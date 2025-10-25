// Nakama JavaScript Server for Tic-Tac-Toe Multiplayer Game

// Op codes for different message types
var OpCode = {
    MOVE: 1,
    STATE_UPDATE: 2,
    GAME_OVER: 3,
    PLAYER_JOINED: 4,
    ERROR: 5,
    CHAT: 6
};

var LEADERBOARD_ID = 'tictactoe_wins';
var MATCH_TIMEOUT_MS = 300000; // 5 minutes

// ==================== MAIN INIT MODULE ====================
function InitModule(ctx, logger, nk, initializer) {
    logger.info('=== Tic-Tac-Toe Multiplayer Module Loaded ===');
    
    // Register match handler
    initializer.registerMatch('tictactoe', {
        matchInit: matchInit,
        matchJoinAttempt: matchJoinAttempt,
        matchJoin: matchJoin,
        matchLeave: matchLeave,
        matchLoop: matchLoop,
        matchTerminate: matchTerminate,
        matchSignal: matchSignal
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
}

// ==================== MATCH INITIALIZATION ====================
function matchInit(ctx, logger, nk, params) {
    logger.info('Initializing new Tic-Tac-Toe match');
    
    var state = {
        board: [null, null, null, null, null, null, null, null, null],
        currentPlayer: '',
        players: {},
        gameStatus: 'waiting',
        winner: null,
        moveCount: 0,
        lastActivityTime: Date.now()
    };
    
    var tickRate = 1; // 1 tick per second
    var label = {matchmaking: true};
    
    return {
        state: state,
        tickRate: tickRate,
        label: JSON.stringify(label)
    };
}

// ==================== MATCH JOIN ATTEMPT ====================
function matchJoinAttempt(ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
    var playerCount = Object.keys(state.players).length;
    
    if (playerCount >= 2) {
        return {
            state: state,
            accept: false,
            rejectMessage: 'Match is full'
        };
    }
    
    return {
        state: state,
        accept: true
    };
}

// ==================== MATCH JOIN ====================
function matchJoin(ctx, logger, nk, dispatcher, tick, state, presences) {
    presences.forEach(function(presence) {
        if (!state.players[presence.userId]) {
            var symbol = Object.keys(state.players).length === 0 ? 'X' : 'O';
            state.players[presence.userId] = {
                symbol: symbol,
                username: presence.username,
                sessionId: presence.sessionId
            };
            
            logger.info('Player joined: ' + presence.username + ' as ' + symbol);
            
            // Notify player joined
            var joinMessage = {
                opCode: OpCode.PLAYER_JOINED,
                data: {
                    userId: presence.userId,
                    username: presence.username,
                    symbol: symbol,
                    playerCount: Object.keys(state.players).length
                }
            };
            dispatcher.broadcastMessage(OpCode.PLAYER_JOINED, JSON.stringify(joinMessage.data));
            
            // If two players, start the game
            if (Object.keys(state.players).length === 2) {
                state.gameStatus = 'active';
                var playerIds = Object.keys(state.players);
                state.currentPlayer = playerIds[0]; // X goes first
                
                var stateUpdate = {
                    board: state.board,
                    currentPlayer: state.currentPlayer,
                    gameStatus: state.gameStatus,
                    players: state.players
                };
                dispatcher.broadcastMessage(OpCode.STATE_UPDATE, JSON.stringify(stateUpdate));
                logger.info('Game started with 2 players');
            }
        }
    });
    
    state.lastActivityTime = Date.now();
    return {state: state};
}

// ==================== MATCH LEAVE ====================
function matchLeave(ctx, logger, nk, dispatcher, tick, state, presences) {
    presences.forEach(function(presence) {
        if (state.players[presence.userId]) {
            delete state.players[presence.userId];
            logger.info('Player left: ' + presence.username);
            
            // If game was active, end it
            if (state.gameStatus === 'active') {
                state.gameStatus = 'finished';
                var remainingPlayers = Object.keys(state.players);
                if (remainingPlayers.length > 0) {
                    state.winner = remainingPlayers[0];
                    // Update leaderboard for the winner
                    try {
                        nk.leaderboardRecordWrite(LEADERBOARD_ID, state.winner, '', 1, 0, null, null);
                    } catch (error) {
                        logger.error('Failed to update leaderboard: ' + error);
                    }
                }
                
                var gameOverMessage = {
                    winner: state.winner,
                    reason: 'opponent_left',
                    finalBoard: state.board
                };
                dispatcher.broadcastMessage(OpCode.GAME_OVER, JSON.stringify(gameOverMessage));
            }
        }
    });
    
    return {state: state};
}

// ==================== MATCH LOOP ====================
function matchLoop(ctx, logger, nk, dispatcher, tick, state, messages) {
    // Check for timeout
    var timeSinceLastActivity = Date.now() - state.lastActivityTime;
    if (timeSinceLastActivity > MATCH_TIMEOUT_MS && state.gameStatus === 'active') {
        logger.info('Match timed out due to inactivity');
        state.gameStatus = 'finished';
        var timeoutMessage = {
            winner: null,
            reason: 'timeout',
            finalBoard: state.board
        };
        dispatcher.broadcastMessage(OpCode.GAME_OVER, JSON.stringify(timeoutMessage));
        return null; // End match
    }
    
    // Process messages
    messages.forEach(function(message) {
        if (message.opCode === OpCode.MOVE) {
            try {
                var moveData = JSON.parse(nk.binaryToString(message.data));
                var result = processMove(state, message.sender, moveData, logger, nk);
                
                if (result.valid) {
                    state = result.state;
                    state.lastActivityTime = Date.now();
                    
                    // Broadcast state update
                    var stateUpdate = {
                        board: state.board,
                        currentPlayer: state.currentPlayer,
                        gameStatus: state.gameStatus,
                        players: state.players,
                        lastMove: moveData.position
                    };
                    dispatcher.broadcastMessage(OpCode.STATE_UPDATE, JSON.stringify(stateUpdate));
                    
                    // Check for game over
                    if (state.gameStatus === 'finished') {
                        var gameOverMessage = {
                            winner: state.winner,
                            reason: state.winner ? 'win' : 'draw',
                            finalBoard: state.board
                        };
                        dispatcher.broadcastMessage(OpCode.GAME_OVER, JSON.stringify(gameOverMessage));
                        
                        // Update leaderboard
                        if (state.winner) {
                            try {
                                nk.leaderboardRecordWrite(LEADERBOARD_ID, state.winner, '', 1, 0, null, null);
                            } catch (error) {
                                logger.error('Failed to update leaderboard: ' + error);
                            }
                        }
                    }
                } else {
                    // Send error to player
                    var errorMessage = {
                        error: result.error
                    };
                    dispatcher.broadcastMessage(OpCode.ERROR, JSON.stringify(errorMessage), [message.sender]);
                }
            } catch (error) {
                logger.error('Error processing move: ' + error);
            }
        }
    });
    
    // End match if game is finished and has been for a while
    if (state.gameStatus === 'finished' && tick % 60 === 0) {
        return null;
    }
    
    return {state: state};
}

// ==================== MATCH TERMINATE ====================
function matchTerminate(ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
    logger.info('Match terminating');
    return {state: state};
}

// ==================== MATCH SIGNAL ====================
function matchSignal(ctx, logger, nk, dispatcher, tick, state, data) {
    logger.info('Match signal received: ' + data);
    return {state: state};
}

// ==================== PROCESS MOVE ====================
function processMove(state, presence, moveData, logger, nk) {
    // Validate it's the player's turn
    if (presence.userId !== state.currentPlayer) {
        return {valid: false, error: 'Not your turn'};
    }
    
    // Validate game is active
    if (state.gameStatus !== 'active') {
        return {valid: false, error: 'Game is not active'};
    }
    
    // Validate position
    var position = moveData.position;
    if (position < 0 || position > 8) {
        return {valid: false, error: 'Invalid position'};
    }
    
    // Validate cell is empty
    if (state.board[position] !== null) {
        return {valid: false, error: 'Cell already occupied'};
    }
    
    // Make the move
    var symbol = state.players[presence.userId].symbol;
    state.board[position] = symbol;
    state.moveCount++;
    
    logger.info('Player ' + presence.username + ' (' + symbol + ') moved to position ' + position);
    
    // Check for winner
    var winner = checkWinner(state.board);
    if (winner) {
        state.gameStatus = 'finished';
        state.winner = presence.userId;
        logger.info('Game over - Winner: ' + presence.username);
    } else if (state.moveCount === 9) {
        // Draw
        state.gameStatus = 'finished';
        state.winner = null;
        logger.info('Game over - Draw');
    } else {
        // Switch turns
        var playerIds = Object.keys(state.players);
        state.currentPlayer = playerIds[0] === state.currentPlayer ? playerIds[1] : playerIds[0];
    }
    
    return {valid: true, state: state};
}

// ==================== CHECK WINNER ====================
function checkWinner(board) {
    var winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]              // Diagonals
    ];
    
    for (var i = 0; i < winPatterns.length; i++) {
        var pattern = winPatterns[i];
        var a = board[pattern[0]];
        var b = board[pattern[1]];
        var c = board[pattern[2]];
        
        if (a && a === b && a === c) {
            return a;
        }
    }
    
    return null;
}

// ==================== INITIALIZE LEADERBOARD ====================
function initLeaderboard(nk, logger) {
    try {
        // authoritative, sort order, operator, reset schedule, metadata
        nk.leaderboardCreate(LEADERBOARD_ID, true, 'desc', 'incr', null, null);
        logger.info('Leaderboard initialized: ' + LEADERBOARD_ID);
    } catch (error) {
        // Leaderboard might already exist
        logger.debug('Leaderboard already exists or error: ' + error);
    }
}

// ==================== RPC: CREATE MATCH ====================
function createMatchRpc(ctx, logger, nk, payload) {
    try {
        var matchId = nk.matchCreate('tictactoe', {});
        logger.info('Match created: ' + matchId);
        return JSON.stringify({success: true, matchId: matchId});
    } catch (error) {
        logger.error('Error creating match: ' + error);
        return JSON.stringify({success: false, error: String(error)});
    }
}

// ==================== RPC: INIT LEADERBOARD ====================
function initLeaderboardRpc(ctx, logger, nk, payload) {
    try {
        initLeaderboard(nk, logger);
        return JSON.stringify({success: true});
    } catch (error) {
        logger.error('Error initializing leaderboard: ' + error);
        return JSON.stringify({success: false, error: String(error)});
    }
}

// ==================== RPC: GET LEADERBOARD ====================
function getLeaderboardRpc(ctx, logger, nk, payload) {
    try {
        var records = nk.leaderboardRecordsList(LEADERBOARD_ID, null, 10, null, 0);
        var leaderboard = records.map(function(record) {
            return {
                username: record.username,
                score: record.score,
                rank: record.rank
            };
        });
        return JSON.stringify({success: true, leaderboard: leaderboard});
    } catch (error) {
        logger.error('Error fetching leaderboard: ' + error);
        return JSON.stringify({success: false, error: String(error)});
    }
}

// ==================== MATCHMAKER MATCHED HOOK ====================
function matchmakerMatched(ctx, logger, nk, matches) {
    logger.info('Matchmaker matched players');
    var matchId = nk.matchCreate('tictactoe', {});
    logger.info('Created match for matched players: ' + matchId);
    return matchId;
}
