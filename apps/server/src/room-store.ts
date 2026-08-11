import crypto from "node:crypto";
import { addPlayer, createGame, type GameState } from "@richesses-espace/game";
import { PLAYER_COLORS, PLAYER_SYMBOLS, type DisplayMode } from "@richesses-espace/protocol";

export interface Room {
  state: GameState;
  displayMode: DisplayMode;
  adminToken: string;
  hostPlayerId: string | null;
  playerTokens: Map<string, string>;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const token = () => crypto.randomBytes(24).toString("base64url");

export class RoomStore {
  private readonly rooms = new Map<string, Room>();

  create(displayMode: DisplayMode = "TV"): Room {
    let code = "";
    do {
      code = Array.from({ length: 4 }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join("");
    } while (this.rooms.has(code));
    const room: Room = {
      state: createGame(crypto.randomUUID(), code, crypto.randomBytes(4).readUInt32LE()),
      displayMode,
      adminToken: token(),
      hostPlayerId: null,
      playerTokens: new Map()
    };
    this.rooms.set(code, room);
    return room;
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
    room.playerTokens.set(playerToken, playerId);
    const isHost = !room.hostPlayerId && (room.displayMode === "TV" || hostToken === room.adminToken);
    if (isHost) room.hostPlayerId = playerId;
    return { room, playerId, playerToken, isHost };
  }

  findByToken(value: string): { room: Room; role: "admin" | "player"; playerId?: string; isHost?: boolean } | undefined {
    for (const room of this.rooms.values()) {
      if (room.adminToken === value) return { room, role: "admin" };
      const playerId = room.playerTokens.get(value);
      if (playerId) return { room, role: "player", playerId, isHost: room.hostPlayerId === playerId };
    }
    return undefined;
  }
}
