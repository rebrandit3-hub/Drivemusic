export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  artwork?: string;
  /** seconds */
  duration: number;
  genre?: string;
  /** catalog the track streams from */
  source: "audius";
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
