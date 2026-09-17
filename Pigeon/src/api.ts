import {
  type ApiMediaDetails,
  GameImageType,
  type MediaDetails,
  type SearchResult,
  type SearchResponse,
  type SeasonDetails,
  type SeasonDetailsResponse,

  toMediaDetails,
  toSearchResult,
  toSeasonDetails,
} from "./responses";

const MEDIA_BASE_URL = "https://api.themoviedb.org/3";
const SEARCH_ENDPOINT = "search/multi";
const MOVIE_DB_API_KEY = "54e00466a09676df57ba51c4ca30b1a6"

// ============================================================
// Helpers
// ============================================================

function completeUrl(
  endpoint: string,
  params: Record<string, string | number> = {},
): string {
  const url = new URL(`${MEDIA_BASE_URL}/${endpoint}`);

  url.searchParams.set("api_key", MOVIE_DB_API_KEY);
  url.searchParams.set("language", "en-US");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

async function fetchJson<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}


// ============================================================
// Search
// ============================================================

export async function fetchSearchedMedia(
  query: string,
): Promise<SearchResult[]> {
  const response = await fetchJson<SearchResponse>(
    completeUrl(SEARCH_ENDPOINT, { query }),
  );

  return response.results
    .filter(
      (result) =>
        result.media_type === "movie" ||
        result.media_type === "tv",
    )
    .map(toSearchResult);
}


// ============================================================
// Media Details
// ============================================================

export async function fetchTitleInfo(
  mediaType: "movie" | "tv",
  id: number,
): Promise<MediaDetails> {
  const response = await fetchJson<ApiMediaDetails>(
    completeUrl(`${mediaType}/${id}`),
  );

  return toMediaDetails(response);
}

export function mediaImagePath(path: string | undefined | null, nullValue="noImage.jpg"): string {
  if (!path) {
    return nullValue;
  }

  return `https://image.tmdb.org/t/p/w500${path}`;
}

// ============================================================
// Season Details
// ============================================================

export async function fetchSeasonInfo(
  id: number,
  seasonNumber: number,
): Promise<SeasonDetails> {
  const response = await fetchJson<SeasonDetailsResponse>(
    completeUrl(`tv/${id}/season/${seasonNumber}`),
  );

  return toSeasonDetails(response);
}

export function gameImagePath(imageId: string | undefined, type: GameImageType, nullValue="noImage.jpg") {
  if (imageId == undefined) {
    return nullValue;
  }

  return `https://images.igdb.com/igdb/image/upload/t_${type}/${imageId}.jpg`
}