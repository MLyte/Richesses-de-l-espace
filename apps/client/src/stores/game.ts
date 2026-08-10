import { defineStore } from "pinia";
import { io, type Socket } from "socket.io-client";
import type { CommandResult, PlayerGameView, PublicGameView, SessionResult, TradeProposalPayload } from "@orbisium/protocol";
import type { GameEvent } from "@orbisium/game";
import { playEventSound, playMoveStep, setActionReminder } from "../services/audio";
import { playErrorHaptic, playEventHaptic } from "../services/haptics";

type Role = "admin" | "player" | null;
type DiceAnimationState = { eventId: number; playerId: string; dice: [number, number]; total: number; rolling: boolean };
type PersistentNotification = { key: string; event: GameEvent };
const wait = (duration: number) => new Promise<void>((resolve) => window.setTimeout(resolve, duration));
const silentNotificationTypes = new Set(["dice_rolled", "pawn_moved", "turn_started", "player_joined", "player_ready"]);
const mandatoryActionNames = new Set(["ROLL_DICE", "BUY_ASSET", "PASS_ASSET", "BUY_LEVER", "PASS_LEVER", "PAY_RETURNS", "DECLARE_BANKRUPTCY", "SELECT_AUCTION_ASSETS", "BID", "PASS_BID", "ACCEPT_TRADE", "END_TURN"]);

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
    movingPlayerId: null as string | null
  }),
  getters: {
    me(state) { return state.game?.players.find((player) => player.id === state.player?.playerId) ?? null; },
    activePlayer(state) { return state.game?.players.find((player) => player.id === state.game?.activePlayerId) ?? null; }
  },
  actions: {
    connect() {
      if (this.socket) return;
      this.socket = io({ autoConnect: true });
      this.socket.on("connect", () => { this.connected = true; });
      this.socket.on("disconnect", () => { this.connected = false; setActionReminder(false); });
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
        }
        for (const player of state.players) {
          const previousPlayer = previous?.players.find((item) => item.id === player.id);
          if (restarted || !previousPlayer) this.visualPlayerPositions[player.id] = player.position;
          else if (previousPlayer.position !== player.position) this.visualPlayerPositions[player.id] = previousPlayer.position;
          else if (this.movingPlayerId !== player.id) this.visualPlayerPositions[player.id] = player.position;
        }
        this.game = state;
      });
      this.socket.on("state:player", (state: PlayerGameView) => {
        this.player = state;
        setActionReminder(state.allowedActions.some((action) => mandatoryActionNames.has(action)));
      });
      this.socket.on("game:event", (event: GameEvent) => { this.enqueueEvent(event); });
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
          const moneyEvent = event.type === "payment_due" || event.type === "payment_completed";
          const concerned = event.data?.payerId === this.player?.playerId || event.data?.recipientId === this.player?.playerId;
          if (this.role === "player") playEventHaptic(event, this.player?.playerId ?? null);

          if (event.type === "dice_rolled") {
            const first = Number(event.data?.first ?? 1);
            const second = Number(event.data?.second ?? 1);
            const total = Number(event.data?.total ?? first + second);
            this.diceAnimation = { eventId: event.id, playerId: event.playerId ?? "", dice: [first, second], total, rolling: true };
            if (!moneyEvent || this.role === "admin" || concerned) playEventSound(event.type);
            await wait(920);
            if (this.diceAnimation?.eventId === event.id) this.diceAnimation.rolling = false;
            await wait(520);
            continue;
          }

          if (event.type === "pawn_moved" && event.playerId) {
            const boardLength = this.game?.board.length ?? 78;
            const from = Number(event.data?.from ?? this.visualPlayerPositions[event.playerId] ?? 0);
            const to = Number(event.data?.to ?? from);
            const steps = Number(event.data?.steps ?? ((to - from + boardLength) % boardLength));
            this.movingPlayerId = event.playerId;
            this.visualPlayerPositions[event.playerId] = from;
            for (let step = 1; step <= steps; step += 1) {
              await wait(210);
              this.visualPlayerPositions[event.playerId] = (from + step) % boardLength;
              playMoveStep(step, steps, this.role === "admin" || event.playerId === this.player?.playerId);
            }
            await wait(320);
            this.visualPlayerPositions[event.playerId] = to;
            this.movingPlayerId = null;
            this.diceAnimation = null;
            continue;
          }

          if (event.type === "turn_started") {
            if (this.role === "admin" || event.playerId === this.player?.playerId) playEventSound(event.type);
            await wait(440);
            continue;
          }

          if (!moneyEvent || this.role === "admin" || concerned) playEventSound(event.type);
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
      this.connect();
      this.pending = true;
      this.error = "";
      try {
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
      this.connect();
      const existing = sessionStorage.getItem("orbisium:admin");
      if (existing) {
        try { await this.resume(existing); return; } catch { sessionStorage.removeItem("orbisium:admin"); }
      }
      const session = await this.command<SessionResult>("room:create", { displayMode: "TV" });
      if (session) {
        this.role = "admin"; this.sessionToken = session.token;
        sessionStorage.setItem("orbisium:admin", session.token);
      }
    },
    async createMobileSession(): Promise<string | undefined> {
      this.connect();
      const session = await this.command<SessionResult>("room:create", { displayMode: "MOBILE_ONLY" });
      if (!session) return undefined;
      this.role = "admin";
      this.sessionToken = session.token;
      sessionStorage.setItem(`orbisium:mobile-host:${session.code}`, session.token);
      return session.code;
    },
    async resume(token: string) {
      const session = await this.command<SessionResult>("session:resume", { token });
      if (!session) return;
      this.role = session.role; this.sessionToken = token;
      if (session.role === "player") localStorage.setItem(`orbisium:player:${session.code}`, token);
    },
    async resumePlayer(code: string) {
      this.connect();
      const token = localStorage.getItem(`orbisium:player:${code.toUpperCase()}`);
      if (!token) return;
      try { await this.resume(token); } catch { localStorage.removeItem(`orbisium:player:${code.toUpperCase()}`); }
    },
    async join(code: string, name: string, color: string, symbol: string) {
      const normalizedCode = code.toUpperCase();
      const hostToken = sessionStorage.getItem(`orbisium:mobile-host:${normalizedCode}`) ?? undefined;
      const session = await this.command<SessionResult>("room:join", { code: normalizedCode, name, color, symbol, hostToken });
      if (!session) return;
      this.role = "player"; this.sessionToken = session.token;
      localStorage.setItem(`orbisium:player:${session.code}`, session.token);
    },
    syncActionReminder() {
      setActionReminder(Boolean(this.player?.allowedActions.some((action) => mandatoryActionNames.has(action))));
    },
    setReady(ready: boolean) { return this.command("lobby:set-ready", { ready }); },
    startGame() { return this.command("game:start"); },
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
