// ============================================================
//  VRFloor.jsx — Chão estilo Metal Gear Solid VR Missions
//  Grid 6×6 com linhas cyan emissivas + paredes baixas nas bordas
// ============================================================

import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Edges } from '@react-three/drei';

const CELL_SIZE = 1.2;
const WALL_HEIGHT = 2;
const WALL_THICKNESS = 0.3;

const FLOOR_COLOR = '#0a1e1e';
const EDGE_COLOR = '#ffffff';
const WALL_COLOR = '#081818';

const BORDER_WIDTH = 0.025;
const sharedBorderGeometry = (() => {
  const shape = new THREE.Shape();
  const half = CELL_SIZE / 2;
  shape.moveTo(-half, -half);
  shape.lineTo(half, -half);
  shape.lineTo(half, half);
  shape.lineTo(-half, half);
  shape.closePath();

  const inner = half - BORDER_WIDTH;
  const hole = new THREE.Path();
  hole.moveTo(-inner, -inner);
  hole.lineTo(inner, -inner);
  hole.lineTo(inner, inner);
  hole.lineTo(-inner, inner);
  hole.closePath();
  shape.holes.push(hole);

  return new THREE.ShapeGeometry(shape);
})();

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
      const maxRad = w.radius || 1.5;
      if (dist <= maxRad) {
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

    const isElevated = isHit || isPreview || (isOccupied && isOccupied !== 'descending');
    const baseY = isElevated ? 0.2 : -0.01;
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
      isOccupied === 'npc-targeted' ? '#0d4a19' :
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

    const targetIntensity = isWaveActive ? (0.4 + (maxWaveY / 0.55) * 0.8) : (isOccupied === 'npc-targeted' ? 1.2 : (isElevated ? 0.4 : 0));

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
      <mesh geometry={sharedBorderGeometry} position={[0, 0, 0.003]}>
        <meshBasicMaterial ref={edgesMatRef} color={EDGE_COLOR} depthWrite={false} toneMapped={false} />
      </mesh>
    </mesh>
  );
}

function WallSegment({ position, size }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={WALL_COLOR} roughness={0.7} metalness={0.4} />
      <Edges threshold={15} lineWidth={1}>
        <lineBasicMaterial color={EDGE_COLOR} polygonOffset={true} polygonOffsetFactor={-1} polygonOffsetUnits={-1} depthWrite={false} />
      </Edges>
    </mesh>
  );
}

// ── Aura / Campo de Força nas Bordas Superiores da Arena ─────────
function PerimeterForcefield({ totalSize, halfTotal }) {
  const meshSouthRef = useRef();
  const meshEastRef = useRef();
  const FIELD_HEIGHT = CELL_SIZE * 0.5; // Metade do tamanho de um piso (0.6)
  const FIELD_Y = FIELD_HEIGHT / 2; // 0.3

  useFrame((state) => {
    const pulse = 0.28 + Math.sin(state.clock.elapsedTime * 3.5) * 0.12;
    [meshSouthRef, meshEastRef].forEach(ref => {
      if (ref.current && ref.current.material) {
        ref.current.material.opacity = pulse;
      }
    });
  });

  return (
    <group>
      {/* Barreira Sul (Abre para o jogador, encosta no chão com metade da altura de um piso) */}
      <mesh ref={meshSouthRef} position={[0, FIELD_Y, halfTotal]}>
        <planeGeometry args={[totalSize, FIELD_HEIGHT]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Topo Laser Sul */}
      <mesh position={[0, FIELD_HEIGHT, halfTotal]}>
        <boxGeometry args={[totalSize, 0.05, 0.05]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>
      {/* Base Laser Sul no Chão */}
      <mesh position={[0, 0.02, halfTotal]}>
        <boxGeometry args={[totalSize, 0.04, 0.04]} />
        <meshBasicMaterial color="#00ddaa" />
      </mesh>

      {/* Barreira Leste (Abre para o jogador, encosta no chão com metade da altura de um piso) */}
      <mesh ref={meshEastRef} position={[halfTotal, FIELD_Y, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[totalSize, FIELD_HEIGHT]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Topo Laser Leste */}
      <mesh position={[halfTotal, FIELD_HEIGHT, 0]}>
        <boxGeometry args={[0.05, 0.05, totalSize]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>
      {/* Base Laser Leste no Chão */}
      <mesh position={[halfTotal, 0.02, 0]}>
        <boxGeometry args={[0.04, 0.04, totalSize]} />
        <meshBasicMaterial color="#00ddaa" />
      </mesh>

      {/* Pilar/Conector de Canto Holográfico entre Sul e Leste */}
      <mesh position={[halfTotal, FIELD_Y, halfTotal]}>
        <boxGeometry args={[0.06, FIELD_HEIGHT, 0.06]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>
    </group>
  );
}

// ── Base Procedural da Ilha Flutuante (Voxel Rock Keel) ──────────
function FloatingIslandUnderside({ gridSize }) {
  const halfGrid = (gridSize - 1) / 2;
  const maxRadius = Math.SQRT2 * halfGrid;

  const voxels = useMemo(() => {
    const list = [];
    const hash = (x, z) => {
      const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
      return s - Math.floor(s);
    };

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const dx = c - halfGrid;
        const dz = r - halfGrid;
        const dist = Math.hypot(dx, dz) / (maxRadius + 0.1);
        const n = hash(c, r);

        // Mais profundo no centro (até 7 camadas para baixo), afinando nas bordas
        const depth = Math.max(0, Math.round((1 - Math.pow(dist, 1.2)) * 6.5 + (n - 0.5) * 1.8));

        for (let k = 1; k <= depth; k++) {
          const taper = 1 - (k / 8) * 0.38;
          const bx = dx * CELL_SIZE * taper;
          const bz = dz * CELL_SIZE * taper;
          const by = -k * (CELL_SIZE * 0.65) + 0.05;
          const isAccent = (k + c + r) % 7 === 0;
          list.push({ x: bx, y: by, z: bz, isAccent });
        }
      }
    }
    return list;
  }, [gridSize, halfGrid, maxRadius]);

  const blockGeo = useMemo(() => new THREE.BoxGeometry(CELL_SIZE * 0.94, CELL_SIZE * 0.6, CELL_SIZE * 0.94), []);
  const baseMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0d1318',
    roughness: 0.85,
    metalness: 0.4
  }), []);
  const accentMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#09151e',
    emissive: '#00ffee',
    emissiveIntensity: 0.25,
    roughness: 0.7,
    metalness: 0.5
  }), []);

  const baseMeshRef = useRef();
  const accentMeshRef = useRef();

  useEffect(() => {
    if (!baseMeshRef.current && !accentMeshRef.current) return;
    const dummy = new THREE.Object3D();
    let baseIdx = 0;
    let accIdx = 0;

    voxels.forEach(v => {
      dummy.position.set(v.x, v.y, v.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();

      if (v.isAccent && accentMeshRef.current) {
        accentMeshRef.current.setMatrixAt(accIdx++, dummy.matrix);
      } else if (baseMeshRef.current) {
        baseMeshRef.current.setMatrixAt(baseIdx++, dummy.matrix);
      }
    });

    if (baseMeshRef.current) baseMeshRef.current.instanceMatrix.needsUpdate = true;
    if (accentMeshRef.current) accentMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [voxels]);

  const baseCount = voxels.filter(v => !v.isAccent).length;
  const accCount = voxels.filter(v => v.isAccent).length;

  return (
    <group>
      {baseCount > 0 && (
        <instancedMesh ref={baseMeshRef} args={[blockGeo, baseMat, baseCount]} />
      )}
      {accCount > 0 && (
        <instancedMesh ref={accentMeshRef} args={[blockGeo, accentMat, accCount]} />
      )}
    </group>
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
  }, [gridSize, halfGrid]);

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

      {/* Aura Holográfica de Contenção no Topo da Arena */}
      <PerimeterForcefield totalSize={totalSize} halfTotal={halfTotal} />

      {/* Parte de Baixo Procedural da Ilha Flutuante */}
      <FloatingIslandUnderside gridSize={gridSize} />

      <pointLight position={[0, -1, 0]} color="#00ddaa" intensity={0.8} distance={12} />
      <pointLight position={[-halfTotal, 1, -halfTotal]} color="#00ffcc" intensity={0.4} distance={8} />
      <pointLight position={[halfTotal, 1, halfTotal]} color="#00ffcc" intensity={0.4} distance={8} />
    </group>
  );
}
