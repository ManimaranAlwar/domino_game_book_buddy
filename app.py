from flask import Flask, render_template, jsonify, request, session
import random

app = Flask(__name__)
app.secret_key = 'word-dominoes-secret-2024'
WORDS  = ["Lion", "Apple", "Paris", "Mars", "Python", "Oxygen", "Sun"]
COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "cyan"]

def build_full_tile_set():
    tiles = []
    # Standard 28-tile set (Double-Six style) for 7 values (0-6)
    for i in range(7):
        for j in range(i, 7):
            tiles.append({
                "id": f"tile-{i}-{j}",
                "left":  {"word": WORDS[i], "color": COLORS[i]},
                "right": {"word": WORDS[j], "color": COLORS[j]}
            })
    return tiles
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/new-game')
def new_game():
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
    
    return jsonify({
        "words":       WORDS,
        "colors":      COLORS,
        "total_tiles": 49,
        "tiles":       build_full_tile_set()
    })


if __name__ == '__main__':
    app.run(debug=True)
