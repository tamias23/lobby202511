use std::collections::HashMap;
use serde::{Deserialize, Serialize, Deserializer, Serializer};

// Custom deserialization for PieceType to handle legacy names and plurals
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PieceType {
    Heroe,
    Goddess,
    Mage,
    Bishop,
    Soldier,
    Siren,
    Ghoul,
    Berserker,
}

impl Serialize for PieceType {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let s = match self {
            PieceType::Heroe => "heroe",
            PieceType::Goddess => "goddess",
            PieceType::Mage => "mage",
            PieceType::Bishop => "bishop",
            PieceType::Soldier => "soldier",
            PieceType::Siren => "siren",
            PieceType::Ghoul => "ghoul",
            PieceType::Berserker => "berserker",
        };
        serializer.serialize_str(s)
    }
}

impl<'de> Deserialize<'de> for PieceType {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?.to_lowercase();
        match s.as_str() {
            "heroe" | "heroes" | "king" | "kings" => Ok(PieceType::Heroe),
            "goddess" | "goddesses" => Ok(PieceType::Goddess),
            "mage" | "mages" => Ok(PieceType::Mage),
            "bishop" | "bishops" => Ok(PieceType::Bishop),
            "soldier" | "soldiers" => Ok(PieceType::Soldier),
            "siren" | "sirens" => Ok(PieceType::Siren),
            "ghoul" | "ghouls" => Ok(PieceType::Ghoul),
            "berserker" | "berserkers" | "trifox" | "trifoxes" => Ok(PieceType::Berserker),
            _ => Err(serde::de::Error::custom(format!("Unknown piece type: {}" , s))),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Copy)]
pub enum Side {
    White,
    Black,
}

impl Serialize for Side {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let s = match self {
            Side::White => "white",
            Side::Black => "black",
        };
        serializer.serialize_str(s)
    }
}

impl<'de> Deserialize<'de> for Side {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?.to_lowercase();
        match s.as_str() {
            "white" => Ok(Side::White),
            "black" | "yellow" => Ok(Side::Black),
            _ => Err(serde::de::Error::custom(format!("Unknown side: {}", s))),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Piece {
    pub id: String,
    #[serde(rename = "type")]
    pub piece_type: PieceType,
    #[serde(alias = "color")] // Parse raw JSON 'color', serialize to cleanly strictly-typed 'side'
    pub side: Side,
    pub position: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Polygon {
    pub id: usize,
    pub name: String,
    pub color: String,
    pub shape: String,
    pub center: [f64; 2],
    pub points: Vec<[f64; 2]>,
    #[serde(default)]
    pub neighbors: Vec<String>,
    #[serde(default)]
    pub neighbours: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Edge {
    pub id: String,
    pub name: String,
    pub color: String,
    #[serde(rename = "sharedIds")]
    pub shared_ids: Vec<usize>,
    #[serde(rename = "sharedPoints")]
    pub shared_points: Vec<[f64; 2]>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoardMap {
    #[serde(rename = "allPolygons")]
    pub polygons: HashMap<String, Polygon>,
    #[serde(rename = "allPieces")]
    pub pieces: HashMap<String, Piece>,
    #[serde(rename = "allEdges")]
    pub edges: HashMap<String, Edge>,
    pub width: Option<f64>,
    pub height: Option<f64>,
}
