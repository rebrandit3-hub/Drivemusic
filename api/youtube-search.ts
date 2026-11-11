// Vercel serverless function: GET /api/youtube-search?q=<song>
import { handleSearchRequest } from "../server/youtubeSearch";

export async function GET(request: Request): Promise<Response> {
  const { status, body } = await handleSearchRequest(new URL(request.url), {
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  });
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      // identical searches from different people are answered by the CDN
      "Cache-Control": status === 200 ? "public, s-maxage=43200, stale-while-revalidate=86400" : "no-store",
    },
  });
}
