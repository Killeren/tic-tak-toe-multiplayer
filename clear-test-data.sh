#!/bin/bash

# Clear test data from Nakama database
# This removes all users and matches for a fresh start

echo "🧹 Clearing test data from Nakama database..."

# Stop Nakama to ensure clean shutdown
echo "1. Stopping Nakama..."
docker-compose -f server/docker-compose.yml stop nakama

# Clear the database
echo "2. Resetting database..."
docker-compose -f server/docker-compose.yml exec -T postgres psql -U postgres -d nakama <<-EOSQL
    -- Clear users (this will cascade to related data)
    TRUNCATE users CASCADE;
    
    -- Clear storage data
    TRUNCATE storage CASCADE;
    
    -- Clear leaderboard records
    TRUNCATE leaderboard_record CASCADE;
    
    -- Note: We keep the leaderboard definition itself
    
    VACUUM ANALYZE;
EOSQL

# Restart Nakama
echo "3. Restarting Nakama..."
docker-compose -f server/docker-compose.yml start nakama

echo ""
echo "✅ Test data cleared successfully!"
echo "⏳ Waiting for Nakama to start (5 seconds)..."
sleep 5

echo ""
echo "✨ Ready for testing! All usernames are now available."
echo "🌐 Open: http://localhost:8080"
