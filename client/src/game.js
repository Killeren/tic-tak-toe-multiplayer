// game.js - Nakama Client Implementation for Tic-Tac-Toe

// Import Nakama SDK
import * as nakamajs from './nakama-js.mjs';

// ==================== CONFIGURATION ====================
// Auto-detect environment (local vs production)
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// Railway production domain
const CONFIG = {
    serverUrl: isProduction ? 'nakama-server-production-f101.up.railway.app' : 'localhost',
    serverPort: isProduction ? '' : '7350', // Empty string for Railway (uses default HTTPS port)
    serverKey: 'defaultkey',
    useSSL: isProduction
};

console.log('Environment:', isProduction ? 'Production (Railway)' : 'Local Development');
console.log('Connecting to:', CONFIG.serverUrl + ':' + CONFIG.serverPort, 'SSL:', CONFIG.useSSL);

// ==================== GLOBAL STATE ====================
let client;
let socket;
let session;
let currentMatch;
let myUserId;
let myMark;
let myUsername;
let isMyTurn = false;

// ==================== DOM ELEMENTS ====================
const loginScreen = document.getElementById('loginScreen');
const searchingScreen = document.getElementById('searchingScreen');
const gameScreen = document.getElementById('gameScreen');
const usernameInput = document.getElementById('usernameInput');
const findMatchBtn = document.getElementById('findMatchBtn');
const cancelSearchBtn = document.getElementById('cancelSearchBtn');
const boardElement = document.getElementById('board');
const cells = document.querySelectorAll('.cell');
const playerMarkSpan = document.getElementById('playerMark');
const opponentMarkSpan = document.getElementById('opponentMark');
const playerNameSpan = document.getElementById('playerName');
const opponentNameSpan = document.getElementById('opponentName');
const turnIndicator = document.getElementById('turnIndicator');
const newGameBtn = document.getElementById('newGameBtn');
const quitBtn = document.getElementById('quitBtn');
const leaderboardList = document.getElementById('leaderboardList');
const refreshLeaderboardBtn = document.getElementById('refreshLeaderboardBtn');
const connectionStatus = document.getElementById('connectionStatus');

// ==================== INITIALIZATION ====================

function initNakama() {
    console.log('Initializing Nakama client with config:', CONFIG);
    console.log('Nakama SDK imported:', nakamajs);
    
    client = new nakamajs.Client(CONFIG.serverKey, CONFIG.serverUrl, CONFIG.serverPort, CONFIG.useSSL);
    console.log('Nakama client initialized:', client);
}

// ==================== AUTHENTICATION ====================

async function authenticate(username) {
    try {
        showToast('Connecting to server...', 'info');
        
        // Generate a new device ID each time to allow username changes
        const deviceId = generateUUID();
        console.log('Authenticating with deviceId:', deviceId, 'username:', username);
        
        // Try authentication with original username
        try {
            session = await client.authenticateDevice(deviceId, true, username);
            myUserId = session.user_id;
            myUsername = username;
        } catch (authError) {
            // If username conflict (409), try with a random suffix
            if (authError.status === 409) {
                const uniqueUsername = username + '_' + Math.floor(Math.random() * 10000);
                console.log('Username conflict, trying with:', uniqueUsername);
                showToast('Username taken, using: ' + uniqueUsername, 'info');
                session = await client.authenticateDevice(deviceId, true, uniqueUsername);
                myUserId = session.user_id;
                myUsername = uniqueUsername;
            } else {
                throw authError;
            }
        }
        
        console.log('Authenticated successfully:', session);
        console.log('Playing as:', myUsername);
        updateConnectionStatus(true);
        showToast('Connected as ' + myUsername, 'success');
        return true;
    } catch (error) {
        console.error('Authentication error:', error);
        console.error('Error details:', error.message, error.stack);
        showToast('Failed to connect to server: ' + (error.message || 'Unknown error'), 'error');
        updateConnectionStatus(false);
        return false;
    }
}

function getOrCreateDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = generateUUID();
        localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function updateConnectionStatus(connected) {
    if (connected) {
        connectionStatus.classList.add('connected');
        connectionStatus.querySelector('.text').textContent = 'Connected';
    } else {
        connectionStatus.classList.remove('connected');
        connectionStatus.querySelector('.text').textContent = 'Not connected';
    }
}

// ==================== SOCKET CONNECTION ====================

async function connectSocket() {
    try {
        console.log('Creating socket connection...');
        
        // Close existing socket if any
        if (socket) {
            try {
                socket.disconnect();
            } catch (e) {
                console.log('Error closing old socket:', e);
            }
        }
        
        socket = client.createSocket(CONFIG.useSSL, true); // verbose = true for debugging
        console.log('Socket created:', socket);
        
        // Set up socket event handlers BEFORE connecting
        socket.onmatchdata = (matchData) => {
            console.log('Received match data:', matchData);
            handleMatchData(matchData);
        };
        
        socket.onmatchpresence = (matchPresence) => {
            console.log('Match presence update:', matchPresence);
            handleMatchPresence(matchPresence);
        };
        
        socket.ondisconnect = (event) => {
            console.log('Socket disconnected:', event);
            updateConnectionStatus(false);
            if (currentMatch) {
                showToast('Connection lost. Please rejoin.', 'error');
            }
        };
        
        socket.onerror = (error) => {
            console.error('Socket error:', error);
            showToast('Connection error: ' + (error.message || 'Unknown error'), 'error');
        };
        
        socket.onnotification = (notification) => {
            console.log('Notification:', notification);
        };
        
        console.log('Connecting socket with session...');
        await socket.connect(session, true); // appear online
        console.log('Socket connected successfully!');
        updateConnectionStatus(true);
        return true;
    } catch (error) {
        console.error('Socket connection error:', error);
        console.error('Error details:', error.message, error.stack);
        showToast('Failed to establish connection: ' + (error.message || 'Unknown error'), 'error');
        updateConnectionStatus(false);
        return false;
    }
}

// ==================== MATCHMAKING ====================

async function startMatchmaking() {
    try {
        // Leave any existing match first
        if (socket && currentMatch) {
            try {
                await socket.leaveMatch(currentMatch.match_id);
                console.log('Left previous match before starting new matchmaking');
                currentMatch = null;
            } catch (error) {
                console.log('No previous match to leave or already left');
            }
        }
        
        showScreen(searchingScreen);
        showToast('Searching for opponent...', 'info');
        
        // Add to matchmaker with specific criteria
        const minPlayers = 2;
        const maxPlayers = 2;
        const query = '*'; // Match with anyone
        const stringProperties = {};
        const numericProperties = {};
        
        console.log('Adding to matchmaker...');
        const ticket = await socket.addMatchmaker(query, minPlayers, maxPlayers, stringProperties, numericProperties);
        console.log('Matchmaking ticket:', ticket);
        
        // Handle when match is found
        socket.onmatchmakermatched = async (matched) => {
            console.log('🎮 MATCHMAKER MATCHED!');
            console.log('Match found:', matched);
            console.log('Match ID:', matched.match_id);
            console.log('Token:', matched.token);
            console.log('Match details:', JSON.stringify(matched, null, 2));
            showToast('Match found! Joining game...', 'success');
            
            try {
                // Small delay to ensure server is ready
                console.log('⏳ Waiting 100ms before joining...');
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Join the match
                console.log('🚀 Attempting to join match:', matched.match_id);
                const match = await socket.joinMatch(matched.match_id);
                
                console.log('📥 Join match response:', match);
                
                if (!match) {
                    throw new Error('Join match returned null');
                }
                
                currentMatch = match;
                console.log('✅ Successfully joined match:', JSON.stringify(match, null, 2));
                console.log('🎯 Calling setupGame...');
                
                setupGame(match);
            } catch (error) {
                console.error('❌ Error joining match:', error);
                console.error('Error details:', error.message, error.stack);
                showToast('Failed to join match: ' + error.message, 'error');
                
                // Return to login screen on error
                setTimeout(() => {
                    showScreen(loginScreen);
                }, 2000);
            }
        };
    } catch (error) {
        console.error('Matchmaking error:', error);
        showToast('Matchmaking failed: ' + error.message, 'error');
        showScreen(loginScreen);
    }
}

function cancelMatchmaking() {
    // Note: Nakama doesn't have a direct cancel matchmaker API
    // We just return to login screen
    showScreen(loginScreen);
    showToast('Matchmaking cancelled', 'info');
}

// ==================== GAME SETUP ====================

function setupGame(match) {
    console.log('🎮 SETUP GAME CALLED');
    console.log('Setting up game with match:', match);
    console.log('Match self:', match.self);
    console.log('Match presences:', match.presences);
    
    console.log('📺 Switching to game screen...');
    showScreen(gameScreen);
    console.log('✅ Game screen shown');
    
    // Build full list of presences including self
    let allPresences = [];
    
    // Add existing presences
    if (match.presences && match.presences.length > 0) {
        allPresences = [...match.presences];
    }
    
    // Add self if not already in presences
    if (match.self) {
        const selfInPresences = allPresences.find(p => p.user_id === match.self.user_id);
        if (!selfInPresences) {
            allPresences.push(match.self);
        }
    }
    
    console.log('All presences (including self):', allPresences);
    
    if (allPresences.length === 0) {
        console.error('No presences found in match!');
        showToast('Error: Could not determine players', 'error');
        showScreen(loginScreen);
        return;
    }
    
    // Find my presence and opponent
    const myPresence = allPresences.find(p => p.user_id === myUserId);
    const opponentPresence = allPresences.find(p => p.user_id !== myUserId);
    
    if (!myPresence) {
        console.error('My presence not found! My userId:', myUserId);
        showToast('Error: Could not join match', 'error');
        showScreen(loginScreen);
        return;
    }
    
    // Determine marks - need to handle case where only one player has joined
    let myMark, opponentMark;
    
    if (allPresences.length >= 2) {
        // Both players present - use join order
        myMark = allPresences[0].user_id === myUserId ? 'X' : 'O';
        opponentMark = myMark === 'X' ? 'O' : 'X';
    } else {
        // Only one player (me) - wait for opponent
        // First player is always X
        myMark = 'X';
        opponentMark = 'O';
        console.log('Waiting for second player to join...');
    }
    
    // Update UI
    playerMarkSpan.textContent = myMark;
    playerNameSpan.textContent = myUsername;
    opponentMarkSpan.textContent = opponentMark;
    opponentNameSpan.textContent = opponentPresence ? opponentPresence.username : 'Waiting for opponent...';
    
    resetBoard();
    updateTurnIndicator({ currentPlayer: '', gameStatus: 'waiting' });
    
    // Load leaderboard
    loadLeaderboard();
    
    console.log('Game setup complete. My mark:', myMark, 'Opponent:', opponentPresence?.username || 'pending');
}

// ==================== MATCH DATA HANDLING ====================

function handleMatchData(matchData) {
    const opCode = matchData.op_code;
    const data = JSON.parse(new TextDecoder().decode(matchData.data));
    
    console.log('Received match data:', opCode, data);
    
    switch(opCode) {
        case 1: // MOVE
            break;
        case 2: // STATE_UPDATE
            updateBoard(data);
            break;
        case 3: // GAME_OVER
            handleGameOver(data);
            break;
        case 4: // PLAYER_JOINED
            handlePlayerJoined(data);
            break;
        case 5: // ERROR
            showToast(data.error, 'error');
            break;
        case 6: // CHAT
            handleChat(data);
            break;
    }
}

function handleMatchPresence(matchPresence) {
    console.log('Match presence update:', matchPresence);
    
    // Handle players joining
    if (matchPresence.joins && matchPresence.joins.length > 0) {
        for (const join of matchPresence.joins) {
            console.log('Player joined:', join);
            if (join.user_id !== myUserId) {
                // Opponent joined
                opponentNameSpan.textContent = join.username;
                showToast(`${join.username} joined the game!`, 'success');
                
                // Update mark if we were first player
                if (!myMark || myMark === 'X') {
                    // We're X (first player), opponent is O
                    opponentMarkSpan.textContent = 'O';
                }
            }
        }
    }
    
    // Handle players leaving
    if (matchPresence.leaves && matchPresence.leaves.length > 0) {
        for (const leave of matchPresence.leaves) {
            console.log('Player left:', leave);
            if (leave.user_id !== myUserId) {
                showToast('Opponent disconnected', 'warning');
                setTimeout(() => {
                    quitGame();
                }, 2000);
            }
        }
    }
}

function handlePlayerJoined(data) {
    console.log('Player joined:', data);
    
    if (data.player && data.player !== myUsername) {
        opponentNameSpan.textContent = data.player;
        showToast(`${data.player} joined the game!`, 'success');
    }
    
    if (data.gameStatus === 'active') {
        showToast('Game started!', 'success');
    }
}

function handleChat(data) {
    // Could implement chat functionality here
    console.log('Chat message:', data);
}

// ==================== GAME ACTIONS ====================

function sendMove(position) {
    if (!isMyTurn) {
        showToast("It's not your turn!", 'warning');
        return;
    }
    
    const data = JSON.stringify({ position });
    const encoder = new TextEncoder();
    
    try {
        socket.sendMatchState(currentMatch.match_id, 1, encoder.encode(data));
        console.log('Sent move:', position);
    } catch (error) {
        console.error('Error sending move:', error);
        showToast('Failed to send move', 'error');
    }
}

// ==================== UI UPDATES ====================

function updateBoard(state) {
    console.log('Updating board:', state);
    
    state.board.forEach((mark, index) => {
        const cell = cells[index];
        if (cell.textContent !== (mark || '')) {
            cell.textContent = mark || '';
            cell.classList.remove('x', 'o');
            if (mark === 'X') {
                cell.classList.add('x');
            } else if (mark === 'O') {
                cell.classList.add('o');
            }
        }
    });
    
    updateTurnIndicator(state);
    
    // Enable/disable cells based on game state
    const canInteract = state.gameStatus === 'active' && state.currentPlayer === myUserId;
    cells.forEach(cell => {
        if (cell.textContent === '') {
            cell.classList.toggle('disabled', !canInteract);
        } else {
            cell.classList.add('disabled');
        }
    });
}

function updateTurnIndicator(state) {
    if (!state || state.gameStatus === 'waiting') {
        turnIndicator.querySelector('span').textContent = 'Waiting for game to start...';
        turnIndicator.classList.remove('my-turn', 'opponent-turn');
        isMyTurn = false;
        return;
    }
    
    isMyTurn = state.currentPlayer === myUserId;
    
    const indicatorSpan = turnIndicator.querySelector('span');
    turnIndicator.classList.remove('my-turn', 'opponent-turn');
    
    if (state.gameStatus === 'active') {
        if (isMyTurn) {
            indicatorSpan.textContent = 'Your turn! Make your move';
            turnIndicator.classList.add('my-turn');
        } else {
            indicatorSpan.textContent = "Opponent's turn...";
            turnIndicator.classList.add('opponent-turn');
        }
    }
}

function handleGameOver(data) {
    console.log('Game over data received:', data);
    console.log('My userId:', myUserId);
    console.log('Winner userId:', data.winner);
    
    cells.forEach(cell => cell.classList.add('disabled'));
    isMyTurn = false;
    
    const indicatorSpan = turnIndicator.querySelector('span');
    turnIndicator.classList.remove('my-turn', 'opponent-turn');
    
    // Check if it's a draw (winner is null or reason is 'draw')
    if (!data.winner || data.reason === 'draw') {
        indicatorSpan.textContent = "It's a draw! 🤝";
        showToast("Game ended in a draw", 'info');
    } else {
        // Check if the winner is me (compare userIds)
        const won = data.winner === myUserId;
        console.log('Did I win?', won);
        
        if (won) {
            indicatorSpan.textContent = 'You won! 🎉';
            turnIndicator.classList.add('my-turn');
            showToast('Congratulations! You won!', 'success');
        } else {
            indicatorSpan.textContent = 'You lost 😔';
            turnIndicator.classList.add('opponent-turn');
            
            // Get opponent name for the message
            const opponentName = opponentNameSpan.textContent;
            showToast(`${opponentName} won the game`, 'error');
        }
    }
    
    newGameBtn.classList.remove('hidden');
    
    // Reload leaderboard after game
    setTimeout(() => {
        loadLeaderboard();
    }, 1000);
}

function resetBoard() {
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('x', 'o', 'disabled', 'winning');
    });
    newGameBtn.classList.add('hidden');
}

// ==================== LEADERBOARD ====================

async function loadLeaderboard() {
    try {
        if (!client || !session) {
            console.log('Cannot load leaderboard - not connected yet');
            leaderboardList.innerHTML = '<li class="loading">Connect to see leaderboard</li>';
            return;
        }
        
        leaderboardList.innerHTML = '<li class="loading">Loading leaderboard...</li>';
        
        const limit = 10;
        const records = await client.listLeaderboardRecords(session, 'tictactoe_wins', [], limit);
        
        displayLeaderboard(records.records);
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        leaderboardList.innerHTML = '<li class="loading">Failed to load leaderboard</li>';
    }
}

function displayLeaderboard(records) {
    leaderboardList.innerHTML = '';
    
    if (!records || records.length === 0) {
        leaderboardList.innerHTML = '<li class="loading">No players yet. Be the first!</li>';
        return;
    }
    
    records.forEach((record, index) => {
        const li = document.createElement('li');
        
        const leftDiv = document.createElement('div');
        leftDiv.innerHTML = `<span class="rank">#${index + 1}</span> ${record.username || 'Anonymous'}`;
        
        const rightDiv = document.createElement('div');
        rightDiv.className = 'stats';
        const wins = record.score || 0;
        const losses = record.subscore || 0;
        const total = wins + losses;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
        rightDiv.textContent = `${wins}W ${losses}L (${winRate}%)`;
        
        li.appendChild(leftDiv);
        li.appendChild(rightDiv);
        leaderboardList.appendChild(li);
    });
}

// ==================== SCREEN MANAGEMENT ====================

function showScreen(screen) {
    [loginScreen, searchingScreen, gameScreen].forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
}

// ==================== TOAST NOTIFICATIONS ====================

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// ==================== GAME CONTROL ====================

async function startNewGame() {
    if (socket && currentMatch) {
        try {
            await socket.leaveMatch(currentMatch.match_id);
            console.log('Left previous match');
        } catch (error) {
            console.error('Error leaving match:', error);
        }
    }
    
    newGameBtn.classList.add('hidden');
    await startMatchmaking();
}

function quitGame() {
    if (socket && currentMatch) {
        socket.leaveMatch(currentMatch.match_id).catch(console.error);
    }
    
    showScreen(loginScreen);
    showToast('Left the game', 'info');
}

// ==================== EVENT LISTENERS ====================

findMatchBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    if (!username) {
        showToast('Please enter a username', 'warning');
        usernameInput.focus();
        return;
    }
    
    findMatchBtn.disabled = true;
    findMatchBtn.textContent = 'Connecting...';
    
    if (!client) {
        initNakama();
    }
    
    const authenticated = await authenticate(username);
    if (authenticated) {
        const connected = await connectSocket();
        if (connected) {
            await startMatchmaking();
        }
    }
    
    findMatchBtn.disabled = false;
    findMatchBtn.textContent = 'Find Match';
});

cancelSearchBtn.addEventListener('click', () => {
    cancelMatchmaking();
});

cells.forEach(cell => {
    cell.addEventListener('click', () => {
        if (cell.classList.contains('disabled') || cell.textContent) {
            return;
        }
        
        const index = parseInt(cell.dataset.index);
        sendMove(index);
    });
});

newGameBtn.addEventListener('click', () => {
    startNewGame();
});

quitBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to quit?')) {
        quitGame();
    }
});

refreshLeaderboardBtn.addEventListener('click', () => {
    loadLeaderboard();
});

// Handle Enter key in username input
usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        findMatchBtn.click();
    }
});

// ==================== INITIALIZATION ====================

window.addEventListener('load', () => {
    console.log('=== Tic-Tac-Toe Multiplayer Client Loaded ===');
    initNakama();
    
    // Set focus to username input
    usernameInput.focus();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (socket && currentMatch) {
        socket.leaveMatch(currentMatch.match_id);
    }
});

console.log('Game client initialized successfully');
