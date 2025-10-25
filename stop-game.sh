#!/bin/bash

# Stop Multiplayer Tic-Tac-Toe Game Server

echo "🛑 Stopping Multiplayer Tic-Tac-Toe Server..."
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd "$SCRIPT_DIR/server"

# Check if containers are running
if docker compose ps --services --filter "status=running" | grep -q .; then
    echo "Stopping Docker containers..."
    docker compose down
    echo ""
    echo "✓ Server stopped successfully"
else
    echo "⚠ No running containers found"
fi

echo ""
echo "To start again, run: ./start-game.sh"
