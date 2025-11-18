  const fetchUserTickets = async () => {
    if (!account) return
    try {
      const objects = await client.getOwnedObjects({
        owner: account.address,
        filter: { StructType: `${PACKAGE_ID}::lottery_personal::Ticket` },
        options: { showContent: true }
      })
      const tickets = objects.data
        .filter(obj => {
          // Filter out deleted/consumed tickets
          if (!obj.data) return false
          if (!obj.data.content) return false
          if (obj.data.content.dataType !== 'moveObject') return false
          return true
        })
        .map(obj => ({
          objectId: obj.data.objectId,
          ...obj.data.content.fields
        }))
      setUserTickets(tickets)
      console.log('Active tickets:', tickets.length)
    } catch (error) {
      console.error('Error fetching tickets:', error)
    }
  }
