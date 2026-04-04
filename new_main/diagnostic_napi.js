const { getLegalMovesNapi, applyMoveNapi } = require('./backend/rust-napi');
const fs = require('fs');

const boardData = JSON.parse(fs.readFileSync('./backend/src/utils/board.json', 'utf8'));
const pieces = Object.values(boardData.allPieces);

try {
    console.log("Testing Goddess Placement (Setup Step 0)...");
    const res = getLegalMovesNapi({
        boardJson: JSON.stringify(boardData),
        piecesJson: JSON.stringify(pieces),
        pieceId: 'white_goddess_0',
        turn: 'white',
        phase: 'Setup',
        setupStep: 0,
        colorChosen: {}
    });
    console.log("Legal Goddess targets:", res.targets.length);
    
    if (res.targets.length > 0) {
        const target = res.targets[0];
        console.log("Applying move to:", target);
        const moveRes = applyMoveNapi({
            boardJson: JSON.stringify(boardData),
            piecesJson: JSON.stringify(pieces),
            pieceId: 'white_goddess_0',
            targetPoly: target,
            turn: 'white',
            phase: 'Setup',
            setupStep: 0,
            colorChosen: {}
        });
        console.log("Full moveRes keys:", Object.keys(moveRes));
        const piecesKey = moveRes.pieces_json ? 'pieces_json' : 'piecesJson';
        console.log("Using pieces key:", piecesKey);
        const updatedPieces = JSON.parse(moveRes[piecesKey]);
        const goddess = updatedPieces.find(p => p.id === 'white_goddess_0');
        console.log("Resulting position:", goddess.position);
        if (goddess.position === target) {
            console.log("SUCCESS: NAPI move applied.");
        } else {
            console.log("FAILURE: NAPI move did not update position.");
        }
    } else {
        console.log("FAILURE: No legal targets found for Goddess.");
    }
} catch (e) {
    console.error("NAPI CRASH:", e);
}
