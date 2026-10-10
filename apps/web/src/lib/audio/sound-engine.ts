import joinUrl from '@/assets/join.wav?url';
import leaveUrl from '@/assets/leave.wav?url';

export type SoundId = 'join' | 'leave';

type SoundAssetMap = Record<SoundId, string>;

const SOUND_ASSETS: SoundAssetMap = {
  join: joinUrl,
  leave: leaveUrl,
};

const RATE_LIMIT_MS = 700;
const MAX_CONCURRENT_VOICES = 2;
const DEFAULT_VOLUME = 0.45;

const allSounds = new Set<SoundId>(Object.keys(SOUND_ASSETS) as SoundId[]);
const bufferCache = new Map<SoundId, AudioBuffer>();
const inFlight = new Map<SoundId, Promise<AudioBuffer | null>>();
const lastPlayedAt = new Map<SoundId, number>();
const fallbackPool = new Map<SoundId, HTMLAudioElement[]>();

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let concurrentVoices = 0;
let unlockBound = false;
let visibilityBound = false;
let unlockHandler: (() => void) | null = null;
let visibilityHandler: (() => void) | null = null;

function getAudioContextConstructor() {
  if (typeof window === 'undefined') return null;
  return window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? null;
}

function ensureAudioGraph() {
  if (typeof window === 'undefined') return null;
  const AudioCtor = getAudioContextConstructor();
  if (!AudioCtor) return null;
  if (!audioContext) {
    try {
      audioContext = new AudioCtor({ latencyHint: 'interactive' });
      masterGain = audioContext.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(audioContext.destination);
    } catch (error) {
      if (import.meta.env.DEV) console.warn('[sound-engine] Web Audio unavailable', error);
      audioContext = null;
      masterGain = null;
      return null;
    }
  }
  if (!visibilityBound) {
    visibilityHandler = () => {
      if (document.visibilityState !== 'visible') return;
      const context = audioContext;
      if (context && (context.state === 'suspended' || (context.state as string) === 'interrupted')) {
        void context.resume().catch((error: unknown) => {
          if (import.meta.env.DEV) console.warn('[sound-engine] resume failed', error);
        });
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
    visibilityBound = true;
  }
  return audioContext;
}

function getFallbackPool(soundId: SoundId) {
  const pool = fallbackPool.get(soundId) ?? [];
  if (fallbackPool.has(soundId)) return pool;
  fallbackPool.set(soundId, pool);
  return pool;
}

function ensureAudioBuffer(soundId: SoundId): Promise<AudioBuffer | null> {
  const cached = bufferCache.get(soundId);
  if (cached) return Promise.resolve(cached);

  const inflight = inFlight.get(soundId);
  if (inflight) return inflight;

  const ctx = ensureAudioGraph();
  if (!ctx) return Promise.resolve(null);

  const request = (async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(SOUND_ASSETS[soundId]);
        if (!response.ok) throw new Error(`Failed to fetch sound: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
        bufferCache.set(soundId, decoded);
        return decoded;
      } catch (error) {
        lastError = error;
        if (attempt < 2) {
          await new Promise((resolve) => window.setTimeout(resolve, 200 * 2 ** attempt));
        }
      }
    }
    if (import.meta.env.DEV) console.warn('[sound-engine] preload failed', soundId, lastError);
    return null;
  })()
    .finally(() => {
      inFlight.delete(soundId);
    });

  inFlight.set(soundId, request);
  return request;
}

function bindUnlock() {
  if (unlockBound || typeof window === 'undefined') return;
  unlockBound = true;
  unlockHandler = () => {
    const ctx = ensureAudioGraph();
    if (!ctx) {
      removeUnlockListeners();
      return;
    }
    void ctx.resume().catch(() => undefined);
    try {
      const silentBuffer = ctx.createBuffer(1, 1, 44100);
      const channel = silentBuffer.getChannelData(0);
      channel[0] = 0;
      const source = ctx.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(ctx.destination);
      source.start();
      source.onended = () => source.disconnect();
    } catch (error) {
      if (import.meta.env.DEV) console.warn('[sound-engine] unlock failed', error);
    }
    removeUnlockListeners();
  };

  window.addEventListener('pointerdown', unlockHandler);
  window.addEventListener('keydown', unlockHandler);
  window.addEventListener('touchend', unlockHandler);
}

function removeUnlockListeners() {
  if (typeof window === 'undefined' || !unlockHandler) return;
  window.removeEventListener('pointerdown', unlockHandler);
  window.removeEventListener('keydown', unlockHandler);
  window.removeEventListener('touchend', unlockHandler);
  unlockHandler = null;
  unlockBound = false;
}

export async function preloadSounds(ids: SoundId[] = Array.from(allSounds)) {
  if (typeof window === 'undefined') return;
  if (!getAudioContextConstructor() || !ensureAudioGraph()) {
    for (const id of ids) {
      const pool = getFallbackPool(id);
      if (pool.length === 0 && typeof Audio !== 'undefined') {
        const audio = new Audio(SOUND_ASSETS[id]);
        audio.preload = 'auto';
        pool.push(audio);
      }
    }
    return;
  }
  bindUnlock();
  await Promise.all(ids.map((id) => ensureAudioBuffer(id)));
}

export function scheduleSoundPreload() {
  if (typeof window === 'undefined') return () => undefined;
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  let timeout: number | null = null;
  let idleId: number | null = null;
  const start = () => void preloadSounds();
  if (idleWindow.requestIdleCallback) {
    idleId = idleWindow.requestIdleCallback(start, { timeout: 2000 });
  } else {
    timeout = window.setTimeout(start, 500);
  }
  return () => {
    if (timeout !== null) window.clearTimeout(timeout);
    if (idleId !== null) idleWindow.cancelIdleCallback?.(idleId);
  };
}

function isFallbackAvailable() {
  return typeof HTMLAudioElement !== 'undefined';
}

function fallbackPlay(soundId: SoundId, volume: number) {
  if (!isFallbackAvailable()) return;
  const activeFallbackVoices = [...fallbackPool.values()]
    .flat()
    .filter((node) => !node.paused && !node.ended).length;
  if (activeFallbackVoices >= MAX_CONCURRENT_VOICES) return;
  const pool = getFallbackPool(soundId);
  const audio = pool.find((node) => node.paused || node.ended) ?? new Audio(SOUND_ASSETS[soundId]);
  audio.preload = 'auto';
  audio.volume = Math.min(1, Math.max(0, volume));
  try {
    audio.currentTime = 0;
    void audio.play().catch((error: unknown) => {
      if (import.meta.env.DEV) console.warn('[sound-engine] fallback playback failed', soundId, error);
    });
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[sound-engine] fallback playback failed', soundId, error);
  }
  if (!pool.includes(audio)) {
    pool.push(audio);
  }
}

export function playSound(soundId: SoundId, volume = DEFAULT_VOLUME) {
  if (typeof window === 'undefined') return Promise.resolve();
  const now = Date.now();
  const previous = lastPlayedAt.get(soundId);
  if (previous !== undefined && now - previous < RATE_LIMIT_MS) return Promise.resolve();

  const ctx = ensureAudioGraph();
  if (!ctx || !masterGain) {
    lastPlayedAt.set(soundId, now);
    fallbackPlay(soundId, volume);
    return Promise.resolve();
  }

  if (ctx.state !== 'running') {
    bindUnlock();
    return Promise.resolve();
  }

  if (concurrentVoices >= MAX_CONCURRENT_VOICES) {
    return Promise.resolve();
  }

  lastPlayedAt.set(soundId, now);
  const bufferMaybe = bufferCache.get(soundId) ?? null;
  if (!bufferMaybe) {
    void ensureAudioBuffer(soundId).then((buffer) => {
      if (
        !buffer ||
        audioContext !== ctx ||
        ctx.state !== 'running' ||
        !masterGain ||
        concurrentVoices >= MAX_CONCURRENT_VOICES
      ) {
        return;
      }
      startBufferSound(ctx, masterGain, buffer, volume, soundId);
    });
    return Promise.resolve();
  }

  startBufferSound(ctx, masterGain, bufferMaybe, volume, soundId);
  return Promise.resolve();
}

function startBufferSound(
  ctx: AudioContext,
  output: GainNode,
  buffer: AudioBuffer,
  volume: number,
  soundId: SoundId,
) {
  const safeVolume = Number.isFinite(volume)
    ? Math.min(1, Math.max(0, volume))
    : DEFAULT_VOLUME;
  if (safeVolume === 0) return;
  let source: AudioBufferSourceNode | null = null;
  let gain: GainNode | null = null;
  let voiceReserved = false;
  try {
    source = ctx.createBufferSource();
    gain = ctx.createGain();
    const startAt = ctx.currentTime;
    const attackDuration = Math.min(0.015, buffer.duration / 5);
    const releaseDuration = Math.min(0.08, buffer.duration / 3);
    const releaseAt = Math.max(
      startAt + attackDuration,
      startAt + buffer.duration - releaseDuration,
    );
    gain.gain.setValueAtTime(0.001, startAt);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.001, safeVolume),
      startAt + attackDuration,
    );
    gain.gain.setValueAtTime(Math.max(0.001, safeVolume), releaseAt);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      startAt + buffer.duration,
    );
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(output);
    concurrentVoices += 1;
    voiceReserved = true;
    source.onended = () => {
      source?.disconnect();
      gain?.disconnect();
      concurrentVoices = Math.max(0, concurrentVoices - 1);
    };
    source.start(startAt);
  } catch (error) {
    source?.disconnect();
    gain?.disconnect();
    if (voiceReserved) {
      concurrentVoices = Math.max(0, concurrentVoices - 1);
    }
    if (import.meta.env.DEV) console.warn('[sound-engine] playback failed', soundId, error);
  }
}

export function registerSound(soundId: SoundId) {
  allSounds.add(soundId);
}

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    audioContext?.close().catch(() => undefined);
    audioContext = null;
    masterGain = null;
    if (typeof document !== 'undefined' && visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = null;
      visibilityBound = false;
    }
    removeUnlockListeners();
    for (const pool of fallbackPool.values()) {
      pool.forEach((audio) => audio.pause());
    }
    fallbackPool.clear();
  });
}

export function resetSoundEngine() {
  bufferCache.clear();
  inFlight.clear();
  lastPlayedAt.clear();
  for (const pool of fallbackPool.values()) {
    pool.forEach((audio) => audio.pause());
  }
  fallbackPool.clear();
  concurrentVoices = 0;
  if (audioContext) {
    void audioContext.close().catch(() => undefined);
    audioContext = null;
    masterGain = null;
  }
  if (typeof document !== 'undefined' && visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
    visibilityBound = false;
  }
  removeUnlockListeners();
}

export function playPresenceSound(online: boolean) {
  return playSound(online ? 'join' : 'leave');
}
