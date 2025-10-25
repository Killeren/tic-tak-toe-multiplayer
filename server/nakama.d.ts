// Nakama TypeScript definitions for server runtime

declare namespace nkruntime {
    export interface Context {
        env: { [key: string]: string };
        executionMode: string;
        matchId: string;
        matchNode: string;
        matchLabel: string;
        matchTickRate: number;
        queryParams: { [key: string]: string };
    }

    export interface Logger {
        debug(message: string, ...args: any[]): void;
        info(message: string, ...args: any[]): void;
        warn(message: string, ...args: any[]): void;
        error(message: string, ...args: any[]): void;
    }

    export interface Nakama {
        accountGetId(userId: string): Account;
        leaderboardCreate(id: string, authoritative: boolean, sortOrder: SortOrder, operator: Operator, resetSchedule: string | null, metadata: { [key: string]: any }): void;
        leaderboardRecordWrite(id: string, ownerId: string, username: string, score: number, subscore: number, metadata?: { [key: string]: any }): void;
        leaderboardRecordsList(id: string, ownerIds: string[], limit: number, cursor: string | null, overrideExpiry: number): LeaderboardRecord[];
        matchCreate(module: string, params: { [key: string]: any }): string;
        binaryToString(data: ArrayBuffer): string;
        stringToBinary(data: string): Uint8Array;
    }

    export interface Initializer {
        registerRpc(id: string, fn: RpcFunction): void;
        registerMatch(name: string, handlers: MatchHandler): void;
        registerMatchmakerMatched(fn: MatchmakerMatchedFunction): void;
    }

    export interface Presence {
        userId: string;
        sessionId: string;
        username: string;
        node: string;
    }

    export interface MatchMessage {
        sender: Presence;
        opCode: number;
        data: ArrayBuffer;
        reliable: boolean;
        receiveTimeMs: number;
    }

    export interface MatchDispatcher {
        broadcastMessage(opCode: number, data: string | ArrayBuffer, presences?: Presence[], reliable?: boolean): void;
        matchKick(presences: Presence[]): void;
        matchLabelUpdate(label: string): void;
    }

    export interface MatchHandler {
        matchInit: MatchInitFunction;
        matchJoinAttempt: MatchJoinAttemptFunction;
        matchJoin: MatchJoinFunction;
        matchLeave: MatchLeaveFunction;
        matchLoop: MatchLoopFunction;
        matchTerminate: MatchTerminateFunction;
        matchSignal: MatchSignalFunction;
    }

    export interface MatchmakerResult {
        match_id: string;
        token: string;
        users: MatchmakerUser[];
    }

    export interface MatchmakerUser {
        presence: Presence;
        properties: { [key: string]: any };
    }

    export interface LeaderboardRecord {
        leaderboardId: string;
        ownerId: string;
        username: string;
        score: number;
        subscore: number;
        numScore: number;
        maxNumScore: number;
        metadata: { [key: string]: any };
        createTime: number;
        updateTime: number;
        expiryTime: number;
        rank: number;
    }

    export interface Account {
        user: User;
        wallet: string;
        email: string;
        devices: Device[];
    }

    export interface User {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string;
        langTag: string;
        location: string;
        timezone: string;
        metadata: { [key: string]: any };
        createTime: number;
        updateTime: number;
    }

    export interface Device {
        id: string;
    }

    export type InitModule = (ctx: Context, logger: Logger, nk: Nakama, initializer: Initializer) => void;
    
    export type RpcFunction = (ctx: Context, logger: Logger, nk: Nakama, payload: string) => string;
    
    export type MatchInitFunction<T = any> = (ctx: Context, logger: Logger, nk: Nakama, params: { [key: string]: string }) => { state: T, tickRate: number, label: string };
    
    export type MatchJoinAttemptFunction<T = any> = (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: T, presence: Presence, metadata: { [key: string]: any }) => { state: T, accept: boolean, rejectMessage?: string } | null;
    
    export type MatchJoinFunction<T = any> = (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: T, presences: Presence[]) => { state: T } | null;
    
    export type MatchLeaveFunction<T = any> = (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: T, presences: Presence[]) => { state: T } | null;
    
    export type MatchLoopFunction<T = any> = (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: T, messages: MatchMessage[]) => { state: T } | null;
    
    export type MatchTerminateFunction<T = any> = (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: T, graceSeconds: number) => { state: T } | null;
    
    export type MatchSignalFunction<T = any> = (ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher, tick: number, state: T, data: string) => { state: T, data?: string } | null;
    
    export type MatchmakerMatchedFunction = (ctx: Context, logger: Logger, nk: Nakama, matches: MatchmakerResult[]) => string | null;

    export enum SortOrder {
        ASCENDING = 0,
        DESCENDING = 1
    }

    export enum Operator {
        NO_OVERRIDE = 0,
        BEST = 1,
        SET = 2,
        INCREMENT = 3,
        DECREMENT = 4
    }
}
