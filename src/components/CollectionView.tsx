import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDownCircle, CheckCircle2, ChevronLeft, MoreHorizontal, Shuffle } from "lucide-react";
import { downloadMany, useDownloadProgress } from "@/library/downloads";
import { useLibrary } from "@/library/store";
import { player } from "@/player/engine";
import { usePlayer } from "@/player/store";
import type { Track } from "@/lib/types";
import { cn, hueFor, totalMinutes } from "@/lib/ui";
import { Cover } from "./Cover";
import { BigPlay } from "./PlayButton";
import { toast } from "./Toast";
import { TrackRow } from "./TrackRow";
import { TrackSheet } from "./TrackSheet";

interface Props {
  title: string;
  subtitle?: string;
  artwork?: string;
  coverIcon?: React.ReactNode;
  seed: string;
  tracks: Track[];
  /** your own playlist: enables "remove from this playlist" */
  playlistId?: string;
  onMore?: () => void;
  empty?: React.ReactNode;
  children?: React.ReactNode;
}

export function CollectionView({ title, subtitle, artwork, coverIcon, seed, tracks, playlistId, onMore, empty, children }: Props) {
  const navigate = useNavigate();
  const [menu, setMenu] = useState<Track | null>(null);
  const [solid, setSolid] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const context = usePlayer((s) => s.context);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const downloads = useLibrary((s) => s.downloads);
  const busy = useDownloadProgress((s) => tracks.some((t) => s.progress[t.id] !== undefined));
  const playingHere = context === title && isPlaying;
  const allDownloaded = tracks.length > 0 && tracks.every((t) => downloads[t.id]);
  const seconds = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
  const h = hueFor(seed);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => setSolid(el.scrollTop > 220);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const playAll = () => {
    if (context === title) return player.toggle();
    player.playQueue(tracks, 0, title);
  };
  const shuffleAll = () => {
    usePlayer.setState({ shuffle: true });
    player.playQueue(tracks, Math.floor(Math.random() * tracks.length), title);
  };

  return (
    <div ref={scroller} className="no-scrollbar h-full overflow-y-auto">
      <div
        className={cn(
          "pt-safe fixed inset-x-0 top-0 z-20 mx-auto flex max-w-[520px] items-center gap-2 px-2 pb-2 transition-colors",
          solid ? "bg-surface/95 backdrop-blur" : "bg-transparent",
        )}
      >
        <button aria-label="Back" onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <p className={cn("truncate font-bold transition-opacity", solid ? "opacity-100" : "opacity-0")}>{title}</p>
      </div>

      <div
        className="pt-safe px-4 pb-4"
        style={{ background: `linear-gradient(180deg, hsl(${h} 45% 32%) 0%, hsl(${h} 35% 16%) 60%, var(--color-bg) 100%)` }}
      >
        <div className="flex justify-center pt-12">
          <Cover src={artwork} seed={seed} icon={coverIcon} className="h-[min(240px,62vw)] w-[min(240px,62vw)] shadow-2xl shadow-black/60" rounded="rounded-md" />
        </div>
        <h1 className="mt-5 text-[26px] font-extrabold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        <p className="mt-1 text-[13px] text-muted">
          {tracks.length} {tracks.length === 1 ? "song" : "songs"}
          {seconds > 0 && ` · ${totalMinutes(seconds)}`}
        </p>

        <div className="mt-3 flex items-center gap-1">
          <button
            aria-label={allDownloaded ? "Downloaded" : "Download all"}
            disabled={!tracks.length || allDownloaded || busy}
            onClick={() => {
              toast(`Downloading ${tracks.length} songs`);
              void downloadMany(tracks).then(() => toast("Downloads finished"));
            }}
            className="flex h-11 w-11 items-center justify-center text-muted disabled:opacity-100"
          >
            {allDownloaded ? (
              <CheckCircle2 className="h-7 w-7 text-mint" />
            ) : (
              <ArrowDownCircle className={cn("h-7 w-7", busy && "animate-pulse text-mint")} />
            )}
          </button>
          {onMore && (
            <button aria-label="More options" onClick={onMore} className="flex h-11 w-11 items-center justify-center text-muted">
              <MoreHorizontal className="h-6 w-6" />
            </button>
          )}
          <div className="flex-1" />
          <button aria-label="Shuffle play" disabled={!tracks.length} onClick={shuffleAll} className="flex h-11 w-11 items-center justify-center text-muted">
            <Shuffle className="h-6 w-6" />
          </button>
          {tracks.length > 0 && <BigPlay playing={playingHere} onClick={playAll} label={playingHere ? "Pause" : `Play ${title}`} />}
        </div>
      </div>

      {children}
      {tracks.length === 0 && empty}
      <div className="pb-6">
        {tracks.map((t, i) => (
          <TrackRow key={t.id} track={t} onPlay={() => player.playQueue(tracks, i, title)} onMore={setMenu} />
        ))}
      </div>
      <TrackSheet track={menu} onClose={() => setMenu(null)} playlistId={playlistId} />
    </div>
  );
}
