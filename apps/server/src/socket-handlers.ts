import type { Server, Socket } from "socket.io";
import {
  BOARD, LEVER_CARDS, SECTORS, RuleError, buyPendingAsset, buyPendingLever, closeExpiredAuction, declareBankruptcy, decideBotAction, endTurn, finishGame,
  getNetWorth, getSectorInfluence, passAuction, passPendingAsset, passPendingLever, payPendingPayment,
  pauseGame, placeBid, proposeTrade, respondToTrade, restartGame, resumeGame, rollDice, setPlayerConnected,
  selectAuctionAssets, setPlayerReady, startGame, useLever, observeGameForBot,
  type BotDecision, type BotProfile, type GameState
} from "@richesses-espace/game";
import type { CommandResult, DisplayMode, PlayerAction, PlayerGameView, PublicGameView, SessionResult, TradeProposalPayload } from "@richesses-espace/protocol";
import { getJoinUrls } from "./network-addresses";
import { isBotProfile, RoomStore, type Room } from "./room-store";

interface SessionData {
  code?: string;
  role?: "admin" | "player";
  token?: string;
  playerId?: string;
  isHost?: boolean;
}

type Ack<T = undefined> = (result: CommandResult<T>) => void;

function errorMessage(code: string): string {
  return ({ ROOM_NOT_FOUND: "Partie introuvable.", INVALID_COLOR: "Couleur invalide.", INVALID_SYMBOL: "Symbole invalide.", INVALID_NAME: "Choisissez un prénom de 1 à 20 caractères.", SESSION_NOT_FOUND: "Cette session a expiré.", INVALID_BOT_PROFILE: "Profil de robot invalide.", BOT_NOT_FOUND: "Robot introuvable.", ROOM_FULL: "La partie est complète.", INVALID_PHASE: "Cette action n’est possible que dans le lobby." } as Record<string, string>)[code] ?? "Action impossible.";
}

async function safe<T>(ack: Ack<T>, action: () => T | Promise<T>): Promise<void> {
  try { ack({ ok: true, data: await action() }); }
  catch (error) {
    const code = error instanceof RuleError ? error.code : error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const message = error instanceof RuleError ? error.message : errorMessage(code);
    ack({ ok: false, error: { code, message } });
  }
}

function sessionOf(socket: Socket): SessionData { return socket.data as SessionData; }

function publicView(room: Room, publicPort: number, publicOrigin?: string): PublicGameView {
  const state = room.state;
  return {
    code: state.code, displayMode: room.displayMode, revision: state.revision, status: state.status, phase: state.phase,
    players: state.players.map(({ id, name, color, symbol, connected, ready, position, lapsCompleted, turnsToSkip, capital, assetIds, leverIds, bankrupt, allianceId, mergedIntoId }) => ({ id, name, color, symbol, connected, ready, isBot: Boolean(room.bots[id]), botProfile: room.bots[id] ?? null, position, lapsCompleted, turnsToSkip, capital, assetIds, leverCount: leverIds.length, bankrupt, allianceId, mergedIntoId, netWorth: getNetWorth(state, id), sectorInfluence: Object.fromEntries(SECTORS.map((sector) => [sector.id, getSectorInfluence(state, id, sector.id)])) as Record<(typeof SECTORS)[number]["id"], number> })),
    activePlayerId: state.activePlayerId, botThinkingPlayerId: room.botThinkingPlayerId, turnNumber: state.turnNumber, roundNumber: state.roundNumber,
    ownership: state.ownership, lastRoll: state.lastRoll,
    pendingAssetId: state.pendingAction?.availableAssetIds[0] ?? null,
    pendingPrice: null,
    pendingPurchase: state.pendingAction ? { source: state.pendingAction.source, countryId: state.pendingAction.countryId, resourceId: state.pendingAction.resourceId, label: state.pendingAction.label, availableAssetIds: state.pendingAction.availableAssetIds, maxAssets: state.pendingAction.maxAssets } : null,
    pendingLever: state.pendingLever ? { price: state.pendingLever.price } : null,
    pendingPayment: state.pendingPayment ? { ...state.pendingPayment, payableAmount: Math.min(state.players.find((player) => player.id === state.pendingPayment!.payerId)?.capital ?? 0, state.pendingPayment.amount) } : null,
    auction: state.auction, tradeOffer: state.tradeOffer, lastCard: state.lastCard,
    landedSpaceId: state.landedSpaceId, landedAssetId: state.landedAssetId, pauseReason: state.pauseReason, pausePlayerId: state.pausePlayerId,
    recentEvents: state.recentEvents, board: BOARD, joinUrls: getJoinUrls(state.code, publicPort, publicOrigin),
    winnerId: state.winnerId, finishReason: state.finishReason
  };
}

function actionsFor(state: GameState, playerId: string): PlayerAction[] {
  if (state.phase === "LOBBY") return ["SET_READY"];
  if (state.phase === "AUCTION" && state.auction?.mode === "selection" && state.auction.sellerId === playerId) {
    const actions: PlayerAction[] = ["SELECT_AUCTION_ASSETS"];
    const player = state.players.find((item) => item.id === playerId);
    if (player?.leverIds.some((id) => LEVER_CARDS.find((card) => card.id === id)?.kind === "auction_exemption")) actions.push("USE_LEVER");
    return actions;
  }
  if (state.phase === "AUCTION" && state.auction?.mode === "bidding" && state.auction.eligiblePlayerIds.includes(playerId) && !state.auction.passedPlayerIds.includes(playerId) && state.auction.leaderId !== playerId) return ["BID", "PASS_BID"];
  if (state.phase === "WAITING_FOR_TRADE" && state.tradeOffer?.targetId === playerId) return ["ACCEPT_TRADE", "REJECT_TRADE"];
  if (state.phase === "WAITING_FOR_TRADE" && state.tradeOffer?.proposerId === playerId) return ["REJECT_TRADE"];
  const actions: PlayerAction[] = [];
  const player = state.players.find((item) => item.id === playerId);
  if (player?.mergedIntoId) return [];
  const canLiquidateDebt = state.phase === "WAITING_FOR_PAYMENT" && state.activePlayerId === playerId && state.pendingPayment?.payerId === playerId && (player?.capital ?? 0) < state.pendingPayment.amount && Boolean(player?.assetIds.length);
  if (!player?.bankrupt && (state.phase === "WAITING_FOR_ROLL" || state.phase === "WAITING_FOR_END_TURN" || canLiquidateDebt)) actions.push("PROPOSE_TRADE");
  if (state.activePlayerId !== playerId) return actions;
  if (state.phase === "WAITING_FOR_ROLL") actions.push("ROLL_DICE");
  if (state.phase === "WAITING_FOR_PURCHASE") actions.push("BUY_ASSET", "PASS_ASSET");
  if (state.phase === "WAITING_FOR_LEVER_PURCHASE") actions.push("BUY_LEVER", "PASS_LEVER");
  if (state.phase === "WAITING_FOR_PAYMENT") {
    if ((state.players.find((player) => player.id === playerId)?.capital ?? 0) >= (state.pendingPayment?.amount ?? Infinity)) actions.push("PAY_RETURNS");
    else actions.push("DECLARE_BANKRUPTCY");
  }
  if (state.phase === "WAITING_FOR_END_TURN") actions.push("END_TURN");
  if (state.players.find((player) => player.id === playerId)?.leverIds.length) actions.push("USE_LEVER");
  return actions;
}

function playerView(room: Room, playerId: string, sessionToken: string): PlayerGameView {
  const pendingLever = room.state.pendingLever?.playerId === playerId ? { leverId: room.state.pendingLever.leverId, price: room.state.pendingLever.price } : null;
  return { playerId, token: sessionToken, isHost: room.hostPlayerId === playerId, allowedActions: actionsFor(room.state, playerId), leverIds: room.state.players.find((player) => player.id === playerId)?.leverIds ?? [], pendingLever };
}

export interface SocketHandlerOptions { botDelayScale?: number }

export function registerSocketHandlers(io: Server, store: RoomStore, publicPort: number, publicOrigin?: string, options: SocketHandlerOptions = {}): void {
  const botDelayScale = Math.max(0, options.botDelayScale ?? 1);
  const auctionTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const auctionPausedAt = new Map<string, number>();
  const botTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const roomQueues = new Map<string, Promise<void>>();
  function broadcast(room: Room): void {
    io.to(room.state.code).emit("state:public", publicView(room, publicPort, publicOrigin));
    for (const client of io.sockets.sockets.values()) {
      const session = sessionOf(client);
      if (session.code === room.state.code && session.role === "player" && session.playerId && session.token) {
        client.emit("state:player", playerView(room, session.playerId, session.token));
      }
    }
  }

  function publish(room: Room): void {
    const events = room.state.recentEvents.filter((item) => item.id === room.state.revision);
    broadcast(room);
    for (const item of events) io.to(room.state.code).emit("game:event", item);
  }

  function enqueue<T>(room: Room, task: () => Promise<T>): Promise<T> {
    const previous = roomQueues.get(room.state.code) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(task);
    const tail = run.then(() => undefined, () => undefined);
    roomQueues.set(room.state.code, tail);
    return run.finally(() => { if (roomQueues.get(room.state.code) === tail) roomQueues.delete(room.state.code); });
  }

  function botMutation(state: GameState, botId: string, decision: BotDecision): GameState {
    switch (decision.type) {
      case "ROLL": return rollDice(state, botId);
      case "BUY_ASSETS": return buyPendingAsset(state, botId, decision.assetIds);
      case "PASS_ASSETS": return passPendingAsset(state, botId);
      case "BUY_LEVER": return buyPendingLever(state, botId);
      case "PASS_LEVER": return passPendingLever(state, botId);
      case "PAY": return payPendingPayment(state, botId);
      case "DECLARE_BANKRUPTCY": return declareBankruptcy(state, botId);
      case "USE_LEVER": return useLever(state, botId, decision.leverId);
      case "SELECT_AUCTION_ASSETS": return selectAuctionAssets(state, botId, decision.assetIds);
      case "BID": return placeBid(state, botId, decision.amount);
      case "PASS_BID": return passAuction(state, botId);
      case "RESPOND_TRADE": return respondToTrade(state, botId, decision.accept);
      case "END_TURN": return endTurn(state, botId);
    }
  }

  function pendingBot(room: Room): { playerId: string; profile: BotProfile; decision: BotDecision } | null {
    for (const player of room.state.players) {
      const profile = room.bots[player.id];
      if (!profile) continue;
      const decision = decideBotAction(observeGameForBot(room.state, player.id), player.id, profile);
      if (decision) return { playerId: player.id, profile, decision };
    }
    return null;
  }

  function botDelay(room: Room, decision: BotDecision): number {
    const rolledThisRevision = room.state.recentEvents.some((event) => event.id === room.state.revision && event.type === "dice_rolled");
    const duration = rolledThisRevision ? 2_800 + (room.state.lastRoll?.total ?? 0) * 210
      : decision.type === "ROLL" ? 700
        : decision.type === "BID" || decision.type === "PASS_BID" ? 800
          : 900;
    return Math.round(duration * botDelayScale);
  }

  function scheduleBot(room: Room): void {
    const existing = botTimers.get(room.state.code);
    if (existing) clearTimeout(existing);
    botTimers.delete(room.state.code);
    const pending = pendingBot(room);
    room.botThinkingPlayerId = pending?.playerId ?? null;
    if (!pending) {
      broadcast(room);
      return;
    }
    const expectedRevision = room.state.revision;
    broadcast(room);
    const timer = setTimeout(() => {
      botTimers.delete(room.state.code);
      void enqueue(room, async () => {
        if (room.state.revision !== expectedRevision || room.botThinkingPlayerId !== pending.playerId) {
          scheduleBot(room);
          return;
        }
        const currentProfile = room.bots[pending.playerId];
        const currentDecision = currentProfile ? decideBotAction(observeGameForBot(room.state, pending.playerId), pending.playerId, currentProfile) : null;
        room.botThinkingPlayerId = null;
        if (!currentDecision) {
          scheduleBot(room);
          return;
        }
        const previousState = room.state;
        try {
          room.state = botMutation(room.state, pending.playerId, currentDecision);
          await store.save(room);
        } catch (error) {
          room.state = previousState;
          console.error(`Décision robot impossible (${currentDecision.reason})`, error);
          broadcast(room);
          return;
        }
        publish(room);
        scheduleAuction(room);
        scheduleBot(room);
      });
    }, botDelay(room, pending.decision));
    botTimers.set(room.state.code, timer);
  }

  async function changeRoom(room: Room, change: () => void): Promise<void> {
    await enqueue(room, async () => {
      const previousState = room.state;
      const previousBots = { ...room.bots };
      const previousThinking = room.botThinkingPlayerId;
      try {
        change();
        await store.save(room);
      } catch (error) {
        room.state = previousState;
        room.bots = previousBots;
        room.botThinkingPlayerId = previousThinking;
        throw error;
      }
      publish(room);
      scheduleAuction(room);
      scheduleBot(room);
    });
  }

  function scheduleAuction(room: Room): void {
    const existing = auctionTimers.get(room.state.code); if (existing) clearTimeout(existing);
    auctionTimers.delete(room.state.code);
    const deadline = room.state.auction?.mode === "bidding" ? room.state.auction.deadline : null;
    if (room.state.phase === "PAUSED" && room.state.previousPhase === "AUCTION" && deadline) {
      if (!auctionPausedAt.has(room.state.code)) auctionPausedAt.set(room.state.code, Date.now());
      return;
    }
    if (room.state.phase !== "AUCTION" || !deadline) return;
    const timer = setTimeout(() => {
      void mutate(room, (state) => closeExpiredAuction(state, Date.now())).catch((error) => {
        console.error("Impossible de sauvegarder la clôture de l’enchère", error);
      });
    }, Math.max(0, deadline - Date.now()) + 5);
    auctionTimers.set(room.state.code, timer);
  }

  async function resumeRoom(room: Room): Promise<void> {
    await changeRoom(room, () => {
      const pausedAt = auctionPausedAt.get(room.state.code);
      let next = resumeGame(room.state);
      if (pausedAt && next.auction?.mode === "bidding" && next.auction.deadline) {
        next = { ...next, auction: { ...next.auction, deadline: next.auction.deadline + Date.now() - pausedAt } };
      }
      auctionPausedAt.delete(room.state.code);
      room.state = next;
    });
  }

  async function mutate(room: Room, mutation: (state: GameState) => GameState): Promise<void> {
    await changeRoom(room, () => { room.state = mutation(room.state); });
  }

  function requireRoom(socket: Socket, role?: "admin" | "player"): { room: Room; session: SessionData } {
    const session = sessionOf(socket);
    if (!session.code || !session.token || (role && session.role !== role)) throw new RuleError("UNAUTHORIZED", "Session non autorisée.");
    const room = store.get(session.code);
    if (!room) throw new RuleError("ROOM_NOT_FOUND", "Partie introuvable.");
    return { room, session };
  }

  function requireAdmin(socket: Socket): { room: Room; session: SessionData } {
    const result = requireRoom(socket);
    if (result.session.role !== "player" || !result.session.isHost) {
      throw new RuleError("UNAUTHORIZED", "Seul l’hôte peut administrer la partie.");
    }
    return result;
  }

  const attempts = new Map<string, { count: number; resetAt: number }>();
  function allow(socket: Socket, action: "create" | "join"): void {
    const now = Date.now();
    const limit = action === "create" ? 8 : 30;
    const key = `${action}:${socket.handshake.address}`;
    const current = attempts.get(key);
    if (!current || current.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + 15 * 60_000 });
      return;
    }
    if (current.count >= limit) throw new RuleError("RATE_LIMITED", "Trop de tentatives. Réessayez dans quelques minutes.");
    current.count += 1;
  }

  async function detachSession(socket: Socket): Promise<void> {
    const previous = sessionOf(socket);
    if (!previous.code) return;
    socket.leave(previous.code);
    if (previous.role === "player" && previous.playerId && previous.token) {
      const room = store.get(previous.code);
      const replacementExists = [...io.sockets.sockets.values()].some((client) => client.id !== socket.id && sessionOf(client).token === previous.token);
      if (room && !replacementExists) {
        await mutate(room, (state) => {
          let next = setPlayerConnected(state, previous.playerId!, false);
          const disconnectedPlayer = next.players.find((player) => player.id === previous.playerId);
          const mustPause = Boolean(disconnectedPlayer && !disconnectedPlayer.bankrupt && !disconnectedPlayer.mergedIntoId);
          if (mustPause && next.status === "PLAYING" && next.phase !== "PAUSED" && next.phase !== "FINISHED") next = pauseGame(next, "PLAYER_DISCONNECTED", previous.playerId!);
          return next;
        });
      }
    }
    for (const key of ["code", "role", "token", "playerId", "isHost"] as const) delete previous[key];
  }

  io.on("connection", (socket) => {
    socket.on("room:create", (payloadOrAck: { displayMode?: DisplayMode } | Ack<SessionResult>, maybeAck?: Ack<SessionResult>) => {
      const payload = typeof payloadOrAck === "function" ? {} : payloadOrAck;
      const ack = typeof payloadOrAck === "function" ? payloadOrAck : maybeAck!;
      void safe(ack, async () => {
        allow(socket, "create");
        const displayMode: DisplayMode = payload?.displayMode === "MOBILE_ONLY" ? "MOBILE_ONLY" : "TV";
        await detachSession(socket);
        const { room, adminToken } = store.create(displayMode);
        await store.save(room);
        Object.assign(sessionOf(socket), { code: room.state.code, role: "admin", token: adminToken });
        socket.join(room.state.code);
        broadcast(room);
        return { code: room.state.code, token: adminToken, role: "admin" as const, displayMode, joinUrls: getJoinUrls(room.state.code, publicPort, publicOrigin) };
      });
    });

    socket.on("room:join", (payload: { code?: string; name?: string; color?: string; symbol?: string; hostToken?: string }, ack: Ack<SessionResult>) => void safe(ack, async () => {
      allow(socket, "join");
      const name = payload.name?.trim() ?? "";
      if (name.length < 1 || name.length > 20) throw new Error("INVALID_NAME");
      const joined = store.join(payload.code?.trim().toUpperCase() ?? "", name, payload.color ?? "", payload.symbol ?? "", payload.hostToken);
      await detachSession(socket);
      await store.save(joined.room);
      Object.assign(sessionOf(socket), { code: joined.room.state.code, role: "player", token: joined.playerToken, playerId: joined.playerId, isHost: joined.isHost });
      socket.join(joined.room.state.code);
      broadcast(joined.room);
      return { code: joined.room.state.code, token: joined.playerToken, role: "player" as const, playerId: joined.playerId, isHost: joined.isHost, displayMode: joined.room.displayMode };
    }));

    socket.on("session:resume", (payload: { token?: string }, ack: Ack<SessionResult>) => void safe(ack, async () => {
      const found = payload.token ? store.findByToken(payload.token) : undefined;
      if (!found || !payload.token) throw new Error("SESSION_NOT_FOUND");
      const session = sessionOf(socket);
      if (session.code && (session.code !== found.room.state.code || session.token !== payload.token)) await detachSession(socket);
      Object.assign(session, { code: found.room.state.code, role: found.role, token: payload.token, playerId: found.playerId, isHost: found.isHost });
      socket.join(found.room.state.code);
      if (found.role === "player" && found.playerId) {
        await mutate(found.room, (state) => setPlayerConnected(state, found.playerId!, true));
      } else broadcast(found.room);
      return { code: found.room.state.code, token: payload.token, role: found.role, displayMode: found.room.displayMode, ...(found.isHost !== undefined ? { isHost: found.isHost } : {}), ...(found.playerId ? { playerId: found.playerId } : {}), ...(found.role === "admin" ? { joinUrls: getJoinUrls(found.room.state.code, publicPort, publicOrigin) } : {}) };
    }));

    const playerMutation = (event: string, mutation: (state: GameState, playerId: string) => GameState) => socket.on(event, (payloadOrAck: unknown, maybeAck?: Ack) => {
      const ack = typeof payloadOrAck === "function" ? payloadOrAck as Ack : maybeAck!;
      void safe(ack, async () => { const { room, session } = requireRoom(socket, "player"); await mutate(room, (state) => mutation(state, session.playerId!)); return undefined; });
    });

    socket.on("lobby:set-ready", (payload: { ready?: boolean }, ack: Ack) => void safe(ack, async () => { const { room, session } = requireRoom(socket, "player"); await mutate(room, (state) => setPlayerReady(state, session.playerId!, Boolean(payload.ready))); return undefined; }));
    socket.on("lobby:bot-add", (payload: { profile?: BotProfile }, ack: Ack<{ playerId: string }>) => void safe(ack, async () => {
      const { room } = requireAdmin(socket);
      if (!isBotProfile(payload.profile)) throw new Error("INVALID_BOT_PROFILE");
      let playerId = "";
      await changeRoom(room, () => { playerId = store.addBot(room, payload.profile!); });
      return { playerId };
    }));
    socket.on("lobby:bot-update", (payload: { playerId?: string; profile?: BotProfile }, ack: Ack) => void safe(ack, async () => {
      const { room } = requireAdmin(socket);
      if (!payload.playerId) throw new Error("BOT_NOT_FOUND");
      if (!isBotProfile(payload.profile)) throw new Error("INVALID_BOT_PROFILE");
      await changeRoom(room, () => store.updateBot(room, payload.playerId!, payload.profile!));
      return undefined;
    }));
    socket.on("lobby:bot-remove", (payload: { playerId?: string }, ack: Ack) => void safe(ack, async () => {
      const { room } = requireAdmin(socket);
      if (!payload.playerId) throw new Error("BOT_NOT_FOUND");
      await changeRoom(room, () => store.removeBot(room, payload.playerId!));
      return undefined;
    }));
    socket.on("game:start", (ack: Ack) => void safe(ack, async () => { const { room } = requireAdmin(socket); await mutate(room, startGame); return undefined; }));
    playerMutation("turn:roll", (state, playerId) => rollDice(state, playerId));
    socket.on("purchase:buy", (payload: { assetIds?: string[] }, ack: Ack) => void safe(ack, async () => { const { room, session } = requireRoom(socket, "player"); await mutate(room, (state) => buyPendingAsset(state, session.playerId!, payload.assetIds)); return undefined; }));
    playerMutation("purchase:pass", (state, playerId) => passPendingAsset(state, playerId));
    playerMutation("lever:buy", (state, playerId) => buyPendingLever(state, playerId));
    playerMutation("lever:pass", (state, playerId) => passPendingLever(state, playerId));
    playerMutation("payment:pay", (state, playerId) => payPendingPayment(state, playerId));
    playerMutation("finance:bankruptcy", (state, playerId) => declareBankruptcy(state, playerId));
    socket.on("lever:use", (payload: { leverId?: string }, ack: Ack) => void safe(ack, async () => { const { room, session } = requireRoom(socket, "player"); await mutate(room, (state) => useLever(state, session.playerId!, payload.leverId ?? "")); return undefined; }));
    socket.on("auction:bid", (payload: { amount?: number }, ack: Ack) => void safe(ack, async () => { const { room, session } = requireRoom(socket, "player"); await mutate(room, (state) => placeBid(state, session.playerId!, Number(payload.amount))); return undefined; }));
    playerMutation("auction:pass", (state, playerId) => passAuction(state, playerId));
    socket.on("auction:select", (payload: { assetIds?: string[] }, ack: Ack) => void safe(ack, async () => { const { room, session } = requireRoom(socket, "player"); await mutate(room, (state) => selectAuctionAssets(state, session.playerId!, payload.assetIds ?? [])); return undefined; }));
    socket.on("trade:propose", (payload: TradeProposalPayload, ack: Ack) => void safe(ack, async () => { const { room, session } = requireRoom(socket, "player"); await mutate(room, (state) => proposeTrade(state, session.playerId!, payload)); return undefined; }));
    playerMutation("trade:accept", (state, playerId) => respondToTrade(state, playerId, true));
    playerMutation("trade:reject", (state, playerId) => respondToTrade(state, playerId, false));
    playerMutation("turn:end", (state, playerId) => endTurn(state, playerId));
    socket.on("admin:pause", (ack: Ack) => void safe(ack, async () => { const { room } = requireAdmin(socket); await mutate(room, pauseGame); return undefined; }));
    socket.on("admin:resume", (ack: Ack) => void safe(ack, async () => { const { room } = requireAdmin(socket); await resumeRoom(room); return undefined; }));
    socket.on("admin:end", (ack: Ack) => void safe(ack, async () => { const { room } = requireAdmin(socket); await mutate(room, finishGame); return undefined; }));
    socket.on("admin:restart", (ack: Ack) => void safe(ack, async () => {
      const { room } = requireAdmin(socket);
      await mutate(room, (state) => {
        const restarted = restartGame(state);
        return { ...restarted, players: restarted.players.map((player) => room.bots[player.id] ? { ...player, connected: true, ready: true } : { ...player, ready: false }) };
      });
      return undefined;
    }));
    socket.on("disconnect", () => { void detachSession(socket).catch((error) => console.error("Déconnexion incomplète", error)); });
  });
}
