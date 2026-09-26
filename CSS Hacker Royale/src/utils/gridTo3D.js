// ============================================================
//  gridTo3D.js — Mapeamento de Coordenadas 2D Grid → 3D Voxel
//  Projeto de aprendizado
//
//  COMO FUNCIONA O MAPEAMENTO:
//
//  No CSS 2D, a Sniper de Grid usa:
//    grid-area: row / col / row+1 / col+1
//
//  No Three.js 3D, precisamos converter [row, col] para [x, y, z]:
//    - O chão da arena fica no plano XZ (y = 0)
//    - "row" (linha)  → mapeia para o eixo Z (profundidade)
//    - "col" (coluna) → mapeia para o eixo X (largura)
//    - Objetos acima do chão usam Y > 0 (altura)
//
//  Para centralizar o grid na origem (0,0,0):
//    x = (col - 1 - (ARENA_SIZE - 1) / 2) * CELL_SIZE
//    z = (row - 1 - (ARENA_SIZE - 1) / 2) * CELL_SIZE
//
//  Exemplo com ARENA_SIZE=6 e CELL_SIZE=1.2:
//    grid-area: 1/1 → x = -3.0, z = -3.0
//    grid-area: 3/4 → x =  0.6, z = -0.6
//    grid-area: 6/6 → x =  3.0, z =  3.0
// ============================================================

import { ARENA_SIZE } from '../constants/gameData';

/**
 * Tamanho de cada célula em unidades 3D.
 * Controla o espaçamento entre os blocos voxel.
 */
export const CELL_SIZE = 1.2;

/**
 * Gap visual entre células (simula o gap do CSS Grid).
 */
export const CELL_GAP = 0.06;

/**
 * Tamanho visual do bloco (CELL_SIZE menos o gap).
 */
export const BLOCK_SIZE = CELL_SIZE - CELL_GAP;

/**
 * Converte coordenadas do CSS Grid 2D [row, col] (1-indexed)
 * para posição 3D [x, y, z] no Three.js.
 *
 * @param {number} row - Linha no grid CSS (1 a ARENA_SIZE)
 * @param {number} col - Coluna no grid CSS (1 a ARENA_SIZE)
 * @param {number} [y=0] - Altura acima do chão (opcional)
 * @returns {[number, number, number]} Posição [x, y, z]
 *
 * @example
 * // grid-area: 3 / 4 / 4 / 5  →  [x, 0, z]
 * gridTo3D(3, 4) // → [0.6, 0, -0.6]
 *
 * // Personagem voxel em cima do bloco
 * gridTo3D(3, 4, 0.5) // → [0.6, 0.5, -0.6]
 */
export function gridTo3D(row, col, y = 0) {
  //  col → eixo X    row → eixo Z
  const halfGrid = (ARENA_SIZE - 1) / 2; // 2.5 para grid 6x6

  const x = (col - 1 - halfGrid) * CELL_SIZE;
  const z = (row - 1 - halfGrid) * CELL_SIZE;

  return [x, y, z];
}

/**
 * Retorna o centro exato do grid inteiro em coordenadas 3D.
 * Usado para posicionar a câmera e luzes.
 */
export function getGridCenter() {
  return [0, 0, 0]; // Sempre na origem, pois centralizamos o grid
}

/**
 * Calcula a extensão total do grid em unidades 3D.
 * Útil para configurar a câmera ortográfica.
 */
export function getGridExtent() {
  return ARENA_SIZE * CELL_SIZE; // 7.2 para grid 6x6
}
