// ============================================================
// Search API Types
// ============================================================

export interface SearchResponse {
  page: number;
  results: ApiSearchResult[];
  total_pages: number;
  total_results: number;
}

export interface ApiSearchResult {
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
  known_for?: ApiSearchResult[];

  original_language?: string;
  genre_ids?: number[];
  softcore?: boolean;
  vote_average?: number;
  vote_count?: number;
}


// ============================================================
// Search App Types
// ============================================================

export interface SearchResult {
  id: number;
  media_type: "movie" | "tv";

  backdrop_path?: string | null;
  poster_path?: string | null;
  overview?: string;
  vote_average?: number;

  title?: string;
  release_date?: string;

  genre_ids?: number[];
}

export function toSearchResult(
  result: ApiSearchResult,
): SearchResult {
  if (result.media_type !== "movie" && result.media_type !== "tv") {
    throw new Error(`Invalid media type: ${result.media_type}`);
  }

  return {
    id: result.id,
    media_type: result.media_type,

    backdrop_path: result.backdrop_path,
    poster_path: result.poster_path,
    overview: result.overview,
    vote_average: result.vote_average,

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
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string | null;
  vote_average: number;
  genres: Genre[];
  seasons: Season[];
}

export interface MovieDetailsResponse {
  id: number;
  title: string;
  overview: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string | null;
  vote_average: number;
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
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string | null;
  vote_average: number;
  genres: Genre[];
  runtime?: number | null;
  seasons?: Season[];

  // Present only when this MediaDetails is attached to a single downloaded
  // TV episode rather than a movie (or whole-show info). Lets a downloaded
  // file be traced back to the exact episode it contains.
  episode?: SeasonEpisode;
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
      poster_path: response.poster_path,
      backdrop_path: response.backdrop_path,
      release_date: response.release_date,
      vote_average: response.vote_average,
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
    vote_average: response.vote_average,
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
  episodes: SeasonEpisode[];
  vote_average: number
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
  vote_average: number
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
  vote_average: number;
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
    episodes: response.episodes,
    vote_average: response.vote_average
  };
}
