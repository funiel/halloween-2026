let decoder: AudioContext | null = null;

/** One AudioContext shared by every voice note, only used to decode waveforms (never plays). */
export function audioDecoder() {
  decoder ??= new AudioContext();
  return decoder;
}
