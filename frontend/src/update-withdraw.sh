#!/bin/bash

# This updates the handleWithdraw function to use request_withdrawal

# Create a temporary file with the new function
cat > /tmp/new_withdraw.txt << 'ENDFUNCTION'
  const handleWithdraw = async () => {
    if (!account || !selectedTicket) {
      setStatus('❌ Please select a ticket')
      return
    }
    setLoading(true)
    setStatus('⏳ Requesting withdrawal...')
    try {
      const tx = new Transaction()
      tx.moveCall({
        target: `${PACKAGE_ID}::lottery_personal::request_withdrawal`,
        typeArguments: [USDC_TYPE],
        arguments: [
          tx.object(POOL_ID),
          tx.object(selectedTicket.objectId),
          tx.object(CLOCK_ID)
        ],
      })
      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Withdrawal request successful:', result)
            setStatus('✅ Withdrawal requested! It will be processed within a few seconds.')
            setSelectedTicket(null)
            setTimeout(() => {
ENDFUNCTION

echo "✅ Use request_withdrawal instead of withdraw_smart"
echo "📝 Manual update needed:"
echo ""
echo "1. Open App.jsx in nano or editor"
echo "2. Find the handleWithdraw function (around line 200)"
echo "3. Change 'withdraw_smart' to 'request_withdrawal'"
echo "4. Remove the SUILEND_TRACKER_ID line"
echo "5. Update status message to say 'Withdrawal requested! Processing...'"
echo ""
echo "Or run: nano App.jsx"
