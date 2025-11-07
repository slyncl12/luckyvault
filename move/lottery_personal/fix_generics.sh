#!/bin/bash

# Read the file
input_file="sources/lottery_personal.move"

# Comment out USDC struct
sed -i 's/^    public struct USDC has drop {}/    \/\/ public struct USDC has drop {}/' "$input_file"

# Replace Balance<USDC> with Balance<T>
sed -i 's/Balance<USDC>/Balance<T>/g' "$input_file"

# Replace Coin<USDC> with Coin<T>  
sed -i 's/Coin<USDC>/Coin<T>/g' "$input_file"

# Fix function signatures - add <T> after function name and replace LotteryPool
sed -i 's/public entry fun create_pool(/public entry fun create_pool<T>(/' "$input_file"
sed -i 's/public entry fun deposit(/public entry fun deposit<T>(/' "$input_file"
sed -i 's/public entry fun withdraw(/public entry fun withdraw<T>(/' "$input_file"
sed -i 's/public entry fun buy_mega_entry(/public entry fun buy_mega_entry<T>(/' "$input_file"
sed -i 's/public fun add_to_whitelist(/public fun add_to_whitelist<T>(/' "$input_file"
sed -i 's/public entry fun pause(/public entry fun pause<T>(/' "$input_file"
sed -i 's/public entry fun unpause(/public entry fun unpause<T>(/' "$input_file"
sed -i 's/public entry fun admin_withdraw_for_suilend(/public entry fun admin_withdraw_for_suilend<T>(/' "$input_file"
sed -i 's/public entry fun admin_deposit_from_suilend(/public entry fun admin_deposit_from_suilend<T>(/' "$input_file"
sed -i 's/public fun is_whitelisted(/public fun is_whitelisted<T>(/' "$input_file"
sed -i 's/public fun get_pool_balance(/public fun get_pool_balance<T>(/' "$input_file"
sed -i 's/public fun get_user_deposit(/public fun get_user_deposit<T>(/' "$input_file"

# Replace pool: &mut LotteryPool with pool: &mut LotteryPool<T>
sed -i 's/pool: \&mut LotteryPool,/pool: \&mut LotteryPool<T>,/g' "$input_file"
sed -i 's/pool: \&LotteryPool,/pool: \&LotteryPool<T>,/g' "$input_file"

# Fix the struct definition
sed -i 's/public struct LotteryPool has key {/public struct LotteryPool<phantom T> has key {/' "$input_file"
sed -i 's/balance: Balance,/balance: Balance<T>,/' "$input_file"

echo "Done! Check the file and build."
