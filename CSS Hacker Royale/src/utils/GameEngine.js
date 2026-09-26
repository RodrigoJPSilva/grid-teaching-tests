// ============================================================
//  GameEngine.js — Parser de CSS e utilitários 3D
// ============================================================

const CELL_SIZE = 1.2;
const ARENA_SIZE = 6;

/**
 * Converte grid-column/row (1-indexed) para posições 3D [x, 0, z].
 */
export function gridToPosition3D(col, row, arenaSize = 6) {
  const halfGrid = (arenaSize - 1) / 2;
  const x = (row - 1 - halfGrid) * CELL_SIZE;
  const z = (col - 1 - halfGrid) * CELL_SIZE;
  return [x, 0.21, z];
}

/**
 * Lê uma string de código CSS e extrai as posições numéricas
 * das classes .player, .bomba e .sniper.
 */
export function parsePlayerCode(inputString) {
  const state = {
    player: { col: 1, row: 1 },
    bomba: null,
    sniper: null,
  };

  const extractCSS = (className, text) => {
    const classRegex = new RegExp(`\\.${className}\\s*\\{([^}]+)\\}`, 'i');
    const match = text.match(classRegex);
    if (!match) return null;

    const block = match[1];
    const colMatch = block.match(/grid-column:\s*(\d+)/i);
    const rowMatch = block.match(/grid-row:\s*(\d+)/i);

    return {
      col: colMatch ? parseInt(colMatch[1], 10) : null,
      row: rowMatch ? parseInt(rowMatch[1], 10) : null,
    };
  };

  const playerCSS = extractCSS('player', inputString);
  if (playerCSS && playerCSS.col !== null && playerCSS.row !== null) {
    state.player = { col: playerCSS.col, row: playerCSS.row };
  }

  const bombaCSS = extractCSS('bomba', inputString);
  if (bombaCSS && bombaCSS.col !== null && bombaCSS.row !== null) {
    state.bomba = { col: bombaCSS.col, row: bombaCSS.row };
  }

  const sniperCSS = extractCSS('sniper', inputString);
  if (sniperCSS && sniperCSS.col !== null && sniperCSS.row !== null) {
    state.sniper = { col: sniperCSS.col, row: sniperCSS.row };
  }

  return state;
}

/**
 * Descobre qual seletor CSS o cursor do editor está dentro.
 */
export function getActiveEditorClass(code, cursorIndex) {
  const textBeforeCursor = code.slice(0, cursorIndex);
  const matches = [...textBeforeCursor.matchAll(/\.(player|bomba|sniper)\s*\{/gi)];

  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    const textBetween = textBeforeCursor.slice(lastMatch.index + lastMatch[0].length);
    if (!textBetween.includes('}')) {
      return lastMatch[1].toLowerCase();
    }
  }
  return null;
}
