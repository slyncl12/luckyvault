module lottery_pool::lottery_pool {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::vec_map::{Self, VecMap};
    use sui::event;
    use sui::random::{Self, Random};
    use test_usdc::usdc::USDC;    
    // Errors
    const EInsufficientBalance: u64 = 0;
    const ENotOwner: u64 = 1;
    const ENoParticipants: u64 = 2;
    const EMinimumDeposit: u64 = 4;
    const EInsufficientYield: u64 = 5;
    
    // Constants
    const MIN_DEPOSIT: u64 = 100_000; // 0.1 USDC (6 decimals)
    
    /// Admin capability
    public struct AdminCap has key, store {
        id: UID,
    }
    
    /// The lottery pool tracking USDC and Suilend obligations
    public struct LotteryPool has key {
        id: UID,
        usdc_deposits: Balance<USDC>,         // Temporary USDC before Suilend
        yield_balance: Balance<USDC>,         // Yield for prizes
        participants: VecMap<address, u64>,   // User -> USDC amount
        suilend_obligations: VecMap<address, vector<u8>>, // User -> obligation ID
        total_deposited: u64,
        total_yield_earned: u64,
        total_tickets: u64,
        admin: address,
    }
    
       
    /// A ticket proving deposit
    public struct Ticket has key, store {
        id: UID,
        amount_usdc: u64,
        pool_id: address,
        owner: address,
        suilend_obligation_id: vector<u8>, // For transparency
    }
    
    /// Events
    public struct DepositEvent has copy, drop {
        depositor: address,
        amount_usdc: u64,
        pool_id: address,
        timestamp: u64,
    }
    
    public struct SuilendDepositEvent has copy, drop {
        depositor: address,
        amount_usdc: u64,
        obligation_id: vector<u8>,
    }
    
    public struct WithdrawEvent has copy, drop {
        withdrawer: address,
        amount_usdc: u64,
    }
    
    public struct WinnerEvent has copy, drop {
        winner: address,
        prize_usdc: u64,
        draw_time: u64,
    }
    
    public struct YieldAddedEvent has copy, drop {
        amount: u64,
        total_yield: u64,
    }
    
    /// Create pool
    public fun create_pool(ctx: &mut TxContext) {
        let admin = tx_context::sender(ctx);
        
        let pool = LotteryPool {
            id: object::new(ctx),
            usdc_deposits: balance::zero(),
            yield_balance: balance::zero(),
            participants: vec_map::empty(),
            suilend_obligations: vec_map::empty(),
            total_deposited: 0,
            total_yield_earned: 0,
            total_tickets: 0,
            admin,
        };
        
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };
        
        transfer::share_object(pool);
        transfer::transfer(admin_cap, admin);
    }
    
    /// User deposits USDC to pool
    /// Frontend will then deposit to Suilend and call record_suilend_deposit
    public fun deposit(
        pool: &mut LotteryPool,
        usdc_payment: Coin<USDC>,
        ctx: &mut TxContext
    ) {
        let amount = coin::value(&usdc_payment);
        assert!(amount >= MIN_DEPOSIT, EMinimumDeposit);
        
        let sender = tx_context::sender(ctx);
        
        // Store USDC temporarily
        balance::join(&mut pool.usdc_deposits, coin::into_balance(usdc_payment));
        
        // Track participant
        if (vec_map::contains(&pool.participants, &sender)) {
            let current = *vec_map::get(&pool.participants, &sender);
            vec_map::remove(&mut pool.participants, &sender);
            vec_map::insert(&mut pool.participants, sender, current + amount);
        } else {
            vec_map::insert(&mut pool.participants, sender, amount);
        };
        
        pool.total_deposited = pool.total_deposited + amount;
        
        // Calculate tickets (1 USDC = 1 ticket)
        let tickets = amount / 1_000_000; // 6 decimals
        pool.total_tickets = pool.total_tickets + tickets;
        
        // Issue ticket (obligation_id will be added by frontend)
        let ticket = Ticket {
            id: object::new(ctx),
            amount_usdc: amount,
            pool_id: object::id_address(pool),
            owner: sender,
            suilend_obligation_id: b"", // Filled by frontend
        };
        
        // Emit event for frontend to catch
        event::emit(DepositEvent {
            depositor: sender,
            amount_usdc: amount,
            pool_id: object::id_address(pool),
            timestamp: tx_context::epoch(ctx),
        });
        
        transfer::transfer(ticket, sender);
    }
    
    /// Frontend calls this after depositing to Suilend
    /// Records the obligation ID for transparency
    public fun record_suilend_deposit(
        pool: &mut LotteryPool,
        user: address,
        obligation_id: vector<u8>,
        ctx: &mut TxContext
    ) {
        // Only the user or admin can record
        let sender = tx_context::sender(ctx);
        assert!(sender == user || sender == pool.admin, ENotOwner);
        
        // Store obligation ID
        if (vec_map::contains(&pool.suilend_obligations, &user)) {
            vec_map::remove(&mut pool.suilend_obligations, &user);
        };
        vec_map::insert(&mut pool.suilend_obligations, user, obligation_id);
        
        event::emit(SuilendDepositEvent {
            depositor: user,
            amount_usdc: *vec_map::get(&pool.participants, &user),
            obligation_id,
        });
    }
    
    /// Withdraw USDC
    /// Frontend handles withdrawing from Suilend first
    public fun withdraw(
        pool: &mut LotteryPool,
        ticket: Ticket,
        usdc_return: Coin<USDC>, // USDC returned from Suilend by frontend
        ctx: &mut TxContext
    ) {
        let Ticket { id, amount_usdc, pool_id: _, owner, suilend_obligation_id: _ } = ticket;
        object::delete(id);
        
        let sender = tx_context::sender(ctx);
        assert!(owner == sender, ENotOwner);
        
        // Verify correct amount returned from Suilend
        assert!(coin::value(&usdc_return) >= amount_usdc, EInsufficientBalance);
        
        // Remove from participants
        if (vec_map::contains(&pool.participants, &sender)) {
            let current = *vec_map::get(&pool.participants, &sender);
            vec_map::remove(&mut pool.participants, &sender);
            if (current > amount_usdc) {
                vec_map::insert(&mut pool.participants, sender, current - amount_usdc);
            };
        };
        
        // Remove obligation tracking
        if (vec_map::contains(&pool.suilend_obligations, &sender)) {
            vec_map::remove(&mut pool.suilend_obligations, &sender);
        };
        
        // Update totals
        pool.total_deposited = pool.total_deposited - amount_usdc;
        let tickets = amount_usdc / 1_000_000;
        pool.total_tickets = pool.total_tickets - tickets;
        
        event::emit(WithdrawEvent {
            withdrawer: sender,
            amount_usdc,
        });
        
        // Transfer USDC to user
        transfer::public_transfer(usdc_return, sender);
    }
    
    /// Admin adds yield collected from Suilend
    entry fun add_yield(
        _admin_cap: &AdminCap,
        pool: &mut LotteryPool,
        yield_payment: Coin<USDC>,
    ) {
        let yield_amount = coin::value(&yield_payment);
        balance::join(&mut pool.yield_balance, coin::into_balance(yield_payment));
        pool.total_yield_earned = pool.total_yield_earned + yield_amount;
        
        event::emit(YieldAddedEvent {
            amount: yield_amount,
            total_yield: pool.total_yield_earned,
        });
    }
    
    /// Draw winner using VRF - prize from yield
    entry fun draw_winner(
        _admin_cap: &AdminCap,
        pool: &mut LotteryPool,
        prize_amount: u64,
        r: &Random,
        ctx: &mut TxContext
    ) {
        assert!(balance::value(&pool.yield_balance) >= prize_amount, EInsufficientYield);
        assert!(vec_map::length(&pool.participants) > 0, ENoParticipants);
        
        // VRF randomness
        let mut generator = random::new_generator(r, ctx);
        let num_participants = vec_map::length(&pool.participants);
        let winner_index = random::generate_u64_in_range(&mut generator, 0, num_participants - 1);
        
        // Get winner
        let (winner_addr, _) = vec_map::get_entry_by_idx(&pool.participants, winner_index);
        
        // Send prize from yield
        let prize_balance = balance::split(&mut pool.yield_balance, prize_amount);
        let prize_coin = coin::from_balance(prize_balance, ctx);
        
        event::emit(WinnerEvent {
            winner: *winner_addr,
            prize_usdc: prize_amount,
            draw_time: tx_context::epoch(ctx),
        });
        
        transfer::public_transfer(prize_coin, *winner_addr);
    }
    
    /// View functions
    public fun get_total_deposited(pool: &LotteryPool): u64 {
        pool.total_deposited
    }
    
    public fun get_yield_balance(pool: &LotteryPool): u64 {
        balance::value(&pool.yield_balance)
    }
    
    public fun get_total_yield(pool: &LotteryPool): u64 {
        pool.total_yield_earned
    }
    
    public fun get_total_tickets(pool: &LotteryPool): u64 {
        pool.total_tickets
    }
    
    public fun get_participant_count(pool: &LotteryPool): u64 {
        vec_map::length(&pool.participants)
    }
    
    public fun get_user_deposit(pool: &LotteryPool, user: address): u64 {
        if (vec_map::contains(&pool.participants, &user)) {
            *vec_map::get(&pool.participants, &user)
        } else {
            0
        }
    }
}
