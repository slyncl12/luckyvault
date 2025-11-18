#!/bin/bash

echo "🚀 Deploying fresh pool..."

sui client call \
  --package 0x9b5e8b2a65d2f3ba91000558bd60bc45b9be48b0da3b39d0c079654caee1d3ae \
  --module lottery_personal \
  --function create_pool \
  --type-args 0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC \
  --args \
    0x2504d9bf87de60b78f23a6b2290bc664b85162aba1163b35084ab28a29e6ac91 \
    0x9d1d93f595fbfc241d1a25c864d195bd401ba814368178e7fa5a21e552014382 \
    0x9d1d93f595fbfc241d1a25c864d195bd401ba814368178e7fa5a21e552014382 \
    0x6 \
  --gas-budget 100000000

echo ""
echo "✅ New pool created!"
echo "Look for 'Created Objects' in the output above"
echo "Copy the Pool ID and update your .env files"
