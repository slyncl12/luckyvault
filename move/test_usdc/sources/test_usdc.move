module test_usdc::usdc {
    use sui::coin::{Self, Coin, TreasuryCap};
    
    public struct USDC has drop {}
    
    fun init(witness: USDC, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(
            witness,
            6, // decimals
            b"USDC",
            b"USD Coin (Test)",
            b"Test USDC for LuckyVault",
            option::none(),
            ctx
        );
        
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury, tx_context::sender(ctx));
    }
    
    public fun mint(
        treasury: &mut TreasuryCap<USDC>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let coin = coin::mint(treasury, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }
}
