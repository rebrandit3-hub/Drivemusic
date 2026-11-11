import { useEffect, useRef, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { audius, GENRES } from "@/api/audius";
import { Card, Shelf } from "@/components/Shelf";
import { ErrorState, SkeletonRow } from "@/components/states";
import { TrackRow } from "@/components/TrackRow";
import { TrackSheet } from "@/components/TrackSheet";
import { player } from "@/player/engine";
import type { Track } from "@/lib/types";
import { hueFor } from "@/lib/ui";
import { useQuery } from "@/lib/useQuery";

function useDebounced(value: string, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function GenreBrowse({ onPick }: { onPick: (g: string) => void }) {
  return (
    <section className="px-4 pt-2">
      <h2 className="mb-3 text-[17px] font-bold">Browse all</h2>
      <div className="grid grid-cols-2 gap-3">
        {GENRES.map((g) => {
          const h = hueFor(g);
          return (
            <button
              key={g}
              onClick={() => onPick(g)}
              className="relative h-[96px] overflow-hidden rounded-lg p-3 text-left text-[16px] font-extrabold active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg, hsl(${h} 62% 44%), hsl(${(h + 30) % 360} 58% 30%))` }}
            >
              {g}
              <span className="absolute -bottom-3 -right-3 h-16 w-16 rotate-[25deg] rounded-md bg-black/25 shadow-lg" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function Search() {
  const [text, setText] = useState("");
  const [menu, setMenu] = useState<Track | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const q = useDebounced(text.trim());
  const tracks = useQuery(q ? `search:t:${q}` : null, () => audius.searchTracks(q, 20));
  const artists = useQuery(q ? `search:a:${q}` : null, () => audius.searchArtists(q, 8));
  const playlists = useQuery(q ? `search:p:${q}` : null, () => audius.searchPlaylists(q, 8));

  return (
    <div className="no-scrollbar h-full overflow-y-auto pb-8">
      <div className="pt-safe sticky top-0 z-10 bg-bg px-4 pb-3">
        <h1 className="pb-3 pt-2 text-[24px] font-extrabold tracking-tight">Search</h1>
        <label className="flex h-12 items-center gap-2.5 rounded-md bg-text px-3 text-bg">
          <SearchIcon className="h-5 w-5 shrink-0" />
          <input
            ref={input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            enterKeyHint="search"
            placeholder="What do you want to listen to?"
            className="min-w-0 flex-1 bg-transparent font-medium text-bg outline-none placeholder:text-bg/60"
          />
          {text && (
            <button aria-label="Clear search" onClick={() => { setText(""); input.current?.focus(); }}>
              <X className="h-5 w-5" />
            </button>
          )}
        </label>
      </div>

      {!q && <GenreBrowse onPick={(g) => setText(g)} />}

      {q && (
        <>
          {tracks.loading && Array.from({ length: 6 }, (_, i) => <SkeletonRow key={i} />)}
          {tracks.error && <ErrorState message="Search failed. Check your connection." onRetry={tracks.retry} />}
          {tracks.data && tracks.data.length === 0 && !artists.data?.length && (
            <p className="px-6 py-12 text-center text-muted">No results for “{q}”.</p>
          )}
          {tracks.data && tracks.data.length > 0 && (
            <section>
              <h2 className="px-4 pb-1 text-[17px] font-bold">Songs</h2>
              {tracks.data.map((t, i) => (
                <TrackRow key={t.id} track={t} onPlay={() => player.playQueue(tracks.data!, i, `Search: ${q}`)} onMore={setMenu} />
              ))}
            </section>
          )}
          {(artists.data?.length ?? 0) > 0 && (
            <Shelf title="Artists">
              {artists.data!.map((a) => (
                <Card key={a.id} round title={a.name} subtitle="Artist" artwork={a.avatar} seed={a.id} to={`/artist/${a.id}`} />
              ))}
            </Shelf>
          )}
          {(playlists.data?.length ?? 0) > 0 && (
            <Shelf title="Playlists">
              {playlists.data!.map((p) => (
                <Card key={p.id} title={p.name} subtitle={`By ${p.owner}`} artwork={p.artwork} seed={p.id} to={`/remote/${p.id}`} />
              ))}
            </Shelf>
          )}
        </>
      )}
      <TrackSheet track={menu} onClose={() => setMenu(null)} />
    </div>
  );
}
