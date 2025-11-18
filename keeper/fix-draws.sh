#!/bin/bash

# Backup
cp DrawScheduler.ts DrawScheduler.ts.broken

# Add SuilendTracker to all 4 draw functions
sed -i 's/tx.object(process.env.VITE_DRAW_CONFIG_ID!),$/tx.object(process.env.VITE_DRAW_CONFIG_ID!),\n          tx.object(process.env.VITE_SUILEND_TRACKER_ID!),/' DrawScheduler.ts

echo "✅ Fixed all draw functions to include SuilendTracker!"
