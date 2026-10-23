const MAX_SECONDS = 120;

/** Voice notes via MediaRecorder. Safari records mp4/aac, Chrome mp4 or webm/opus. */
export function useRecorder(onDone: (file: File) => void) {
  const recording = ref(false);
  const seconds = ref(0);
  /** Recent loudness samples, 0–1, for the little waveform. */
  const levels = ref<number[]>([]);

  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let audio: AudioContext | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  let frame = 0;

  const supported = computed(() => import.meta.client && "MediaRecorder" in window && !!navigator.mediaDevices?.getUserMedia);

  async function start() {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((t) => MediaRecorder.isTypeSupported(t));
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      const type = (recorder?.mimeType || mimeType || "audio/webm").split(";")[0]!;
      const ext = type.includes("mp4") ? "m4a" : "webm";
      const length = `${Math.floor(seconds.value / 60)}m${String(seconds.value % 60).padStart(2, "0")}s`;
      cleanup();
      if (chunks.length) onDone(new File(chunks, `voice-note-${length}.${ext}`, { type }));
    };
    recorder.start(250);

    recording.value = true;
    seconds.value = 0;
    levels.value = [];
    timer = setInterval(() => {
      seconds.value++;
      if (seconds.value >= MAX_SECONDS) stop();
    }, 1000);

    audio = new AudioContext();
    const analyser = audio.createAnalyser();
    analyser.fftSize = 256;
    audio.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128);
      // Smoothed, so the waveform rolls instead of jittering.
      const prev = levels.value.at(-1) ?? 0;
      levels.value = [...levels.value.slice(-31), prev * 0.55 + Math.min(1, peak * 2.5) * 0.45];
      frame = requestAnimationFrame(tick);
    };
    tick();
  }

  function stop() {
    if (recorder?.state === "recording") recorder.stop();
  }

  function cancel() {
    if (recorder) recorder.onstop = null;
    stop();
    cleanup();
  }

  function cleanup() {
    clearInterval(timer);
    cancelAnimationFrame(frame);
    stream?.getTracks().forEach((t) => t.stop());
    audio?.close();
    stream = null;
    audio = null;
    recording.value = false;
  }

  onBeforeUnmount(cancel);

  return { supported, recording, seconds, levels, start, stop, cancel };
}
