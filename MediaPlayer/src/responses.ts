// ============================================================
// Search API Types
// ============================================================

export interface SearchResponse {
  page: number;
  results: SearchResult[];
  total_pages: number;
  total_results: number;
}

export interface SearchResult {
  adult?: boolean;
  id: number;
  media_type?: "movie" | "tv" | "person";

  backdrop_path?: string | null;
  poster_path?: string | null;
  overview?: string;
  popularity?: number;

  // Movie
  title?: string;
  original_title?: string;
  release_date?: string;
  video?: boolean;

  // TV
  name?: string;
  original_name?: string;
  first_air_date?: string;
  origin_country?: string[];

  // Person
  gender?: number;
  known_for_department?: string;
  profile_path?: string | null;
  known_for?: SearchResult[];

  original_language?: string;
  genre_ids?: number[];
  softcore?: boolean;
  vote_average?: number;
  vote_count?: number;
}


// ============================================================
// Search App Types
// ============================================================

export interface MediaSearchResult {
  id: number;
  media_type: "movie" | "tv";

  backdrop_path?: string | null;
  poster_path?: string | null;
  overview?: string;
  popularity?: number;

  title?: string;
  release_date?: string;

  genre_ids?: number[];
}

export function toMediaSearchResult(
  result: SearchResult,
): MediaSearchResult {
  if (result.media_type !== "movie" && result.media_type !== "tv") {
    throw new Error(`Invalid media type: ${result.media_type}`);
  }

  return {
    id: result.id,
    media_type: result.media_type,

    backdrop_path: result.backdrop_path,
    poster_path: result.poster_path,
    overview: result.overview,
    popularity: result.popularity,

    title: result.title ?? result.name,
    release_date: result.release_date ?? result.first_air_date,

    genre_ids: result.genre_ids,
  };
}


// ============================================================
// Media Details
// ============================================================

export interface Genre {
  id: number;
  name: string;
}

export interface Season {
  id: number;

  // Raw TMDB property
  air_date?: string | null;

  name: string;
  overview: string;
  episode_count: number;
  poster_path?: string | null;
  season_number: number;
}

export interface TvDetailsResponse {
  id: number;
  name: string;
  overview: string;
  backdrop_path?: string | null;
  first_air_date?: string | null;
  popularity: number;
  genres: Genre[];
  seasons: Season[];
}

export interface MovieDetailsResponse {
  id: number;
  title: string;
  overview: string;
  backdrop_path?: string | null;
  release_date?: string | null;
  popularity: number;
  runtime?: number | null;
  genres: Genre[];
}

export type ApiMediaDetails =
  | MovieDetailsResponse
  | TvDetailsResponse;

export interface MediaDetails {
  id: number;
  title: string;
  overview: string;
  backdrop_path?: string | null;
  release_date?: string | null;
  popularity: number;
  genres: Genre[];
  runtime?: number | null;
  seasons?: Season[];
}

export function toMediaDetails(
  response: ApiMediaDetails,
): MediaDetails {
  // Movie
  if ("title" in response) {
    return {
      id: response.id,
      title: response.title,
      overview: response.overview,
      backdrop_path: response.backdrop_path,
      release_date: response.release_date,
      popularity: response.popularity,
      genres: response.genres,
      runtime: response.runtime,
    };
  }

  // TV
  return {
    id: response.id,
    title: response.name,
    overview: response.overview,
    backdrop_path: response.backdrop_path,
    release_date: response.first_air_date,
    popularity: response.popularity,
    genres: response.genres,
    seasons: response.seasons,
  };
}


// ============================================================
// Season Details
// ============================================================

export interface SeasonDetailsResponse {
  _id: string;
  id: number;
  name: string;
  overview: string;
  poster_path?: string | null;
  season_number: number;
  air_date?: string | null;
  episodes: SeasonEpisodeResponse[];
}

export interface SeasonEpisodeResponse {
  episode_number: number;
  episode_type: string;
  id: number;
  name: string;
  overview: string;
  runtime?: number | null;
  season_number: number;
  show_id: number;
  still_path?: string | null;
}

export interface SeasonDetails {
  _id: string;
  id: number;
  name: string;
  overview: string;
  poster_path?: string | null;
  season_number: number;
  release_date?: string | null;
  episodes: SeasonEpisode[];
}

export interface SeasonEpisode {
  episode_number: number;
  episode_type: string;
  id: number;
  name: string;
  overview: string;
  runtime?: number | null;
  season_number: number;
  show_id: number;
  still_path?: string | null;
}

export function toSeasonEpisode(
  response: SeasonEpisodeResponse,
): SeasonEpisode {
  return {
    episode_number: response.episode_number,
    episode_type: response.episode_type,
    id: response.id,
    name: response.name,
    overview: response.overview,
    runtime: response.runtime,
    season_number: response.season_number,
    show_id: response.show_id,
    still_path: response.still_path,
  };
}

export function toSeasonDetails(
  response: SeasonDetailsResponse,
): SeasonDetails {
  return {
    _id: response._id,
    id: response.id,
    name: response.name,
    overview: response.overview,
    poster_path: response.poster_path,
    season_number: response.season_number,
    release_date: response.air_date,
    episodes: response.episodes.map(toSeasonEpisode),
  };
}


// ============================================================
// Available Downloads
// ============================================================

export interface Mp4Format {
  url: string;
  resolution: number;
  size: string;
  id: string;
}

export interface AvailableDownloadsResponse {
  mp4Data: {
    downloadInfo: {
      data: {
        downloads: Mp4Format[];
      };
    };
  };
}

export interface AvailableDownloads {
  mp4Formats: Mp4Format[];
}

export function toAvailableDownloads(
  response: AvailableDownloadsResponse,
): AvailableDownloads {
  return {
    mp4Formats: response.mp4Data.downloadInfo.data.downloads,
  };
}


// ============================================================
// Token
// ============================================================

export interface TokenResponse {
  t: string;
  e: number;
}