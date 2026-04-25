import json

def update():
    path = 'frontend/assets/translations.json'
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    additions = {
        "en": {"ui": {
            "fmt_swiss_desc":       "Paired by score each round. Everyone plays every round.",
            "fmt_arena_desc":       "Continuous re-pairing immediately after finishing. Fastest format.",
            "fmt_knockout_desc":    "Single-elimination. Lose and you're out!",
            "fmt_round_robin_desc": "Everyone plays everyone. The true test of strength.",
        }},
        "fr": {"ui": {
            "fmt_swiss_desc":       "Appairé par score à chaque ronde. Tout le monde joue chaque ronde.",
            "fmt_arena_desc":       "Ré-appairage continu dès la fin d'une partie. Format le plus rapide.",
            "fmt_knockout_desc":    "Élimination directe. Perdez et c'est terminé !",
            "fmt_round_robin_desc": "Tout le monde joue contre tout le monde. Le vrai test de force.",
        }},
        "es": {"ui": {
            "fmt_swiss_desc":       "Emparejado por puntuación cada ronda. Todos juegan cada ronda.",
            "fmt_arena_desc":       "Re-emparejamiento continuo nada más terminar. El formato más rápido.",
            "fmt_knockout_desc":    "Eliminación directa. ¡Pierde y estás fuera!",
            "fmt_round_robin_desc": "Todos juegan contra todos. La verdadera prueba de fuerza.",
        }},
        "it": {"ui": {
            "fmt_swiss_desc":       "Abbinato per punteggio ogni turno. Tutti giocano ogni turno.",
            "fmt_arena_desc":       "Riabbinamento continuo subito dopo la fine. Il formato più veloce.",
            "fmt_knockout_desc":    "Eliminazione diretta. Perdi e sei fuori!",
            "fmt_round_robin_desc": "Tutti giocano contro tutti. Il vero banco di prova.",
        }},
        "de": {"ui": {
            "fmt_swiss_desc":       "Nach Punkten gepaart jede Runde. Alle spielen jede Runde.",
            "fmt_arena_desc":       "Kontinuierliche Neuauslosung nach dem Spiel. Schnellstes Format.",
            "fmt_knockout_desc":    "K.-o.-System. Verliere und du bist raus!",
            "fmt_round_robin_desc": "Alle spielen gegen alle. Der wahre Stärketest.",
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
