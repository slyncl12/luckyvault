#!/bin/bash

# Backup App.jsx
cp frontend/src/App.jsx frontend/src/App.jsx.backup_hardcoded_$(date +%Y%m%d)

# Replace hardcoded IDs with environment variables
sed -i "s/const DRAW_CONFIG_ID = '[^']*'/const DRAW_CONFIG_ID = import.meta.env.VITE_DRAW_CONFIG_ID/" frontend/src/App.jsx
sed -i "s/const JACKPOT_TIERS_ID = '[^']*'/const JACKPOT_TIERS_ID = import.meta.env.VITE_JACKPOT_TIERS_ID/" frontend/src/App.jsx
sed -i "s/const SUILEND_TRACKER_ID = '[^']*'/const SUILEND_TRACKER_ID = import.meta.env.VITE_SUILEND_TRACKER_ID/" frontend/src/App.jsx

# Also check for POOL_OBJECT_ID and PACKAGE_ID
sed -i "s/const POOL_OBJECT_ID = '[^']*'/const POOL_OBJECT_ID = import.meta.env.VITE_POOL_OBJECT_ID/" frontend/src/App.jsx
sed -i "s/const PACKAGE_ID = '[^']*'/const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID/" frontend/src/App.jsx

echo "✅ Replaced hardcoded IDs with environment variables"
