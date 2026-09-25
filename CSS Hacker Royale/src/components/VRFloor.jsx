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

function FloorCell({ col, row, x, z, isOccupied, isHit, onTileClick }) {
  const meshRef = useRef();
  const meshMatRef = useRef();
  const edgesMatRef = useRef();
  
  const targetY = (isHit || isOccupied) ? 0.2 : -0.01;
  const targetEdgeColor = new THREE.Color(
    isHit ? '#f87171' : 
    isOccupied === 'player' ? '#4ade80' : 
    isOccupied === 'npc' ? '#f87171' : 
    EDGE_COLOR
  );

  const targetBgColor = new THREE.Color(
    isHit ? '#440000' : 
    isOccupied === 'player' ? '#003322' : 
    isOccupied === 'npc' ? '#440000' : 
    FLOOR_COLOR
  );

  const targetEmissive = new THREE.Color(
    isHit ? '#ff0000' : 
    isOccupied === 'player' ? '#00ff88' : 
    isOccupied === 'npc' ? '#ff3333' : 
    '#000000'
  );

  const targetIntensity = (isHit || isOccupied) ? 0.4 : 0;

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, delta * 8);
    }
    if (edgesMatRef.current) {
      edgesMatRef.current.color.lerp(targetEdgeColor, delta * 8);
    }
    if (meshMatRef.current) {
      meshMatRef.current.color.lerp(targetBgColor, delta * 8);
      meshMatRef.current.emissive.lerp(targetEmissive, delta * 8);
      meshMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(meshMatRef.current.emissiveIntensity, targetIntensity, delta * 8);
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

export default function VRFloor({ occupiedTiles = [], hitTiles = [], gridSize = 6, onTileClick }) {
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
        
        return <FloorCell 
          key={c.key} col={c.col} row={c.row} x={c.x} z={c.z} 
          isOccupied={occupant ? occupant.type : false} 
          isHit={!!hitData} 
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
