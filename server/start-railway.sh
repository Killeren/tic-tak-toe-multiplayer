#!/bin/bash
# Railway startup script for Nakama

set -e  # Exit on error

echo "========================================="
echo "Starting Nakama on Railway"
echo "========================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set!"
    exit 1
fi

echo "✓ Database URL configured: ${DATABASE_URL%%@*}@***"

# Debug: Check if config file exists
echo ""
echo "Checking configuration files..."
if [ -f "/nakama/data/local.yml" ]; then
    echo "✓ Found /nakama/data/local.yml"
    ls -lh /nakama/data/local.yml
else
    echo "✗ ERROR: /nakama/data/local.yml not found!"
    echo "Files in /nakama/data/:"
    ls -la /nakama/data/ || echo "Directory does not exist!"
    exit 1
fi

# Check if game logic exists
if [ -d "/nakama/data/modules/build" ]; then
    echo "✓ Found game logic in /nakama/data/modules/build"
    ls -lh /nakama/data/modules/build/
else
    echo "✗ WARNING: Game logic not found in /nakama/data/modules/build"
fi

# Wait for database to be ready
echo ""
echo "Waiting for database to be ready..."
sleep 5

# Run migrations
echo ""
echo "Running database migrations..."
/nakama/nakama migrate up --database.address "$DATABASE_URL"

# Check if migrations succeeded
if [ $? -ne 0 ]; then
    echo "✗ ERROR: Database migrations failed!"
    exit 1
fi

echo "✓ Database migrations completed successfully"

# Start Nakama
echo "========================================="
echo "Starting Nakama server..."
echo "Config: /nakama/data/local.yml"
echo "Database: ${DATABASE_URL%%@*}@***"
echo "========================================="
echo ""

exec /nakama/nakama --config /nakama/data/local.yml --database.address "$DATABASE_URL"
