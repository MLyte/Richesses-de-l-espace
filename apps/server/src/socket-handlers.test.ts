import http from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Server } from "socket.io";
import { io as connect, type Socket } from "socket.io-client";
import type { CommandResult, PlayerGameView, PublicGameView, SessionResult } from "@richesses-espace/protocol";
import { STARTING_RACE_SHIPS, nextRandom, type RaceShipId } from "@richesses-espace/game";
import { RoomStore } from "./room-store";
import { registerSocketHandlers } from "./socket-handlers";

let httpServer: http.Server;
let ioServer: Server;
let roomStore: RoomStore;
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
const nextPlayerState = (socket: Socket) => new Promise<PlayerGameView>((resolve) => socket.once("state:player", resolve));
async function waitFor(predicate: () => boolean, timeout = 2_000): Promise<void> {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("Condition de test non atteinte dans le délai imparti");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function predictedRaceOrder(seed: number): RaceShipId[] {
  const order = [...STARTING_RACE_SHIPS];
  let nextSeed = seed;
  for (let index = order.length - 1; index > 0; index -= 1) {
    const [value, updatedSeed] = nextRandom(nextSeed);
    nextSeed = updatedSeed;
    const target = Math.floor(value * (index + 1));
    [order[index], order[target]] = [order[target]!, order[index]!];
  }
  return order;
}

async function completeStartingRace(code: string, players: Socket[]): Promise<void> {
  const order = predictedRaceOrder(roomStore.get(code)!.state.rngState);
  for (const [index, player] of players.entries()) expect((await command(player, "race:select-ship", { shipId: order[index] })).ok).toBe(true);
  await waitFor(() => roomStore.get(code)?.state.phase === "WAITING_FOR_ROLL");
}

beforeEach(async () => {
  httpServer = http.createServer();
  ioServer = new Server(httpServer);
  roomStore = new RoomStore();
  registerSocketHandlers(ioServer, roomStore, 5173, undefined, { botDelayScale: .1, startingRaceDurationMs: 5 });
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
    expect(joinedFirst.data?.isHost).toBe(true);
    await firstJoinState;

    const second = await openClient();
    const secondJoinState = nextState(admin);
    const joinedSecond = await command<SessionResult>(second, "room:join", { code, name: "Basile", color: "#3784a6", symbol: "dog" });
    expect(joinedSecond.ok).toBe(true);
    expect(joinedSecond.data?.isHost).toBe(false);
    await secondJoinState;

    let statePromise = nextState(admin);
    await command(first, "lobby:set-ready", { ready: true });
    await statePromise;
    statePromise = nextState(admin);
    await command(second, "lobby:set-ready", { ready: true });
    await statePromise;
    expect((await command(admin, "game:start")).error?.code).toBe("UNAUTHORIZED");
    statePromise = nextState(admin);
    const started = await command(first, "game:start");
    expect(started.ok).toBe(true);
    await statePromise;
    await completeStartingRace(code, [first, second]);
    let state = roomStore.get(code)!.state as unknown as PublicGameView;
    const firstStarts = state.activePlayerId === joinedFirst.data!.playerId;
    const active = firstStarts ? first : second;
    const inactive = firstStarts ? second : first;
    const activePlayerId = firstStarts ? joinedFirst.data!.playerId : joinedSecond.data!.playerId;
    const inactivePlayerId = firstStarts ? joinedSecond.data!.playerId : joinedFirst.data!.playerId;
    expect(state.activePlayerId).toBe(activePlayerId);

    const emptyTrade = await command(active, "trade:propose", { targetId: inactivePlayerId, offeredResourceId: null, requestedResourceId: null, offeredCredits: 2, requestedCredits: 0 });
    expect(emptyTrade.error?.code).toBe("INVALID_TRADE");

    const forbidden = await command(inactive, "turn:roll");
    expect(forbidden.error?.code).toBe("NOT_ACTIVE_PLAYER");

    statePromise = nextState(admin);
    const rolled = await command(active, "turn:roll");
    expect(rolled.ok).toBe(true);
    state = await statePromise;
    expect(state.lastRoll?.total).toBeGreaterThanOrEqual(2);

    if (state.phase === "WAITING_FOR_PURCHASE") {
      statePromise = nextState(admin);
      await command(active, "purchase:pass");
      state = await statePromise;
    }
    expect(state.phase).toBe("WAITING_FOR_END_TURN");
    statePromise = nextState(admin);
    await command(active, "turn:end");
    state = await statePromise;
    expect(state.activePlayerId).toBe(inactivePlayerId);

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
    const finished = await command(first, "admin:end");
    expect(finished.ok).toBe(true);
    state = await statePromise;
    expect(state.phase).toBe("FINISHED");
    expect(state.finishReason).toBe("ADMIN");
    expect(state.winnerId).toBeNull();

    statePromise = nextState(admin);
    const restarted = await command(first, "admin:restart");
    expect(restarted.ok).toBe(true);
    state = await statePromise;
    expect(state.phase).toBe("LOBBY");
    expect(state.players.map((player) => player.id)).toEqual([joinedFirst.data!.playerId, joinedSecond.data!.playerId]);
    expect(state.players.every((player) => !player.ready && player.position === 0 && !player.assetIds.length)).toBe(true);
  });

  it("pauses before an offline player can be targeted by a trade", async () => {
    const admin = await openClient();
    const created = await command<SessionResult>(admin, "room:create");
    const first = await openClient();
    const joinedFirst = await command<SessionResult>(first, "room:join", { code: created.data!.code, name: "Aline", color: "#e05f42", symbol: "cat" });
    const second = await openClient();
    const joinedSecond = await command<SessionResult>(second, "room:join", { code: created.data!.code, name: "Basile", color: "#3784a6", symbol: "dog" });
    await command(first, "lobby:set-ready", { ready: true });
    await command(second, "lobby:set-ready", { ready: true });
    await command(first, "game:start");
    await completeStartingRace(created.data!.code, [first, second]);

    const offlineState = nextState(admin);
    second.disconnect();
    await offlineState;

    const proposed = await command(first, "trade:propose", { targetId: joinedSecond.data!.playerId, kind: "alliance", offeredResourceId: null, requestedResourceId: null, offeredCredits: 0, requestedCredits: 0 });
    expect(proposed.error?.code).toBe("INVALID_PHASE");
    expect(roomStore.get(created.data!.code)?.state.phase).toBe("PAUSED");
    expect(joinedFirst.data?.isHost).toBe(true);
  });
  it("detaches a socket from its previous room before it joins another", async () => {
    const firstAdmin = await openClient();
    const firstRoom = await command<SessionResult>(firstAdmin, "room:create");
    const player = await openClient();
    const firstJoin = await command<SessionResult>(player, "room:join", { code: firstRoom.data!.code, name: "Aline", color: "#e05f42", symbol: "cat" });

    const secondAdmin = await openClient();
    const secondRoom = await command<SessionResult>(secondAdmin, "room:create");
    const secondJoin = await command<SessionResult>(player, "room:join", { code: secondRoom.data!.code, name: "Aline", color: "#e05f42", symbol: "cat" });

    expect(secondJoin.ok).toBe(true);
    expect(roomStore.get(firstRoom.data!.code)?.state.players.find((playerState) => playerState.id === firstJoin.data!.playerId)?.connected).toBe(false);
  });
  it("freezes an auction deadline while the host pauses the game", async () => {
    const admin = await openClient();
    const created = await command<SessionResult>(admin, "room:create");
    const first = await openClient();
    const joinedFirst = await command<SessionResult>(first, "room:join", { code: created.data!.code, name: "Aline", color: "#e05f42", symbol: "cat" });
    const second = await openClient();
    const joinedSecond = await command<SessionResult>(second, "room:join", { code: created.data!.code, name: "Basile", color: "#3784a6", symbol: "dog" });
    const third = await openClient();
    const joinedThird = await command<SessionResult>(third, "room:join", { code: created.data!.code, name: "Chloé", color: "#75a341", symbol: "bird" });
    await command(first, "lobby:set-ready", { ready: true });
    await command(second, "lobby:set-ready", { ready: true });
    await command(third, "lobby:set-ready", { ready: true });
    await command(first, "game:start");
    await completeStartingRace(created.data!.code, [first, second, third]);

    const room = roomStore.get(created.data!.code)!;
    room.state = {
      ...room.state,
      phase: "AUCTION",
      auction: { mode: "bidding", sellerId: joinedFirst.data!.playerId!, bankSale: false, targetCount: 1, redDie: 1, assetId: "aluminous-regolith-mercure", selectedAssetIds: ["aluminous-regolith-mercure"], lots: [["aluminous-regolith-mercure"]], currentLotIndex: 0, minimumBid: 1, currentBid: 0, leaderId: null, eligiblePlayerIds: [joinedSecond.data!.playerId!, joinedThird.data!.playerId!], passedPlayerIds: [], deadline: Date.now() + 500 }
    };

    let statePromise = nextState(admin);
    await command(first, "admin:pause");
    await statePromise;
    await new Promise((resolve) => setTimeout(resolve, 70));
    expect(room.state.phase).toBe("PAUSED");

    statePromise = nextState(admin);
    await command(first, "admin:resume");
    const resumed = await statePromise;
    expect(resumed.phase).toBe("AUCTION");
    expect(resumed.auction?.deadline).toBeGreaterThan(Date.now());
  });

  it("detaches the previous player session when a socket resumes into another room", async () => {
    const firstAdmin = await openClient();
    const firstRoom = await command<SessionResult>(firstAdmin, "room:create");
    const player = await openClient();
    const firstJoin = await command<SessionResult>(player, "room:join", { code: firstRoom.data!.code, name: "Aline", color: "#e05f42", symbol: "cat" });
    const secondAdmin = await openClient();
    const secondRoom = await command<SessionResult>(secondAdmin, "room:create");

    const resumed = await command<SessionResult>(player, "session:resume", { token: secondRoom.data!.token });

    expect(resumed.ok).toBe(true);
    expect(resumed.data?.code).toBe(secondRoom.data!.code);
    expect(resumed.data?.role).toBe("admin");
    expect(roomStore.get(firstRoom.data!.code)?.state.players.find((state) => state.id === firstJoin.data!.playerId)?.connected).toBe(false);
  });

  it("keeps a player online while another socket still owns the same session", async () => {
    const admin = await openClient();
    const created = await command<SessionResult>(admin, "room:create");
    const first = await openClient();
    const joinedFirst = await command<SessionResult>(first, "room:join", { code: created.data!.code, name: "Aline", color: "#e05f42", symbol: "cat" });
    const second = await openClient();
    await command<SessionResult>(second, "room:join", { code: created.data!.code, name: "Basile", color: "#3784a6", symbol: "dog" });
    await command(first, "lobby:set-ready", { ready: true });
    await command(second, "lobby:set-ready", { ready: true });
    await command(first, "game:start");
    await completeStartingRace(created.data!.code, [first, second]);
    const replacement = await openClient();
    const resumed = await command<SessionResult>(replacement, "session:resume", { token: joinedFirst.data!.token });
    expect(resumed.ok).toBe(true);

    first.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 25));

    const state = roomStore.get(created.data!.code)!.state;
    expect(state.players.find((player) => player.id === joinedFirst.data!.playerId)?.connected).toBe(true);
    expect(state.phase).toBe("WAITING_FOR_ROLL");
    expect(state.pauseReason).toBeNull();
  });
  it("lets only the host manage persistent robot seats in the lobby", async () => {
    const display = await openClient();
    const created = await command<SessionResult>(display, "room:create", { displayMode: "MOBILE_ONLY" });
    const host = await openClient();
    const hostJoined = await command<SessionResult>(host, "room:join", { code: created.data!.code, name: "Aline", color: "#e05f42", symbol: "cat", hostToken: created.data!.token });
    const guest = await openClient();
    await command<SessionResult>(guest, "room:join", { code: created.data!.code, name: "Basile", color: "#3784a6", symbol: "dog" });

    expect((await command(guest, "lobby:bot-add", { profile: "BALANCED" })).error?.code).toBe("UNAUTHORIZED");
    const publicState = nextState(display);
    const added = await command<{ playerId: string }>(host, "lobby:bot-add", { profile: "CAUTIOUS" });
    expect(added.ok).toBe(true);
    const botId = added.data!.playerId;
    const withBot = await publicState;
    expect(withBot.players.find((player) => player.id === botId)).toMatchObject({ isBot: true, botProfile: "CAUTIOUS", connected: true, ready: true });
    expect(roomStore.get(created.data!.code)?.playerTokens.size).toBe(2);

    expect((await command(host, "lobby:bot-update", { playerId: botId, profile: "AMBITIOUS" })).ok).toBe(true);
    expect(roomStore.get(created.data!.code)?.bots[botId]).toBe("AMBITIOUS");
    expect((await command(host, "lobby:bot-update", { playerId: botId, profile: "UNKNOWN" })).error?.code).toBe("INVALID_BOT_PROFILE");
    expect((await command(host, "lobby:bot-remove", { playerId: botId })).ok).toBe(true);
    expect(roomStore.get(created.data!.code)?.state.players.some((player) => player.id === botId)).toBe(false);

    for (let index = 0; index < 4; index += 1) expect((await command(host, "lobby:bot-add", { profile: "BALANCED" })).ok).toBe(true);
    expect(roomStore.get(created.data!.code)?.state.players).toHaveLength(6);
    expect((await command(host, "lobby:bot-add", { profile: "BALANCED" })).error?.code).toBe("ROOM_FULL");
    expect(hostJoined.data?.isHost).toBe(true);
  });

  it("waits for every human ship choice before scheduling robot choices", async () => {
    const display = await openClient();
    const created = await command<SessionResult>(display, "room:create", { displayMode: "MOBILE_ONLY" });
    const host = await openClient();
    await command<SessionResult>(host, "room:join", { code: created.data!.code, name: "Aline", color: "#e05f42", symbol: "cat", hostToken: created.data!.token });
    const added = await command<{ playerId: string }>(host, "lobby:bot-add", { profile: "BALANCED" });
    await command(host, "lobby:set-ready", { ready: true });
    await command(host, "game:start");

    const room = roomStore.get(created.data!.code)!;
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(room.state.startingRace.selections[added.data!.playerId]).toBeUndefined();
    expect(room.botThinkingPlayerId).toBeNull();

    expect((await command(host, "race:select-ship", { shipId: STARTING_RACE_SHIPS[2] })).ok).toBe(true);
    expect(room.botThinkingPlayerId).toBe(added.data!.playerId);
    await waitFor(() => room.state.phase === "WAITING_FOR_ROLL");
  });

  it("pauses, resumes and restarts a server-driven robot turn without stale actions", async () => {
    const display = await openClient();
    const created = await command<SessionResult>(display, "room:create", { displayMode: "MOBILE_ONLY" });
    const host = await openClient();
    const hostJoined = await command<SessionResult>(host, "room:join", { code: created.data!.code, name: "Aline", color: "#e05f42", symbol: "cat", hostToken: created.data!.token });
    const added = await command<{ playerId: string }>(host, "lobby:bot-add", { profile: "BALANCED" });
    const botId = added.data!.playerId;
    await command(host, "lobby:set-ready", { ready: true });
    await command(host, "game:start");
    await completeStartingRace(created.data!.code, [host]);
    let room = roomStore.get(created.data!.code)!;
    if (room.state.activePlayerId === hostJoined.data!.playerId) {
      expect((await command(host, "turn:roll")).ok).toBe(true);
      if (room.state.phase === "WAITING_FOR_PURCHASE") await command(host, "purchase:pass");
      if (room.state.phase === "WAITING_FOR_LEVER_PURCHASE") await command(host, "lever:pass");
      if (room.state.phase === "WAITING_FOR_PAYMENT") await command(host, "payment:pay");
      if (room.state.phase === "WAITING_FOR_END_TURN") await command(host, "turn:end");
      room = roomStore.get(created.data!.code)!;
    }
    expect(room.state.activePlayerId).toBe(botId);
    expect(room.botThinkingPlayerId).toBe(botId);
    const expectedHostTurnNumber = room.state.turnNumber + 1;

    await command(host, "admin:pause");
    const pausedRevision = room.state.revision;
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(room.state.phase).toBe("PAUSED");
    expect(room.state.revision).toBe(pausedRevision);
    expect(room.botThinkingPlayerId).toBeNull();

    await command(host, "admin:resume");
    await waitFor(() => room.state.activePlayerId === hostJoined.data!.playerId && room.state.turnNumber >= expectedHostTurnNumber);
    expect(room.state.phase).toBe("WAITING_FOR_ROLL");
    expect(room.state.players.find((player) => player.id === botId)?.connected).toBe(true);

    await command(host, "admin:end");
    await command(host, "admin:restart");
    expect(room.state.phase).toBe("LOBBY");
    expect(room.state.players.find((player) => player.id === botId)).toMatchObject({ ready: true, connected: true });
    expect(room.state.players.find((player) => player.id === hostJoined.data!.playerId)?.ready).toBe(false);
    expect(room.bots[botId]).toBe("BALANCED");
  });
  it("keeps a pending Technology and every session token out of public state", async () => {
    const admin = await openClient();
    const created = await command<SessionResult>(admin, "room:create");
    const first = await openClient();
    const joinedFirst = await command<SessionResult>(first, "room:join", { code: created.data!.code, name: "Aline", color: "#e05f42", symbol: "cat" });
    const second = await openClient();
    await command<SessionResult>(second, "room:join", { code: created.data!.code, name: "Basile", color: "#3784a6", symbol: "dog" });
    const third = await openClient();
    await command<SessionResult>(third, "room:join", { code: created.data!.code, name: "Chloé", color: "#75a341", symbol: "bird" });
    await command(first, "lobby:set-ready", { ready: true });
    await command(second, "lobby:set-ready", { ready: true });
    await command(third, "lobby:set-ready", { ready: true });
    await command(first, "game:start");
    await completeStartingRace(created.data!.code, [first, second, third]);
    const room = roomStore.get(created.data!.code)!;
    room.state = { ...room.state, phase: "WAITING_FOR_LEVER_PURCHASE", pendingLever: { playerId: joinedFirst.data!.playerId!, leverId: "emergency-propulsor", price: 3 } };
    const publicPromise = nextState(admin);
    const privatePromise = nextPlayerState(first);

    await command(first, "admin:pause");
    const [publicState, privateState] = await Promise.all([publicPromise, privatePromise]);

    expect(publicState.pendingLever).toEqual({ price: 3 });
    expect(publicState.pendingLever).not.toHaveProperty("leverId");
    expect(JSON.stringify(publicState)).not.toContain(joinedFirst.data!.token);
    expect(privateState.pendingLever).toEqual({ leverId: "emergency-propulsor", price: 3 });
    expect(privateState.token).toBe(joinedFirst.data!.token);
  });});
