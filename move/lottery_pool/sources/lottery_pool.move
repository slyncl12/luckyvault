module lottery_pool::lottery_pool {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::vec_map::{Self, VecMap};
    use sui::event;
    
    // Errors
    const EInsufficientBalance: u64 = 0;
    const ENotOwner: u64 = 1;
    const ENoParticipants: u64 = 2;
    const ENotAuthorized: u64 = 3;
    const EMinimumDeposit: u64 = 4;
    
    // Constants
    const MIN_DEPOSIT: u64 = 100_000_000; // 0.1 SUI minimum
    
    /// Admin capability - only holder can draw winners
    public struct AdminCap has key, store {
        id: UID,
    }
    
    /// The main lottery pool
    public struct LotteryPool has key {
        id: UID,
        total_deposits: u64,
        balance: Balance<SUI>,
        participants: VecMap<address, u64>,
        total_tickets: u64,
        admin: address,
    }
    
    /// A ticket that proves deposit
    public struct Ticket has key, store {
        id: UID,
        amount: u64,
        pool_id: address,
        owner: address,
    }
    
    /// Event emitted when someone deposits
    public struct DepositEvent has copy, drop {
        depositor: address,
        amount: u64,
        tickets: u64,
    }
    
    /// Event emitted when winner is selected
    public struct WinnerEvent has copy, drop {
        winner: address,
        prize: u64,
        draw_time: u64,
    }
    
    /// Create the lottery pool with admin capability
    public fun create_pool(ctx: &mut TxContext) {
        let admin = tx_context::sender(ctx);
        
        let pool = LotteryPool {
            id: object::new(ctx),
            total_deposits: 0,
            balance: balance::zero(),
            participants: vec_map::empty(),
            total_tickets: 0,
            admin,
        };
        
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };
        
        transfer::share_object(pool);
        transfer::transfer(admin_cap, admin);
    }
    
    /// Deposit SUI and get a ticket
    public fun deposit(
        pool: &mut LotteryPool,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let amount = coin::value(&payment);
        
        // Check minimum deposit
        assert!(amount >= MIN_DEPOSIT, EMinimumDeposit);
        
        let payment_balance = coin::into_balance(payment);
        let sender = tx_context::sender(ctx);
        
        // Add to pool with overflow check
        let new_total = pool.total_deposits + amount;
        assert!(new_total >= pool.total_deposits, 0); // Overflow check
        
        balance::join(&mut pool.balance, payment_balance);
        pool.total_deposits = new_total;
        
        // Track participant
        if (vec_map::contains(&pool.participants, &sender)) {
            let current = *vec_map::get(&pool.participants, &sender);
            vec_map::remove(&mut pool.participants, &sender);
            vec_map::insert(&mut pool.participants, sender, current + amount);
        } else {
            vec_map::insert(&mut pool.participants, sender, amount);
        };
        
        // Calculate tickets (1 SUI = 1 ticket)
        let tickets = amount / 1_000_000_000;
        pool.total_tickets = pool.total_tickets + tickets;
        
        // Give user a ticket
        let ticket = Ticket {
            id: object::new(ctx),
            amount: amount,
            pool_id: object::id_address(pool),
            owner: sender,
        };
        
        // Emit event
        event::emit(DepositEvent {
            depositor: sender,
            amount: amount,
            tickets: tickets,
        });
        
        transfer::transfer(ticket, sender);
    }
    
    /// Withdraw deposit
    public fun withdraw(
        pool: &mut LotteryPool,
        ticket: Ticket,
        ctx: &mut TxContext
    ) {
        let Ticket { id, amount, pool_id: _, owner } = ticket;
        object::delete(id);
        
        let sender = tx_context::sender(ctx);
        assert!(owner == sender, ENotOwner);
        
        // Check pool has sufficient balance
        assert!(balance::value(&pool.balance) >= amount, EInsufficientBalance);
        
        // Remove from participants
        if (vec_map::contains(&pool.participants, &sender)) {
            let current = *vec_map::get(&pool.participants, &sender);
            vec_map::remove(&mut pool.participants, &sender);
            if (current > amount) {
                vec_map::insert(&mut pool.participants, sender, current - amount);
            };
        };
        
        // Calculate tickets to remove
        let tickets = amount / 1_000_000_000;
        pool.total_tickets = pool.total_tickets - tickets;
        
        // Return the SUI
        let withdraw_balance = balance::split(&mut pool.balance, amount);
        let withdraw_coin = coin::from_balance(withdraw_balance, ctx);
        
        pool.total_deposits = pool.total_deposits - amount;
        
        transfer::public_transfer(withdraw_coin, sender);
    }
    
    /// Draw a winner - REQUIRES ADMIN CAP
    public fun draw_winner(
        _admin_cap: &AdminCap, // Proves caller is admin
        pool: &mut LotteryPool,
        prize_amount: u64,
        ctx: &mut TxContext
    ) {
        // Ensure pool has enough balance
        assert!(balance::value(&pool.balance) >= prize_amount, EInsufficientBalance);
        assert!(vec_map::length(&pool.participants) > 0, ENoParticipants);
        
        // Simple random selection using epoch (still not perfect, but better than before)
        // TODO: Integrate Sui VRF for production
        let epoch = tx_context::epoch(ctx);
        let num_participants = vec_map::length(&pool.participants);
        let winner_index = (epoch % (num_participants as u64));
        
        // Get winner
        let (winner_addr, _) = vec_map::get_entry_by_idx(&pool.participants, winner_index);
        
        // Send prize
        let prize_balance = balance::split(&mut pool.balance, prize_amount);
        let prize_coin = coin::from_balance(prize_balance, ctx);
        
        // Emit event
        event::emit(WinnerEvent {
            winner: *winner_addr,
            prize: prize_amount,
            draw_time: tx_context::epoch(ctx),
        });
        
        transfer::public_transfer(prize_coin, *winner_addr);
    }
    
    /// Emergency pause - admin can prevent deposits
    /// (For production, implement full pause mechanism)
    
    /// Get total deposits
    public fun get_total_deposits(pool: &LotteryPool): u64 {
        pool.total_deposits
    }
    
    /// Get total tickets
    public fun get_total_tickets(pool: &LotteryPool): u64 {
        pool.total_tickets
    }
    
    /// Get participant count
    public fun get_participant_count(pool: &LotteryPool): u64 {
        vec_map::length(&pool.participants)
    }
    
    /// Check if address is admin
    public fun is_admin(pool: &LotteryPool, addr: address): bool {
        pool.admin == addr
    }
}
