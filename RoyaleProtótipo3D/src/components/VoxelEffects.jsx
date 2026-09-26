// ============================================================
//  VoxelEffects.jsx — Efeitos Visuais 3D de Tiro na Arena
//  Projeto de aprendizado
//
//  Cada arma gera um efeito visual 3D diferente:
//   🎯 Sniper:  Coluna de luz vertical que desce sobre a célula
//   💣 Bomba:   Esfera de expansão que cresce e desaparece
//   ⚡ Laser:   Faixa de luz horizontal que varre a linha/coluna
// ============================================================

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { gridTo3D, BLOCK_SIZE, CELL_SIZE } from '../utils/gridTo3D';
import { ARENA_SIZE } from '../constants/gameData';

/**
 * VoxelEffects — Renderiza os efeitos visuais dos tiros em 3D.
 *
 * @param {Array} shotEffects - Lista de efeitos ativos [{id, type, cells}]
 */
export default function VoxelEffects({ shotEffects }) {
  return (
    <group name="voxel-effects">
      {shotEffects.map(effect => (
        <ShotEffect key={effect.id} effect={effect} />
      ))}
    </group>
  );
}

// ════════════════════════════════════════════════════════════
//  ShotEffect — Efeito individual de um tiro
// ════════════════════════════════════════════════════════════

const EFFECT_COLORS = {
  sniper: new THREE.Color('#00ff88'),
  bombs:  new THREE.Color('#ff6b35'),
  laser:  new THREE.Color('#a855f7'),
};

function ShotEffect({ effect }) {
  switch (effect.type) {
    case 'sniper':
      return <SniperEffect cells={effect.cells} />;
    case 'bombs':
      return <BombEffect cells={effect.cells} />;
    case 'laser':
      return <LaserEffect cells={effect.cells} />;
    default:
      return null;
  }
}

// ════════════════════════════════════════════════════════════
//  SniperEffect — Coluna de luz (beam) vertical precisa
// ════════════════════════════════════════════════════════════

function SniperEffect({ cells }) {
  const groupRef = useRef();
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta;
    // Fade out
    const progress = Math.min(timeRef.current / 0.8, 1);
    const opacity = 1 - progress;
    groupRef.current.children.forEach(child => {
      if (child.material) {
        child.material.opacity = opacity;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {cells.map(([row, col]) => {
        // Mapeamento: grid-area → posição 3D
        const [x, , z] = gridTo3D(row, col);
        return (
          <group key={`sniper-${row}-${col}`}>
            {/* Coluna de luz vertical */}
            <mesh position={[x, 2.5, z]}>
              <boxGeometry args={[BLOCK_SIZE * 0.15, 5, BLOCK_SIZE * 0.15]} />
              <meshBasicMaterial
                color={EFFECT_COLORS.sniper}
                transparent
                opacity={0.9}
              />
            </mesh>
            {/* Flash de impacto no chão */}
            <mesh position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[BLOCK_SIZE * 0.5, 8]} />
              <meshBasicMaterial
                color={EFFECT_COLORS.sniper}
                transparent
                opacity={0.8}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Luz de impacto */}
            <pointLight
              position={[x, 0.5, z]}
              color="#00ff88"
              intensity={5}
              distance={3}
              decay={2}
            />
          </group>
        );
      })}
    </group>
  );
}

// ════════════════════════════════════════════════════════════
//  BombEffect — Esfera expansiva (flex-grow visual)
// ════════════════════════════════════════════════════════════

function BombEffect({ cells }) {
  const groupRef = useRef();
  const sphereRef = useRef();
  const timeRef = useRef(0);

  // Centro do AoE (média das posições das células atingidas)
  const centerRow = cells.reduce((s, [r]) => s + r, 0) / cells.length;
  const centerCol = cells.reduce((s, [, c]) => s + c, 0) / cells.length;
  const [cx, , cz] = gridTo3D(centerRow, centerCol);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const progress = Math.min(timeRef.current / 0.8, 1);

    // Esfera que cresce (simula flex-grow expandindo)
    if (sphereRef.current) {
      const scale = progress * 2.5;
      sphereRef.current.scale.set(scale, scale, scale);
      sphereRef.current.material.opacity = (1 - progress) * 0.5;
    }

    // Fade out de todos os blocos
    if (groupRef.current) {
      groupRef.current.children.forEach(child => {
        if (child.material) {
          child.material.opacity = (1 - progress) * 0.8;
        }
      });
    }
  });

  return (
    <>
      {/* Esfera de expansão central (flex-grow visual) */}
      <mesh ref={sphereRef} position={[cx, 0.5, cz]}>
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshBasicMaterial
          color={EFFECT_COLORS.bombs}
          transparent
          opacity={0.5}
          wireframe
        />
      </mesh>

      {/* Blocos de fogo em cada célula atingida */}
      <group ref={groupRef}>
        {cells.map(([row, col]) => {
          const [x, , z] = gridTo3D(row, col);
          return (
            <mesh key={`bomb-${row}-${col}`} position={[x, 0.2, z]}>
              <boxGeometry args={[BLOCK_SIZE * 0.8, 0.4, BLOCK_SIZE * 0.8]} />
              <meshBasicMaterial
                color={EFFECT_COLORS.bombs}
                transparent
                opacity={0.8}
              />
            </mesh>
          );
        })}
      </group>

      {/* Luz explosiva */}
      <pointLight
        position={[cx, 1, cz]}
        color="#ff6b35"
        intensity={8}
        distance={5}
        decay={2}
      />
    </>
  );
}

// ════════════════════════════════════════════════════════════
//  LaserEffect — Faixa de luz que varre a linha/coluna
//  Simula visualmente: grid-column: N / span 6
// ════════════════════════════════════════════════════════════

function LaserEffect({ cells }) {
  const groupRef = useRef();
  const timeRef = useRef(0);

  // Determina se é laser de linha (row) ou coluna (col)
  // Se todas as células têm o mesmo row → laser horizontal
  const isRowLaser = cells.every(([r]) => r === cells[0][0]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const progress = Math.min(timeRef.current / 0.8, 1);

    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        if (child.material) {
          // Efeito de varredura: cada célula aparece com delay
          const cellDelay = i * 0.05;
          const cellProgress = Math.max(0, Math.min((timeRef.current - cellDelay) / 0.5, 1));
          child.material.opacity = (1 - progress) * Math.min(cellProgress * 3, 1);
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {cells.map(([row, col], index) => {
        const [x, , z] = gridTo3D(row, col);
        return (
          <group key={`laser-${row}-${col}`}>
            {/* Faixa do laser sobre cada célula */}
            <mesh position={[x, 0.1, z]}>
              <boxGeometry
                args={
                  isRowLaser
                    ? [BLOCK_SIZE, 0.08, BLOCK_SIZE * 0.3] // Horizontal
                    : [BLOCK_SIZE * 0.3, 0.08, BLOCK_SIZE] // Vertical
                }
              />
              <meshBasicMaterial
                color={EFFECT_COLORS.laser}
                transparent
                opacity={0.9}
              />
            </mesh>
            {/* Luz ao longo da faixa */}
            {index % 2 === 0 && (
              <pointLight
                position={[x, 0.5, z]}
                color="#a855f7"
                intensity={2}
                distance={2}
                decay={2}
              />
            )}
          </group>
        );
      })}
    </group>
  );
}
