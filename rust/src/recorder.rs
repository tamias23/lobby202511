use polars::prelude::*;
use serde::Serialize;
use std::fs::File;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, serde::Deserialize)]
pub struct MoveEvent {
    pub turn_number: u32,
    pub active_side: String,
    pub phase: String,          // "setup" or "playing"
    pub chosen_color: String,
    pub piece_id: String,
    pub target_id: String,
    #[serde(default)]
    pub timestamp_ms: i64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct GameRecord {
    pub game_id: String,
    pub timestamp: i64,
    pub white_name: String,
    pub black_name: String,
    pub white_player_id: String,
    pub black_player_id: String,
    pub board_id: String,
    pub winner: String,
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
        let mut timestamps = Vec::with_capacity(self.records.len());
        let mut white_names = Vec::with_capacity(self.records.len());
        let mut black_names = Vec::with_capacity(self.records.len());
        let mut white_player_ids = Vec::with_capacity(self.records.len());
        let mut black_player_ids = Vec::with_capacity(self.records.len());
        let mut board_ids = Vec::with_capacity(self.records.len());
        let mut winners = Vec::with_capacity(self.records.len());
        let mut moves = Vec::with_capacity(self.records.len());

        for r in &self.records {
            game_ids.push(r.game_id.as_str());
            timestamps.push(r.timestamp);
            white_names.push(r.white_name.as_str());
            black_names.push(r.black_name.as_str());
            white_player_ids.push(r.white_player_id.as_str());
            black_player_ids.push(r.black_player_id.as_str());
            board_ids.push(r.board_id.as_str());
            winners.push(r.winner.as_str());
            moves.push(r.moves.as_str());
        }

        let mut df = df!(
            "game_id" => &game_ids,
            "timestamp" => &timestamps,
            "white_name" => &white_names,
            "black_name" => &black_names,
            "white_player_id" => &white_player_ids,
            "black_player_id" => &black_player_ids,
            "board_id" => &board_ids,
            "winner" => &winners,
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
