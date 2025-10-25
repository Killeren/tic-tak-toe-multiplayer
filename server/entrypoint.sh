#!/bin/sh
set -e

echo "========================================="
echo "Railway Nakama Entrypoint"
echo "========================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set!"
    echo "Please add DATABASE_URL variable in Railway dashboard"
    exit 1
fi

echo "✓ DATABASE_URL is set"
echo "Database: ${DATABASE_URL%%@*}@***"

# Run migrations
echo "Running database migrations..."
/nakama/nakama migrate up --database.address "$DATABASE_URL"

echo "✓ Migrations complete"
echo ""
echo "Starting Nakama server..."
echo "========================================="

# Start Nakama with the Railway database
exec /nakama/nakama --config /nakama/data/local.yml --database.address "$DATABASE_URL"
