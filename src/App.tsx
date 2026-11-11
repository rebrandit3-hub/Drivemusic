import { useEffect, useState } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { MiniPlayer } from "@/components/MiniPlayer";
import { NowPlaying } from "@/components/NowPlaying";
import { TabBar } from "@/components/TabBar";
import { ToastHost } from "@/components/Toast";
import { useLibrary } from "@/library/store";
import { player } from "@/player/engine";
import Artist from "@/screens/Artist";
import { DownloadsScreen, LikedScreen, PlaylistScreen, RemotePlaylistScreen } from "@/screens/Collections";
import Home from "@/screens/Home";
import ImportScreen from "@/screens/Import";
import Library from "@/screens/Library";
import Search from "@/screens/Search";
import Settings from "@/screens/Settings";

function OfflineBanner() {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <div className="bg-elevated px-4 py-1.5 text-center text-[12px] font-semibold text-muted">
      You're offline — downloaded songs still play
    </div>
  );
}

function useOffline(): boolean {
  const [offline, setOffline] = useState(typeof navigator !== "undefined" && !navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return offline;
}

function Shell() {
  const { pathname } = useLocation();
  const fullscreen = pathname === "/import" || pathname === "/settings";
  return (
    <div className="mx-auto flex h-full max-w-[520px] flex-col bg-bg">
      <main className="relative min-h-0 flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/library" element={<Library />} />
          <Route path="/liked" element={<LikedScreen />} />
          <Route path="/downloads" element={<DownloadsScreen />} />
          <Route path="/playlist/:id" element={<PlaylistScreen />} />
          <Route path="/remote/:id" element={<RemotePlaylistScreen />} />
          <Route path="/artist/:id" element={<Artist />} />
          <Route path="/import" element={<ImportScreen />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <div className="relative z-30 shrink-0">
        <OfflineBanner />
        <MiniPlayer />
        {!fullscreen && <TabBar />}
      </div>
      <NowPlaying />
      <ToastHost />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    void useLibrary.getState().load();
    player.restoreSession();
  }, []);
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
