  private async checkForWithdrawals() {
    try {
      // Only query events from the last hour to avoid reprocessing old ones
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::lottery_personal::WithdrawalRequestedEvent`
        },
        limit: 50,
        order: 'descending'
      });

      if (!events.data || events.data.length === 0) {
        return;
      }

      for (const event of events.data) {
        const parsedJson = event.parsedJson as any;
        const requestId = parsedJson.request_id;
        const timestamp = parsedJson.timestamp;
        
        // Skip old events (older than 1 hour)
        if (timestamp < oneHourAgo) {
          continue;
        }
        
        // Skip already processed
        if (this.processedRequests.has(requestId)) {
          continue;
        }

        // Check if still exists and unfulfilled
        try {
          const requestObj = await this.client.getObject({
            id: requestId,
            options: { showContent: true }
          });

          if (requestObj.data?.content?.dataType === 'moveObject') {
            const fields = requestObj.data.content.fields as any;
            
            if (!fields.fulfilled) {
              const amount = parseInt(fields.amount);
              console.log(`💸 Found pending withdrawal: $${(amount / 1_000_000).toFixed(2)}`);
              
              const success = await this.fulfillWithdrawal(requestId, amount);
              if (success) {
                this.processedRequests.add(requestId);
              }
            } else {
              this.processedRequests.add(requestId);
            }
          }
        } catch (error: any) {
          // Object deleted = already fulfilled, mark as processed
          if (error.message?.includes('deleted') || error.message?.includes('does not exist')) {
            this.processedRequests.add(requestId);
          }
        }
      }
    } catch (error: any) {
      // Silently handle errors to avoid log spam
      if (!error.message?.includes('deleted')) {
        console.error('❌ Error checking withdrawals:', error.message);
      }
    }
  }
