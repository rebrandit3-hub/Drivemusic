# DriveMusic

A mobile music app: stream, search, build playlists, import from Spotify and
download songs to play offline. Built as an installable web app (PWA), ready to
be wrapped as a native Android/iOS app with Capacitor.

## Features

- **Home** — greeting, quick picks, genre chips, trending songs and playlists, Top 10 chart
- **Search** — songs, artists and playlists, genre browsing
- **Your Library** — Liked Songs, Downloads, your playlists (create, rename, delete)
- **Now Playing** — full-screen player, seek, shuffle, repeat, queue, lock-screen controls
- **Offline** — download a song or a whole playlist; it plays with no connection
- **Spotify import** — paste a playlist link or pick one of yours; every song is matched in the catalog

## Music source

Songs stream from [Audius](https://audius.org), an open music network whose API
allows free streaming by third-party apps. The library (likes, playlists,
downloads) is stored on the phone.

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
pnpm build      # static site in dist/ — deploy to any static host (HTTPS needed for install + offline)
```

Install on the phone: open the deployed URL → Share → *Add to Home Screen* (iOS)
or the browser menu → *Install app* (Android).

## Spotify import setup

1. Create an app at <https://developer.spotify.com/dashboard> (Web API).
2. Add your app URL (for example `https://your-domain.com/`) as a Redirect URI.
3. Put the Client ID in `.env.local` as `VITE_SPOTIFY_CLIENT_ID=…`, or paste it in the app.

New Spotify apps start in development mode: add the Spotify accounts that will
import (up to 25) under *User Management* in the dashboard.

## Native app (later)

```bash
pnpm add @capacitor/android @capacitor/ios
npx cap add android   # needs Android Studio
npx cap add ios       # needs Xcode on a Mac
pnpm cap:sync
```

For background playback in the native build, add a media-session/background-audio
plugin and enable the audio background mode on iOS.
