export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  artwork?: string;
  /** seconds */
  duration: number;
  genre?: string;
  /** where the audio comes from */
  source: "audius" | "youtube" | "local";
  /** YouTube video id; missing on imported songs until first played */
  videoId?: string;
  /** what to search YouTube for when videoId is missing */
  query?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  artwork?: string;
  tracks: Track[];
  createdAt: number;
  /** set when it came from a Spotify import */
  importedFrom?: string;
}

export interface RemotePlaylist {
  id: string;
  name: string;
  owner: string;
  artwork?: string;
  trackCount: number;
}

export interface Artist {
  id: string;
  name: string;
  handle: string;
  avatar?: string;
  cover?: string;
  followers: number;
  trackCount: number;
}
