import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { player } from "@/player/engine";
import { currentTrack, usePlayer } from "@/player/store";
import { YT_HOST_ID } from "@/player/youtube";

export const VIDEO_SLOT_ATTR = "data-video-slot";
/** YouTube requires its player to be at least 200×200 and fully visible. */
const PIP_SIZE = 200;

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * The one YouTube player element. It never moves in the DOM (that would
 * reload the video); it is positioned over the Now Playing artwork slot, or
 * floats above the mini player while you browse.
 */
export function VideoSurface() {
  const isYouTube = usePlayer((s) => currentTrack(s)?.source === "youtube");
  const open = usePlayer((s) => s.nowPlayingOpen);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const [slot, setSlot] = useState<Box | null>(null);
  // the floating player can be put away, but only by pausing (YouTube's rule)
  const [tucked, setTucked] = useState(false);
  useEffect(() => {
    if (isPlaying) setTucked(false);
  }, [isPlaying]);

  useEffect(() => {
    if (!open || !isYouTube) {
      setSlot(null);
      return;
    }
    let frame = 0;
    let alive = true;
    const measure = () => {
      const el = document.querySelector(`[${VIDEO_SLOT_ATTR}]`);
      if (el) {
        const r = el.getBoundingClientRect();
        setSlot((prev) =>
          prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height
            ? prev
            : { top: r.top, left: r.left, width: r.width, height: r.height },
        );
      }
      // follow the sheet's slide-in, then settle
      if (alive) frame = requestAnimationFrame(measure);
    };
    measure();
    const stop = setTimeout(() => {
      alive = false;
    }, 600);
    const onResize = () => {
      alive = true;
      measure();
      setTimeout(() => (alive = false), 100);
    };
    window.addEventListener("resize", onResize);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      clearTimeout(stop);
      window.removeEventListener("resize", onResize);
    };
  }, [open, isYouTube]);

  const style: React.CSSProperties = !isYouTube
    ? { width: 1, height: 1, left: -10, top: -10, opacity: 0, pointerEvents: "none" }
    : open && slot
      ? { top: slot.top, left: slot.left, width: slot.width, height: slot.height, zIndex: 65 }
      : open || tucked
        ? { width: 1, height: 1, left: -10, top: -10, opacity: 0, pointerEvents: "none" }
        : {
            width: PIP_SIZE,
            height: PIP_SIZE,
            right: 8,
            bottom: `calc(150px + env(safe-area-inset-bottom))`,
            zIndex: 40,
          };

  const floating = isYouTube && !open && !tucked;
  return (
    <>
    {floating && (
      <button
        aria-label="Pause and hide video"
        onClick={() => {
          player.pause();
          setTucked(true);
        }}
        className="fixed right-2 z-40 flex h-8 w-8 items-center justify-center rounded-full bg-elevated shadow-lg"
        style={{ bottom: `calc(150px + ${PIP_SIZE + 6}px + env(safe-area-inset-bottom))` }}
      >
        <X className="h-4 w-4" />
      </button>
    )}
    <div
      aria-label="YouTube player"
      className="fixed overflow-hidden rounded-lg bg-black shadow-2xl shadow-black/70"
      style={style}
    >
      <div id={YT_HOST_ID} className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />
    </div>
    </>
  );
}
