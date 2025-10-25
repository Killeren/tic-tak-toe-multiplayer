#!/bin/sh
set -e

echo "==========================================="
echo "🚀 Railway Nakama Wrapper"
echo "==========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set!"
    echo ""
    echo "Available environment variables:"
    env | grep -i database || echo "No DATABASE related variables found"
    echo ""
    echo "Please set DATABASE_URL in Railway dashboard"
    exit 1
fi

echo "✅ DATABASE_URL is set"
echo "Database host: ${DATABASE_URL#*@}"
echo ""

# Railway PostgreSQL URLs might need sslmode parameter
DB_URL="$DATABASE_URL"

# Add sslmode if not present (Railway requires SSL)
case "$DB_URL" in
    *"?sslmode="*) 
        echo "✓ SSL mode already configured"
        ;;
    *"?"*)
        DB_URL="${DB_URL}&sslmode=require"
        echo "✓ Added sslmode=require to existing params"
        ;;
    *)
        DB_URL="${DB_URL}?sslmode=require"
        echo "✓ Added sslmode=require"
        ;;
esac

echo ""
echo "Waiting for database to be ready..."
sleep 3

# Run migrations with retry logic
echo "Running database migrations..."
MAX_RETRIES=3
RETRY=0

while [ $RETRY -lt $MAX_RETRIES ]; do
    if /nakama/nakama-original migrate up --database.address "$DB_URL"; then
        echo "✅ Migrations complete"
        break
    else
        RETRY=$((RETRY + 1))
        if [ $RETRY -lt $MAX_RETRIES ]; then
            echo "⚠️  Migration failed, retrying in 5 seconds... (attempt $RETRY/$MAX_RETRIES)"
            sleep 5
        else
            echo "❌ ERROR: Database migrations failed after $MAX_RETRIES attempts"
            exit 1
        fi
    fi
done

echo ""
echo "==========================================="
echo "Starting Nakama server..."
echo "Config: /nakama/data/local.yml"
echo "Database: ${DB_URL%%@*}@***"
echo "==========================================="
echo ""

# Start Nakama with the Railway database
exec /nakama/nakama-original --config /nakama/data/local.yml --database.address "$DB_URL"
