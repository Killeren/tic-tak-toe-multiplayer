# 🎮 Tic-Tac-Toe Multiplayer Game

A real-time multiplayer Tic-Tac-Toe game built with **Nakama** game server and vanilla JavaScript.

![Status](https://img.shields.io/badge/status-production--ready-brightgreen)
![Platform](https://img.shields.io/badge/platform-web-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- ⚡ **Real-time Multiplayer** - WebSocket-based instant gameplay
- 🎯 **Automatic Matchmaking** - Find opponents in seconds
- 🏆 **Leaderboard System** - Track wins, losses, and rankings
- 🎨 **Modern UI** - Responsive design with smooth animations
- 🔒 **Authoritative Server** - Server-side validation prevents cheating
- 📊 **Persistent Stats** - Player statistics saved in database
- 🌐 **Cross-platform** - Works on desktop and mobile browsers

## 🚀 Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running
- Python 3 (for local web server)

### Run Locally

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd tic-tak-toe-lilagames
```

2. **Start the game servers**
```bash
./start-game.sh
```

This will start:
- Nakama game server (ports 7349-7351)
- PostgreSQL database (port 5432)
- Web client (http://localhost:8080)

3. **Open in browser**
   - Open http://localhost:8080 in two browser windows/tabs
   - Enter usernames and click "Find Match"
   - Start playing!

4. **Stop servers**
```bash
./stop-game.sh
```

### Reset Database (Optional)
```bash
./clear-test-data.sh
```

## 🎮 How to Play

1. **Join:** Enter your username and click "Find Match"
2. **Wait:** Matchmaking will find you an opponent (~5-10 seconds)
3. **Play:** Click cells to place your mark (X or O)
4. **Win:** Get 3 in a row horizontally, vertically, or diagonally
5. **Rematch:** Click "New Game" to find another opponent

## 🏗️ Architecture

### Tech Stack

**Backend:**
- [Nakama](https://heroiclabs.com/) - Open-source game server
- PostgreSQL - Database for user data and leaderboards
- Docker - Containerization

**Frontend:**
- Vanilla JavaScript (ES6 modules)
- HTML5 + CSS3
- WebSocket for real-time communication

### Project Structure

```
tic-tak-toe-lilagames/
├── server/
│   ├── docker-compose.yml      # Docker services configuration
│   ├── local.yml               # Nakama server configuration
│   └── build/
│       └── index.js            # Game server logic (391 lines)
├── client/
│   └── src/
│       ├── index.html          # Main HTML page
│       ├── game.js             # Client game logic (715 lines)
│       ├── styles.css          # Styles and animations
│       └── nakama-js.mjs       # Nakama JavaScript SDK
├── start-game.sh               # Start all services
├── stop-game.sh                # Stop all services
├── clear-test-data.sh          # Reset database
├── README.md                   # This file
└── DEPLOYMENT.md               # Cloud deployment guide
```

## 🔧 Configuration

### Server Ports

- **7349** - Nakama gRPC API
- **7350** - Nakama HTTP API & WebSocket
- **7351** - Nakama Admin Console
- **5432** - PostgreSQL
- **8080** - Client web server

### Admin Console

Access Nakama admin console at: http://localhost:7351

- **Username:** admin
- **Password:** password

## 📊 Game Rules

- Two players: X (first player) and O (second player)
- Players take turns placing marks
- First to get 3 marks in a row wins
- If all 9 cells are filled with no winner, it's a draw
- Winner gets +1 point on leaderboard

## 🐛 Troubleshooting

### Servers won't start
```bash
# Check if Docker is running
docker ps

# Restart Docker Desktop, then try again
./start-game.sh
```

### Can't connect to game
```bash
# Check if services are running
docker ps

# View server logs
docker logs nakama --tail 50

# Restart services
./stop-game.sh
./start-game.sh
```

### Players not matching
- Both players must click "Find Match" within ~10 seconds
- Wait for "Match found!" message
- Check browser console for errors (F12)

### Clear stuck matches
```bash
./clear-test-data.sh
```

## 🚀 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed guides on deploying to:
- Railway (recommended - easiest)
- Fly.io
- AWS
- Google Cloud
- DigitalOcean

**Estimated cost:** $5-20/month depending on platform

## 🔐 Security Notes

For production deployment:

1. Change default server key in `server/local.yml`
2. Update admin console password
3. Use environment variables for secrets
4. Enable SSL/HTTPS
5. Set up firewall rules
6. Enable rate limiting

## 📈 Future Enhancements

Potential features to add:
- 🔊 Sound effects
- 💬 In-game chat
- 🤖 AI opponent for single-player
- 🏆 Tournament mode
- 📱 Native mobile apps
- 🎨 Custom themes
- 📊 Detailed game statistics
- 🎥 Game replay system

## 🧪 Development

### Run in Development Mode

```bash
# Start services
./start-game.sh

# View live logs
docker logs -f nakama

# Make changes to code
# Client: Edit files in client/src/
# Server: Edit server/build/index.js, then restart:
docker restart nakama
```

### Code Statistics

- **Total Lines:** ~1,800 lines of production code
- **Server:** 391 lines (JavaScript)
- **Client:** 715 lines (JavaScript)
- **Styles:** 595 lines (CSS)
- **HTML:** 98 lines

## 📝 API Documentation

### Server-Client Communication (OpCodes)

```javascript
OpCode 1: MOVE           // Player makes a move
OpCode 2: STATE_UPDATE   // Board state changed
OpCode 3: GAME_OVER      // Game ended (win/draw)
OpCode 4: PLAYER_JOINED  // Player joined match
OpCode 5: ERROR          // Error message
OpCode 6: CHAT           // Chat message (reserved)
```

### Game State Structure

```javascript
{
  board: [null, null, 'X', null, 'O', ...],  // 9 cells
  currentPlayer: 'user-id',                   // Whose turn
  gameStatus: 'waiting' | 'active' | 'finished',
  players: { 'user-id': { username, symbol } },
  winner: 'user-id' | null
}
```

## 🤝 Contributing

Contributions welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

## 📄 License

MIT License - feel free to use this project for learning or building your own games!

## 👨‍💻 Author

Built with ❤️ using Nakama Game Server

## 🔗 Resources

- [Nakama Documentation](https://heroiclabs.com/docs/)
- [Nakama JavaScript SDK](https://github.com/heroiclabs/nakama-js)
- [Docker Documentation](https://docs.docker.com/)

## 📞 Support

Having issues? Check:
1. Docker is running
2. Ports 7350 and 8080 are available
3. Browser console for errors (F12)
4. Server logs: `docker logs nakama --tail 50`

---

**Status:** ✅ Fully functional and production-ready!

Enjoy your multiplayer Tic-Tac-Toe game! 🎮✨
