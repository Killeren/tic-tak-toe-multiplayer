#!/bin/bash
# Railway startup script for Nakama

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set!"
    exit 1
fi

echo "Database URL configured: ${DATABASE_URL%%@*}@***" # Hide password in logs

# Wait for database to be ready
echo "Waiting for database..."
sleep 5

# Run migrations
echo "Running database migrations..."
/nakama/nakama migrate up --database.address "$DATABASE_URL"

# Check if migrations succeeded
if [ $? -ne 0 ]; then
    echo "ERROR: Database migrations failed!"
    exit 1
fi

# Start Nakama
echo "Starting Nakama server..."
exec /nakama/nakama --config /nakama/data/railway.yml --database.address "$DATABASE_URL"Railway startup script for Nakama

# Wait for database to be ready
echo "Waiting for database..."
sleep 5

# Run migrations
echo "Running database migrations..."
/nakama/nakama migrate up --database.address "$DATABASE_URL"

# Start Nakama server
echo "Starting Nakama server..."
exec /nakama/nakama --config /nakama/data/local.yml --database.address "$DATABASE_URL"
