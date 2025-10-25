#!/bin/bash

echo "🗑️  Resetting Leaderboard Data"
echo "================================"
echo ""
echo "This script will clear all leaderboard entries so new games"
echo "will create fresh leaderboard records with proper usernames."
echo ""
echo "⚠️  WARNING: This will delete all current leaderboard data!"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

echo ""
echo "Connecting to Railway database..."
echo ""
echo "Run this SQL command in Railway PostgreSQL console:"
echo ""
echo "DELETE FROM leaderboard WHERE leaderboard_id = 'tictactoe_wins';"
echo ""
echo "Or use Railway CLI:"
echo ""
echo "railway run psql \$DATABASE_URL -c \"DELETE FROM leaderboard WHERE leaderboard_id = 'tictactoe_wins';\""
echo ""
echo "✅ After running this command, all new games will create"
echo "   leaderboard entries with proper usernames!"
