import http from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Server } from "socket.io";
import { io as connect, type Socket } from "socket.io-client";
import type { CommandResult, PublicGameView, SessionResult } from "@orbisium/protocol";
import { RoomStore } from "./room-store";
import { registerSocketHandlers } from "./socket-handlers";

let httpServer: http.Server;
let ioServer: Server;
let url: string;
const clients: Socket[] = [];

function openClient(): Promise<Socket> {
  return new Promise((resolve) => {
    const socket = connect(url, { transports: ["websocket"], forceNew: true });
    clients.push(socket);
    socket.on("connect", () => resolve(socket));
  });
}

function command<T>(socket: Socket, event: string, payload?: unknown): Promise<CommandResult<T>> {
  return new Promise((resolve) => payload === undefined ? socket.emit(event, resolve) : socket.emit(event, payload, resolve));
}

const nextState = (socket: Socket) => new Promise<PublicGameView>((resolve) => socket.once("state:public", resolve));

beforeEach(async () => {
  httpServer = http.createServer();
  ioServer = new Server(httpServer);
  registerSocketHandlers(ioServer, new RoomStore(), 5173);
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const address = httpServer.address();
  if (!address || typeof address === "string") throw new Error("Port de test indisponible");
  url = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  for (const client of clients.splice(0)) client.disconnect();
  await new Promise<void>((resolve) => ioServer.close(() => resolve()));
});

describe("Socket.IO game flow", () => {
  it("lets the first phone administer a mobile-only table", async () => {
    const host = await openClient();
    const created = await command<SessionResult>(host, "room:create", { displayMode: "MOBILE_ONLY" });
    expect(created.data?.displayMode).toBe("MOBILE_ONLY");

    const hostJoined = await command<SessionResult>(host, "room:join", {
      code: created.data!.code, name: "Aline", color: "#e05f42", symbol: "cat", hostToken: created.data!.token
    });
    expect(hostJoined.data?.isHost).toBe(true);

    const guest = await openClient();
    const guestJoined = await command<SessionResult>(guest, "room:join", {
      code: created.data!.code, name: "Basile", color: "#3784a6", symbol: "dog"
    });
    expect(guestJoined.data?.isHost).toBe(false);

    await command(host, "lobby:set-ready", { ready: true });
    await command(guest, "lobby:set-ready", { ready: true });
    expect((await command(guest, "game:start")).error?.code).toBe("UNAUTHORIZED");
    expect((await command(host, "game:start")).ok).toBe(true);
    expect((await command(host, "admin:pause")).ok).toBe(true);
    expect((await command(host, "admin:resume")).ok).toBe(true);
  });

  it("synchronizes a display and two authoritative player sessions", async () => {
    const admin = await openClient();
    const adminCreated = nextState(admin);
    const created = await command<SessionResult>(admin, "room:create");
    expect(created.ok).toBe(true);
    const code = created.data!.code;
    await adminCreated;

    const first = await openClient();
    const firstJoinState = nextState(admin);
    const joinedFirst = await command<SessionResult>(first, "room:join", { code, name: "Aline", color: "#e05f42", symbol: "cat" });
    expect(joinedFirst.ok).toBe(true);
    await firstJoinState;

    const second = await openClient();
    const secondJoinState = nextState(admin);
    const joinedSecond = await command<SessionResult>(second, "room:join", { code, name: "Basile", color: "#3784a6", symbol: "dog" });
    expect(joinedSecond.ok).toBe(true);
    await secondJoinState;

    let statePromise = nextState(admin);
    await command(first, "lobby:set-ready", { ready: true });
    await statePromise;
    statePromise = nextState(admin);
    await command(second, "lobby:set-ready", { ready: true });
    await statePromise;
    statePromise = nextState(admin);
    const started = await command(admin, "game:start");
    expect(started.ok).toBe(true);
    let state = await statePromise;
    expect(state.activePlayerId).toBe(joinedFirst.data!.playerId);

    const emptyTrade = await command(first, "trade:propose", { targetId: joinedSecond.data!.playerId, offeredResourceId: null, requestedResourceId: null, offeredCredits: 2, requestedCredits: 0 });
    expect(emptyTrade.error?.code).toBe("INVALID_TRADE");

    const forbidden = await command(second, "turn:roll");
    expect(forbidden.error?.code).toBe("NOT_ACTIVE_PLAYER");

    statePromise = nextState(admin);
    const rolled = await command(first, "turn:roll");
    expect(rolled.ok).toBe(true);
    state = await statePromise;
    expect(state.lastRoll?.total).toBeGreaterThanOrEqual(2);

    if (state.phase === "WAITING_FOR_PURCHASE") {
      statePromise = nextState(admin);
      await command(first, "purchase:pass");
      state = await statePromise;
    }
    expect(state.phase).toBe("WAITING_FOR_END_TURN");
    statePromise = nextState(admin);
    await command(first, "turn:end");
    state = await statePromise;
    expect(state.activePlayerId).toBe(joinedSecond.data!.playerId);

    statePromise = nextState(admin);
    second.disconnect();
    state = await statePromise;
    expect(state.phase).toBe("PAUSED");
    expect(state.pauseReason).toBe("PLAYER_DISCONNECTED");
    expect(state.pausePlayerId).toBe(joinedSecond.data!.playerId);
    expect(state.players.find((player) => player.id === joinedSecond.data!.playerId)?.connected).toBe(false);

    const replacement = await openClient();
    statePromise = nextState(admin);
    const resumed = await command<SessionResult>(replacement, "session:resume", { token: joinedSecond.data!.token });
    expect(resumed.ok).toBe(true);
    state = await statePromise;
    expect(state.players.find((player) => player.id === joinedSecond.data!.playerId)?.connected).toBe(true);

    statePromise = nextState(admin);
    const finished = await command(admin, "admin:end");
    expect(finished.ok).toBe(true);
    state = await statePromise;
    expect(state.phase).toBe("FINISHED");

    statePromise = nextState(admin);
    const restarted = await command(admin, "admin:restart");
    expect(restarted.ok).toBe(true);
    state = await statePromise;
    expect(state.phase).toBe("LOBBY");
    expect(state.players.map((player) => player.id)).toEqual([joinedFirst.data!.playerId, joinedSecond.data!.playerId]);
    expect(state.players.every((player) => !player.ready && player.position === 0 && !player.assetIds.length)).toBe(true);
  });
});
