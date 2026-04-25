import json

def update():
    path = 'frontend/assets/translations.json'
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    additions = {
        "en": {"ui": {
            # Game board phase labels
            "phase_setup":    "SETUP",
            "phase_play":     "PLAY",
            "phase_end":      "END",
            "move_history":   "Move History",
            "connection_lost": "Connection lost — reconnecting…",

            # Action buttons
            "waiting_opponent":  "Waiting for opponent…",
            "random_setup":      "Random Setup",
            "end_turn":          "End Turn",
            "pass_turn":         "Pass Turn",
            "confirm_pass":      "Confirm Pass",
            "flip_board":        "Flip Board",
            "unflip_board":      "Unflip Board",
            "resign":            "Resign",
            "confirm_resign":    "Confirm Resign",
            "cancel":            "Cancel",

            # Color picker labels
            "white_color":       "White Color",
            "black_color":       "Black Color",
            "white_deciding":    "White Deciding…",
            "black_deciding":    "Black Deciding…",
            "your_color":        "◆ Your Color",
            "choose_color":      "Choose Color",
            "opponent_color":    "Opponent Color",
            "opponent_deciding": "Opponent Deciding…",

            # Mage locked
            "mage_locked":       "MAGE LOCKED",
            "choose_all_4":      "Choose all 4 colors",
            "seen_count":        "{n} / 4 seen",

            # Settings
            "settings":          "Settings",
            "board_colors":      "Board Colors",

            # Game over overlay — headlines
            "you_win":           "You Win!",
            "you_lose":          "You Lose",
            "draw":              "Draw!",
            "game_over":         "Game Over",
            "white_wins":        "White Wins",
            "black_wins":        "Black Wins",

            # Game over — reasons (player perspective)
            "reason_time_win":          "Victory on time! Your speed was superior.",
            "reason_time_lose":         "Ran out of time. The clock is a cruel master.",
            "reason_resign_win":        "Opponent has surrendered to your might.",
            "reason_resign_lose":       "You have chosen to withdraw from the field.",
            "reason_goddess_win":       "Victory! The enemy Goddess has been captured.",
            "reason_goddess_lose":      "Your Goddess has been captured. Defeat.",
            "reason_aborted":           "Game aborted (tournament ended).",
            "reason_draw":              "A hard-fought draw. Peace is restored.",

            # Game over — reasons (spectator / neutral)
            "reason_time_neutral":      "Victory on time.",
            "reason_resign_neutral":    "One side has resigned.",
            "reason_goddess_neutral":   "The Goddess has been captured.",
            "reason_aborted_neutral":   "Game aborted (tournament ended).",
            "reason_draw_neutral":      "A hard-fought draw.",

            # Game over — rating & buttons
            "rating_changes":    "Rating Changes",
            "review_game":       "Review",
            "download":          "Download",
            "game_json":         "Game JSON",
            "copy_clipboard":    "Copy to clipboard",
            "close":             "Close",
        }},
        "fr": {"ui": {
            "phase_setup":    "MISE EN PLACE",
            "phase_play":     "JEU",
            "phase_end":      "FIN",
            "move_history":   "Historique des coups",
            "connection_lost": "Connexion perdue — reconnexion…",

            "waiting_opponent":  "En attente de l'adversaire…",
            "random_setup":      "Placement aléatoire",
            "end_turn":          "Fin du tour",
            "pass_turn":         "Passer le tour",
            "confirm_pass":      "Confirmer le passage",
            "flip_board":        "Retourner le plateau",
            "unflip_board":      "Rétablir le plateau",
            "resign":            "Abandonner",
            "confirm_resign":    "Confirmer l'abandon",
            "cancel":            "Annuler",

            "white_color":       "Couleur de Blanc",
            "black_color":       "Couleur de Noir",
            "white_deciding":    "Blanc choisit…",
            "black_deciding":    "Noir choisit…",
            "your_color":        "◆ Votre couleur",
            "choose_color":      "Choisir une couleur",
            "opponent_color":    "Couleur de l'adversaire",
            "opponent_deciding": "L'adversaire choisit…",

            "mage_locked":       "MAGE VERROUILLÉ",
            "choose_all_4":      "Choisissez les 4 couleurs",
            "seen_count":        "{n} / 4 vues",

            "settings":          "Paramètres",
            "board_colors":      "Couleurs du plateau",

            "you_win":           "Vous gagnez !",
            "you_lose":          "Vous perdez",
            "draw":              "Nulle !",
            "game_over":         "Partie terminée",
            "white_wins":        "Blanc gagne",
            "black_wins":        "Noir gagne",

            "reason_time_win":          "Victoire au temps ! Votre rapidité était supérieure.",
            "reason_time_lose":         "Temps écoulé. L'horloge est un maître cruel.",
            "reason_resign_win":        "L'adversaire a capitulé devant votre puissance.",
            "reason_resign_lose":       "Vous avez choisi de vous retirer du champ de bataille.",
            "reason_goddess_win":       "Victoire ! La Déesse ennemie a été capturée.",
            "reason_goddess_lose":      "Votre Déesse a été capturée. Défaite.",
            "reason_aborted":           "Partie abandonnée (tournoi terminé).",
            "reason_draw":              "Nulle bien disputée. La paix est rétablie.",

            "reason_time_neutral":      "Victoire au temps.",
            "reason_resign_neutral":    "Un joueur a abandonné.",
            "reason_goddess_neutral":   "La Déesse a été capturée.",
            "reason_aborted_neutral":   "Partie abandonnée (tournoi terminé).",
            "reason_draw_neutral":      "Nulle bien disputée.",

            "rating_changes":    "Variations de classement",
            "review_game":       "Revoir",
            "download":          "Télécharger",
            "game_json":         "JSON de la partie",
            "copy_clipboard":    "Copier dans le presse-papiers",
            "close":             "Fermer",
        }},
        "es": {"ui": {
            "phase_setup":    "COLOCACIÓN",
            "phase_play":     "JUEGO",
            "phase_end":      "FIN",
            "move_history":   "Historial de movimientos",
            "connection_lost": "Conexión perdida — reconectando…",

            "waiting_opponent":  "Esperando al oponente…",
            "random_setup":      "Colocación aleatoria",
            "end_turn":          "Fin del turno",
            "pass_turn":         "Pasar turno",
            "confirm_pass":      "Confirmar paso",
            "flip_board":        "Voltear tablero",
            "unflip_board":      "Restablecer tablero",
            "resign":            "Rendirse",
            "confirm_resign":    "Confirmar rendición",
            "cancel":            "Cancelar",

            "white_color":       "Color de Blancas",
            "black_color":       "Color de Negras",
            "white_deciding":    "Blancas eligiendo…",
            "black_deciding":    "Negras eligiendo…",
            "your_color":        "◆ Tu color",
            "choose_color":      "Elegir color",
            "opponent_color":    "Color del oponente",
            "opponent_deciding": "El oponente está eligiendo…",

            "mage_locked":       "MAGO BLOQUEADO",
            "choose_all_4":      "Elige los 4 colores",
            "seen_count":        "{n} / 4 vistos",

            "settings":          "Ajustes",
            "board_colors":      "Colores del tablero",

            "you_win":           "¡Ganas!",
            "you_lose":          "Pierdes",
            "draw":              "¡Tablas!",
            "game_over":         "Fin de la partida",
            "white_wins":        "Ganan las Blancas",
            "black_wins":        "Ganan las Negras",

            "reason_time_win":          "¡Victoria por tiempo! Tu rapidez fue superior.",
            "reason_time_lose":         "Se acabó el tiempo. El reloj es un maestro cruel.",
            "reason_resign_win":        "El oponente se ha rendido ante tu poderío.",
            "reason_resign_lose":       "Has elegido retirarte del campo de batalla.",
            "reason_goddess_win":       "¡Victoria! La Diosa enemiga ha sido capturada.",
            "reason_goddess_lose":      "Tu Diosa ha sido capturada. Derrota.",
            "reason_aborted":           "Partida cancelada (torneo finalizado).",
            "reason_draw":              "Tablas bien disputadas. La paz ha sido restaurada.",

            "reason_time_neutral":      "Victoria por tiempo.",
            "reason_resign_neutral":    "Un lado se ha rendido.",
            "reason_goddess_neutral":   "La Diosa ha sido capturada.",
            "reason_aborted_neutral":   "Partida cancelada (torneo finalizado).",
            "reason_draw_neutral":      "Tablas bien disputadas.",

            "rating_changes":    "Cambios de clasificación",
            "review_game":       "Revisar",
            "download":          "Descargar",
            "game_json":         "JSON de la partida",
            "copy_clipboard":    "Copiar al portapapeles",
            "close":             "Cerrar",
        }},
        "it": {"ui": {
            "phase_setup":    "POSIZIONAMENTO",
            "phase_play":     "GIOCO",
            "phase_end":      "FINE",
            "move_history":   "Storico mosse",
            "connection_lost": "Connessione persa — riconnessione…",

            "waiting_opponent":  "In attesa dell'avversario…",
            "random_setup":      "Posizionamento casuale",
            "end_turn":          "Fine turno",
            "pass_turn":         "Passa turno",
            "confirm_pass":      "Conferma passaggio",
            "flip_board":        "Capovolgi tavola",
            "unflip_board":      "Ripristina tavola",
            "resign":            "Abbandonare",
            "confirm_resign":    "Conferma abbandono",
            "cancel":            "Annulla",

            "white_color":       "Colore del Bianco",
            "black_color":       "Colore del Nero",
            "white_deciding":    "Il Bianco sta scegliendo…",
            "black_deciding":    "Il Nero sta scegliendo…",
            "your_color":        "◆ Il tuo colore",
            "choose_color":      "Scegli un colore",
            "opponent_color":    "Colore dell'avversario",
            "opponent_deciding": "L'avversario sta scegliendo…",

            "mage_locked":       "MAGO BLOCCATO",
            "choose_all_4":      "Scegli tutti e 4 i colori",
            "seen_count":        "{n} / 4 visti",

            "settings":          "Impostazioni",
            "board_colors":      "Colori della tavola",

            "you_win":           "Hai vinto!",
            "you_lose":          "Hai perso",
            "draw":              "Patta!",
            "game_over":         "Partita terminata",
            "white_wins":        "Vince il Bianco",
            "black_wins":        "Vince il Nero",

            "reason_time_win":          "Vittoria al tempo! La tua velocità era superiore.",
            "reason_time_lose":         "Tempo scaduto. L'orologio è un maestro crudele.",
            "reason_resign_win":        "L'avversario si è arreso alla tua potenza.",
            "reason_resign_lose":       "Hai scelto di ritirarti dal campo di battaglia.",
            "reason_goddess_win":       "Vittoria! La Dea nemica è stata catturata.",
            "reason_goddess_lose":      "La tua Dea è stata catturata. Sconfitta.",
            "reason_aborted":           "Partita interrotta (torneo terminato).",
            "reason_draw":              "Patta ben combattuta. La pace è ristabilita.",

            "reason_time_neutral":      "Vittoria al tempo.",
            "reason_resign_neutral":    "Un lato si è arreso.",
            "reason_goddess_neutral":   "La Dea è stata catturata.",
            "reason_aborted_neutral":   "Partita interrotta (torneo terminato).",
            "reason_draw_neutral":      "Patta ben combattuta.",

            "rating_changes":    "Variazioni di punteggio",
            "review_game":       "Rivedi",
            "download":          "Scarica",
            "game_json":         "JSON della partita",
            "copy_clipboard":    "Copia negli appunti",
            "close":             "Chiudi",
        }},
        "de": {"ui": {
            "phase_setup":    "AUFBAU",
            "phase_play":     "SPIEL",
            "phase_end":      "ENDE",
            "move_history":   "Zugverlauf",
            "connection_lost": "Verbindung unterbrochen — Wiederverbindung…",

            "waiting_opponent":  "Warten auf Gegner…",
            "random_setup":      "Zufälliger Aufbau",
            "end_turn":          "Zug beenden",
            "pass_turn":         "Aussetzen",
            "confirm_pass":      "Aussetzen bestätigen",
            "flip_board":        "Brett drehen",
            "unflip_board":      "Brett zurückdrehen",
            "resign":            "Aufgeben",
            "confirm_resign":    "Aufgabe bestätigen",
            "cancel":            "Abbrechen",

            "white_color":       "Farbe Weiß",
            "black_color":       "Farbe Schwarz",
            "white_deciding":    "Weiß wählt…",
            "black_deciding":    "Schwarz wählt…",
            "your_color":        "◆ Deine Farbe",
            "choose_color":      "Farbe wählen",
            "opponent_color":    "Farbe des Gegners",
            "opponent_deciding": "Gegner wählt…",

            "mage_locked":       "MAGIER GESPERRT",
            "choose_all_4":      "Wähle alle 4 Farben",
            "seen_count":        "{n} / 4 gesehen",

            "settings":          "Einstellungen",
            "board_colors":      "Brettfarben",

            "you_win":           "Du gewinnst!",
            "you_lose":          "Du verlierst",
            "draw":              "Remis!",
            "game_over":         "Spiel beendet",
            "white_wins":        "Weiß gewinnt",
            "black_wins":        "Schwarz gewinnt",

            "reason_time_win":          "Zeitsieg! Deine Schnelligkeit war überlegen.",
            "reason_time_lose":         "Zeit abgelaufen. Die Uhr ist ein grausamer Meister.",
            "reason_resign_win":        "Der Gegner hat sich deiner Macht ergeben.",
            "reason_resign_lose":       "Du hast dich entschieden, das Feld zu räumen.",
            "reason_goddess_win":       "Sieg! Die feindliche Göttin wurde gefangen.",
            "reason_goddess_lose":      "Deine Göttin wurde gefangen. Niederlage.",
            "reason_aborted":           "Spiel abgebrochen (Turnier beendet).",
            "reason_draw":              "Hart umkämpftes Remis. Frieden ist wiederhergestellt.",

            "reason_time_neutral":      "Zeitsieg.",
            "reason_resign_neutral":    "Eine Seite hat aufgegeben.",
            "reason_goddess_neutral":   "Die Göttin wurde gefangen.",
            "reason_aborted_neutral":   "Spiel abgebrochen (Turnier beendet).",
            "reason_draw_neutral":      "Hart umkämpftes Remis.",

            "rating_changes":    "Bewertungsänderungen",
            "review_game":       "Überprüfen",
            "download":          "Herunterladen",
            "game_json":         "Spiel-JSON",
            "copy_clipboard":    "In Zwischenablage kopieren",
            "close":             "Schließen",
        }},
    }

    for lang, content in additions.items():
        if lang not in data:
            data[lang] = {}
        for section, strings in content.items():
            if section not in data[lang]:
                data[lang][section] = {}
            data[lang][section].update(strings)

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Done.")

if __name__ == "__main__":
    update()
