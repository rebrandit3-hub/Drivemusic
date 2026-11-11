import { audius } from "@/api/audius";
import { getOfflineBlob } from "@/library/downloads";
import { useLibrary } from "@/library/store";
import type { Track } from "@/lib/types";
import {
  nextIndex,
  prevIndex,
  RESTART_THRESHOLD_S,
  shuffleAround,
} from "./queue";
import { currentTrack, usePlayer } from "./store";

const SESSION_KEY = "drivemusic:player:v1";
const MAX_RETRIES = 4;
/** a stall shorter than this is normal buffering; longer means a dead connection */
const STALL_RELOAD_MS = 8000;
/** start fetching the next song once this much of the current one has played */
const PRELOAD_AT = 0.5;

interface Slot {
  el: HTMLAudioElement;
  trackId: string | null;
  objectUrl: string | null;
}

/**
 * Plays through two <audio> elements: one plays, the other quietly loads
 * the next song, so skipping and track changes start instantly. Audio goes
 * straight from the element to the speaker (no WebAudio graph), which is
 * what keeps playback alive when the phone locks or switches outputs.
 */
class PlayerEngine {
  private slots: [Slot, Slot] | null = null;
  private active = 0;
  private retries = 0;
  private stallTimer: ReturnType<typeof setTimeout> | null = null;
  private loadToken = 0;
  private resumeAt = 0;

  private get cur(): Slot {
    return this.ensure()[this.active];
  }
  private get spare(): Slot {
    return this.ensure()[this.active ^ 1];
  }

  private ensure(): [Slot, Slot] {
    if (!this.slots) {
      const make = (): Slot => {
        const el = new Audio();
        el.preload = "auto";
        el.setAttribute("playsinline", "");
        this.bind(el);
        return { el, trackId: null, objectUrl: null };
      };
      this.slots = [make(), make()];
      this.setupMediaSession();
      window.addEventListener("online", () => this.recover("online"));
    }
    return this.slots;
  }

  private isActive(el: HTMLAudioElement) {
    return this.slots !== null && this.cur.el === el;
  }

  private bind(el: HTMLAudioElement) {
    el.addEventListener("timeupdate", () => {
      if (!this.isActive(el)) return;
      usePlayer.setState({ position: el.currentTime });
      this.maybePreload(el);
      this.saveSession();
    });
    el.addEventListener("durationchange", () => {
      if (this.isActive(el) && Number.isFinite(el.duration))
        usePlayer.setState({ duration: el.duration });
    });
    el.addEventListener("playing", () => {
      if (!this.isActive(el)) return;
      this.retries = 0;
      this.clearStall();
      usePlayer.setState({ isPlaying: true, buffering: false, error: null });
      this.updatePositionState();
    });
    el.addEventListener("pause", () => {
      if (!this.isActive(el) || el.ended) return;
      usePlayer.setState({ isPlaying: false, buffering: false });
      this.clearStall();
      this.saveSession(true);
    });
    el.addEventListener("waiting", () => {
      if (!this.isActive(el)) return;
      usePlayer.setState({ buffering: true });
      this.armStall(el);
    });
    el.addEventListener("stalled", () => {
      if (this.isActive(el) && !el.paused) this.armStall(el);
    });
    el.addEventListener("ended", () => {
      if (!this.isActive(el)) return;
      this.advance(true);
    });
    el.addEventListener("error", () => {
      if (!this.isActive(el) || !el.src) return;
      this.recover("error");
    });
  }

  private armStall(el: HTMLAudioElement) {
    if (this.stallTimer) return;
    this.stallTimer = setTimeout(() => {
      this.stallTimer = null;
      if (this.isActive(el) && !el.paused && el.readyState < 3) {
        this.recover("stall");
      }
    }, STALL_RELOAD_MS);
  }

  private clearStall() {
    if (this.stallTimer) clearTimeout(this.stallTimer);
    this.stallTimer = null;
  }

  /** Reload the current song where it stopped instead of giving up. */
  private recover(reason: "error" | "stall" | "online") {
    const state = usePlayer.getState();
    const track = currentTrack(state);
    if (!track) return;
    if (reason === "online" && !state.buffering && !state.error) return;
    if (this.retries >= MAX_RETRIES) {
      usePlayer.setState({
        buffering: false,
        isPlaying: false,
        error: navigator.onLine
          ? "This song can't be played right now."
          : "You're offline. Downloaded songs still play.",
      });
      return;
    }
    this.retries += 1;
    const position = this.cur.el.currentTime || state.position;
    const delay = reason === "online" ? 0 : 500 * 2 ** (this.retries - 1);
    usePlayer.setState({ buffering: true });
    setTimeout(() => {
      if (currentTrack(usePlayer.getState())?.id !== track.id) return;
      this.cur.trackId = null; // force a fresh source
      void this.load(track, true, position);
    }, delay);
  }

  private async sourceFor(track: Track): Promise<{ src: string; objectUrl: string | null }> {
    const blob = await getOfflineBlob(track.id);
    if (blob) {
      const objectUrl = URL.createObjectURL(blob);
      return { src: objectUrl, objectUrl };
    }
    return { src: await audius.streamUrl(track.id), objectUrl: null };
  }

  private async fill(slot: Slot, track: Track) {
    const { src, objectUrl } = await this.sourceFor(track);
    if (slot.objectUrl) URL.revokeObjectURL(slot.objectUrl);
    slot.objectUrl = objectUrl;
    slot.trackId = track.id;
    slot.el.src = src;
    slot.el.load();
  }

  private maybePreload(el: HTMLAudioElement) {
    if (!el.duration || el.currentTime / el.duration < PRELOAD_AT) return;
    const s = usePlayer.getState();
    const next = nextIndex(s.queue.length, s.index, s.repeat, true);
    if (next === null || next === s.index) return;
    const track = s.queue[next];
    if (!track || this.spare.trackId === track.id) return;
    void this.fill(this.spare, track).catch(() => {
      this.spare.trackId = null;
    });
  }

  private async load(track: Track, autoplay: boolean, startAt = 0) {
    const token = ++this.loadToken;
    this.clearStall();
    usePlayer.setState({
      position: startAt,
      duration: track.duration || 0,
      buffering: autoplay,
      error: null,
    });
    this.updateMetadata(track);

    const previous = this.cur;
    if (this.spare.trackId === track.id && startAt === 0) {
      // already loaded in the background: switch over instantly
      this.active ^= 1;
    } else if (previous.trackId !== track.id) {
      try {
        await this.fill(previous, track);
      } catch {
        if (token === this.loadToken) this.recover("error");
        return;
      }
    }
    if (token !== this.loadToken) return;
    if (previous !== this.cur) {
      previous.el.pause();
      previous.el.currentTime = 0;
    }
    const el = this.cur.el;
    if (startAt > 0) {
      const seek = () => {
        el.currentTime = startAt;
      };
      if (el.readyState >= 1) seek();
      else el.addEventListener("loadedmetadata", seek, { once: true });
    } else if (el.currentTime > 0) {
      el.currentTime = 0;
    }
    if (autoplay) {
      useLibrary.getState().addRecent(track);
      try {
        await el.play();
      } catch (err) {
        // autoplay blocked (no user gesture yet): show as paused, not broken
        if ((err as DOMException)?.name === "NotAllowedError") {
          usePlayer.setState({ isPlaying: false, buffering: false });
        }
      }
    }
    this.saveSession(true);
  }

  // ---------- public API ----------

  playQueue(tracks: Track[], startIndex = 0, context: string | null = null) {
    if (!tracks.length) return;
    const { shuffle } = usePlayer.getState();
    const queue = shuffle ? shuffleAround(tracks, startIndex) : [...tracks];
    usePlayer.setState({
      baseQueue: [...tracks],
      queue,
      index: shuffle ? 0 : startIndex,
      context,
    });
    this.retries = 0;
    void this.load(queue[shuffle ? 0 : startIndex], true);
  }

  playTrack(track: Track, context: string | null = null) {
    this.playQueue([track], 0, context);
  }

  playNext(track: Track) {
    const s = usePlayer.getState();
    if (s.index < 0) return this.playTrack(track);
    const queue = [...s.queue];
    queue.splice(s.index + 1, 0, track);
    usePlayer.setState({ queue, baseQueue: [...s.baseQueue, track] });
  }

  addToQueue(track: Track) {
    const s = usePlayer.getState();
    if (s.index < 0) return this.playTrack(track);
    usePlayer.setState({
      queue: [...s.queue, track],
      baseQueue: [...s.baseQueue, track],
    });
  }

  jumpTo(index: number) {
    const s = usePlayer.getState();
    if (!s.queue[index]) return;
    usePlayer.setState({ index });
    this.retries = 0;
    void this.load(s.queue[index], true);
  }

  toggle() {
    const s = usePlayer.getState();
    const track = currentTrack(s);
    if (!track) return;
    const el = this.cur.el;
    if (this.cur.trackId !== track.id) {
      void this.load(track, true, s.position);
      return;
    }
    if (el.paused) {
      if (s.error) {
        this.retries = 0;
        this.cur.trackId = null;
        void this.load(track, true, s.position);
        return;
      }
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }

  pause() {
    this.slots && this.cur.el.pause();
  }

  next() {
    this.advance(false);
  }

  private advance(auto: boolean) {
    const s = usePlayer.getState();
    const i = nextIndex(s.queue.length, s.index, s.repeat, auto);
    if (i === null) {
      usePlayer.setState({ isPlaying: false, position: 0 });
      this.cur.el.currentTime = 0;
      return;
    }
    usePlayer.setState({ index: i });
    this.retries = 0;
    void this.load(s.queue[i], true);
  }

  prev() {
    const s = usePlayer.getState();
    if (this.slots && this.cur.el.currentTime > RESTART_THRESHOLD_S) {
      this.seek(0);
      return;
    }
    const i = prevIndex(s.queue.length, s.index, s.repeat);
    usePlayer.setState({ index: i });
    this.retries = 0;
    void this.load(s.queue[i], true);
  }

  seek(seconds: number) {
    const el = this.cur.el;
    const s = usePlayer.getState();
    if (this.cur.trackId !== currentTrack(s)?.id) {
      usePlayer.setState({ position: seconds });
      return;
    }
    el.currentTime = Math.max(0, Math.min(seconds, el.duration || seconds));
    usePlayer.setState({ position: el.currentTime });
    this.updatePositionState();
  }

  toggleShuffle() {
    const s = usePlayer.getState();
    const track = currentTrack(s);
    if (!s.shuffle) {
      const queue = shuffleAround(s.queue, Math.max(0, s.index));
      usePlayer.setState({ shuffle: true, queue, index: track ? 0 : -1 });
    } else {
      const index = track ? s.baseQueue.findIndex((t) => t.id === track.id) : -1;
      usePlayer.setState({ shuffle: false, queue: [...s.baseQueue], index });
    }
    this.spare.trackId = null; // next song changed
  }

  cycleRepeat() {
    const order = { off: "all", all: "one", one: "off" } as const;
    usePlayer.setState((s) => ({ repeat: order[s.repeat] }));
  }

  // ---------- lock screen / headphones ----------

  private setupMediaSession() {
    const ms = typeof navigator !== "undefined" ? navigator.mediaSession : undefined;
    if (!ms) return;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => this.toggle()],
      ["pause", () => this.pause()],
      ["previoustrack", () => this.prev()],
      ["nexttrack", () => this.next()],
      ["seekto", (d) => d.seekTime !== undefined && this.seek(d.seekTime)],
      ["seekbackward", (d) => this.seek(this.cur.el.currentTime - (d.seekOffset ?? 10))],
      ["seekforward", (d) => this.seek(this.cur.el.currentTime + (d.seekOffset ?? 10))],
    ];
    for (const [action, handler] of handlers) {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // action not supported on this platform
      }
    }
  }

  private updateMetadata(track: Track) {
    const ms = navigator.mediaSession;
    if (!ms || typeof MediaMetadata === "undefined") return;
    ms.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: usePlayer.getState().context ?? "DriveMusic",
      artwork: track.artwork
        ? [{ src: track.artwork, sizes: "480x480", type: "image/jpeg" }]
        : [],
    });
  }

  private updatePositionState() {
    const ms = navigator.mediaSession;
    const el = this.slots ? this.cur.el : null;
    if (!ms?.setPositionState || !el || !Number.isFinite(el.duration)) return;
    try {
      ms.setPositionState({
        duration: el.duration,
        position: Math.min(el.currentTime, el.duration),
        playbackRate: el.playbackRate,
      });
    } catch {
      // ignore invalid states during track switches
    }
  }

  // ---------- resume where you left off ----------

  private lastSave = 0;
  private saveSession(force = false) {
    const now = Date.now();
    if (!force && now - this.lastSave < 5000) return;
    this.lastSave = now;
    const s = usePlayer.getState();
    try {
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          queue: s.queue,
          baseQueue: s.baseQueue,
          index: s.index,
          position: this.slots ? this.cur.el.currentTime : s.position,
          shuffle: s.shuffle,
          repeat: s.repeat,
          context: s.context,
        }),
      );
    } catch {
      // storage full or blocked
    }
  }

  restoreSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!Array.isArray(data.queue) || !data.queue[data.index]) return;
      this.resumeAt = Number(data.position) || 0;
      usePlayer.setState({
        queue: data.queue,
        baseQueue: data.baseQueue ?? data.queue,
        index: data.index,
        position: this.resumeAt,
        duration: data.queue[data.index].duration ?? 0,
        shuffle: Boolean(data.shuffle),
        repeat: data.repeat ?? "off",
        context: data.context ?? null,
      });
    } catch {
      // corrupt session: start fresh
    }
  }
}

export const player = new PlayerEngine();
