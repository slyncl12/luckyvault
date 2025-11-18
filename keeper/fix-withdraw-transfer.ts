  async withdrawFromNavi(userAddress: string, amount: number): Promise<any> {
    const { withdrawCoinPTB } = await import('@naviprotocol/lending');
    const { Transaction } = await import('@mysten/sui/transactions');

    const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';

    const tx = new Transaction();

    // Withdraw from NAVI - this returns the withdrawn coin
    const [withdrawnCoin] = await withdrawCoinPTB(
      tx,
      USDC_TYPE,
      Math.floor(amount * 1_000_000)
    );

    // Transfer the withdrawn coin to the user address
    tx.transferObjects([withdrawnCoin], userAddress);

    return tx;
  }
