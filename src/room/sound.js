import { useSyncExternalStore } from "react";

// One global mute switch. Sound is OFF until the visitor turns it on, and the
// choice is remembered. Nothing ever plays without a click first.
const KEY = "site-sound";
let on = false;
try { on = localStorage.getItem(KEY) === "on"; } catch { /* storage blocked: stay off */ }
const listeners = new Set();
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export function setSound(next) {
  on = next;
  try { localStorage.setItem(KEY, next ? "on" : "off"); } catch { /* ignore */ }
  listeners.forEach((fn) => fn());
  if (next) playTick();
}
export const useSoundOn = () => useSyncExternalStore(subscribe, () => on);

let audio;
// Placeholder UI click, synthesized so no audio files are needed yet.
export function playTick() {
  if (!on) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "square";
    osc.frequency.value = 520;
    gain.gain.setValueAtTime(0.03, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.07);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.08);
  } catch { /* audio unavailable */ }
}
