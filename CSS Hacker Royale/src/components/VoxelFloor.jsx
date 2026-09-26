// ============================================================
//  VoxelFloor.jsx — Chão da Arena em Voxel Art (Blocos 3D)
//  Projeto de aprendizado
//
//  Cada célula do CSS Grid 6x6 é um cubo plano (boxGeometry)
//  posicionado no espaço 3D usando a função gridTo3D().
//
//  Mapeamento visual:
//    CSS:  grid-template-columns: repeat(6, 1fr)
//    3D:   6 blocos ao longo do eixo X, espaçados por CELL_SIZE
//
//    CSS:  grid-template-rows: repeat(6, 1fr)
//    3D:   6 blocos ao longo do eixo Z, espaçados por CELL_SIZE
// ============================================================

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ARENA_SIZE } from '../constants/gameData';
import { gridTo3D, BLOCK_SIZE } from '../utils/gridTo3D';

/**
 * Altura (espessura) dos blocos do chão.
 * Cubos "achatados" para parecerem ladrilhos.
 */
const FLOOR_HEIGHT = 0.15;

/**
 * Cores base do chão no estilo cyberpunk.
 * Alterna para criar padrão de tabuleiro.
 */
const COLOR_DARK = new THREE.Color('#0a0f1a');
const COLOR_LIGHT = new THREE.Color('#0d1525');

/**
 * VoxelFloor — Renderiza o chão da arena como uma grade de cubos 3D.
 *
 * @param {[number,number]} aimPosition - Posição da mira [row, col]
 * @param {string} selectedWeapon - Arma selecionada
 * @param {string} selectedAxis - Eixo do laser ('row' | 'col')
 * @param {function} setAimPosition - Altera posição da mira
 * @param {Array} shotEffects - Efeitos de tiro ativos
 */
export default function VoxelFloor({
  aimPosition,
  selectedWeapon,
  selectedAxis,
  setAimPosition,
  shotEffects,
}) {
  const [aimRow, aimCol] = aimPosition;

  // ── Gera a lista de células do grid ──────────────────────
  const cells = useMemo(() => {
    const result = [];
    for (let row = 1; row <= ARENA_SIZE; row++) {
      for (let col = 1; col <= ARENA_SIZE; col++) {
        result.push({ row, col });
      }
    }
    return result;
  }, []);

  /**
   * Verifica se a célula está na área de mira da arma ativa.
   * Mesma lógica do ArenaGrid 2D, agora aplicada aos blocos 3D.
   */
  const isCellInAimArea = (row, col) => {
    if (selectedWeapon === 'sniper') return row === aimRow && col === aimCol;
    if (selectedWeapon === 'bombs') {
      return Math.abs(row - aimRow) <= 1 && Math.abs(col - aimCol) <= 1;
    }
    if (selectedWeapon === 'laser') {
      return selectedAxis === 'row' ? row === aimRow : col === aimCol;
    }
    return false;
  };

  /**
   * Verifica se a célula está sob efeito de um tiro ativo.
   */
  const getCellEffect = (row, col) => {
    for (const effect of shotEffects) {
      if (effect.cells.some(([r, c]) => r === row && c === col)) {
        return effect.type;
      }
    }
    return null;
  };

  return (
    <group name="voxel-floor">
      {cells.map(({ row, col }) => (
        <FloorBlock
          key={`floor-${row}-${col}`}
          row={row}
          col={col}
          isAim={isCellInAimArea(row, col)}
          isExactAim={row === aimRow && col === aimCol}
          effect={getCellEffect(row, col)}
          selectedWeapon={selectedWeapon}
          onClick={() => setAimPosition([row, col])}
        />
      ))}
    </group>
  );
}

// ════════════════════════════════════════════════════════════
//  FloorBlock — Bloco individual do chão (boxGeometry)
// ════════════════════════════════════════════════════════════

/**
 * Cores de emissão (glow) por tipo de arma quando a mira está sobre o bloco.
 */
const WEAPON_GLOW_COLORS = {
  sniper: new THREE.Color('#00ff88'),  // Verde neon
  bombs:  new THREE.Color('#ff6b35'),  // Laranja
  laser:  new THREE.Color('#a855f7'),  // Roxo
};

/**
 * Cores de efeito de impacto por tipo de arma.
 */
const EFFECT_COLORS = {
  sniper: new THREE.Color('#00ff88'),
  bombs:  new THREE.Color('#ff6b35'),
  laser:  new THREE.Color('#a855f7'),
};

function FloorBlock({ row, col, isAim, isExactAim, effect, selectedWeapon, onClick }) {
  const meshRef = useRef();
  const materialRef = useRef();
  const emissiveIntensityRef = useRef(0);

  // ── Posição 3D calculada a partir das coordenadas do grid CSS ──
  //
  // CSS:  grid-area: {row} / {col} / {row+1} / {col+1}
  // 3D:   position = gridTo3D(row, col, y=0)
  //
  // O bloco do chão fica em y = -FLOOR_HEIGHT/2 para que
  // a superfície superior esteja exatamente em y = 0
  const position = gridTo3D(row, col, -FLOOR_HEIGHT / 2);

  // Cor base do bloco (padrão tabuleiro)
  const isEvenSquare = (row + col) % 2 === 0;
  const baseColor = isEvenSquare ? COLOR_DARK : COLOR_LIGHT;

  // ── Animação por frame ──────────────────────────────────
  useFrame((_, delta) => {
    if (!materialRef.current) return;

    // Intensidade alvo da emissão baseada no estado
    let targetIntensity = 0;
    let targetEmissive = baseColor;

    if (effect) {
      // Tiro ativo — brilho intenso na cor da arma
      targetIntensity = 3.0;
      targetEmissive = EFFECT_COLORS[effect] || EFFECT_COLORS.sniper;
    } else if (isExactAim) {
      // Centro exato da mira — brilho médio
      targetIntensity = 1.2;
      targetEmissive = WEAPON_GLOW_COLORS[selectedWeapon] || WEAPON_GLOW_COLORS.sniper;
    } else if (isAim) {
      // Na área de efeito da arma — brilho sutil
      targetIntensity = 0.4;
      targetEmissive = WEAPON_GLOW_COLORS[selectedWeapon] || WEAPON_GLOW_COLORS.sniper;
    }

    // Suaviza a transição (lerp)
    emissiveIntensityRef.current += (targetIntensity - emissiveIntensityRef.current) * delta * 8;
    materialRef.current.emissiveIntensity = emissiveIntensityRef.current;
    materialRef.current.emissive.lerp(targetEmissive, delta * 6);

    // Eleva levemente o bloco quando é o centro da mira
    if (meshRef.current) {
      const targetY = isExactAim ? 0.05 : effect ? 0.1 : 0;
      meshRef.current.position.y += (position[1] + targetY - meshRef.current.position.y) * delta * 10;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'crosshair';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      {/* boxGeometry: largura, altura (espessura), profundidade */}
      <boxGeometry args={[BLOCK_SIZE, FLOOR_HEIGHT, BLOCK_SIZE]} />
      <meshStandardMaterial
        ref={materialRef}
        color={baseColor}
        emissive={baseColor}
        emissiveIntensity={0}
        roughness={0.7}
        metalness={0.3}
      />
    </mesh>
  );
}
