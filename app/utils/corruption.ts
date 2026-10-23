import type { InjectionKey } from "vue";

export interface HauntedTarget {
  words: () => string[];
  visible: () => boolean;
  replace: (words: Record<number, string>) => void;
}

export const hauntingKey: InjectionKey<(target: HauntedTarget) => () => void> = Symbol("model-haunting");

export function corruptionProfile(percent: number, meltdown = false) {
  const strength = Math.min(1, Math.max(0, (percent - 80) / 20));
  const wordStrength = Math.min(1, Math.max(0, (percent - 70) / 30));
  return {
    strength,
    interval: meltdown ? 90 : 160 + 10000 * (1 - strength) ** 2,
    duration: meltdown ? 480 : 100 + strength * 320,
    displacement: meltdown ? 36 : 2 + strength ** 2 * 22,
    bands: meltdown ? 12 : 1 + Math.floor(strength * 7),
    words: percent < 70 ? 0 : meltdown ? 18 : 1 + Math.floor(wordStrength ** 4 * 9),
    wordInterval: meltdown ? 450 : Math.round(700 + 59300 * (1 - wordStrength) ** 3),
    wordHold: meltdown ? 450 : Math.round(220 + wordStrength ** 2 * 980),
  };
}
