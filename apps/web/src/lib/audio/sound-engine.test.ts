import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('sound engine', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('drops playback when the AudioContext is suspended', async () => {
    const resume = vi.fn().mockResolvedValue(undefined);
    const source = {
      buffer: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      onended: null as (() => void) | null,
    };
    const gain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    class FakeAudioContext {
      public state = 'suspended';
      public destination = {};
      public createBufferSource = vi.fn(() => source);
      public createGain = vi.fn(() => gain);
      public createBuffer = vi.fn(() => ({ getChannelData: () => new Float32Array(1) }));
      public resume = resume;
      public close = vi.fn().mockResolvedValue(undefined);
    }

    vi.stubGlobal('AudioContext', FakeAudioContext as unknown as typeof AudioContext);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      }),
    );
    vi.stubGlobal(
      'HTMLAudioElement',
      class {
        public preload = 'auto';
        public volume = 0;
        public currentTime = 0;
        public paused = true;
        public ended = true;
        public play = vi.fn().mockResolvedValue(undefined);
      },
    );

    const { playSound } = await import('./sound-engine');
    await expect(playSound('join')).resolves.toBeUndefined();
    expect(resume).not.toHaveBeenCalled();
  });

  it("preloads once and rate-limits playback per sound", async () => {
    const source = {
      buffer: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      onended: null as (() => void) | null,
    };
    const gain = {
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    class FakeAudioContext {
      public state = "running";
      public currentTime = 1;
      public destination = {};
      public createBufferSource = vi.fn(() => source);
      public createGain = vi.fn(() => gain);
      public decodeAudioData = vi.fn().mockResolvedValue({ duration: 1 });
      public resume = vi.fn().mockResolvedValue(undefined);
      public close = vi.fn().mockResolvedValue(undefined);
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    });
    vi.stubGlobal("AudioContext", FakeAudioContext as unknown as typeof AudioContext);
    vi.stubGlobal("fetch", fetchMock);
    vi.setSystemTime(new Date("2026-10-09T12:00:00Z"));

    const { playSound, preloadSounds } = await import("./sound-engine");
    await preloadSounds(["join"]);
    await playSound("join");
    await playSound("join");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(source.start).toHaveBeenCalledTimes(1);
    expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(
      expect.any(Number),
      1.015,
    );
    expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenLastCalledWith(
      0.0001,
      2,
    );
  });
});
