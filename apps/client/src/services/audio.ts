import { ref } from "vue";
import type { GameEventType } from "@orbisium/game";

export type SoundName = "dice" | "move" | "reveal" | "visit" | "purchase" | "payment" | "pass" | "market" | "turn" | "pause" | "resume" | "start" | "enable";
export const soundEnabled = ref(localStorage.getItem("orbisium:sound") !== "off");
let context: AudioContext | null = null;
let reminderNodes: { sources: AudioScheduledSourceNode[]; gains: GainNode[] } | null = null;

function audioContext(): AudioContext {
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume();
  return context;
}

function tone(frequency: number, offset: number, duration: number, volume: number, type: OscillatorType = "sine"): void {
  const ctx = audioContext();
  const start = ctx.currentTime + offset;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(.018, duration / 4));
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + .02);
}

function softTap(offset: number, pitch = 420, volume = .045): void {
  const ctx = audioContext();
  const duration = .075;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * Math.exp(-index / (ctx.sampleRate * .012));
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  filter.type = "bandpass";
  filter.frequency.value = pitch;
  filter.Q.value = 1.4;
  gain.gain.value = volume;
  source.buffer = buffer;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(ctx.currentTime + offset);
}

export function playSound(name: SoundName): void {
  if (!soundEnabled.value) return;
  try {
    if (name === "dice") {
      softTap(0, 260, .032); softTap(.045, 410, .028); softTap(.09, 320, .032);
      softTap(.15, 540, .025); softTap(.22, 370, .03); softTap(.31, 620, .022);
      tone(196, 0, .42, .012, "sine"); tone(784, .36, .38, .018, "sine");
    }
    if (name === "move") { tone(520, 0, .11, .025, "triangle"); tone(620, .09, .13, .022, "triangle"); }
    if (name === "reveal") { softTap(0, 700, .026); tone(360, .02, .32, .025); }
    if (name === "visit") { tone(310, 0, .22, .022, "triangle"); tone(415, .08, .28, .02); }
    if (name === "purchase") { tone(392, 0, .42, .045); tone(494, .08, .48, .04); tone(659, .17, .62, .035); softTap(.02, 920, .018); }
    if (name === "payment") { softTap(0, 780, .03); tone(466, .03, .28, .035); tone(587, .12, .4, .03); }
    if (name === "pass") tone(330, 0, .24, .02, "triangle");
    if (name === "market") { tone(440, 0, .42, .025); tone(554, .12, .5, .025); tone(415, .22, .56, .02); }
    if (name === "turn") { tone(523, 0, .3, .026); tone(659, .11, .42, .022); }
    if (name === "pause") { tone(392, 0, .35, .025); tone(294, .13, .45, .022); }
    if (name === "resume") { tone(330, 0, .28, .026); tone(440, .11, .42, .028); }
    if (name === "start") { tone(330, 0, .5, .03); tone(440, .12, .58, .032); tone(554, .25, .72, .03); }
    if (name === "enable") { softTap(0, 620, .025); tone(523, .03, .28, .024); }
  } catch { /* Audio peut être bloqué avant le premier geste utilisateur. */ }
}

/**
 * Souffle très léger tant qu'une décision obligatoire attend le joueur.
 * Le niveau reste volontairement sous celui des sons événementiels et la
 * boucle s'arrête immédiatement dès que l'action est résolue.
 */
export function setActionReminder(active: boolean): void {
  if (!active || !soundEnabled.value) {
    if (!reminderNodes) return;
    const ctx = context;
    if (ctx) {
      const stopAt = ctx.currentTime + .16;
      reminderNodes.gains.forEach((gain) => gain.gain.exponentialRampToValueAtTime(.0001, stopAt));
      reminderNodes.sources.forEach((source) => { try { source.stop(stopAt + .03); } catch { /* déjà arrêté */ } });
    }
    reminderNodes = null;
    return;
  }
  if (reminderNodes) return;
  try {
    const ctx = audioContext();
    const master = ctx.createGain();
    const toneGain = ctx.createGain();
    const shimmerGain = ctx.createGain();
    const pulseDepth = ctx.createGain();
    const pulse = ctx.createOscillator();
    const base = ctx.createOscillator();
    const shimmer = ctx.createOscillator();
    master.gain.value = .42;
    toneGain.gain.value = .006;
    shimmerGain.gain.value = .0022;
    pulseDepth.gain.value = .0018;
    pulse.type = "sine"; pulse.frequency.value = .22;
    base.type = "sine"; base.frequency.value = 196;
    shimmer.type = "sine"; shimmer.frequency.value = 293.66;
    pulse.connect(pulseDepth).connect(toneGain.gain);
    base.connect(toneGain).connect(master);
    shimmer.connect(shimmerGain).connect(master);
    master.connect(ctx.destination);
    pulse.start(); base.start(); shimmer.start();
    reminderNodes = { sources: [pulse, base, shimmer], gains: [master, toneGain, shimmerGain, pulseDepth] };
  } catch { /* Un premier geste utilisateur peut être requis par le navigateur. */ }
}

/** Petit contact bois/verre à chaque case, puis tintement doux sur la destination. */
export function playMoveStep(step: number, total: number, audible = true): void {
  if (!soundEnabled.value || !audible) return;
  try {
    const progress = total > 1 ? (step - 1) / (total - 1) : 1;
    softTap(0, 430 + progress * 170, .018);
    tone(360 + progress * 90, 0, .085, .009, "triangle");
    if (step === total) {
      tone(659, .035, .34, .024, "sine");
      tone(880, .12, .46, .017, "sine");
    }
  } catch { /* Le navigateur peut attendre un premier geste utilisateur. */ }
}

const eventSounds: Partial<Record<GameEventType, SoundName>> = {
  game_started: "start", dice_rolled: "dice", pawn_moved: "move", space_landed: "reveal", purchase_offered: "reveal",
  asset_visited: "visit", payment_due: "payment", payment_completed: "payment", asset_purchased: "purchase", purchase_passed: "pass",
  trend_drawn: "market", lever_offered: "reveal", lever_drawn: "purchase", lever_passed: "pass", lever_used: "purchase", auction_started: "reveal", auction_bid: "payment", auction_won: "purchase",
  trade_proposed: "reveal", trade_accepted: "purchase", trade_rejected: "pass", player_bankrupt: "pause",
  dividend_received: "purchase", customs_applied: "pause", turn_skipped: "pass",
  turn_started: "turn", game_paused: "pause", game_resumed: "resume", game_finished: "start"
};

export function playEventSound(type: GameEventType): void {
  const sound = eventSounds[type];
  if (sound) playSound(sound);
}

export function toggleSound(): void {
  soundEnabled.value = !soundEnabled.value;
  localStorage.setItem("orbisium:sound", soundEnabled.value ? "on" : "off");
  if (soundEnabled.value) playSound("enable");
  else setActionReminder(false);
}
