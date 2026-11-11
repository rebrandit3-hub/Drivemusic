// Vercel serverless function: GET /api/spotify-playlist?link=<spotify playlist link>
import { handlePlaylistRequest } from "../server/spotifyPlaylist";

export async function GET(request: Request): Promise<Response> {
  const { status, body } = await handlePlaylistRequest(new URL(request.url), {
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
  });
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      // same playlist pasted by many people: let the CDN answer for 5 minutes
      "Cache-Control": status === 200 ? "public, s-maxage=300" : "no-store",
    },
  });
}
