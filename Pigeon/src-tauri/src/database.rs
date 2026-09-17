use rusqlite::{Connection, Result};
use std::sync::Mutex;
use serde::Serialize;

pub struct Database(pub Mutex<Connection>);

pub fn init_db(path: &std::path::Path) -> Result<Connection> {
    let conn = Connection::open(path)?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS watch_progress (
            media_id INTEGER NOT NULL,
            media_type TEXT NOT NULL,

            season INTEGER,
            episode INTEGER,

            time_watched INTEGER NOT NULL,
            total_time INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,

            PRIMARY KEY (media_id, media_type, season, episode)
        );
        ",
    )?;

    Ok(conn)
}

#[tauri::command]
pub fn set_watched_movie(
    db: tauri::State<'_, Database>,
    media_id: i64,
    time_watched: i64,
    total_time: i64,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "
        INSERT INTO watch_progress (
            media_id,
            media_type,
            season,
            episode,
            time_watched,
            total_time,
            updated_at
        )
        VALUES (
            ?1,
            'movie',
            NULL,
            NULL,
            ?2,
            ?3,
            unixepoch()
        )
        ON CONFLICT(media_id, media_type, season, episode)
        DO UPDATE SET
            time_watched = excluded.time_watched,
            total_time = excluded.total_time,
            updated_at = excluded.updated_at
        ",
        (media_id, time_watched, total_time),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn set_watched_tv(
    db: tauri::State<'_, Database>,
    media_id: i64,
    season: i64,
    episode: i64,
    time_watched: i64,
    total_time: i64,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "
        INSERT INTO watch_progress (
            media_id,
            media_type,
            season,
            episode,
            time_watched,
            total_time,
            updated_at
        )
        VALUES (
            ?1,
            'tv',
            ?2,
            ?3,
            ?4,
            ?5,
            unixepoch()
        )
        ON CONFLICT(media_id, media_type, season, episode)
        DO UPDATE SET
            time_watched = excluded.time_watched,
            total_time = excluded.total_time,
            updated_at = excluded.updated_at
        ",
        (media_id, season, episode, time_watched, total_time),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[derive(Debug, Serialize)]
pub struct WatchProgress {
    pub media_id: i64,
    pub media_type: String,
    pub season: Option<i64>,
    pub episode: Option<i64>,
    pub time_watched: i64,
    pub total_time: i64,
    pub updated_at: i64,
}

#[tauri::command]
pub fn get_watched_movies(
    db: tauri::State<'_, Database>,
    media_ids: Vec<i64>,
) -> Result<Vec<WatchProgress>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    if media_ids.is_empty() {
        return Ok(Vec::new());
    }

    let placeholders = std::iter::repeat("?")
        .take(media_ids.len())
        .collect::<Vec<_>>()
        .join(", ");

    let sql = format!(
        "
        SELECT
            media_id,
            media_type,
            season,
            episode,
            time_watched,
            total_time,
            updated_at
        FROM watch_progress
        WHERE media_type = 'movie'
          AND media_id IN ({})
        ",
        placeholders
    );

    let mut stmt = conn.prepare(&sql)
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(
            rusqlite::params_from_iter(media_ids.iter()),
            |row| {
                Ok(WatchProgress {
                    media_id: row.get(0)?,
                    media_type: row.get(1)?,
                    season: row.get(2)?,
                    episode: row.get(3)?,
                    time_watched: row.get(4)?,
                    total_time: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_watched_tv_season(
    db: tauri::State<'_, Database>,
    media_id: i64,
    season: i64,
) -> Result<Vec<WatchProgress>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "
            SELECT
                media_id,
                media_type,
                season,
                episode,
                time_watched,
                total_time,
                updated_at
            FROM watch_progress
            WHERE media_id = ?1
              AND media_type = 'tv'
              AND season = ?2
            ORDER BY episode
            ",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map((media_id, season), |row| {
            Ok(WatchProgress {
                media_id: row.get(0)?,
                media_type: row.get(1)?,
                season: row.get(2)?,
                episode: row.get(3)?,
                time_watched: row.get(4)?,
                total_time: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}