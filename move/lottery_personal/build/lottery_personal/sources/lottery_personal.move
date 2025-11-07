// LuckyVault - With Luck System
// No-loss lottery with dual luck tracking

module luckyvault::lottery_personal {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::table::{Self, Table};
    use sui::vec_set::{Self, VecSet};
    use sui::event;
    use sui::clock::{Self, Clock};

    // ============ Type Definition ============
    //public struct USDC has drop {}

    // ============ Constants ============
    const MAX_DEPOSIT_PER_USER: u64 = 100_000_000;
    const USDC_DECIMALS: u8 = 6;

    // ============ Errors ============
    const ENotWhitelisted: u64 = 0;
    const ENotAdmin: u64 = 1;
    const EPoolPaused: u64 = 2;
    const EExceedsUserLimit: u64 = 3;
    const ENotDepositor: u64 = 4;
    const EInsufficientBalance: u64 = 5;
    const ENoTicket: u64 = 6;
    const EInvalidLuck: u64 = 7;
    const EInvalidDrawType: u64 = 8;
    const EInsufficientMegaFunds: u64 = 9;
    const ETicketUsed: u64 = 10;
    const EInvalidAmount: u64 = 11;

    // ============ Structs ============

    public struct AdminCap has key, store {
        id: UID,
    }

    public struct LotteryPool<phantom T> has key {
        id: UID,
        balance: Balance<T>,
        total_deposited: u64,
        user_deposits: Table<address, u64>,
        whitelist: VecSet<address>,
        paused: bool,
        version: u64,
        created_at: u64,
    }

    public struct PlayerLuck has key, store {
        id: UID,
        player: address,
        regular_luck_bps: u64,
        regular_consecutive_losses: u64,
        last_regular_draw: u64,
        mega_luck_bps: u64,
        mega_consecutive_losses: u64,
        last_mega_draw: u64,
        created_at: u64,
    }

    public struct Ticket has key, store {
        id: UID,
        owner: address,
        amount: u64,
        deposit_time: u64,
        pool_id: address,
        purchase_draw_number: u64,
        purchase_luck_bps: u64,
        is_active: bool,
    }

    public struct MegaEntry has key, store {
        id: UID,
        owner: address,
        entry_type: u8,
        amount_paid: u64,
        purchase_draw_number: u64,
        purchase_mega_luck_bps: u64,
        is_used: bool,
        created_at: u64,
    }

    public struct DrawConfig has key {
        id: UID,
        current_draw_number: u64,
        last_daily_draw: u64,
        last_weekly_draw: u64,
        last_monthly_draw: u64,
        luck_increment_bps: u64,
        max_regular_luck_bps: u64,
        max_mega_luck_bps: u64,
    }

public struct MegaJackpotPool<phantom T> has key {
    id: UID,
    weekly_pool: Balance<T>,
    monthly_pool: Balance<T>,
    weekly_rollover: u64,
    monthly_rollover: u64,
}
    // ============ Events ============

    public struct DepositEvent has copy, drop {
        user: address,
        amount: u64,
        ticket_id: address,
        luck_multiplier: u64,
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

    public struct MegaEntryPurchased has copy, drop {
        player: address,
        entry_type: u8,
        amount: u64,
        mega_luck: u64,
        timestamp: u64,
    }

    public struct DrawExecuted has copy, drop {
        draw_number: u64,
        draw_type: u8,
        winner: address,
        prize_amount: u64,
        timestamp: u64,
    }

    public struct LuckUpdated has copy, drop {
        player: address,
        old_luck: u64,
        new_luck: u64,
        is_mega: bool,
        timestamp: u64,
    }

    public struct WhitelistEvent has copy, drop {
        address: address,
        added: bool,
        timestamp: u64,
    }

    public struct PauseEvent has copy, drop {
        paused: bool,
        timestamp: u64,
    }

    // ============ Init ============

    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }

    // ============ Admin Setup ============

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

        let pool = LotteryPool {
            id: object::new(ctx),
            balance: balance::zero<T>(),
            total_deposited: 0,
            user_deposits: table::new(ctx),
            whitelist,
            paused: false,
            version: 2,
            created_at: clock::timestamp_ms(clock),
        };

        transfer::share_object(pool);
    }

    public entry fun initialize_luck_system(
        _admin: &AdminCap,
        ctx: &mut TxContext
    ) {
        let config = DrawConfig {
            id: object::new(ctx),
            current_draw_number: 0,
            last_daily_draw: 0,
            last_weekly_draw: 0,
            last_monthly_draw: 0,
            luck_increment_bps: 1000,
            max_regular_luck_bps: 50000,
            max_mega_luck_bps: 100000,
        };
        transfer::share_object(config);
    }

    public entry fun initialize_mega_pool<T>(
        _admin: &AdminCap,
        ctx: &mut TxContext
    ) {
        let mega_pool = MegaJackpotPool<T> {
            id: object::new(ctx),
            weekly_pool: balance::zero<T>(),
            monthly_pool: balance::zero<T>(),
            weekly_rollover: 0,
            monthly_rollover: 0,
        };
        transfer::share_object(mega_pool);
    }

    // ============ Player Luck ============

    public entry fun create_my_luck(
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let luck = PlayerLuck {
            id: object::new(ctx),
            player: sender,
            regular_luck_bps: 10000,
            regular_consecutive_losses: 0,
            last_regular_draw: 0,
            mega_luck_bps: 10000,
            mega_consecutive_losses: 0,
            last_mega_draw: 0,
            created_at: clock::timestamp_ms(clock),
        };
        transfer::transfer(luck, sender);
    }

    // ============ Deposit/Withdraw ============

    public entry fun deposit<T>(
    pool: &mut LotteryPool<T>,
    config: &DrawConfig,
    payment: Coin<T>,
    player_luck: &PlayerLuck,
    clock: &Clock,
    ctx: &mut TxContext
) {
        let sender = tx_context::sender(ctx);
        assert!(!pool.paused, EPoolPaused);
        assert!(vec_set::contains(&pool.whitelist, &sender), ENotWhitelisted);
        assert!(player_luck.player == sender, ENotDepositor);

        let amount = coin::value(&payment);
        assert!(amount >= 1_000000, EInvalidAmount);

        let current = if (table::contains(&pool.user_deposits, sender)) {
            *table::borrow(&pool.user_deposits, sender)
        } else {
            0
        };
        let new_total = current + amount;
        assert!(new_total <= MAX_DEPOSIT_PER_USER, EExceedsUserLimit);

        balance::join(&mut pool.balance, coin::into_balance(payment));
        pool.total_deposited = pool.total_deposited + amount;

        if (table::contains(&pool.user_deposits, sender)) {
            let user_deposit = table::borrow_mut(&mut pool.user_deposits, sender);
            *user_deposit = new_total;
        } else {
            table::add(&mut pool.user_deposits, sender, amount);
        };

        let ticket_id = object::new(ctx);
        let ticket_addr = object::uid_to_address(&ticket_id);

        let ticket = Ticket {
            id: ticket_id,
            owner: sender,
            amount,
            deposit_time: clock::timestamp_ms(clock),
            pool_id: object::uid_to_address(&pool.id),
            purchase_draw_number: config.current_draw_number,
            purchase_luck_bps: player_luck.regular_luck_bps,
            is_active: true,
        };

        event::emit(DepositEvent {
            user: sender,
            amount,
            ticket_id: ticket_addr,
            luck_multiplier: player_luck.regular_luck_bps,
            total_pool: pool.total_deposited,
            timestamp: clock::timestamp_ms(clock),
        });

        transfer::transfer(ticket, sender);
    }

    public entry fun withdraw<T>(
        pool: &mut LotteryPool<T>,
        ticket: Ticket,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let Ticket { 
            id, 
            owner, 
            amount, 
            deposit_time: _, 
            pool_id,
            purchase_draw_number: _,
            purchase_luck_bps: _,
            is_active: _,
        } = ticket;

        let sender = tx_context::sender(ctx);
        assert!(owner == sender, ENotDepositor);
        assert!(pool_id == object::uid_to_address(&pool.id), ENoTicket);
        assert!(balance::value(&pool.balance) >= amount, EInsufficientBalance);

        let withdrawn = balance::split(&mut pool.balance, amount);
        pool.total_deposited = pool.total_deposited - amount;

        if (table::contains(&pool.user_deposits, owner)) {
            let user_deposit = table::borrow_mut(&mut pool.user_deposits, owner);
            *user_deposit = *user_deposit - amount;
            if (*user_deposit == 0) {
                table::remove(&mut pool.user_deposits, owner);
            };
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
        transfer::public_transfer(coin::from_balance(withdrawn, ctx), sender);
    }

    // ============ Mega Entry ============

    public entry fun buy_mega_entry<T>(
        mega_pool: &mut MegaJackpotPool<T>,
        config: &DrawConfig,
        payment: Coin<T>,
        player_luck: &PlayerLuck,
        entry_type: u8,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(entry_type == 1 || entry_type == 2, EInvalidDrawType);
        assert!(player_luck.player == sender, ENotDepositor);

        let amount = coin::value(&payment);
        let required = if (entry_type == 1) { 500_000 } else { 1_000_000 };
        assert!(amount >= required, EInsufficientMegaFunds);

        let mut payment_balance = coin::into_balance(payment);
        let total = balance::value(&payment_balance);
        let prize_amount = (total * 80) / 100;
        
        let prize_balance = balance::split(&mut payment_balance, prize_amount);

        if (entry_type == 1) {
            balance::join(&mut mega_pool.weekly_pool, prize_balance);
        } else {
            balance::join(&mut mega_pool.monthly_pool, prize_balance);
        };

        // Platform fee returns to sender (or treasury in production)
        let platform_coin = coin::from_balance(payment_balance, ctx);
        transfer::public_transfer(platform_coin, sender);

        let entry = MegaEntry {
            id: object::new(ctx),
            owner: sender,
            entry_type,
            amount_paid: amount,
            purchase_draw_number: config.current_draw_number,
            purchase_mega_luck_bps: player_luck.mega_luck_bps,
            is_used: false,
            created_at: clock::timestamp_ms(clock),
        };

        event::emit(MegaEntryPurchased {
            player: sender,
            entry_type,
            amount,
            mega_luck: player_luck.mega_luck_bps,
            timestamp: clock::timestamp_ms(clock),
        });

        transfer::transfer(entry, sender);
    }

    // ============ Luck Calculations ============

    public fun calculate_weighted_entries(
        ticket_luck_bps: u64,
        current_luck_bps: u64,
        ticket_draw: u64,
        current_draw: u64,
    ): u64 {
        if (ticket_draw == current_draw) {
            current_luck_bps
        } else {
            let growth = if (current_luck_bps > ticket_luck_bps) {
                current_luck_bps - ticket_luck_bps
            } else {
                0
            };
            ticket_luck_bps + (growth / 2)
        }
    }

    public fun update_luck_after_draw(
        player_luck: &mut PlayerLuck,
        won: bool,
        is_mega: bool,
        config: &DrawConfig,
        clock: &Clock,
    ) {
        let old_luck = if (is_mega) {
            player_luck.mega_luck_bps
        } else {
            player_luck.regular_luck_bps
        };

        if (is_mega) {
            if (won) {
                player_luck.mega_luck_bps = 10000;
                player_luck.mega_consecutive_losses = 0;
            } else {
                player_luck.mega_consecutive_losses = player_luck.mega_consecutive_losses + 1;
                let new_luck = player_luck.mega_luck_bps + config.luck_increment_bps;
                player_luck.mega_luck_bps = if (new_luck > config.max_mega_luck_bps) {
                    config.max_mega_luck_bps
                } else {
                    new_luck
                };
            };
            player_luck.last_mega_draw = config.current_draw_number;
        } else {
            if (won) {
                player_luck.regular_luck_bps = 10000;
                player_luck.regular_consecutive_losses = 0;
            } else {
                player_luck.regular_consecutive_losses = player_luck.regular_consecutive_losses + 1;
                let new_luck = player_luck.regular_luck_bps + config.luck_increment_bps;
                player_luck.regular_luck_bps = if (new_luck > config.max_regular_luck_bps) {
                    config.max_regular_luck_bps
                } else {
                    new_luck
                };
            };
            player_luck.last_regular_draw = config.current_draw_number;
        };

        event::emit(LuckUpdated {
            player: player_luck.player,
            old_luck,
            new_luck: if (is_mega) { player_luck.mega_luck_bps } else { player_luck.regular_luck_bps },
            is_mega,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    // ============ Admin Functions ============

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

    public entry fun admin_deposit_from_suilend<T>(
        _admin: &AdminCap,
        pool: &mut LotteryPool<T>,
        coins: Coin<T>,
        clock: &Clock,
    ) {
        let amount = coin::value(&coins);
        balance::join(&mut pool.balance, coin::into_balance(coins));

        event::emit(DepositEvent {
            user: @0x0,
            amount,
            ticket_id: @0x0,
            luck_multiplier: 0,
            total_pool: balance::value(&pool.balance),
            timestamp: clock::timestamp_ms(clock),
        });
    }

    // ============ View Functions ============

    public fun is_whitelisted<T>(pool: &LotteryPool<T>, address: address): bool {
        vec_set::contains(&pool.whitelist, &address)
    }

    public fun get_pool_balance<T>(pool: &LotteryPool<T>): u64 {
        balance::value(&pool.balance)
    }

    public fun get_user_deposit<T>(pool: &LotteryPool<T>, user: address): u64 {
        if (table::contains(&pool.user_deposits, user)) {
            *table::borrow(&pool.user_deposits, user)
        } else {
            0
        }
    }

    public fun get_luck_info(luck: &PlayerLuck): (u64, u64, u64, u64) {
        (
            luck.regular_luck_bps,
            luck.regular_consecutive_losses,
            luck.mega_luck_bps,
            luck.mega_consecutive_losses
        )
    }
}
