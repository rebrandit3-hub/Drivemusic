import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Settings } from "lucide-react";
import { audius, GENRES } from "@/api/audius";
import { Card, Shelf } from "@/components/Shelf";
import { Cover } from "@/components/Cover";
import { ErrorState, SkeletonRow } from "@/components/states";
import { TrackRow } from "@/components/TrackRow";
import { TrackSheet } from "@/components/TrackSheet";
import { useLibrary } from "@/library/store";
import { player } from "@/player/engine";
import type { Track } from "@/lib/types";
import { cn, greeting } from "@/lib/ui";
import { useQuery } from "@/lib/useQuery";

/** Spotify-style 2-column grid of the things you play most. */
function QuickPicks() {
  const liked = useLibrary((s) => s.liked);
  const playlists = useLibrary((s) => s.playlists);
  const recent = useLibrary((s) => s.recent);
  const tiles: { key: string; label: string; artwork?: string; to?: string; icon?: React.ReactNode; play?: () => void }[] = [];
  if (liked.length) tiles.push({ key: "liked", label: "Liked Songs", to: "/liked", icon: <Heart className="h-5 w-5 fill-white" /> });
  for (const p of playlists.slice(0, 3)) tiles.push({ key: p.id, label: p.name, artwork: p.artwork, to: `/playlist/${p.id}` });
  for (const t of recent) {
    if (tiles.length >= 6) break;
    tiles.push({ key: t.id, label: t.title, artwork: t.artwork, play: () => player.playTrack(t, "Recently played") });
  }
  if (!tiles.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2 px-4">
      {tiles.map((tile) => {
        const inner = (
          <>
            <Cover
              src={tile.artwork}
              seed={tile.key}
              icon={tile.icon}
              rounded="rounded-l-md"
              className={cn("h-14 w-14", tile.key === "liked" && "!bg-gradient-to-br from-mint-deep to-[#1d3d8f]")}
            />
            <span className="line-clamp-2 pr-2 text-left text-[13px] font-bold leading-tight">{tile.label}</span>
          </>
        );
        const cls = "flex items-center gap-2.5 overflow-hidden rounded-md bg-white/[0.07] active:bg-white/15";
        return tile.to ? (
          <Link key={tile.key} to={tile.to} className={cls}>{inner}</Link>
        ) : (
          <button key={tile.key} onClick={tile.play} className={cls}>{inner}</button>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [genre, setGenre] = useState<string | null>(null);
  const [menu, setMenu] = useState<Track | null>(null);
  const trending = useQuery(`trending:${genre ?? "all"}`, () => audius.trending({ genre: genre ?? undefined, limit: 20 }));
  const charts = useQuery("charts:month", () => audius.trending({ time: "month", limit: 10 }));
  const playlists = useQuery("playlists:trending", () => audius.trendingPlaylists(12));
  const recent = useLibrary((s) => s.recent);
  const label = genre ? `Trending in ${genre}` : "Trending this week";

  return (
    <div className="no-scrollbar h-full overflow-y-auto pb-8">
      <div className="pt-safe bg-gradient-to-b from-mint-deep/35 to-transparent pb-4">
        <header className="flex items-center justify-between px-4 pb-4 pt-2">
          <h1 className="text-[24px] font-extrabold tracking-tight">{greeting()}</h1>
          <Link to="/settings" aria-label="Settings" className="flex h-10 w-10 items-center justify-center rounded-full">
            <Settings className="h-6 w-6" />
          </Link>
        </header>
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto px-4">
          {[null, ...GENRES].map((g) => (
            <button
              key={g ?? "all"}
              onClick={() => setGenre(g)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                genre === g ? "bg-mint text-on-mint" : "bg-white/[0.08] text-text",
              )}
            >
              {g ?? "All"}
            </button>
          ))}
        </div>
        {!genre && <QuickPicks />}
      </div>

      <Shelf title={label}>
        {trending.loading && Array.from({ length: 4 }, (_, i) => <div key={i} className="h-[180px] w-[140px] shrink-0 animate-pulse rounded-md bg-elevated" />)}
        {trending.data?.map((t, i) => (
          <Card key={t.id} title={t.title} subtitle={t.artist} artwork={t.artwork} seed={t.id} onClick={() => player.playQueue(trending.data!, i, label)} />
        ))}
      </Shelf>
      {trending.error && <ErrorState message="Couldn't load music. Check your connection." onRetry={trending.retry} />}

      {!genre && recent.length > 0 && (
        <Shelf title="Recently played">
          {recent.slice(0, 12).map((t, i) => (
            <Card key={t.id} title={t.title} subtitle={t.artist} artwork={t.artwork} seed={t.id} onClick={() => player.playQueue(recent, i, "Recently played")} />
          ))}
        </Shelf>
      )}

      {!genre && (
        <>
          {(playlists.data?.length ?? 0) > 0 && (
            <Shelf title="Popular playlists">
              {playlists.data!.map((p) => (
                <Card key={p.id} title={p.name} subtitle={`By ${p.owner}`} artwork={p.artwork} seed={p.id} to={`/remote/${p.id}`} />
              ))}
            </Shelf>
          )}

          <section className="mt-7">
            <h2 className="mb-1 px-4 text-[21px] font-bold tracking-tight">Top 10 this month</h2>
            {charts.loading && Array.from({ length: 4 }, (_, i) => <SkeletonRow key={i} />)}
            {charts.data?.map((t, i) => (
              <TrackRow key={t.id} track={t} rank={i + 1} onPlay={() => player.playQueue(charts.data!, i, "Top 10 this month")} onMore={setMenu} />
            ))}
          </section>
        </>
      )}
      <TrackSheet track={menu} onClose={() => setMenu(null)} />
    </div>
  );
}
