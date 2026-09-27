import { chunks } from './voices';

export type SpeechLine = { text: string; voice: SpeechSynthesisVoice | null; pitch: number; lang: string };

export const speechSupported = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Resolves the browser's voice list (it loads asynchronously in Chrome). */
export function loadVoices(timeoutMs = 2500): Promise<SpeechSynthesisVoice[]> {
  if (!speechSupported()) return Promise.resolve([]);
  const now = window.speechSynthesis.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    window.setTimeout(done, timeoutMs);
  });
}

/**
 * Speaks lines sequentially (each split into sentence chunks). stop() cancels the whole run; pause()/resume()
 * delegate to speechSynthesis. The promise resolves 'done' or 'stopped'.
 */
export class SpeechRunner {
  private stopped = false;

  constructor(private readonly rate: number) {}

  async speak(lines: SpeechLine[], onLine?: (index: number) => void): Promise<'done' | 'stopped'> {
    for (let i = 0; i < lines.length; i++) {
      if (this.stopped) return 'stopped';
      onLine?.(i);
      for (const part of chunks(lines[i]!.text)) {
        if (this.stopped) return 'stopped';
        await this.utter(part, lines[i]!);
      }
    }
    return this.stopped ? 'stopped' : 'done';
  }

  wait(ms: number): Promise<'done' | 'stopped'> {
    return new Promise((resolve) => {
      const started = Date.now();
      const tick = () => {
        if (this.stopped) return resolve('stopped');
        if (Date.now() - started >= ms) return resolve('done');
        window.setTimeout(tick, 200);
      };
      tick();
    });
  }

  pause() {
    window.speechSynthesis.pause();
  }

  resume() {
    window.speechSynthesis.resume();
  }

  stop() {
    this.stopped = true;
    if (speechSupported()) window.speechSynthesis.cancel();
  }

  get isStopped() {
    return this.stopped;
  }

  private utter(text: string, line: SpeechLine): Promise<void> {
    return new Promise((resolve) => {
      if (!speechSupported()) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      if (line.voice) u.voice = line.voice;
      u.lang = line.lang;
      u.pitch = line.pitch;
      u.rate = this.rate;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });
  }
}
