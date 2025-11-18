#!/bin/bash

# Fix syntax errors with template literals
sed -i '123s/console.log`/console.log(`/' PoolRebalancer.ts
sed -i '123s/`);/`);/' PoolRebalancer.ts

sed -i '176s/console.log`/console.log(`/' PoolRebalancer.ts  
sed -i '176s/`);/`);/' PoolRebalancer.ts

# Remove the duplicate/broken line 191
sed -i '191d' PoolRebalancer.ts

# Now let's re-enable tracker updates - need to see what env vars are available
echo "Fixed syntax errors. Now need to add tracker update logic..."
