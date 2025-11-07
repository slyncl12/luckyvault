// LuckyVault - Personal Testing Version
// Whitelist-only, mainnet deployment with safety features

module luckyvault::lottery_personal {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::table::{Self, Table};
    use sui::vec_set::{Self, VecSet};
    use sui::event;
    use sui::clock::{Self, Clock};
    
    // ============ Constants ============
    const MAX_DEPOSIT_PER_USER: u64 = 100_000_000_000; // 100 SUI max per wallet for testing
  
    // ============ Errors ============
    const ENotWhitelisted: u64 = 0;
    const ENotAdmin: u64 = 1;
    const EPoolPaused: u64 = 2;
    const EExceedsUserLimit: u64 = 3;
    const ENotDepositor: u64 = 4;
    const EInsufficientBalance: u64 = 5;
    const ENoTicket: u64 = 6;
    
    // ============ Structs ============
    
    /// Admin capability - KEEP THIS SAFE!
    public struct AdminCap has key, store {
        id: UID,
    }
    
    /// Lottery pool with whitelist protection
    public struct LotteryPool<phantom T> has key {
        id: UID,
        balance: Balance<T>,
        total_deposited: u64,
        user_deposits: Table<address, u64>,
        suilend_obligations: Table<address, vector<u8>>, // Track Suilend obligation IDs
        whitelist: VecSet<address>, // Only these addresses can use
        paused: bool,
        version: u64,
        created_at: u64,
    }
    
    /// Ticket NFT - Receipt for deposit
    public struct Ticket has key, store {
        id: UID,
        owner: address,
        amount: u64,
        deposit_time: u64,
        pool_id: address, // Track which pool
    }
    
    // ============ Events ============
    
    public struct DepositEvent has copy, drop {
        user: address,
        amount: u64,
        ticket_id: address,
        total_pool: u64,
        timestamp: u64,
    }
    
    public struct WithdrawEvent has copy, drop {
        user: address,
        amount: u64,
        ticket_id: address,
        total_pool: u64,
        timestamp: u64,
    }
    
    public struct WhitelistEvent has copy, drop {
        address: address,
        added: bool, // true = added, false = removed
        timestamp: u64,
    }
    
    public struct PauseEvent has copy, drop {
        paused: bool,
        timestamp: u64,
    }
    
    // ============ Init ============
    
    fun init(ctx: &mut TxContext) {
        // Create and send AdminCap to deployer
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };
        
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }
    
    // ============ Admin Functions ============
    
    /// Create pool with initial whitelisted addresses
    public entry fun create_pool<T>(
        _admin: &AdminCap,
        wallet1: address,
        wallet2: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let mut whitelist = vec_set::empty<address>();
        vec_set::insert(&mut whitelist, wallet1);
        vec_set::insert(&mut whitelist, wallet2);
        
        let pool = LotteryPool<T> {
            id: object::new(ctx),
            balance: balance::zero<T>(),
            total_deposited: 0,
            user_deposits: table::new(ctx),
            suilend_obligations: table::new(ctx),
            whitelist,
            paused: false,
            version: 1,
            created_at: clock::timestamp_ms(clock),
        };
        
        transfer::share_object(pool);
    }
    
    /// Add address to whitelist
    public fun add_to_whitelist<T>(
        _admin: &AdminCap,
        pool: &mut LotteryPool<T>,
        new_address: address,
        clock: &Clock,
    ) {
        vec_set::insert(&mut pool.whitelist, new_address);
        
        event::emit(WhitelistEvent {
            address: new_address,
            added: true,
            timestamp: clock::timestamp_ms(clock),
        });
    }
    
    /// Remove from whitelist
    public fun remove_from_whitelist<T>(
        _admin: &AdminCap,
        pool: &mut LotteryPool<T>,
        address: address,
        clock: &Clock,
    ) {
        vec_set::remove(&mut pool.whitelist, &address);
        
        event::emit(WhitelistEvent {
            address,
            added: false,
            timestamp: clock::timestamp_ms(clock),
        });
    }
    
/// Emergency pause
    public entry fun pause<T>(
        _admin: &AdminCap,
        pool: &mut LotteryPool<T>,
        clock: &Clock,
    ) {
        pool.paused = true;
        event::emit(PauseEvent {
            paused: true,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Unpause
    public entry fun unpause<T>(
        _admin: &AdminCap,
        pool: &mut LotteryPool<T>,
        clock: &Clock,
    ) {
        pool.paused = false;
        event::emit(PauseEvent {
            paused: false,
            timestamp: clock::timestamp_ms(clock),
        });
    }
    
    /// Store Suilend obligation ID for user
    public fun set_suilend_obligation<T>(
        _admin: &AdminCap,
        pool: &mut LotteryPool<T>,
        user: address,
        obligation_id: vector<u8>,
    ) {
        if (table::contains(&pool.suilend_obligations, user)) {
            table::remove(&mut pool.suilend_obligations, user);
        };
        table::add(&mut pool.suilend_obligations, user, obligation_id);
    }
    
// ============ Suilend Integration ============
    
// ============ Admin Pool Management ============
    
    /// Admin can withdraw USDC from pool (for external Suilend management)
    public entry fun admin_withdraw_for_suilend<T>(
        _admin: &AdminCap,
        pool: &mut LotteryPool<T>,
        amount: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(balance::value(&pool.balance) >= amount, EInsufficientBalance);
        
        let withdrawn = coin::take(&mut pool.balance, amount, ctx);
        
        event::emit(WithdrawEvent {
            user: tx_context::sender(ctx),
            amount,
            ticket_id: @0x0,
            total_pool: balance::value(&pool.balance),
            timestamp: clock::timestamp_ms(clock),
        });
        
        transfer::public_transfer(withdrawn, tx_context::sender(ctx));
    }
    
    /// Admin can deposit USDC back to pool (from Suilend yields)
    public entry fun admin_deposit_from_suilend<T>(
        _admin: &AdminCap,
        pool: &mut LotteryPool<T>,
        coins: coin::Coin<T>,
        clock: &Clock,
    ) {
        let amount = coin::value(&coins);
        let deposit_balance = coin::into_balance(coins);
        balance::join(&mut pool.balance, deposit_balance);
        
        event::emit(DepositEvent {
            user: @0x0, // System deposit
            amount,
            ticket_id: @0x0,
            total_pool: balance::value(&pool.balance),
            timestamp: clock::timestamp_ms(clock),
        });
    }    


    // ============ User Functions ============
    
    /// Deposit - Whitelist only
    public fun deposit<T>(
        pool: &mut LotteryPool<T>,
        payment: Coin<T>,
        clock: &Clock,
        ctx: &mut TxContext
    ): Ticket {
        let sender = tx_context::sender(ctx);
        
        // Check whitelist
        assert!(vec_set::contains(&pool.whitelist, &sender), ENotWhitelisted);
        
        // Check not paused
        assert!(!pool.paused, EPoolPaused);
        
        let amount = coin::value(&payment);
        
        // Check user limit
        let current = if (table::contains(&pool.user_deposits, sender)) {
            *table::borrow(&pool.user_deposits, sender)
        } else {
            0
        };
        
        let new_total = current + amount;
        assert!(new_total <= MAX_DEPOSIT_PER_USER, EExceedsUserLimit);
        
        // Accept deposit
        balance::join(&mut pool.balance, coin::into_balance(payment));
        pool.total_deposited = pool.total_deposited + amount;
        
        // Update user deposits
        if (table::contains(&pool.user_deposits, sender)) {
            let user_deposit = table::borrow_mut(&mut pool.user_deposits, sender);
            *user_deposit = new_total;
        } else {
            table::add(&mut pool.user_deposits, sender, amount);
        };
        
        // Create ticket
        let ticket = Ticket {
            id: object::new(ctx),
            owner: sender,
            amount,
            deposit_time: clock::timestamp_ms(clock),
            pool_id: object::uid_to_address(&pool.id),
        };
        
        let ticket_id = object::uid_to_address(&ticket.id);
        
        event::emit(DepositEvent {
            user: sender,
            amount,
            ticket_id,
            total_pool: pool.total_deposited,
            timestamp: clock::timestamp_ms(clock),
        });
        
        ticket
    }
    
    /// Withdraw - Ticket owner only
    public fun withdraw<T>(
        pool: &mut LotteryPool<T>,
        ticket: Ticket,
        clock: &Clock,
        ctx: &mut TxContext
    ): Coin<T> {
        let Ticket { id, owner, amount, deposit_time: _, pool_id } = ticket;
        
        // Verify ownership
        assert!(owner == tx_context::sender(ctx), ENotDepositor);
        
        // Verify correct pool
        assert!(pool_id == object::uid_to_address(&pool.id), ENoTicket);
        
        // Check balance
        assert!(balance::value(&pool.balance) >= amount, EInsufficientBalance);
        
        // Withdraw
        let withdrawn = balance::split(&mut pool.balance, amount);
        pool.total_deposited = pool.total_deposited - amount;
        
        // Update user deposits
        let user_deposit = table::borrow_mut(&mut pool.user_deposits, owner);
        *user_deposit = *user_deposit - amount;
        if (*user_deposit == 0) {
            table::remove(&mut pool.user_deposits, owner);
        };
        
        let ticket_id = object::uid_to_address(&id);
        
        event::emit(WithdrawEvent {
            user: owner,
            amount,
            ticket_id,
            total_pool: pool.total_deposited,
            timestamp: clock::timestamp_ms(clock),
        });
        
        object::delete(id);
        coin::from_balance(withdrawn, ctx)
    }
    
    // ============ View Functions ============
    
    /// Check if address is whitelisted
    public fun is_whitelisted<T>(pool: &LotteryPool<T>, address: address): bool {
        vec_set::contains(&pool.whitelist, &address)
    }
    
    /// Get pool stats
    public fun get_pool_stats<T>(pool: &LotteryPool<T>): (u64, u64, u64, bool) {
        (
            pool.total_deposited,
            balance::value(&pool.balance),
            vec_set::size(&pool.whitelist),
            pool.paused
        )
    }
    
    /// Get user deposit
    public fun get_user_deposit<T>(pool: &LotteryPool<T>, user: address): u64 {
        if (table::contains(&pool.user_deposits, user)) {
            *table::borrow(&pool.user_deposits, user)
        } else {
            0
        }
    }
    
    /// Get Suilend obligation ID for user
    public fun get_suilend_obligation<T>(pool: &LotteryPool<T>, user: address): vector<u8> {
        if (table::contains(&pool.suilend_obligations, user)) {
            *table::borrow(&pool.suilend_obligations, user)
        } else {
            vector::empty<u8>()
        }
    }
    
    /// Get ticket info
    public fun get_ticket_info(ticket: &Ticket): (address, u64, u64) {
        (ticket.owner, ticket.amount, ticket.deposit_time)
    }
}
