use polars::prelude::*;
use serde::Serialize;
use std::fs::File;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use time::OffsetDateTime;

#[derive(Debug, Clone, Serialize, serde::Deserialize)]
pub struct MoveEvent {
    pub turn_number: u32,
    pub active_side: String,
    pub chosen_color: String,
    pub piece_id: String,
    pub target_pos: String,
    #[serde(default)]
    pub timestamp_ms: i64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct GameRecord {
    pub game_id: String,
    pub board_id: String,
    pub timestamp: i64,
    pub game_date: String,
    pub white_name: String,
    pub black_name: String,
    pub winner: String,
    pub total_turns: u32,
    pub initial_state: String, // JSON serialized HashMap<String, String> (Piece ID -> Polygon ID)
    pub moves: String, // JSON serialized Vec<MoveEvent>
}

pub struct Recorder {
    pub records: Vec<GameRecord>,
}

impl Recorder {
    pub fn new() -> Self {
        Self { records: Vec::new() }
    }

    pub fn add_game(&mut self, record: GameRecord) {
        self.records.push(record);
    }

    pub fn write_parquet(&self, filepath: &str) -> PolarsResult<()> {
        if self.records.is_empty() {
            return Ok(());
        }

        let mut game_ids = Vec::with_capacity(self.records.len());
        let mut board_ids = Vec::with_capacity(self.records.len());
        let mut timestamps = Vec::with_capacity(self.records.len());
        let mut game_dates = Vec::with_capacity(self.records.len());
        let mut white_names = Vec::with_capacity(self.records.len());
        let mut black_names = Vec::with_capacity(self.records.len());
        let mut winners = Vec::with_capacity(self.records.len());
        let mut total_turns = Vec::with_capacity(self.records.len());
        let mut initial_states = Vec::with_capacity(self.records.len());
        let mut moves = Vec::with_capacity(self.records.len());

        for r in &self.records {
            game_ids.push(r.game_id.as_str());
            board_ids.push(r.board_id.as_str());
            timestamps.push(r.timestamp);
            game_dates.push(r.game_date.as_str());
            white_names.push(r.white_name.as_str());
            black_names.push(r.black_name.as_str());
            winners.push(r.winner.as_str());
            total_turns.push(r.total_turns);
            initial_states.push(r.initial_state.as_str());
            moves.push(r.moves.as_str());
        }

        let mut df = df!(
            "game_id" => &game_ids,
            "board_id" => &board_ids,
            "timestamp" => &timestamps,
            "game_date" => &game_dates,
            "white_name" => &white_names,
            "black_name" => &black_names,
            "winner" => &winners,
            "total_turns" => &total_turns,
            "initial_state" => &initial_states,
            "moves" => &moves,
        )?;

        let path = Path::new(filepath);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).unwrap_or_default();
        }

        let file = File::create(filepath)?;
        ParquetWriter::new(file).finish(&mut df)?;

        Ok(())
    }
}

pub fn current_timestamp_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

pub fn current_date_string() -> String {
    let dt = OffsetDateTime::now_utc();
    let format = time::format_description::parse("[year]-[month]-[day]T[hour]:[minute]:[second]Z").unwrap();
    dt.format(&format).unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string())
}
