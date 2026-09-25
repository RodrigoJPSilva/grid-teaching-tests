// ============================================================
//  VRFloor.jsx — Chão estilo Metal Gear Solid VR Missions
//  Grid 6×6 com linhas cyan emissivas + paredes baixas nas bordas
// ============================================================

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Edges } from '@react-three/drei';

const CELL_SIZE = 1.2;
const GRID_COUNT = 6;
const WALL_HEIGHT = 2;
const WALL_THICKNESS = 0.3;

// Cores do cenário VR
const FLOOR_COLOR = '#0a1e1e';
const EDGE_COLOR = '#00ddaa';
const WALL_COLOR = '#081818';

function FloorCell({ x, z }) {
  return (
    <mesh position={[x, -0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[CELL_SIZE, CELL_SIZE]} />
      <meshStandardMaterial
        color={FLOOR_COLOR}
        roughness={0.8}
        metalness={0.3}
      />
      <Edges
        threshold={15}
        color={EDGE_COLOR}
        lineWidth={1}
      />
    </mesh>
  );
}

function WallSegment({ position, size }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={WALL_COLOR}
        roughness={0.7}
        metalness={0.4}
      />
      <Edges threshold={15} color={EDGE_COLOR} lineWidth={1} />
    </mesh>
  );
}

export default function VRFloor() {
  const halfGrid = (GRID_COUNT - 1) / 2;
  const totalSize = GRID_COUNT * CELL_SIZE;
  const halfTotal = totalSize / 2;

  // Gerar as 36 células do chão
  const cells = useMemo(() => {
    const arr = [];
    for (let row = 0; row < GRID_COUNT; row++) {
      for (let col = 0; col < GRID_COUNT; col++) {
        const x = (col - halfGrid) * CELL_SIZE;
        const z = (row - halfGrid) * CELL_SIZE;
        arr.push({ x, z, key: `cell-${row}-${col}` });
      }
    }
    return arr;
  }, [halfGrid]);

  // Paredes baixas nas 4 bordas
  const wallY = WALL_HEIGHT / 2;
  const wallOffset = halfTotal + WALL_THICKNESS / 2;

  return (
    <group>
      {/* Chão de células */}
      {cells.map(c => (
        <FloorCell key={c.key} x={c.x} z={c.z} />
      ))}

      {/* Paredes — Frente e Trás (eixo Z) */}
      <WallSegment
        position={[0, wallY, -wallOffset]}
        size={[totalSize + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS]}
      />
      <WallSegment
        position={[0, wallY, wallOffset]}
        size={[totalSize + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS]}
      />

      {/* Paredes — Esquerda e Direita (eixo X) */}
      <WallSegment
        position={[-wallOffset, wallY, 0]}
        size={[WALL_THICKNESS, WALL_HEIGHT, totalSize + WALL_THICKNESS * 2]}
      />
      <WallSegment
        position={[wallOffset, wallY, 0]}
        size={[WALL_THICKNESS, WALL_HEIGHT, totalSize + WALL_THICKNESS * 2]}
      />

      {/* Luz ambiente teal vinda de baixo do chão */}
      <pointLight
        position={[0, -1, 0]}
        color="#00ddaa"
        intensity={0.8}
        distance={12}
      />

      {/* Luzes de borda para realçar o brilho cyan */}
      <pointLight position={[-halfTotal, 1, -halfTotal]} color="#00ffcc" intensity={0.4} distance={8} />
      <pointLight position={[halfTotal, 1, halfTotal]} color="#00ffcc" intensity={0.4} distance={8} />
    </group>
  );
}
