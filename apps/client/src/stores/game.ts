import { defineStore } from "pinia";
import { io, type Socket } from "socket.io-client";
import type { BotProfile, CommandResult, PlayerGameView, PublicGameView, SessionResult, TradeProposalPayload } from "@richesses-espace/protocol";
import type { GameEvent } from "@richesses-espace/game";
import { cancelPendingTurnStart, playEventSound, playMoveStep, playTurnStart, prepareAudioForForeground, setActionReminder, suspendAudioForBackground } from "../services/audio";
import { playErrorHaptic, playEventHaptic } from "../services/haptics";
import {
  LOCAL_GAME_CODE,
  LOCAL_GAME_STORAGE_KEY,
  finishLocalRace,
  getLocalRaceCompletion,
  getLocalBotTurn,
  hasSavedLocalGame as hasSavedLocalGameState,
  resumeLocalGame,
  runLocalBotTurn,
  runLocalGameCommand,
  startLocalGame,
  type LocalGameSnapshot
} from "../local/local-game";

type Role = "admin" | "player" | null;
type DiceAnimationState = { eventId: number; playerId: string; dice: [number, number]; total: number; rolling: boolean };
type PersistentNotification = { key: string; event: GameEvent };
const wait = (duration: number) => new Promise<void>((resolve) => window.setTimeout(resolve, duration));
const silentNotificationTypes = new Set(["dice_rolled", "pawn_moved", "turn_started", "player_joined", "player_ready", "ship_selected", "ship_race_started", "auction_bid"]);
const mandatoryActionNames = new Set(["SELECT_STARTING_SHIP", "ROLL_DICE", "BUY_ASSET", "PASS_ASSET", "BUY_LEVER", "PASS_LEVER", "PAY_RETURNS", "DECLARE_BANKRUPTCY", "SELECT_AUCTION_ASSETS", "BID", "PASS_BID", "ACCEPT_TRADE", "END_TURN"]);
const localGameBuild = import.meta.env.VITE_LOCAL_GAME === "true";
let localBotTimer = 0;
let localRaceTimer = 0;
let localStorageListenerBound = false;

export const useGameStore = defineStore("game", {
  state: () => ({
    socket: null as Socket | null,
    game: null as PublicGameView | null,
    player: null as PlayerGameView | null,
    role: null as Role,
    sessionToken: null as string | null,
    connected: false,
    pending: false,
    error: "",
    animatedEvent: null as GameEvent | null,
    eventQueue: [] as GameEvent[],
    processingEvents: false,
    notifications: [] as PersistentNotification[],
    diceAnimation: null as DiceAnimationState | null,
    visualPlayerPositions: {} as Record<string, number>,
    movingPlayerId: null as string | null,
    announcedRollCueKey: null as string | null,
    appBackgrounded: false,
    localGame: localGameBuild
  }),
  getters: {
    me(state) { return state.game?.players.find((player) => player.id === state.player?.playerId) ?? null; },
    activePlayer(state) { return state.game?.players.find((player) => player.id === state.game?.activePlayerId) ?? null; }
  },
  actions: {
    applyLocalGameSnapshot(snapshot: LocalGameSnapshot) {
      const previous = this.game;
      if (previous?.phase === "FINISHED" && ["LOBBY", "SHIP_SELECTION"].includes(snapshot.game.phase)) this.announcedRollCueKey = null;
      for (const player of snapshot.game.players) {
        const previousPlayer = previous?.players.find((item) => item.id === player.id);
        if (!previousPlayer) this.visualPlayerPositions[player.id] = player.position;
        else if (previousPlayer.position !== player.position) this.visualPlayerPositions[player.id] = previousPlayer.position;
        else if (this.movingPlayerId !== player.id) this.visualPlayerPositions[player.id] = player.position;
      }
      this.game = snapshot.game;
      this.player = snapshot.player;
      this.role = snapshot.player ? "player" : "admin";
      this.sessionToken = null;
      this.connected = true;
      this.error = "";
      this.syncAudioAttention();
      for (const event of snapshot.events) this.enqueueEvent(event);
    },
    bindLocalGameSync() {
      if (!this.localGame || localStorageListenerBound) return;
      localStorageListenerBound = true;
      window.addEventListener("storage", (event) => {
        if (event.key !== LOCAL_GAME_STORAGE_KEY) return;
        const mode = this.game?.displayMode ?? "MOBILE_ONLY";
        const previousRevision = this.game?.revision ?? 0;
        const next = resumeLocalGame(mode, this.role !== "admin", true);
        if (!next) {
          this.game = null;
          this.player = null;
          this.role = null;
          return;
        }
        next.events = next.game.recentEvents.filter((item) => item.id > previousRevision);
        this.applyLocalGameSnapshot(next);
        this.scheduleLocalBot();
      });
    },
    scheduleLocalBot() {
      if (!this.localGame) return;
      window.clearTimeout(localBotTimer);
      window.clearTimeout(localRaceTimer);
      const race = this.role === "player" ? getLocalRaceCompletion() : null;
      if (race) {
        if (this.game?.botThinkingPlayerId) this.game = { ...this.game, botThinkingPlayerId: null };
        localRaceTimer = window.setTimeout(() => {
          const next = finishLocalRace(race.expectedRevision);
          if (next) this.applyLocalGameSnapshot(next);
          this.scheduleLocalBot();
        }, race.delay);
        return;
      }
      const turn = this.role === "player" ? getLocalBotTurn() : null;
      if (!turn) {
        if (this.game?.botThinkingPlayerId) this.game = { ...this.game, botThinkingPlayerId: null };
        return;
      }
      if (this.game) this.game = { ...this.game, botThinkingPlayerId: turn.playerId };
      localBotTimer = window.setTimeout(() => {
        const next = runLocalBotTurn(turn.expectedRevision, turn.playerId);
        if (next) this.applyLocalGameSnapshot(next);
        this.scheduleLocalBot();
      }, turn.delay);
    },
    connect() {
      if (this.localGame) {
        this.bindLocalGameSync();
        const saved = resumeLocalGame("MOBILE_ONLY");
        if (saved) {
          this.applyLocalGameSnapshot(saved);
          this.scheduleLocalBot();
        } else {
          this.game = null;
          this.player = null;
          this.role = null;
          this.connected = true;
        }
        return;
      }
      if (this.socket) return;
      this.socket = io({ autoConnect: true });
      this.socket.on("connect", () => {
        this.connected = true;
        if (this.sessionToken) {
          void this.resume(this.sessionToken).catch(() => {
            this.role = null;
            this.sessionToken = null;
            this.player = null;
          });
        }
      });
      this.socket.on("disconnect", () => {
        this.connected = false;
        this.player = null;
        setActionReminder(false);
      });
      this.socket.on("state:public", (state: PublicGameView) => {
        const previous = this.game;
        const restarted = previous?.phase === "FINISHED" && state.phase === "LOBBY";
        if (restarted) {
          this.visualPlayerPositions = {};
          this.eventQueue = [];
          this.notifications = [];
          this.animatedEvent = null;
          this.diceAnimation = null;
          this.movingPlayerId = null;
          this.announcedRollCueKey = null;
        }
        for (const player of state.players) {
          const previousPlayer = previous?.players.find((item) => item.id === player.id);
          if (restarted || !previousPlayer) this.visualPlayerPositions[player.id] = player.position;
          else if (previousPlayer.position !== player.position) this.visualPlayerPositions[player.id] = previousPlayer.position;
          else if (this.movingPlayerId !== player.id) this.visualPlayerPositions[player.id] = player.position;
        }
        this.game = state;
        this.syncAudioAttention();
      });
      this.socket.on("state:player", (state: PlayerGameView) => {
        this.player = state;
        this.syncAudioAttention();
      });
      this.socket.on("game:event", (event: GameEvent) => { this.enqueueEvent(event); });
    },
    handleAppBackground() {
      suspendAudioForBackground();
      if (this.appBackgrounded) return;
      this.appBackgrounded = true;
      if (this.role !== "player") return;

      if (this.localGame) {
        if (!this.game || ["LOBBY", "PAUSED", "FINISHED"].includes(this.game.phase)) return;
        try {
          const result = runLocalGameCommand("admin:pause");
          this.applyLocalGameSnapshot(result.snapshot);
          this.scheduleLocalBot();
        } catch (error) {
          this.error = error instanceof Error ? error.message : "Impossible de mettre la partie en pause.";
        }
        return;
      }

      // Une fermeture volontaire du transport est reçue immédiatement par le
      // serveur. Son mécanisme de déconnexion existant gèle alors toute la salle.
      if (this.socket?.connected) this.socket.disconnect();
    },
    handleAppForeground() {
      prepareAudioForForeground();
      if (!this.appBackgrounded) return;
      this.appBackgrounded = false;
      if (this.localGame || this.role !== "player" || !this.sessionToken) return;
      if (this.socket) {
        if (!this.socket.connected) this.socket.connect();
      } else {
        this.connect();
      }
    },
    enqueueEvent(event: GameEvent) {
      this.eventQueue.push(event);
      if (!this.processingEvents) void this.processEventQueue();
    },
    addNotification(event: GameEvent) {
      if (event.type === "game_restarted") { this.notifications = []; return; }
      if (silentNotificationTypes.has(event.type)) return;
      if (event.type === "game_started") this.notifications = [];
      const key = `${event.id}:${event.type}`;
      if (this.notifications.some((notification) => notification.key === key)) return;
      this.notifications = [...this.notifications, { key, event }].slice(-5);
    },
    dismissNotification(key: string) {
      this.notifications = this.notifications.filter((notification) => notification.key !== key);
    },
    clearNotifications() { this.notifications = []; },
    async processEventQueue() {
      if (this.processingEvents) return;
      this.processingEvents = true;
      try {
        while (this.eventQueue.length) {
          const event = this.eventQueue.shift()!;
          this.animatedEvent = event;
          this.addNotification(event);
          if (this.role === "player") playEventHaptic(event, this.player?.playerId ?? null);

          if (event.type === "dice_rolled") {
            const first = Number(event.data?.first ?? 1);
            const second = Number(event.data?.second ?? 1);
            const total = Number(event.data?.total ?? first + second);
            this.diceAnimation = { eventId: event.id, playerId: event.playerId ?? "", dice: [first, second], total, rolling: true };
            playEventSound(event.type);
            await wait(920);
            if (this.diceAnimation?.eventId === event.id) this.diceAnimation.rolling = false;
            await wait(520);
            continue;
          }

          if (event.type === "pawn_moved" && event.playerId) {
            // The dice result has had its own reveal time. Remove that overlay
            // before the first step so the whole trip remains visible.
            this.diceAnimation = null;
            const boardLength = this.game?.board.length ?? 78;
            const from = Number(event.data?.from ?? this.visualPlayerPositions[event.playerId] ?? 0);
            const to = Number(event.data?.to ?? from);
            const steps = Number(event.data?.steps ?? ((to - from + boardLength) % boardLength));
            this.movingPlayerId = event.playerId;
            this.visualPlayerPositions[event.playerId] = from;
            for (let step = 1; step <= steps; step += 1) {
              await wait(210);
              this.visualPlayerPositions[event.playerId] = (from + step) % boardLength;
              playMoveStep(step, steps);
            }
            await wait(320);
            this.visualPlayerPositions[event.playerId] = to;
            this.movingPlayerId = null;
            continue;
          }

          if (event.type === "turn_started") {
            // Le téléphone se fie à l'état personnel, plus fiable qu'un événement
            // pouvant arriver avant le déverrouillage audio. L'écran TV garde ce son.
            if (this.role === "admin") playEventSound(event.type);
            await wait(440);
            continue;
          }

          playEventSound(event.type);
          await wait(event.type === "space_landed" ? 700 : 440);
        }
      } finally {
        this.animatedEvent = null;
        this.processingEvents = false;
        this.movingPlayerId = null;
        this.diceAnimation = null;
      }
    },
    async command<T = undefined>(event: string, payload?: unknown): Promise<T | undefined> {
      this.pending = true;
      this.error = "";
      try {
        if (this.localGame) {
          const result = runLocalGameCommand(event, payload);
          this.applyLocalGameSnapshot(result.snapshot);
          this.scheduleLocalBot();
          return result.data as T | undefined;
        }
        this.connect();
        const result = await new Promise<CommandResult<T>>((resolve) => {
          if (payload === undefined) this.socket!.emit(event, resolve);
          else this.socket!.emit(event, payload, resolve);
        });
        if (!result.ok) throw new Error(result.error?.message ?? "Action impossible.");
        return result.data;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Action impossible.";
        if (this.role === "player") playErrorHaptic();
        throw error;
      } finally { this.pending = false; }
    },
    async createDisplaySession() {
      if (this.localGame) {
        this.bindLocalGameSync();
        const saved = resumeLocalGame("TV", false);
        if (saved) this.applyLocalGameSnapshot(saved);
        else {
          this.game = null;
          this.player = null;
          this.role = "admin";
          this.connected = true;
        }
        return;
      }
      this.connect();
      const existing = sessionStorage.getItem("richesses-espace:admin");
      if (existing) {
        try { await this.resume(existing); return; } catch { sessionStorage.removeItem("richesses-espace:admin"); }
      }
      const session = await this.command<SessionResult>("room:create", { displayMode: "TV" });
      if (session) {
        this.role = "admin"; this.sessionToken = session.token;
        sessionStorage.setItem("richesses-espace:admin", session.token);
      }
    },
    async createMobileSession(startFresh = false): Promise<string | undefined> {
      if (this.localGame) {
        this.bindLocalGameSync();
        if (startFresh) {
          window.clearTimeout(localBotTimer);
          this.game = null;
          this.player = null;
          this.role = null;
          this.announcedRollCueKey = null;
          cancelPendingTurnStart();
          setActionReminder(false);
          this.error = "";
          this.connected = true;
          return LOCAL_GAME_CODE;
        }
        const saved = resumeLocalGame("MOBILE_ONLY");
        if (saved) {
          this.applyLocalGameSnapshot(saved);
          this.scheduleLocalBot();
        } else {
          this.game = null;
          this.player = null;
          this.role = null;
          this.connected = true;
        }
        return LOCAL_GAME_CODE;
      }
      this.connect();
      const session = await this.command<SessionResult>("room:create", { displayMode: "MOBILE_ONLY" });
      if (!session) return undefined;
      this.role = "admin";
      this.sessionToken = session.token;
      sessionStorage.setItem(`richesses-espace:mobile-host:${session.code}`, session.token);
      return session.code;
    },
    async resume(token: string) {
      const session = await this.command<SessionResult>("session:resume", { token });
      if (!session) return;
      this.role = session.role; this.sessionToken = token;
      if (session.role === "player") localStorage.setItem(`richesses-espace:player:${session.code}`, token);
    },
    async resumePlayer(code: string) {
      if (this.localGame) {
        this.connect();
        return;
      }
      this.connect();
      const token = localStorage.getItem(`richesses-espace:player:${code.toUpperCase()}`);
      if (!token) return;
      try { await this.resume(token); } catch { localStorage.removeItem(`richesses-espace:player:${code.toUpperCase()}`); }
    },
    async join(code: string, name: string, color: string, symbol: string, botProfiles: number | readonly BotProfile[] = ["BALANCED"]) {
      if (this.localGame) {
        this.error = "";
        try {
          this.applyLocalGameSnapshot(startLocalGame({ name, color, symbol }, "MOBILE_ONLY", true, botProfiles));
          this.scheduleLocalBot();
        } catch (error) {
          this.error = error instanceof Error ? error.message : "Impossible de créer la partie solo.";
          throw error;
        }
        return;
      }
      const normalizedCode = code.toUpperCase();
      const hostToken = sessionStorage.getItem(`richesses-espace:mobile-host:${normalizedCode}`) ?? undefined;
      const session = await this.command<SessionResult>("room:join", { code: normalizedCode, name, color, symbol, hostToken });
      if (!session) return;
      this.role = "player"; this.sessionToken = session.token;
      localStorage.setItem(`richesses-espace:player:${session.code}`, session.token);
    },
    syncAudioAttention() {
      const gameAcceptsActions = Boolean(this.game && !["LOBBY", "PAUSED", "FINISHED"].includes(this.game.phase));
      const actionRequired = Boolean(this.role === "player" && gameAcceptsActions && this.player?.allowedActions.some((action) => mandatoryActionNames.has(action)));
      setActionReminder(actionRequired);

      const playerId = this.player?.playerId;
      const canRollNow = Boolean(
        playerId
        && gameAcceptsActions
        && this.game?.activePlayerId === playerId
        && this.player?.allowedActions.includes("ROLL_DICE")
      );
      if (!canRollNow || !this.game || !playerId) {
        cancelPendingTurnStart();
        return;
      }
      const turnKey = `${this.game.code}:${this.game.roundNumber}:${this.game.turnNumber}:${playerId}`;
      if (turnKey === this.announcedRollCueKey) return;
      this.announcedRollCueKey = turnKey;
      playTurnStart();
    },
    syncActionReminder() {
      this.syncAudioAttention();
    },
    hasSavedLocalGame() { return hasSavedLocalGameState(); },
    setReady(ready: boolean) { return this.command("lobby:set-ready", { ready }); },
    addBot(profile: BotProfile) { return this.command("lobby:bot-add", { profile }); },
    updateBot(playerId: string, profile: BotProfile) { return this.command("lobby:bot-update", { playerId, profile }); },
    removeBot(playerId: string) { return this.command("lobby:bot-remove", { playerId }); },
    startGame() { return this.command("game:start"); },
    selectStartingShip(shipId: string) { return this.command("race:select-ship", { shipId }); },
    roll() { return this.command("turn:roll"); },
    buy(assetIds: string[]) { return this.command("purchase:buy", { assetIds }); },
    pass() { return this.command("purchase:pass"); },
    buyLever() { return this.command("lever:buy"); },
    passLever() { return this.command("lever:pass"); },
    payReturns() { return this.command("payment:pay"); },
    declareBankruptcy() { return this.command("finance:bankruptcy"); },
    useLever(leverId: string) { return this.command("lever:use", { leverId }); },
    bid(amount: number) { return this.command("auction:bid", { amount }); },
    passBid() { return this.command("auction:pass"); },
    selectAuctionAssets(assetIds: string[]) { return this.command("auction:select", { assetIds }); },
    proposeTrade(offer: TradeProposalPayload) { return this.command("trade:propose", offer); },
    acceptTrade() { return this.command("trade:accept"); },
    rejectTrade() { return this.command("trade:reject"); },
    endTurn() { return this.command("turn:end"); },
    pause() { return this.command("admin:pause"); },
    resumeGame() { return this.command("admin:resume"); },
    finish() { return this.command("admin:end"); },
    restart() { return this.command("admin:restart"); }
  }
});
