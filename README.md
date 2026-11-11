# DriveMusic

A mobile music app: stream, search, build playlists, import from Spotify and
download songs to play offline. Built as an installable web app (PWA), ready to
be wrapped as a native Android/iOS app with Capacitor.

## Features

- **Home** — greeting, quick picks, genre chips, trending songs and playlists, Top 10 chart
- **Search** — any song (YouTube), plus the open catalog's songs, artists and playlists
- **Your Library** — Liked Songs, Downloads, your playlists (create, rename, delete)
- **Now Playing** — full-screen player, seek, shuffle, repeat, queue, lock-screen controls
- **Offline** — download open-catalog songs or whole playlists, and add your own music files; both play with no connection
- **Spotify import** — paste a playlist link or pick one of yours; every song is matched in the catalog

## Music sources

| Source | What | Offline |
|---|---|---|
| YouTube | Search any song; plays in YouTube's official embedded player | No — streaming only |
| [Audius](https://audius.org) open catalog | Independent artists, free API that allows streaming | Yes — download in the app |
| Your files | MP3 / M4A / WAV / FLAC / OGG picked from the phone | Yes — copied into the app |

YouTube's rules for embedded players apply: the video stays visible while it
plays (large in Now Playing, a floating 200×200 player while browsing; the ×
pauses and hides it), it pauses when the app is in the background, and it is
never downloaded. Search runs through `/api/youtube-search`, which keeps the
API key on the server and caches results: the free YouTube quota allows about
100 new searches a day (request more from Google when needed).

Imported Spotify songs use the open catalog when there's a confident match
(downloadable); the rest become YouTube songs, looked up the first time they're
played.

## Playback

Two `<audio>` elements: one plays, the other preloads the next song, so track
changes are instant. Audio isn't routed through WebAudio, which keeps it alive
when the phone locks or changes outputs. Stalls and network errors reload the
song where it stopped (with backoff), and downloaded songs play from local storage.

## Run

```bash
pnpm install
pnpm dev        # open the printed URL on your phone (same Wi-Fi)
pnpm test
pnpm build      # site in dist/ + the api/ function — deploy to Vercel (HTTPS needed for install + offline)
```

Install on the phone: open the deployed URL → Share → *Add to Home Screen* (iOS)
or the browser menu → *Install app* (Android).

## Spotify import

Users copy a playlist's share link in Spotify and paste it in the app — no
Spotify login, no setup. The server reads the public playlist with the app's
own Spotify credentials (`/api/spotify-playlist`), then each song is matched in
the catalog on the phone.

One-time setup for the site owner:

1. Create an app at <https://developer.spotify.com/dashboard> (Web API).
2. Set `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` as environment variables
   on the host (Vercel: Project Settings → Environment Variables), or in
   `.env.local` for `pnpm dev`.

## YouTube search setup

1. Google Cloud Console → create a project → enable **YouTube Data API v3**.
2. Credentials → Create API key (restrict it to the YouTube Data API).
3. Set `YOUTUBE_API_KEY` on the host (or in `.env.local`).

Limits: the playlist must be public; Spotify-made mixes (Discover Weekly,
Daily Mix…) can't be read by third-party apps.

## Native app (later)

```bash
pnpm add @capacitor/android @capacitor/ios
npx cap add android   # needs Android Studio
npx cap add ios       # needs Xcode on a Mac
pnpm cap:sync
```

For background playback in the native build, add a media-session/background-audio
plugin and enable the audio background mode on iOS.
