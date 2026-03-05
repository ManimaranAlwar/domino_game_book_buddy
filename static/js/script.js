// =====================================================
// Word Dominoes – Full 49-Tile Edition
// 7 words × 7 colors → 49 tiles, draw from boneyard
// =====================================================

let gameState = {
    playerHand: [],
    boardDominoes: [],
    selectedDomino: null,
    score: 0,
    moves: 0,
    boneyardCount: 0,
    leftEnd: null,   // { word, color }
    rightEnd: null   // { word, color }
};

// ── SDK Config ──────────────────────────────────────
const defaultConfig = {
    game_title: 'Word Dominoes',
    background_color: '#312e81',
    text_color: '#ffffff',
    primary_action: '#f59e0b'
};

if (window.elementSdk) {
    window.elementSdk.init({
        defaultConfig,
        onConfigChange: async (config) => {
            const title = config.game_title || defaultConfig.game_title;
            document.getElementById('game-title').textContent = `🎯 ${title} 🎯`;
            const bgColor = config.background_color || defaultConfig.background_color;
            document.getElementById('app').style.background =
                `linear-gradient(135deg, ${bgColor} 0%, ${adjustColor(bgColor, -20)} 50%, ${adjustColor(bgColor, 20)} 100%)`;
        },
        mapToCapabilities: (config) => ({ recolorables: [], borderables: [] }),
        mapToEditPanelValues: (config) => new Map([['game_title', config.game_title || defaultConfig.game_title]])
    });
} else {
    const bg = defaultConfig.background_color;
    document.getElementById('app').style.background =
        `linear-gradient(135deg, ${bg} 0%, ${adjustColor(bg, -20)} 50%, ${adjustColor(bg, 20)} 100%)`;
}

function adjustColor(hex, pct) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (n >> 16) + pct));
    const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + pct));
    const b = Math.min(255, Math.max(0, (n & 0xff) + pct));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ── API ─────────────────────────────────────────────
async function fetchNewGame() {
    const res = await fetch('/api/new-game');
    return await res.json();
}

async function fetchDraw() {
    const res = await fetch('/api/draw', { method: 'POST' });
    if (!res.ok) {
        const err = await res.json();
        showMessage('🚫 ' + (err.error || 'Cannot draw!'));
        return null;
    }
    return await res.json();
}

// ── Rendering ───────────────────────────────────────
function createDominoElement(domino, isPlayable = true) {
    const div = document.createElement('div');
    const isVertical = domino._vertical || false;
    div.className = `domino ${isVertical ? 'vertical' : ''} ${isPlayable ? '' : 'played'}`;
    div.dataset.id = domino.id;

    const createHalf = (side) => `
        <div class="tile-half">
            <div class="word-dot" style="background:var(--color-${side.color})"></div>
            <div class="tile-word" style="color:var(--color-${side.color})">${side.word}</div>
        </div>
    `;

    div.innerHTML = `
        ${createHalf(domino.left)}
        ${createHalf(domino.right)}
    `;

    if (isPlayable) {
        div.addEventListener('click', () => selectDomino(domino, div));
    }
    return div;
}

// ── Selection & Placement ──────────────────────────
function selectDomino(domino, element) {
    document.querySelectorAll('.domino.selected').forEach(el => el.classList.remove('selected'));

    if (gameState.selectedDomino?.id === domino.id) {
        gameState.selectedDomino = null;
        return;
    }

    gameState.selectedDomino = domino;
    element.classList.add('selected');

    if (gameState.boardDominoes.length === 0) {
        playDomino(domino, 'first', false);
    } else {
        tryPlayDomino(domino);
    }
}

function tryPlayDomino(domino) {
    const L = gameState.leftEnd;
    const R = gameState.rightEnd;

    // RULE UPDATE: Only words must match. Color is aesthetic.
    const fits = {
        left: domino.right.word === L.word,
        leftFlipped: domino.left.word === L.word,
        right: domino.left.word === R.word,
        rightFlipped: domino.right.word === R.word,
    };

    if (fits.left) playDomino(domino, 'left', false);
    else if (fits.leftFlipped) playDomino(domino, 'left', true);
    else if (fits.right) playDomino(domino, 'right', false);
    else if (fits.rightFlipped) playDomino(domino, 'right', true);
    else {
        const el = document.querySelector(`#player-hand [data-id="${domino.id}"]`);
        if (el) {
            el.classList.add('shake');
            setTimeout(() => {
                el.classList.remove('selected');
                el.classList.remove('shake');
                gameState.selectedDomino = null;
            }, 500);
        }
        showMessage('❌ Words must match!');
    }
}

// ── Positioning & Layout ──────────────────────────
function renderBoard() {
    const board = document.getElementById('game-board');
    board.innerHTML = '';

    if (gameState.boardDominoes.length === 0) {
        board.innerHTML = `
            <div id="start-message" class="text-purple-200 text-center py-8 w-full">
                <p class="text-2xl mb-2">👆 Select a domino from your hand to start!</p>
                <p class="text-sm opacity-75">Connect matching words into a chain</p>
            </div>`;
        return;
    }

    // Dynamic Snake Layout
    let currentX = 80;
    let currentY = 150; // Entry height
    let direction = 1;  // 1 right, -1 left
    const boardWidth = board.clientWidth - 200;
    const rowHeight = 160;

    gameState.boardDominoes.forEach((domino) => {
        const isDouble = domino.left.word === domino.right.word;

        // Prepare element
        const dClone = { ...domino, _vertical: isDouble };
        const el = createDominoElement(dClone, false);
        el.style.position = 'absolute';

        // Horizontal spacing: Double is 80px wide, Normal is 160px wide
        const tileWidth = isDouble ? 80 : 160;
        const tileHeight = isDouble ? 160 : 80;

        // Center the tile vertically in the "row"
        // Row center is currentY, so top = currentY - (tileHeight/2)
        const topPos = currentY - (tileHeight / 2);

        el.style.left = `${currentX}px`;
        el.style.top = `${topPos}px`;
        board.appendChild(el);

        // Move to next X
        const margin = 10;
        currentX += (tileWidth + margin) * direction;

        // Turn logic
        if ((direction === 1 && currentX > boardWidth) || (direction === -1 && currentX < 80)) {
            currentY += rowHeight;
            direction *= -1;
            // Align currentX for the new row
            currentX += (tileWidth + margin) * direction;
        }
    });

    // Expand board height to accommodate all rows
    board.style.minHeight = `${currentY + 200}px`;
}

function playDomino(domino, position, shouldFlip) {
    const played = shouldFlip
        ? { id: domino.id, left: domino.right, right: domino.left, _flipped: true }
        : { ...domino, _flipped: false };

    // Update chain ends
    if (position === 'first') {
        gameState.leftEnd = { ...played.left };
        gameState.rightEnd = { ...played.right };
        gameState.boardDominoes = [played];
    } else if (position === 'left') {
        gameState.leftEnd = { ...played.left };
        gameState.boardDominoes.unshift(played);
    } else {
        gameState.rightEnd = { ...played.right };
        gameState.boardDominoes.push(played);
    }

    // Remove from hand
    gameState.playerHand = gameState.playerHand.filter(d => d.id !== domino.id);

    const handEl = document.querySelector(`#player-hand [data-id="${domino.id}"]`);
    if (handEl) {
        handEl.style.transform = 'scale(0)';
        setTimeout(() => handEl.remove(), 300);
    }

    renderBoard();

    gameState.score += 10;
    gameState.moves++;
    gameState.selectedDomino = null;
    updateStats();

    if (gameState.playerHand.length === 0) {
        setTimeout(showWin, 500);
    }
}


// ── Draw from Boneyard ──────────────────────────────
async function drawFromBoneyard() {
    if (gameState.boneyardCount === 0) {
        showMessage('🚫 Boneyard is empty!');
        return;
    }

    const data = await fetchDraw();
    if (!data) return;

    const tile = data.tile;
    gameState.playerHand.push(tile);
    gameState.boneyardCount = data.boneyard_count;

    const hand = document.getElementById('player-hand');
    const el = createDominoElement(tile);
    el.classList.add('animate-bounce-in');
    hand.appendChild(el);

    updateStats();
    showMessage(`🎲 Drew: ${tile.left.word}@${tile.left.color} | ${tile.right.word}@${tile.right.color}`);
}

// ── Stats & Messages ────────────────────────────────
function updateStats() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('moves').textContent = gameState.moves;
    document.getElementById('tiles-left').textContent = gameState.playerHand.length;
    document.getElementById('boneyard').textContent = gameState.boneyardCount;
}

function showMessage(text) {
    const old = document.querySelector('.game-message');
    if (old) old.remove();

    const msg = document.createElement('div');
    msg.className = 'game-message fixed top-4 left-1/2 transform -translate-x-1/2 bg-white text-gray-800 rounded-full px-6 py-3 shadow-xl text-base font-bold z-50';
    msg.textContent = text;
    document.body.appendChild(msg);

    setTimeout(() => {
        msg.style.opacity = '0';
        msg.style.transform = 'translate(-50%, -20px)';
        msg.style.transition = 'all 0.3s ease';
        setTimeout(() => msg.remove(), 300);
    }, 2500);
}

// ── Win ─────────────────────────────────────────────
function showWin() {
    document.getElementById('final-score').textContent = gameState.score;
    const wm = document.getElementById('win-message');
    const wc = document.getElementById('win-content');
    wm.classList.remove('hidden');
    setTimeout(() => { wc.style.transform = 'scale(1)'; }, 100);
    createConfetti();
}

function createConfetti() {
    const palette = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#06b6d4'];
    for (let i = 0; i < 70; i++) {
        const c = document.createElement('div');
        c.style.cssText = `
            position:fixed; width:10px; height:10px; z-index:9999;
            left:${Math.random() * 100}vw; top:-10px;
            background:${palette[~~(Math.random() * palette.length)]};
            border-radius:${Math.random() > .5 ? '50%' : '0'};
            animation: fall ${2 + Math.random() * 2}s linear forwards;
        `;
        document.body.appendChild(c);
        setTimeout(() => c.remove(), 4500);
    }
    if (!document.querySelector('#anim-style')) {
        const s = document.createElement('style');
        s.id = 'anim-style';
        s.textContent = `
            @keyframes fall   { to { transform:translateY(100vh) rotate(720deg); opacity:0; } }
            @keyframes shake  { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-10px) rotate(-5deg)} 75%{transform:translateX(10px) rotate(5deg)} }
            @keyframes bounce-in { 0%{transform:scale(0) rotate(-10deg);opacity:0} 60%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
            .animate-bounce-in { animation: bounce-in 0.4s cubic-bezier(.68,-.55,.265,1.55) forwards; }
        `;
        document.head.appendChild(s);
    }
}

// ── Reverse (Undo) ──────────────────────────────────
document.getElementById('reverse-btn').addEventListener('click', () => {
    if (gameState.boardDominoes.length === 0) {
        showMessage('❌ Nothing to reverse!');
        return;
    }

    // Figure out which one was last played (it might be at start or end of boardDominoes depending on position)
    // For simplicity, let's just pop from the array (last added)
    const reversed = gameState.boardDominoes.pop();

    // Recalculate ends
    if (gameState.boardDominoes.length === 0) {
        gameState.leftEnd = gameState.rightEnd = null;
    } else {
        const first = gameState.boardDominoes[0];
        const last = gameState.boardDominoes[gameState.boardDominoes.length - 1];
        gameState.leftEnd = { ...first.left };
        gameState.rightEnd = { ...last.right };
    }

    // Restore original orientation for hand
    const original = reversed._flipped
        ? { id: reversed.id, left: reversed.right, right: reversed.left }
        : { ...reversed };
    delete original._flipped;

    gameState.playerHand.push(original);
    const hand = document.getElementById('player-hand');
    const el = createDominoElement(original);
    el.classList.add('animate-bounce-in');
    hand.appendChild(el);

    renderBoard();

    gameState.score = Math.max(0, gameState.score - 10);
    gameState.moves++;
    updateStats();
    showMessage('↩️ Tile reversed!');
});

// ── Draw Button ──────────────────────────────────────
document.getElementById('draw-btn').addEventListener('click', drawFromBoneyard);

// ── New Game ─────────────────────────────────────────
async function initGame() {
    // Reset state
    gameState = {
        playerHand: [], boardDominoes: [], selectedDomino: null,
        score: 0, moves: 0, boneyardCount: 0, leftEnd: null, rightEnd: null
    };

    // Hide win overlay
    const wm = document.getElementById('win-message');
    const wc = document.getElementById('win-content');
    wm.classList.add('hidden');
    wc.style.transform = 'scale(0)';

    // Clear board and show initial message
    renderBoard();

    // Show loading in hand
    const hand = document.getElementById('player-hand');
    hand.innerHTML = '<p class="text-purple-300 text-center w-full py-4 animate-pulse">Shuffling 49 tiles…</p>';

    // Fetch from backend
    const data = await fetchNewGame();
    gameState.playerHand = data.hand;
    gameState.boneyardCount = data.boneyard_count;

    hand.innerHTML = '';
    data.hand.forEach((tile, i) => {
        const el = createDominoElement(tile);
        el.style.animationDelay = `${i * 0.08}s`;
        el.classList.add('animate-bounce-in');
        hand.appendChild(el);
    });

    updateStats();
}

document.getElementById('new-game-btn').addEventListener('click', initGame);
document.getElementById('play-again-btn').addEventListener('click', initGame);

// ── Start ────────────────────────────────────────────
initGame();
