// ============================================================
//  VRFloor.jsx — Chão estilo Metal Gear Solid VR Missions
//  Grid 6×6 com linhas cyan emissivas + paredes baixas nas bordas
// ============================================================

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Edges } from '@react-three/drei';

const CELL_SIZE = 1.2;
const WALL_HEIGHT = 2;
const WALL_THICKNESS = 0.3;

const FLOOR_COLOR = '#0a1e1e';
const EDGE_COLOR = '#00ddaa';
const WALL_COLOR = '#081818';

function FloorCell({ col, row, x, z, isOccupied, isHit, isPreview, waveHits = [], onTileClick }) {
  const meshRef = useRef();
  const meshMatRef = useRef();
  const edgesMatRef = useRef();

  useFrame((state, delta) => {
    const now = Date.now();
    let maxWaveY = 0;
    let isWaveActive = false;

    for (let i = 0; i < waveHits.length; i++) {
      const w = waveHits[i];
      const dist = Math.hypot(col - w.col, row - w.row);
      if (dist <= 1.5) {
        const delay = dist * 120; // 120ms de atraso propagando do centro para as bordas
        const elapsed = now - w.time - delay;
        if (elapsed > 0 && elapsed < 650) {
          const p = elapsed / 650;
          const wave = Math.sin(p * Math.PI) * 0.55;
          if (wave > maxWaveY) {
            maxWaveY = wave;
            isWaveActive = true;
          }
        }
      }
    }

    const baseY = (isHit || isOccupied || isPreview) ? 0.2 : -0.01;
    const targetY = baseY + maxWaveY;

    const targetEdgeColor = new THREE.Color(
      isWaveActive ? '#f87171' :
      isHit ? '#f87171' :
      isOccupied === 'npc-targeted' ? '#2CFF05' :
      isOccupied === 'player' ? '#4ade80' :
      isOccupied === 'npc' ? '#f87171' :
      isPreview === 'preview-player' ? '#4ade80' :
      (isPreview === 'preview-bomb' || isPreview === 'preview-sniper') ? '#ffffff' :
      EDGE_COLOR
    );

    const targetBgColor = new THREE.Color(
      isWaveActive ? '#440000' :
      isHit ? '#440000' :
      isOccupied === 'npc-targeted' ? '#003311' :
      isOccupied === 'player' ? '#003322' :
      isOccupied === 'npc' ? '#440000' :
      isPreview === 'preview-player' ? '#003322' :
      (isPreview === 'preview-bomb' || isPreview === 'preview-sniper') ? '#ffffff' :
      FLOOR_COLOR
    );

    const targetEmissive = new THREE.Color(
      isWaveActive ? '#ff0000' :
      isHit ? '#ff0000' :
      isOccupied === 'npc-targeted' ? '#2CFF05' :
      isOccupied === 'player' ? '#00ff88' :
      isOccupied === 'npc' ? '#ff3333' :
      isPreview === 'preview-player' ? '#00ff88' :
      (isPreview === 'preview-bomb' || isPreview === 'preview-sniper') ? '#ffffff' :
      '#000000'
    );

    const targetIntensity = isWaveActive ? (0.4 + (maxWaveY / 0.55) * 0.8) : (isOccupied === 'npc-targeted' ? 0.7 : ((isHit || isOccupied || isPreview) ? 0.4 : 0));

    if (meshRef.current) {
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, delta * 12);
    }
    if (edgesMatRef.current) {
      edgesMatRef.current.color.lerp(targetEdgeColor, delta * 10);
    }
    if (meshMatRef.current) {
      meshMatRef.current.color.lerp(targetBgColor, delta * 10);
      meshMatRef.current.emissive.lerp(targetEmissive, delta * 10);
      meshMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(meshMatRef.current.emissiveIntensity, targetIntensity, delta * 10);
    }
  });

  return (
    <mesh ref={meshRef} position={[x, -0.01, z]} rotation={[-Math.PI / 2, 0, 0]} onClick={() => onTileClick && onTileClick(col, row)}>
      <planeGeometry args={[CELL_SIZE, CELL_SIZE]} />
      <meshStandardMaterial ref={meshMatRef} color={FLOOR_COLOR} emissive="#000000" emissiveIntensity={0} roughness={0.8} metalness={0.3} />
      <Edges threshold={15} lineWidth={1}>
        <lineBasicMaterial ref={edgesMatRef} color={EDGE_COLOR} />
      </Edges>
    </mesh>
  );
}

function WallSegment({ position, size }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={WALL_COLOR} roughness={0.7} metalness={0.4} />
      <Edges threshold={15} color={EDGE_COLOR} lineWidth={1} />
    </mesh>
  );
}

export default function VRFloor({ occupiedTiles = [], hitTiles = [], previewTiles = [], waveHits = [], gridSize = 6, onTileClick }) {
  const halfGrid = (gridSize - 1) / 2;
  const totalSize = gridSize * CELL_SIZE;
  const halfTotal = totalSize / 2;

  const cells = useMemo(() => {
    const arr = [];
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const x = (col - halfGrid) * CELL_SIZE;
        const z = (row - halfGrid) * CELL_SIZE;
        arr.push({ col: col + 1, row: row + 1, x, z, key: `cell-${row}-${col}` });
      }
    }
    return arr;
  }, [halfGrid]);

  const wallY = WALL_HEIGHT / 2;
  const wallOffset = halfTotal + WALL_THICKNESS / 2;

  return (
    <group>
      {cells.map(c => {
        const occupant = occupiedTiles.find(t => t.col === c.col && t.row === c.row);
        const hitData = hitTiles.find(t => t.col === c.col && t.row === c.row);
        const previewData = previewTiles.find(t => t.col === c.col && t.row === c.row);

        return <FloorCell
          key={c.key} col={c.col} row={c.row} x={c.x} z={c.z}
          isOccupied={occupant ? occupant.type : false}
          isHit={!!hitData}
          isPreview={previewData ? previewData.type : false}
          waveHits={waveHits}
          onTileClick={onTileClick}
        />;
      })}

      <WallSegment position={[0, wallY, -wallOffset]} size={[totalSize + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS]} />
      <WallSegment position={[-wallOffset, wallY, 0]} size={[WALL_THICKNESS, WALL_HEIGHT, totalSize + WALL_THICKNESS * 2]} />

      <pointLight position={[0, -1, 0]} color="#00ddaa" intensity={0.8} distance={12} />
      <pointLight position={[-halfTotal, 1, -halfTotal]} color="#00ffcc" intensity={0.4} distance={8} />
      <pointLight position={[halfTotal, 1, halfTotal]} color="#00ffcc" intensity={0.4} distance={8} />
    </group>
  );
}
