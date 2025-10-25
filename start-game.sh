#!/bin/bash

# Start Multiplayer Tic-Tac-Toe Game
# This script starts both the server and client

set -e

echo "🎮 Starting Multiplayer Tic-Tac-Toe Game..."
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}✗ Docker is not running${NC}"
    echo "Please start Docker Desktop and try again"
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker is running"

# Check if server is built
if [ ! -f "$SCRIPT_DIR/server/build/index.js" ]; then
    echo -e "${YELLOW}⚠ Server not built. Building now...${NC}"
    cd "$SCRIPT_DIR/server"
    npm run build
    cd "$SCRIPT_DIR"
fi

echo -e "${GREEN}✓${NC} Server is built"

# Start Docker containers
echo ""
echo -e "${BLUE}Starting Nakama server...${NC}"
cd "$SCRIPT_DIR/server"
docker compose up -d

# Wait for Nakama to be ready
echo "Waiting for Nakama to start..."
sleep 5

# Check if Nakama is healthy
RETRIES=12
for i in $(seq 1 $RETRIES); do
    if curl -s -f http://localhost:7350/ > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Nakama server is ready!"
        break
    fi
    
    if [ $i -eq $RETRIES ]; then
        echo -e "${RED}✗ Nakama failed to start${NC}"
        echo "Check logs with: docker compose logs nakama"
        exit 1
    fi
    
    echo "  Waiting... ($i/$RETRIES)"
    sleep 5
done

# Show server status
echo ""
echo -e "${GREEN}Server Status:${NC}"
docker compose ps

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Server is running!${NC}"
echo ""
echo "📍 Nakama Console: ${BLUE}http://localhost:7351${NC}"
echo "   Username: admin"
echo "   Password: password"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Ask if user wants to start client
read -p "Start the web client? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}Starting web client on port 8080...${NC}"
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎮 Game client is running!${NC}"
    echo ""
    echo "📍 Open game: ${BLUE}http://localhost:8080${NC}"
    echo ""
    echo "To play:"
    echo "  1. Open http://localhost:8080 in two browser windows"
    echo "  2. Enter different usernames in each window"
    echo "  3. Click 'Find Match' in both windows"
    echo "  4. Wait for matchmaking (~1-2 seconds)"
    echo "  5. Play Tic-Tac-Toe!"
    echo ""
    echo -e "${RED}Press Ctrl+C to stop the client${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    cd "$SCRIPT_DIR/client/src"
    python3 -m http.server 8080
else
    echo ""
    echo "To start the client manually, run:"
    echo "  cd client/src"
    echo "  python3 -m http.server 8080"
    echo ""
    echo "Then open: http://localhost:8080"
fi
