use crate::consoles::{ConsoleInfo, CONSOLES};
use crate::secrets::{CLIENT_ID, CLIENT_SECRET};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha1::{Digest, Sha1};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

const HASHEOUS_LOOKUP_URL: &str = "https://hasheous.org/api/v1/Lookup/ByHash/";
const ROM_CACHE_DIR_NAME: &str = "cached data";

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Cover {
    pub image_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameData {
    pub id: u64,
    pub name: String,
    pub summary: Option<String>,
    pub rating: Option<f64>,
    pub first_release_date: Option<i64>,
    pub platforms: Vec<ConsoleInfo>,
    pub cover: Option<String>,
    pub popularity_score: Option<f64>,
}

/// SHA-1 hash(es) of a ROM file. `headerless` is only populated for files
/// carrying an iNES header (NES ROMs), mirroring the Python reference script.
#[derive(Debug, Clone)]
pub struct FileHashes {
    pub full: String,
    pub headerless: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct CachedRomData {
    source_path: String,
    full_hash: String,
    headerless_hash: Option<String>,
    game: GameData,
}

#[derive(Debug, Clone)]
struct RomMatch {
    path: PathBuf,
    game: GameData,
}

#[derive(Debug, Deserialize)]
struct HasheousMetadataItem {
    #[serde(rename = "objectType")]
    object_type: String,
    source: String,
    id: String,
}

#[derive(Debug, Deserialize)]
struct HasheousLookupResponse {
    metadata: Option<Vec<HasheousMetadataItem>>,
}

#[derive(Debug, Deserialize)]
struct IgdbGame {
    id: u64,
    name: String,
    summary: Option<String>,
    rating: Option<f64>,
    total_rating_count: Option<u32>,
    rating_count: Option<u32>,
    aggregated_rating_count: Option<u32>,
    hypes: Option<u32>,
    first_release_date: Option<i64>,
    platforms: Option<Vec<u32>>,
    cover: Option<Cover>,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    expires_in: u64,
}

struct CachedToken {
    token: String,
    expires_at: Instant,
}

static TOKEN_CACHE: Mutex<Option<CachedToken>> = Mutex::new(None);
static HTTP_CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
static HASHEOUS_CACHE: OnceLock<Mutex<HashMap<String, Option<u32>>>> = OnceLock::new();

#[tauri::command]
pub async fn search_roms(
    name: String,
    limit: u32,
    save_path: String,
) -> Result<Vec<GameData>, String> {
    let search_term = name.trim().to_lowercase();
    if search_term.is_empty() || limit == 0 {
        return Ok(Vec::new());
    }

    let roms_dir = PathBuf::from(&save_path).join("roms");
    fs::create_dir_all(&roms_dir).map_err(|e| {
        format!(
            "Failed to create roms directory {}: {}",
            roms_dir.display(),
            e
        )
    })?;
    let cache_dir = ensure_rom_cache_dir(&roms_dir)?;

    // 1. Find files on disk whose name matches the search term.
    let mut matches: Vec<RomMatch> = Vec::new();
    find_matching_rom_files(&roms_dir, &search_term, limit as usize, &mut matches)?;

    if matches.is_empty() {
        return Ok(Vec::new());
    }

    // 2. Hash each matched file and resolve it to an IGDB id via Hasheous.
    let mut igdb_ids: Vec<u32> = Vec::new();
    let mut resolved_ids_by_match: Vec<Option<u32>> = vec![None; matches.len()];
    let mut cached_games_by_match: Vec<Option<GameData>> = vec![None; matches.len()];
    let mut hashes_by_match: Vec<Option<FileHashes>> = vec![None; matches.len()];

    for (index, rom_match) in matches.iter().enumerate() {
        let path_for_hash = rom_match.path.clone();
        let hashes = match tokio::task::spawn_blocking(move || hash_file(&path_for_hash)).await {
            Ok(Ok(h)) => h,
            Ok(Err(e)) => {
                eprintln!("Failed to hash {}: {}", rom_match.path.display(), e);
                continue;
            }
            Err(e) => {
                eprintln!(
                    "Hashing task panicked for {}: {}",
                    rom_match.path.display(),
                    e
                );
                continue;
            }
        };

        hashes_by_match[index] = Some(hashes.clone());

        if let Some(cached_game) = read_cached_rom_data(&cache_dir, &rom_match.path, &hashes) {
            cached_games_by_match[index] = Some(cached_game);
            continue;
        }

        match find_igdb_id_from_hash(&hashes).await {
            Ok(Some(id)) => {
                resolved_ids_by_match[index] = Some(id);
                if !igdb_ids.contains(&id) {
                    igdb_ids.push(id);
                }
            }
            Ok(None) => {
                // eprintln!("No IGDB match found for {}", rom_match.path.display());
            }
            Err(e) => {
                eprintln!(
                    "Hasheous lookup failed for {}: {}",
                    rom_match.path.display(),
                    e
                );
            }
        }
    }

    if igdb_ids.is_empty() {
        let game_entries = matches
            .into_iter()
            .enumerate()
            .map(|(index, rom_match)| {
                let game = cached_games_by_match[index].clone().unwrap_or_else(|| {
                    write_cached_rom_data(
                        &cache_dir,
                        &rom_match.path,
                        hashes_by_match[index].as_ref(),
                        &rom_match.game,
                    );
                    rom_match.game
                });

                (game, hashes_by_match[index].clone())
            })
            .collect();

        return Ok(dedupe_game_entries(game_entries));
    }

    // 3. Fetch metadata for every matched id in a single IGDB call.
    let games_by_id: HashMap<u32, GameData> = query_igdb(igdb_ids)
        .await?
        .into_iter()
        .map(|game| (game.id as u32, game))
        .collect();

    let game_entries = matches
        .into_iter()
        .enumerate()
        .map(|(index, rom_match)| {
            if let Some(cached_game) = &cached_games_by_match[index] {
                return (cached_game.clone(), hashes_by_match[index].clone());
            }

            let game = resolved_ids_by_match[index]
                .and_then(|id| games_by_id.get(&id).cloned())
                .unwrap_or_else(|| rom_match.game.clone());

            write_cached_rom_data(
                &cache_dir,
                &rom_match.path,
                hashes_by_match[index].as_ref(),
                &game,
            );

            (game, hashes_by_match[index].clone())
        })
        .collect::<Vec<_>>();

    Ok(dedupe_game_entries(game_entries))
}

#[tauri::command]
pub fn quick_search_roms(
    name: String,
    limit: u32,
    save_path: String,
) -> Result<Vec<GameData>, String> {
    let search_term = name.trim().to_lowercase();
    if search_term.is_empty() || limit == 0 {
        return Ok(Vec::new());
    }

    let roms_dir = PathBuf::from(&save_path).join("roms");
    fs::create_dir_all(&roms_dir).map_err(|e| {
        format!(
            "Failed to create roms directory {}: {}",
            roms_dir.display(),
            e
        )
    })?;
    ensure_rom_cache_dir(&roms_dir)?;

    let mut matches: Vec<RomMatch> = Vec::new();
    find_matching_rom_files(&roms_dir, &search_term, limit as usize, &mut matches)?;

    Ok(matches
        .into_iter()
        .map(|rom_match| rom_match.game)
        .collect())
}

/// Fallback lookup used only when the frontend navigates to a game's detail
/// page without already having the `GameData` in hand (e.g. a direct link
/// or a page refresh). Always checks the on-disk ROM cache first, since
/// that data was already fetched/hashed during a prior `search_roms` call.
/// Only reaches out to IGDB if nothing cached matches this id.
#[tauri::command]
pub async fn game_info(id: u64, save_path: String) -> Result<GameData, String> {
    let roms_dir = PathBuf::from(&save_path).join("roms");
    let cache_dir = roms_dir.join(ROM_CACHE_DIR_NAME);

    if let Some(game) = find_cached_game_by_id(&cache_dir, id) {
        return Ok(game);
    }

    if id <= u32::MAX as u64 && !is_local_game_id(id) {
        let mut games = query_igdb(vec![id as u32]).await?;
        if let Some(game) = games.pop() {
            return Ok(game);
        }
    }

    Ok(blank_game_data("", None))
}

/// Scans the ROM cache directory for a previously-cached entry whose
/// `GameData.id` matches. Cache files are keyed by a path-derived local id,
/// not by game id, so this is a linear scan rather than a direct lookup —
/// still far cheaper than a network round trip.
fn find_cached_game_by_id(cache_dir: &Path, id: u64) -> Option<GameData> {
    let entries = fs::read_dir(cache_dir).ok()?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) != Some("json") {
            continue;
        }

        let Ok(data) = fs::read_to_string(&path) else {
            continue;
        };

        let Ok(cached) = serde_json::from_str::<CachedRomData>(&data) else {
            continue;
        };

        if cached.game.id == id {
            return Some(cached.game);
        }
    }

    None
}

/// Recursively walk `dir`, collecting files whose stem contains `needle`
/// (already lower-cased), stopping once `limit` matches are found.
fn find_matching_rom_files(
    dir: &Path,
    needle: &str,
    limit: usize,
    out: &mut Vec<RomMatch>,
) -> Result<(), String> {
    if out.len() >= limit {
        return Ok(());
    }

    let entries = fs::read_dir(dir)
        .map_err(|e| format!("Failed to read directory {}: {}", dir.display(), e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();

        if path.is_dir() {
            if path
                .file_name()
                .and_then(|s| s.to_str())
                .map(|name| name.eq_ignore_ascii_case(ROM_CACHE_DIR_NAME))
                .unwrap_or(false)
            {
                continue;
            }

            find_matching_rom_files(&path, needle, limit, out)?;
        } else if path.is_file() {
            let file_stem = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or_default()
                .to_lowercase();

            if file_stem.contains(needle) {
                out.push(RomMatch {
                    game: blank_game_data_from_path(&path),
                    path,
                });
            }
        }

        if out.len() >= limit {
            break;
        }
    }

    Ok(())
}

fn dedupe_game_entries(game_entries: Vec<(GameData, Option<FileHashes>)>) -> Vec<GameData> {
    let mut seen: Vec<String> = Vec::new();
    let mut games = Vec::new();

    for (game, hashes) in game_entries {
        let key = if is_local_game_id(game.id) {
            hashes
                .map(|hashes| format!("hash:{}", hashes.full))
                .unwrap_or_else(|| format!("local:{}", game.id))
        } else {
            format!("igdb:{}", game.id)
        };

        if seen.contains(&key) {
            continue;
        }

        seen.push(key);
        games.push(game);
    }

    sort_games(&mut games);

    games
}

fn sort_games(games: &mut [GameData]) {
    games.sort_by(|a, b| {
        game_has_metadata(b)
            .cmp(&game_has_metadata(a))
            .then_with(|| {
                game_popularity_score(b)
                    .partial_cmp(&game_popularity_score(a))
                    .unwrap_or(std::cmp::Ordering::Equal)
            })
            .then_with(|| {
                game_rating_score(b)
                    .partial_cmp(&game_rating_score(a))
                    .unwrap_or(std::cmp::Ordering::Equal)
            })
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
}

fn game_has_metadata(game: &GameData) -> bool {
    !is_local_game_id(game.id)
}

fn game_popularity_score(game: &GameData) -> f64 {
    game.popularity_score.unwrap_or(0.0)
}

fn game_rating_score(game: &GameData) -> f64 {
    game.rating.unwrap_or(0.0)
}

fn ensure_rom_cache_dir(roms_dir: &Path) -> Result<PathBuf, String> {
    let cache_dir = roms_dir.join(ROM_CACHE_DIR_NAME);
    fs::create_dir_all(&cache_dir).map_err(|e| {
        format!(
            "Failed to create ROM cache directory {}: {}",
            cache_dir.display(),
            e
        )
    })?;
    Ok(cache_dir)
}

fn read_cached_rom_data(
    cache_dir: &Path,
    rom_path: &Path,
    hashes: &FileHashes,
) -> Option<GameData> {
    let cache_path = cached_rom_data_path(cache_dir, rom_path);
    let data = fs::read_to_string(cache_path).ok()?;
    let cached = serde_json::from_str::<CachedRomData>(&data).ok()?;

    if cached.full_hash == hashes.full && cached.headerless_hash == hashes.headerless {
        Some(cached.game)
    } else {
        None
    }
}

fn write_cached_rom_data(
    cache_dir: &Path,
    rom_path: &Path,
    hashes: Option<&FileHashes>,
    game: &GameData,
) {
    let Some(hashes) = hashes else {
        return;
    };

    let cache_path = cached_rom_data_path(cache_dir, rom_path);
    let cached = CachedRomData {
        source_path: rom_path.to_string_lossy().to_string(),
        full_hash: hashes.full.clone(),
        headerless_hash: hashes.headerless.clone(),
        game: game.clone(),
    };

    match serde_json::to_string_pretty(&cached) {
        Ok(data) => {
            if let Err(e) = fs::write(&cache_path, data) {
                eprintln!("Failed to write ROM cache {}: {}", cache_path.display(), e);
            }
        }
        Err(e) => {
            eprintln!(
                "Failed to serialize ROM cache for {}: {}",
                rom_path.display(),
                e
            );
        }
    }
}

fn cached_rom_data_path(cache_dir: &Path, rom_path: &Path) -> PathBuf {
    cache_dir.join(format!("{}.json", local_game_id(rom_path)))
}

fn blank_game_data_from_path(path: &Path) -> GameData {
    let name = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or_default()
        .to_string();

    blank_game_data(&name, Some(path))
}

fn blank_game_data(name: &str, path: Option<&Path>) -> GameData {
    GameData {
        id: path.map(local_game_id).unwrap_or(9_000_000_000_000),
        name: name.to_string(),
        summary: Some(String::new()),
        rating: None,
        first_release_date: None,
        platforms: path.map(platforms_for_path).unwrap_or_default(),
        cover: None,
        popularity_score: None,
    }
}

fn platforms_for_path(path: &Path) -> Vec<ConsoleInfo> {
    let extension = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or_default();

    CONSOLES
        .iter()
        .filter(|console| console.supports_extension(extension))
        .map(|console| ConsoleInfo {
            id: console.id,
            name: console.name.to_string(),
        })
        .collect()
}

fn local_game_id(path: &Path) -> u64 {
    let mut hash = 0xcbf29ce484222325u64;
    let path_text = path.to_string_lossy();

    for byte in path_text.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }

    9_000_000_000_000 + (hash % 7_000_000_000_000)
}

fn is_local_game_id(id: u64) -> bool {
    id >= 9_000_000_000_000
}

/// Computes the full-file SHA-1, plus a headerless SHA-1 when an iNES
/// header (NES ROM) is detected — same logic as the Python reference script.
pub fn hash_file(file_path: &Path) -> Result<FileHashes, String> {
    let data = fs::read(file_path)
        .map_err(|e| format!("Failed to read file {}: {}", file_path.display(), e))?;

    let mut hasher = Sha1::new();
    hasher.update(&data);
    let full = hex::encode(hasher.finalize());

    let headerless = if data.len() >= 16 && &data[0..4] == b"NES\x1a" {
        let mut header_hasher = Sha1::new();
        header_hasher.update(&data[16..]);
        Some(hex::encode(header_hasher.finalize()))
    } else {
        None
    };

    Ok(FileHashes { full, headerless })
}

/// Looks up a hash against Hasheous and pulls out the matching IGDB id.
/// Tries the full-file hash first, falling back to the headerless hash
/// (if present) the same way the commented-out Python fallback does.
pub async fn find_igdb_id_from_hash(hashes: &FileHashes) -> Result<Option<u32>, String> {
    if let Some(id) = query_hasheous(&hashes.full).await? {
        return Ok(Some(id));
    }

    if let Some(headerless) = &hashes.headerless {
        if let Some(id) = query_hasheous(headerless).await? {
            return Ok(Some(id));
        }
    }

    Ok(None)
}

async fn query_hasheous(sha1_hash: &str) -> Result<Option<u32>, String> {
    if let Ok(cache) = get_hasheous_cache().lock() {
        if let Some(cached) = cache.get(sha1_hash) {
            return Ok(*cached);
        }
    }

    let response = get_client()
        .post(HASHEOUS_LOOKUP_URL)
        .json(&json!({ "sha1": sha1_hash }))
        .send()
        .await
        .map_err(|e| format!("Hasheous request failed: {}", e))?;

    let igdb_id = match response.status() {
        StatusCode::OK => {
            let body: HasheousLookupResponse = response
                .json()
                .await
                .map_err(|e| format!("Failed to parse Hasheous response: {}", e))?;

            let igdb_id = body
                .metadata
                .unwrap_or_default()
                .into_iter()
                .find(|item| item.object_type == "Game" && item.source == "IGDB")
                .and_then(|item| item.id.parse::<u32>().ok());

            igdb_id
        }
        StatusCode::NOT_FOUND => None,
        status => {
            let err_text = response.text().await.unwrap_or_default();
            return Err(format!(
                "Hasheous request failed (Status {}): {}",
                status, err_text
            ));
        }
    };

    if let Ok(mut cache) = get_hasheous_cache().lock() {
        cache.insert(sha1_hash.to_string(), igdb_id);
    }

    Ok(igdb_id)
}

fn get_client() -> &'static reqwest::Client {
    HTTP_CLIENT.get_or_init(reqwest::Client::new)
}

fn get_hasheous_cache() -> &'static Mutex<HashMap<String, Option<u32>>> {
    HASHEOUS_CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

async fn get_igdb_token() -> Result<String, String> {
    // Check if valid cached token exists (with a 60-second expiration buffer)
    if let Ok(cache) = TOKEN_CACHE.lock() {
        if let Some(ref cached) = *cache {
            if cached.expires_at > Instant::now() + Duration::from_secs(60) {
                return Ok(cached.token.clone());
            }
        }
    }

    // Request new token using secrets module constants
    let response = get_client()
        .post("https://id.twitch.tv/oauth2/token")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .form(&[
            ("client_id", CLIENT_ID),
            ("client_secret", CLIENT_SECRET),
            ("grant_type", "client_credentials"),
        ])
        .send()
        .await
        .map_err(|e| format!("Token request HTTP error: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Token request failed with status {}",
            response.status()
        ));
    }

    let token_data = response
        .json::<TokenResponse>()
        .await
        .map_err(|e| format!("Failed parsing token response: {}", e))?;

    // Store in cache
    if let Ok(mut cache) = TOKEN_CACHE.lock() {
        *cache = Some(CachedToken {
            token: token_data.access_token.clone(),
            expires_at: Instant::now() + Duration::from_secs(token_data.expires_in),
        });
    }

    Ok(token_data.access_token)
}

/// Queries IGDB for multiple ids at once, matching the batching style of
/// the existing search_games / game_info commands.
pub async fn query_igdb(ids: Vec<u32>) -> Result<Vec<GameData>, String> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }

    let token = get_igdb_token().await?;

    let id_list = ids
        .iter()
        .map(|id| id.to_string())
        .collect::<Vec<_>>()
        .join(",");

    let query = format!(
        "fields id, name, summary, rating, total_rating_count, rating_count, aggregated_rating_count, hypes, first_release_date, platforms, cover.image_id;\nwhere id = ({});\nlimit {};",
        id_list,
        ids.len()
    );

    let response = get_client()
        .post("https://api.igdb.com/v4/games")
        .header("Client-ID", CLIENT_ID)
        .bearer_auth(&token)
        .header("Accept", "application/json")
        .header("Content-Type", "text/plain")
        .body(query)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status();

    if !status.is_success() {
        let err_text = response.text().await.unwrap_or_default();
        return Err(format!(
            "IGDB request failed (Status {}): {}",
            status, err_text
        ));
    }

    let raw_games = response
        .json::<Vec<IgdbGame>>()
        .await
        .map_err(|e| format!("Failed to parse IGDB response: {}", e))?;

    let games = raw_games
        .into_iter()
        .map(|g| {
            let popularity_score = igdb_popularity_score(&g);

            GameData {
                id: g.id,
                name: g.name,
                summary: g.summary,
                rating: g.rating,
                first_release_date: g.first_release_date,
                platforms: g
                    .platforms
                    .unwrap_or_default()
                    .into_iter()
                    .filter_map(|id| CONSOLES.iter().find(|c| c.igdb_id == id))
                    .map(|c| ConsoleInfo {
                        id: c.id,
                        name: c.name.to_string(),
                    })
                    .collect(),
                cover: g.cover.map(|c| c.image_id),
                popularity_score,
            }
        })
        .collect();

    Ok(games)
}

fn igdb_popularity_score(game: &IgdbGame) -> Option<f64> {
    let score = f64::from(game.total_rating_count.unwrap_or(0)) * 10.0
        + f64::from(game.rating_count.unwrap_or(0)) * 5.0
        + f64::from(game.aggregated_rating_count.unwrap_or(0)) * 5.0
        + f64::from(game.hypes.unwrap_or(0)) * 3.0
        + game.rating.unwrap_or(0.0) / 10.0;

    if score > 0.0 {
        Some(score)
    } else {
        None
    }
}