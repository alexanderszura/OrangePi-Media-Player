use reqwest::Client;
use crate::responses::*;

const PUBLIC_API_KEY: &str = "54e00466a09676df57ba51c4ca30b1a6";

const MEDIA_BASE_URL: &str = "https://api.themoviedb.org/3";
const SEARCH_ENDPOINT: &str = "search/multi";

pub fn complete_url(endpoint: &str) -> String {
    return format!("{}/{}?api_key={}&language=en-US", MEDIA_BASE_URL, endpoint, PUBLIC_API_KEY)
}

pub async fn fetch_searched_media(
    query: &str,
) -> Result<Vec<MediaSearchResult>, Box<dyn std::error::Error>> {
    let client = Client::new();

    let response = client
        .get(complete_url(SEARCH_ENDPOINT))
        .query(&[("query", query)])
        .send()
        .await?
        .error_for_status()?
        .json::<SearchResponse>()
        .await?;

    let results = response
        .results
        .into_iter()
        .filter_map(|result| {
            match result.media_type.as_deref() {
                Some("movie") | Some("tv") => Some(MediaSearchResult {
                    id: result.id,
                    media_type: result.media_type.unwrap(),

                    backdrop_path: result.backdrop_path,
                    poster_path: result.poster_path,
                    overview: result.overview,
                    popularity: result.popularity,

                    // Movies use `title`, TV shows use `name`
                    title: result.title.or(result.name),

                    // Movies use `release_date`, TV shows use `first_air_date`
                    release_date: result.release_date.or(result.first_air_date),

                    genre_ids: result.genre_ids,
                }),
                _ => None,
            }
        })
        .collect();

    Ok(results)
}