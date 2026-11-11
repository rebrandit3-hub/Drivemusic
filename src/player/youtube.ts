/**
 * Plays YouTube songs through YouTube's official embedded player (IFrame
 * Player API). YouTube's rules apply: the video stays visible while it plays
 * (see VideoSurface), it is never downloaded, and it pauses in the background.
 */

interface YTPlayer {
  loadVideoById(opts: { videoId: string; startSeconds?: number }): void;
  cueVideoById(opts: { videoId: string; startSeconds?: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
}

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: unknown) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const YT_HOST_ID = "yt-host";

const STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } as const;

export interface YouTubeEvents {
  onPlaying: () => void;
  onPaused: () => void;
  onBuffering: () => void;
  onEnded: () => void;
  onError: (message: string) => void;
  onTime: (position: number, duration: number) => void;
}

let apiPromise: Promise<void> | null = null;
function loadApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve();
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        apiPromise = null;
        reject(new Error("Couldn't load the YouTube player."));
      };
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}

function errorMessage(code: number) {
  if (code === 101 || code === 150) return "The owner doesn't allow this video in other apps.";
  if (code === 100) return "This video was removed.";
  return "YouTube couldn't play this song.";
}

export class YouTubeBackend {
  private player: YTPlayer | null = null;
  private ready: Promise<YTPlayer> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private videoId: string | null = null;

  constructor(private events: YouTubeEvents) {}

  private ensure(): Promise<YTPlayer> {
    if (!this.ready) {
      this.ready = loadApi().then(
        () =>
          new Promise<YTPlayer>((resolve, reject) => {
            const host = document.getElementById(YT_HOST_ID);
            if (!host || !window.YT) return reject(new Error("Video surface missing."));
            const mount = document.createElement("div");
            host.appendChild(mount);
            const player = new window.YT.Player(mount, {
              width: "100%",
              height: "100%",
              playerVars: { playsinline: 1, controls: 0, rel: 0, fs: 0, iv_load_policy: 3, origin: location.origin },
              events: {
                onReady: () => resolve(player),
                onStateChange: (e: { data: number }) => this.onState(e.data),
                onError: (e: { data: number }) => this.events.onError(errorMessage(e.data)),
              },
            });
            this.player = player;
          }),
      );
      this.ready.catch(() => {
        this.ready = null;
      });
    }
    return this.ready;
  }

  private onState(state: number) {
    if (state === STATE.PLAYING) {
      this.events.onPlaying();
      this.startClock();
    } else if (state === STATE.PAUSED) {
      this.events.onPaused();
      this.stopClock();
    } else if (state === STATE.BUFFERING) {
      this.events.onBuffering();
    } else if (state === STATE.ENDED) {
      this.stopClock();
      this.events.onEnded();
    }
  }

  private startClock() {
    this.stopClock();
    this.timer = setInterval(() => {
      if (this.player) this.events.onTime(this.player.getCurrentTime(), this.player.getDuration());
    }, 500);
  }

  private stopClock() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  get active() {
    return this.videoId !== null;
  }

  async load(videoId: string, startAt: number, autoplay: boolean) {
    const player = await this.ensure();
    this.videoId = videoId;
    const opts = { videoId, startSeconds: startAt || 0 };
    if (autoplay) player.loadVideoById(opts);
    else player.cueVideoById(opts);
  }

  play() {
    this.player?.playVideo();
  }

  pause() {
    this.player?.pauseVideo();
  }

  /** Leave YouTube mode (an audio song is playing now). */
  stop() {
    if (!this.videoId) return;
    this.videoId = null;
    this.stopClock();
    this.player?.stopVideo();
  }

  seek(seconds: number) {
    this.player?.seekTo(seconds, true);
  }

  time() {
    return this.player?.getCurrentTime() ?? 0;
  }

  isPlaying() {
    return this.player?.getPlayerState() === STATE.PLAYING;
  }
}
