import { Pause, Play } from "lucide-react";
import { Spinner } from "./states";

export function PlayIcon({ playing, buffering, className }: { playing: boolean; buffering?: boolean; className: string }) {
  if (buffering && playing) return <Spinner className={className} />;
  return playing ? <Pause className={`${className} fill-current`} /> : <Play className={`${className} fill-current`} />;
}

/** The big mint round play button used on collection pages. */
export function BigPlay({ playing, onClick, label }: { playing: boolean; onClick: () => void; label: string }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="flex h-14 w-14 items-center justify-center rounded-full bg-mint text-on-mint shadow-lg shadow-mint/20 transition-transform active:scale-95"
    >
      <PlayIcon playing={playing} className="h-6 w-6" />
    </button>
  );
}
