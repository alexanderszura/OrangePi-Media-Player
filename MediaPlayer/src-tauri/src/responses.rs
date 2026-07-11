use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct SearchResponse {
    pub page: u64,
    pub results: Vec<SearchResult>,
    pub total_pages: u64,
    pub total_results: u64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SearchResult {
    pub adult: Option<bool>,
    pub id: u64,
    pub media_type: Option<String>,

    pub backdrop_path: Option<String>,
    pub poster_path: Option<String>,
    pub overview: Option<String>,
    pub popularity: Option<f64>,

    pub title: Option<String>,
    pub original_title: Option<String>,
    pub release_date: Option<String>,
    pub video: Option<bool>,

    pub name: Option<String>,
    pub original_name: Option<String>,
    pub first_air_date: Option<String>,
    pub origin_country: Option<Vec<String>>,

    pub gender: Option<u64>,
    pub known_for_department: Option<String>,
    pub profile_path: Option<String>,
    pub known_for: Option<Vec<SearchResult>>,

    pub original_language: Option<String>,
    pub genre_ids: Option<Vec<u32>>,
    pub softcore: Option<bool>,
    pub vote_average: Option<f64>,
    pub vote_count: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaSearchResult {
    pub id: u64,
    pub media_type: String,

    pub backdrop_path: Option<String>,
    pub poster_path: Option<String>,
    pub overview: Option<String>,
    pub popularity: Option<f64>,

    pub title: Option<String>,
    pub release_date: Option<String>,

    pub genre_ids: Option<Vec<u32>>,
}