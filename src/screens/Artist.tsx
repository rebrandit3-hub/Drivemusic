import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BadgeCheck, ChevronLeft } from "lucide-react";
import { audius } from "@/api/audius";
import { BigPlay } from "@/components/PlayButton";
import { ErrorState, SkeletonRow, Spinner } from "@/components/states";
import { TrackRow } from "@/components/TrackRow";
import { TrackSheet } from "@/components/TrackSheet";
import { player } from "@/player/engine";
import { usePlayer } from "@/player/store";
import type { Track } from "@/lib/types";
import { compactNumber, hueFor } from "@/lib/ui";
import { useQuery } from "@/lib/useQuery";

export default function Artist() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const artist = useQuery(`artist:${id}`, () => audius.artist(id));
  const tracks = useQuery(`artist-tracks:${id}`, () => audius.artistTracks(id));
  const [menu, setMenu] = useState<Track | null>(null);
  const [all, setAll] = useState(false);
  const context = usePlayer((s) => s.context);
  const isPlaying = usePlayer((s) => s.isPlaying);
  if (artist.loading) return <div className="flex h-full items-center justify-center"><Spinner /></div>;
  if (artist.error || !artist.data) return <ErrorState message="Couldn't load this artist." onRetry={artist.retry} />;
  const a = artist.data;
  const list = tracks.data ?? [];
  const playingHere = context === a.name && isPlaying;
  const h = hueFor(a.id);

  return (
    <div className="no-scrollbar h-full overflow-y-auto pb-8">
      <div className="relative h-[min(340px,80vw)]" style={{ background: `hsl(${h} 35% 22%)` }}>
        {(a.cover || a.avatar) && <img src={a.cover ?? a.avatar} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-bg" />
        <button aria-label="Back" onClick={() => navigate(-1)} className="pt-safe absolute left-2 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-black/40">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="absolute bottom-3 left-4 right-4 text-[40px] font-black leading-none tracking-tight drop-shadow-lg">{a.name}</h1>
      </div>
      <div className="flex items-center justify-between px-4 pt-3">
        <p className="flex items-center gap-1.5 text-[13px] text-muted">
          <BadgeCheck className="h-4 w-4 text-mint" /> {compactNumber(a.followers)} followers · {a.trackCount} tracks
        </p>
        {list.length > 0 && (
          <BigPlay
            playing={playingHere}
            label={playingHere ? "Pause" : `Play ${a.name}`}
            onClick={() => (context === a.name ? player.toggle() : player.playQueue(list, 0, a.name))}
          />
        )}
      </div>
      <h2 className="px-4 pb-1 pt-4 text-[19px] font-bold">Popular</h2>
      {tracks.loading && Array.from({ length: 5 }, (_, i) => <SkeletonRow key={i} />)}
      {list.slice(0, all ? undefined : 5).map((t, i) => (
        <TrackRow key={t.id} track={t} rank={i + 1} onPlay={() => player.playQueue(list, i, a.name)} onMore={setMenu} />
      ))}
      {list.length > 5 && (
        <button onClick={() => setAll((v) => !v)} className="mx-4 mt-2 rounded-full border border-white/30 px-4 py-1.5 text-[13px] font-semibold">
          {all ? "Show less" : "See more"}
        </button>
      )}
      <TrackSheet track={menu} onClose={() => setMenu(null)} />
    </div>
  );
}
