import crypto from "node:crypto";
import { Pool } from "pg";
import { addPlayer, createGame, pauseGame, type GameState } from "@richesses-espace/game";
import { PLAYER_COLORS, PLAYER_SYMBOLS, type DisplayMode } from "@richesses-espace/protocol";

export interface Room {
  state: GameState;
  displayMode: DisplayMode;
  adminTokenHash: string;
  hostPlayerId: string | null;
  playerTokens: Map<string, string>;
  updatedAt: number;
}

interface StoredRoom extends Omit<Room, "playerTokens"> {
  playerTokens: [string, string][];
}

export interface CreatedRoom { room: Room; adminToken: string }

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const token = () => crypto.randomBytes(32).toString("base64url");
const hashToken = (value: string) => crypto.createHash("sha256").update(value).digest("base64url");
const roomTtlHours = Math.max(1, Number(process.env.ROOM_TTL_HOURS ?? 168));

export class RoomStore {
  private readonly rooms = new Map<string, Room>();
  private readonly pool: Pool | null;

  constructor(databaseUrl = process.env.DATABASE_URL) {
    this.pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
  }

  get persistent(): boolean { return this.pool !== null; }

  async initialize(): Promise<void> {
    if (!this.pool) {
      if (process.env.NODE_ENV === "production" && process.env.ALLOW_IN_MEMORY_ROOMS !== "1") {
        throw new Error("DATABASE_URL est obligatoire en production pour préserver les parties live.");
      }
      return;
    }

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS game_rooms (
        code TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS game_rooms_expires_at_idx ON game_rooms (expires_at);
    `);
    const result = await this.pool.query<{ payload: StoredRoom }>("SELECT payload FROM game_rooms WHERE expires_at > NOW()");
    for (const row of result.rows) {
      const room = this.hydrate(row.payload);
      this.rooms.set(room.state.code, room);
      await this.save(room);
    }
  }

  async close(): Promise<void> { await this.pool?.end(); }

  create(displayMode: DisplayMode = "TV"): CreatedRoom {
    let code = "";
    do {
      code = Array.from({ length: 4 }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join("");
    } while (this.rooms.has(code));
    const adminToken = token();
    const room: Room = {
      state: createGame(crypto.randomUUID(), code, crypto.randomBytes(4).readUInt32LE()),
      displayMode,
      adminTokenHash: hashToken(adminToken),
      hostPlayerId: null,
      playerTokens: new Map(),
      updatedAt: Date.now()
    };
    this.rooms.set(code, room);
    return { room, adminToken };
  }

  get(code: string): Room | undefined { return this.rooms.get(code.toUpperCase()); }

  join(code: string, name: string, color: string, symbol: string, hostToken?: string): { room: Room; playerId: string; playerToken: string; isHost: boolean } {
    const room = this.get(code);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (!PLAYER_COLORS.includes(color as typeof PLAYER_COLORS[number])) throw new Error("INVALID_COLOR");
    if (!PLAYER_SYMBOLS.some((item) => item.id === symbol)) throw new Error("INVALID_SYMBOL");
    const playerId = crypto.randomUUID();
    const playerToken = token();
    room.state = addPlayer(room.state, { id: playerId, name, color, symbol });
    room.playerTokens.set(hashToken(playerToken), playerId);
    const isHost = !room.hostPlayerId && (room.displayMode === "TV" || (hostToken !== undefined && hashToken(hostToken) === room.adminTokenHash));
    if (isHost) room.hostPlayerId = playerId;
    return { room, playerId, playerToken, isHost };
  }

  findByToken(value: string): { room: Room; role: "admin" | "player"; playerId?: string; isHost?: boolean } | undefined {
    const valueHash = hashToken(value);
    for (const room of this.rooms.values()) {
      if (room.adminTokenHash === valueHash) return { room, role: "admin" };
      const playerId = room.playerTokens.get(valueHash);
      if (playerId) return { room, role: "player", playerId, isHost: room.hostPlayerId === playerId };
    }
    return undefined;
  }

  async save(room: Room): Promise<void> {
    room.updatedAt = Date.now();
    this.rooms.set(room.state.code, room);
    if (!this.pool) return;
    const stored: StoredRoom = { ...room, playerTokens: [...room.playerTokens.entries()] };
    await this.pool.query(
      `INSERT INTO game_rooms (code, payload, updated_at, expires_at)
       VALUES ($1, $2::jsonb, NOW(), NOW() + ($3 * INTERVAL '1 hour'))
       ON CONFLICT (code) DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at, expires_at = EXCLUDED.expires_at`,
      [room.state.code, JSON.stringify(stored), roomTtlHours]
    );
  }

  async purgeExpired(now = Date.now()): Promise<void> {
    const cutoff = now - roomTtlHours * 60 * 60 * 1000;
    for (const [code, room] of this.rooms) if (room.updatedAt < cutoff) this.rooms.delete(code);
    if (this.pool) await this.pool.query("DELETE FROM game_rooms WHERE expires_at <= NOW()");
  }

  private hydrate(stored: StoredRoom): Room {
    const players = stored.state.players.map((player) => ({ ...player, connected: false }));
    let state: GameState = { ...stored.state, players };
    if (state.status === "PLAYING" && state.phase !== "PAUSED" && state.phase !== "FINISHED") {
      state = pauseGame(state, "PLAYER_DISCONNECTED", state.activePlayerId);
    }
    return { ...stored, state, playerTokens: new Map(stored.playerTokens), updatedAt: Date.now() };
  }
}
