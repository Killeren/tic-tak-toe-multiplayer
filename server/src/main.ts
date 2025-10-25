// src/main.ts
// Nakama TypeScript Server for Tic-Tac-Toe Multiplayer Game

const InitModule: nkruntime.InitModule = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer) {
    logger.info('=== Tic-Tac-Toe Multiplayer Module Loaded ===');
    
    // Register match handler
    initializer.registerMatch('tictactoe', {
        matchInit,
        matchJoinAttempt,
        matchJoin,
        matchLeave,
        matchLoop,
        matchTerminate,
        matchSignal
    });
    
    // Register RPC functions
    initializer.registerRpc('create_match', createMatchRpc);
    initializer.registerRpc('init_leaderboard', initLeaderboardRpc);
    initializer.registerRpc('get_leaderboard', getLeaderboardRpc);
    
    // Register matchmaker matched hook
    initializer.registerMatchmakerMatched(matchmakerMatched);
    
    // Initialize leaderboard on startup
    try {
        initLeaderboard(nk, logger);
    } catch (error) {
        logger.error('Failed to initialize leaderboard: ' + error);
    }
    
    logger.info('Match handler and RPCs registered successfully');
};

// ==================== INTERFACES AND CONSTANTS ====================

interface TicTacToeState {
    board: (string | null)[];
    currentPlayer: string;
    players: { [userId: string]: { mark: string; username: string; sessionId: string } };
    gameStatus: 'waiting' | 'playing' | 'finished';
    winner: string | null;
    moveCount: number;
    lastMoveTime: number;
    matchId: string;
}

// Op codes for different message types
const OpCode = {
    MOVE: 1,
    STATE_UPDATE: 2,
    GAME_OVER: 3,
    PLAYER_JOINED: 4,
    ERROR: 5,
    CHAT: 6
};

const LEADERBOARD_ID = 'tictactoe_wins';
const MATCH_TIMEOUT_MS = 300000; // 5 minutes

// ==================== MATCH INITIALIZATION ====================

const matchInit: nkruntime.MatchInitFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    params: { [key: string]: string }
): { state: TicTacToeState, tickRate: number, label: string } {
    
    logger.info('Initializing new Tic-Tac-Toe match');
    
    const state: TicTacToeState = {
        board: Array(9).fill(null),
        currentPlayer: '',
        players: {},
        gameStatus: 'waiting',
        winner: null,
        moveCount: 0,
        lastMoveTime: Date.now(),
        matchId: ctx.matchId
    };
    
    const tickRate = 5; // 5 ticks per second
    const label = JSON.stringify({ 
        open: true, 
        gameMode: 'tictactoe',
        players: 0,
        maxPlayers: 2
    });
    
    return { state, tickRate, label };
};

// ==================== JOIN ATTEMPT CONTROL ====================

const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: TicTacToeState,
    presence: nkruntime.Presence,
    metadata: { [key: string]: any }
): { state: TicTacToeState, accept: boolean, rejectMessage?: string } | null {
    
    logger.info('Join attempt from user: ' + presence.userId + ' (' + presence.username + ')');
    
    // Check if match is full (max 2 players)
    const playerCount = Object.keys(state.players).length;
    if (playerCount >= 2) {
        logger.warn('Match is full, rejecting join attempt');
        return {
            state,
            accept: false,
            rejectMessage: 'Match is full'
        };
    }
    
    // Check if player already in match
    if (state.players[presence.userId]) {
        logger.warn('Player already in match, rejecting join attempt');
        return {
            state,
            accept: false,
            rejectMessage: 'Player already in match'
        };
    }
    
    // Check if game already finished
    if (state.gameStatus === 'finished') {
        logger.warn('Game already finished, rejecting join attempt');
        return {
            state,
            accept: false,
            rejectMessage: 'Game already finished'
        };
    }
    
    return { state, accept: true };
};

// ==================== PLAYER JOINING ====================

const matchJoin: nkruntime.MatchJoinFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: TicTacToeState,
    presences: nkruntime.Presence[]
): { state: TicTacToeState } | null {
    
    for (const presence of presences) {
        const playerCount = Object.keys(state.players).length;
        const mark = playerCount === 0 ? 'X' : 'O';
        
        state.players[presence.userId] = {
            mark: mark,
            username: presence.username,
            sessionId: presence.sessionId
        };
        
        logger.info(`Player ${presence.username} joined as ${mark}`);
        
        // Set current player to first joiner (X always goes first)
        if (playerCount === 0) {
            state.currentPlayer = presence.userId;
        }
        
        // Start game if we have 2 players
        if (Object.keys(state.players).length === 2) {
            state.gameStatus = 'playing';
            state.lastMoveTime = Date.now();
            logger.info('Game started with 2 players!');
        }
        
        // Broadcast player joined message
        const message = JSON.stringify({
            type: 'player_joined',
            player: presence.username,
            mark: mark,
            gameStatus: state.gameStatus,
            playerCount: Object.keys(state.players).length
        });
        dispatcher.broadcastMessage(OpCode.PLAYER_JOINED, message);
    }
    
    // Update match label
    const label = JSON.stringify({ 
        open: state.gameStatus !== 'finished' && Object.keys(state.players).length < 2, 
        gameMode: 'tictactoe',
        players: Object.keys(state.players).length,
        maxPlayers: 2
    });
    dispatcher.matchLabelUpdate(label);
    
    // Send current state to all players
    broadcastState(dispatcher, state, logger);
    
    return { state };
};

// ==================== PLAYER LEAVING ====================

const matchLeave: nkruntime.MatchLeaveFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: TicTacToeState,
    presences: nkruntime.Presence[]
): { state: TicTacToeState } | null {
    
    for (const presence of presences) {
        logger.info('Player left: ' + presence.username);
        delete state.players[presence.userId];
    }
    
    // End match if less than 2 players during game
    if (Object.keys(state.players).length < 2 && state.gameStatus === 'playing') {
        state.gameStatus = 'finished';
        
        const message = JSON.stringify({
            type: 'game_ended',
            reason: 'Player disconnected',
            winner: null
        });
        dispatcher.broadcastMessage(OpCode.GAME_OVER, message);
        
        logger.info('Match ending due to player disconnect');
        // Return null to end the match after a delay
        return null;
    }
    
    return { state };
};

// ==================== MAIN GAME LOOP ====================

const matchLoop: nkruntime.MatchLoopFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: TicTacToeState,
    messages: nkruntime.MatchMessage[]
): { state: TicTacToeState } | null {
    
    // Process incoming messages
    for (const message of messages) {
        switch (message.opCode) {
            case OpCode.MOVE:
                state = processMove(message, state, dispatcher, logger, nk);
                break;
            case OpCode.CHAT:
                // Relay chat messages to all players
                dispatcher.broadcastMessage(OpCode.CHAT, message.data);
                break;
            default:
                logger.warn('Unknown opcode: ' + message.opCode);
        }
    }
    
    // Check for timeout (5 minutes of inactivity)
    if (state.gameStatus === 'playing' && Date.now() - state.lastMoveTime > MATCH_TIMEOUT_MS) {
        logger.info('Match timed out due to inactivity');
        
        const message = JSON.stringify({
            type: 'game_ended',
            reason: 'Timeout - no activity for 5 minutes',
            winner: null
        });
        dispatcher.broadcastMessage(OpCode.GAME_OVER, message);
        
        return null; // End match
    }
    
    return { state };
};

// ==================== PROCESS PLAYER MOVES ====================

function processMove(
    message: nkruntime.MatchMessage,
    state: TicTacToeState,
    dispatcher: nkruntime.MatchDispatcher,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama
): TicTacToeState {
    
    if (state.gameStatus !== 'playing') {
        sendError(dispatcher, message.sender, 'Game is not in playing state');
        logger.warn('Move attempted but game is not in playing state');
        return state;
    }
    
    // Validate it's the player's turn
    if (message.sender.userId !== state.currentPlayer) {
        sendError(dispatcher, message.sender, 'Not your turn');
        logger.warn(`Player ${message.sender.username} tried to move out of turn`);
        return state;
    }
    
    try {
        const data = JSON.parse(nk.binaryToString(message.data));
        const position = data.position;
        
        // Validate move position
        if (typeof position !== 'number' || position < 0 || position > 8) {
            sendError(dispatcher, message.sender, 'Invalid position');
            return state;
        }
        
        if (state.board[position] !== null) {
            sendError(dispatcher, message.sender, 'Position already occupied');
            return state;
        }
        
        // Make move
        const playerMark = state.players[message.sender.userId].mark;
        state.board[position] = playerMark;
        state.moveCount++;
        state.lastMoveTime = Date.now();
        
        logger.info(`Player ${message.sender.username} played ${playerMark} at position ${position}`);
        
        // Check for winner
        const winningMark = checkWinner(state.board);
        if (winningMark) {
            state.winner = message.sender.userId;
            state.gameStatus = 'finished';
            
            logger.info(`Player ${message.sender.username} won the game!`);
            
            // Update leaderboard
            updateLeaderboard(nk, logger, message.sender.userId, message.sender.username, true);
            
            // Find and update loser
            const loserId = Object.keys(state.players).find(id => id !== message.sender.userId);
            if (loserId) {
                const loserPlayer = state.players[loserId];
                updateLeaderboard(nk, logger, loserId, loserPlayer.username, false);
            }
            
            const gameOverMessage = JSON.stringify({
                type: 'game_over',
                winner: message.sender.username,
                winnerId: message.sender.userId,
                winnerMark: playerMark,
                board: state.board,
                reason: 'win'
            });
            dispatcher.broadcastMessage(OpCode.GAME_OVER, gameOverMessage);
            
        } else if (state.moveCount === 9) {
            // Draw - board is full
            state.gameStatus = 'finished';
            logger.info('Game ended in a draw');
            
            const gameOverMessage = JSON.stringify({
                type: 'game_over',
                winner: 'draw',
                board: state.board,
                reason: 'draw'
            });
            dispatcher.broadcastMessage(OpCode.GAME_OVER, gameOverMessage);
            
        } else {
            // Switch turn to other player
            const playerIds = Object.keys(state.players);
            state.currentPlayer = playerIds.find(id => id !== state.currentPlayer) || playerIds[0];
            logger.debug(`Turn switched to ${state.players[state.currentPlayer].username}`);
        }
        
        // Broadcast updated state
        broadcastState(dispatcher, state, logger);
        
    } catch (error) {
        logger.error('Error processing move: ' + error);
        sendError(dispatcher, message.sender, 'Invalid move data');
    }
    
    return state;
}

// ==================== GAME LOGIC HELPERS ====================

function checkWinner(board: (string | null)[]): string | null {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    
    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    
    return null;
}

function broadcastState(dispatcher: nkruntime.MatchDispatcher, state: TicTacToeState, logger: nkruntime.Logger) {
    const stateMessage = JSON.stringify({
        board: state.board,
        currentPlayer: state.currentPlayer,
        currentPlayerName: state.players[state.currentPlayer]?.username || '',
        gameStatus: state.gameStatus,
        moveCount: state.moveCount,
        players: state.players
    });
    dispatcher.broadcastMessage(OpCode.STATE_UPDATE, stateMessage);
}

function sendError(dispatcher: nkruntime.MatchDispatcher, presence: nkruntime.Presence, errorMessage: string) {
    const message = JSON.stringify({ 
        type: 'error',
        error: errorMessage 
    });
    dispatcher.broadcastMessage(OpCode.ERROR, message, [presence]);
}

// ==================== LEADERBOARD FUNCTIONS ====================

function initLeaderboard(nk: nkruntime.Nakama, logger: nkruntime.Logger) {
    try {
        const authoritative = true;
        const sortOrder = nkruntime.SortOrder.DESCENDING;
        const operator = nkruntime.Operator.INCREMENT;
        const resetSchedule = null; // No automatic reset
        const metadata = {
            name: 'Tic-Tac-Toe Wins',
            description: 'Total wins in Tic-Tac-Toe multiplayer'
        };
        
        nk.leaderboardCreate(LEADERBOARD_ID, authoritative, sortOrder, operator, resetSchedule, metadata);
        logger.info('Leaderboard created/verified: ' + LEADERBOARD_ID);
    } catch (error) {
        // Leaderboard might already exist, which is fine
        logger.debug('Leaderboard initialization: ' + error);
    }
}

function updateLeaderboard(
    nk: nkruntime.Nakama,
    logger: nkruntime.Logger,
    userId: string,
    username: string,
    won: boolean
) {
    try {
        const score = won ? 1 : 0;
        const subscore = won ? 0 : 1; // Track losses in subscore
        
        nk.leaderboardRecordWrite(LEADERBOARD_ID, userId, username, score, subscore);
        logger.info(`Leaderboard updated for ${username}: ${won ? 'Win' : 'Loss'}`);
    } catch (error) {
        logger.error('Failed to update leaderboard: ' + error);
    }
}

// ==================== MATCH TERMINATION ====================

const matchTerminate: nkruntime.MatchTerminateFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: TicTacToeState,
    graceSeconds: number
): { state: TicTacToeState } | null {
    
    logger.info('Match terminated - ID: ' + ctx.matchId);
    return { state };
};

// ==================== MATCH SIGNAL ====================

const matchSignal: nkruntime.MatchSignalFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: TicTacToeState,
    data: string
): { state: TicTacToeState, data?: string } | null {
    
    logger.info('Match signal received: ' + data);
    
    try {
        const signalData = JSON.parse(data);
        
        if (signalData.action === 'reset') {
            // Reset the game
            state.board = Array(9).fill(null);
            state.moveCount = 0;
            state.winner = null;
            state.gameStatus = 'playing';
            state.lastMoveTime = Date.now();
            
            const playerIds = Object.keys(state.players);
            state.currentPlayer = playerIds[0];
            
            broadcastState(dispatcher, state, logger);
            
            return { state, data: 'Game reset' };
        }
    } catch (error) {
        logger.error('Error processing signal: ' + error);
    }
    
    return { state, data: 'Signal received' };
};

// ==================== RPC FUNCTIONS ====================

const createMatchRpc: nkruntime.RpcFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
): string {
    
    logger.info('Creating new match via RPC');
    
    const matchId = nk.matchCreate('tictactoe', {});
    logger.info('Match created with ID: ' + matchId);
    
    return JSON.stringify({ 
        success: true,
        matchId: matchId 
    });
};

const initLeaderboardRpc: nkruntime.RpcFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
): string {
    
    try {
        initLeaderboard(nk, logger);
        return JSON.stringify({ success: true, message: 'Leaderboard initialized' });
    } catch (error) {
        logger.error('Error initializing leaderboard: ' + error);
        return JSON.stringify({ success: false, error: String(error) });
    }
};

const getLeaderboardRpc: nkruntime.RpcFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
): string {
    
    try {
        const limit = 10;
        const records = nk.leaderboardRecordsList(LEADERBOARD_ID, [], limit, null, 0);
        
        const leaderboard = records.map((record, index) => ({
            rank: index + 1,
            username: record.username,
            userId: record.ownerId,
            wins: record.score,
            losses: record.subscore
        }));
        
        return JSON.stringify({
            success: true,
            leaderboard: leaderboard
        });
    } catch (error) {
        logger.error('Error fetching leaderboard: ' + error);
        return JSON.stringify({ success: false, error: String(error) });
    }
};

// ==================== MATCHMAKER MATCHED HOOK ====================

const matchmakerMatched: nkruntime.MatchmakerMatchedFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    matches: nkruntime.MatchmakerResult[]
): string | null {
    
    logger.info('Matchmaker matched players');
    
    // Create authoritative match for matched players
    const matchId = nk.matchCreate('tictactoe', {});
    
    logger.info('Created match for matched players: ' + matchId);
    
    return matchId;
};
