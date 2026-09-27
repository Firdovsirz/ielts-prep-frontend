/** Minimal typings for the (prefixed) Web Speech recognition API. */
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const recognitionSupported = () => typeof window !== 'undefined' && recognitionCtor() !== null;
export const recordingSupported = () =>
  typeof window !== 'undefined' && 'MediaRecorder' in window && !!navigator.mediaDevices?.getUserMedia;

const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

export type Recording = { blob: Blob | null; mimeType: string; transcript: string; durationSeconds: number };

/**
 * Records one answer: audio through MediaRecorder and, where the browser supports it, a live transcript through the
 * Web Speech API (restarted automatically when it stops on silence). onLevel reports the microphone level 0–1.
 */
export class AnswerRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private recognition: Recognition | null = null;
  private chunks: Blob[] = [];
  private finalText = '';
  private interim = '';
  private startedAt = 0;
  private active = false;
  private audioCtx: AudioContext | null = null;
  private raf = 0;

  constructor(
    private readonly onTranscript?: (text: string) => void,
    private readonly onLevel?: (level: number) => void,
  ) {}

  async start(): Promise<void> {
    this.chunks = [];
    this.finalText = '';
    this.interim = '';
    this.active = true;
    this.startedAt = Date.now();
    if (recordingSupported()) {
      this.stream ??= await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const mimeType = MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
      this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
      this.recorder.ondataavailable = (e) => e.data.size > 0 && this.chunks.push(e.data);
      this.recorder.start(1000);
      this.meter();
    }
    const Ctor = recognitionCtor();
    if (Ctor) {
      const r = new Ctor();
      r.lang = 'en-GB';
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i]!;
          if (res.isFinal) this.finalText += res[0].transcript.trim() + ' ';
          else interim += res[0].transcript;
        }
        this.interim = interim;
        this.onTranscript?.((this.finalText + interim).trim());
      };
      r.onend = () => {
        if (this.active) {
          try {
            r.start();
          } catch {
            /* already started */
          }
        }
      };
      r.onerror = () => undefined;
      this.recognition = r;
      try {
        r.start();
      } catch {
        /* ignore */
      }
    }
  }

  async stop(): Promise<Recording> {
    this.active = false;
    this.recognition?.stop();
    cancelAnimationFrame(this.raf);
    const durationSeconds = Math.round((Date.now() - this.startedAt) / 1000);
    const blob = await new Promise<Blob | null>((resolve) => {
      if (!this.recorder || this.recorder.state === 'inactive') return resolve(null);
      this.recorder.onstop = () =>
        resolve(new Blob(this.chunks, { type: this.recorder?.mimeType || 'audio/webm' }));
      this.recorder.stop();
    });
    // give the recogniser a moment to deliver its final result
    await new Promise((r) => window.setTimeout(r, 400));
    const transcript = (this.finalText + this.interim).replace(/\s+/g, ' ').trim();
    return { blob, mimeType: blob?.type ?? '', transcript, durationSeconds };
  }

  release() {
    this.active = false;
    cancelAnimationFrame(this.raf);
    this.recognition?.stop();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    void this.audioCtx?.close();
    this.audioCtx = null;
  }

  private meter() {
    if (!this.stream || !this.onLevel) return;
    this.audioCtx ??= new AudioContext();
    const analyser = this.audioCtx.createAnalyser();
    analyser.fftSize = 512;
    this.audioCtx.createMediaStreamSource(this.stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128);
      this.onLevel?.(Math.min(1, peak * 1.8));
      this.raf = requestAnimationFrame(tick);
    };
    tick();
  }
}
