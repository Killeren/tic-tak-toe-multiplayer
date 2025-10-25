#!/bin/bash
# Railway startup script for Nakama

# Wait for database to be ready
echo "Waiting for database..."
sleep 5

# Run migrations
echo "Running database migrations..."
/nakama/nakama migrate up --database.address "$DATABASE_URL"

# Start Nakama server
echo "Starting Nakama server..."
exec /nakama/nakama --config /nakama/data/local.yml --database.address "$DATABASE_URL"
