from flask import Flask, render_template, jsonify, request, session
import random

app = Flask(__name__)
app.secret_key = 'word-dominoes-secret-2024'

# ─────────────────────────────────────────
# Core Data
# ─────────────────────────────────────────
WORDS  = ["Lion", "Apple", "Paris", "Mars", "Python", "Oxygen", "Sun"]
COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "cyan"]

def build_full_tile_set():
    """
    Generates all 49 domino tiles: 7 words × 7 colors.
    For each word[i] × color[j]:
      Left  = (words[i],           colors[j])
      Right = (words[(i+1) % 7],   colors[(j+1) % 7])
    
    This guarantees:
      - Every word appears with every color (49 unique left-end combos)
      - Right side always has a DIFFERENT color from left side
      - All 49 tiles can form valid chains
    """
    tiles = []
    for i in range(7):
        for j in range(7):
            tiles.append({
                "id": f"tile-{i}-{j}",
                "left":  {"word": WORDS[i],           "color": COLORS[j]},
                "right": {"word": WORDS[(i + 1) % 7], "color": COLORS[(j + 1) % 7]}
            })
    return tiles


# ─────────────────────────────────────────
# Routes
# ─────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/new-game')
def new_game():
    """
    Shuffles all 49 tiles, deals 7 to the player's hand,
    stores the remaining 42 in the session boneyard.
    """
    all_tiles = build_full_tile_set()
    random.shuffle(all_tiles)

    hand      = all_tiles[:7]
    boneyard  = all_tiles[7:]

    session['boneyard'] = boneyard

    return jsonify({
        "hand":           hand,
        "boneyard_count": len(boneyard),
        "total_tiles":    len(all_tiles)
    })


@app.route('/api/draw', methods=['POST'])
def draw_tile():
    """Draw one tile from the boneyard."""
    boneyard = session.get('boneyard', [])
    if not boneyard:
        return jsonify({"error": "Boneyard is empty!"}), 400

    tile     = boneyard.pop(0)
    session['boneyard'] = boneyard

    return jsonify({
        "tile":           tile,
        "boneyard_count": len(boneyard)
    })


@app.route('/api/tile-info')
def tile_info():
    """Returns info about all 49 tiles (for reference / debug)."""
    return jsonify({
        "words":       WORDS,
        "colors":      COLORS,
        "total_tiles": 49,
        "tiles":       build_full_tile_set()
    })


if __name__ == '__main__':
    app.run(debug=True)
