import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { soundManager } from '../utils/SoundManager';

const MAX_TRAIL_POINTS = 24;

export default function Bomb({ startPos, endPos, startTime, duration = 5000, shooterType = 'player', onImpact }) {
  const bombGroup = useRef();
  const materialRef = useRef();
  const ribbonMeshRef = useRef();

  const vStart = useMemo(() => startPos ? new THREE.Vector3(...startPos) : new THREE.Vector3(), [startPos]);
  const vEnd = useMemo(() => endPos ? new THREE.Vector3(...endPos) : new THREE.Vector3(), [endPos]);

  // Cores de transição de acordo com o atirador:
  // Jogador: Verde ciano (#00ff88) -> Amarelo (#ffff00)
  // Bots: Vermelho (#ff0040) -> Amarelo (#ffff00)
  const baseStartColor = useMemo(() => new THREE.Color(shooterType === 'player' ? '#00ff88' : '#ff0040'), [shooterType]);
  const yellowColor = useMemo(() => new THREE.Color('#ffff00'), []);
  const currentColor = useMemo(() => new THREE.Color(shooterType === 'player' ? '#00ff88' : '#ff0040'), [shooterType]);

  // Triggers de áudio e impacto sincronizados
  const ticksPlayed = useRef(new Set());
  const lastBeepPlayed = useRef(false);
  const diveSoundPlayed = useRef(false);
  const impactTriggered = useRef(false);

  useEffect(() => {
    ticksPlayed.current.clear();
    lastBeepPlayed.current = false;
    diveSoundPlayed.current = false;
    impactTriggered.current = false;
  }, [startTime]);

  // Buffer de posições para o Ribbon Trail
  const trailPositions = useRef([]);

  // Geometria dinâmica para a fita
  const ribbonGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const maxVerts = (MAX_TRAIL_POINTS - 1) * 6;
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxVerts * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(maxVerts * 3), 3));
    return geo;
  }, []);

  useFrame(() => {
    if (!bombGroup.current || !startTime) return;

    const elapsed = Date.now() - startTime;

    if (shooterType === 'player') {
      // ════════════════════════════════════════════════════════════════
      // BOMBA DO JOGADOR: 3 FASES (3.3s subida, 0.7s mira/flash, 1.0s mergulho)
      // Dano/impacto antecipado em 0.5s antes do fim da animação (aos 4.5s)
      // ════════════════════════════════════════════════════════════════

      // Tiques normais de contagem aos 0s, 1s, 2s, 3s
      [0, 1000, 2000, 3000].forEach((tickMs) => {
        if (elapsed >= tickMs && elapsed < 3300 && !ticksPlayed.current.has(tickMs)) {
          ticksPlayed.current.add(tickMs);
          soundManager.playBombBeep();
        }
      });

      if (elapsed < 3300) {
        // ── Fase 1: Subida mais lenta ficando amarela (0.0s a 3.3s) ──
        const p1 = Math.min(elapsed / 3300, 1.0);
        currentColor.copy(baseStartColor).lerp(yellowColor, p1);
        if (materialRef.current) {
          materialRef.current.color.copy(currentColor);
          materialRef.current.emissive.copy(currentColor);
          materialRef.current.emissiveIntensity = 0.6 + p1 * 0.8;
        }

        // Sobe em direção ao ponto vertical alto diretamente sobre o alvo
        const currX = THREE.MathUtils.lerp(vStart.x, vEnd.x, p1);
        const currZ = THREE.MathUtils.lerp(vStart.z, vEnd.z, p1);
        const currY = THREE.MathUtils.lerp(vStart.y, 5.0, Math.sin(p1 * Math.PI * 0.5));
        bombGroup.current.position.set(currX, currY, currZ);

        bombGroup.current.rotation.x = p1 * Math.PI * 4;
        bombGroup.current.rotation.y = p1 * Math.PI * 2;
        bombGroup.current.rotation.z = 0;

        const currentScale = THREE.MathUtils.lerp(0.2, 1, Math.min(p1 * 1.5, 1));
        bombGroup.current.scale.set(currentScale, currentScale, currentScale);
      } else if (elapsed < 4000) {
        // ── Fase 2: Olha para o alvo + piscada em branco + último tic diferenciado (3.3s a 4.0s - 0.7s) ──
        if (!lastBeepPlayed.current) {
          lastBeepPlayed.current = true;
          soundManager.playBombLastBeep();
        }

        const p2 = (elapsed - 3300) / 700;
        bombGroup.current.position.set(vEnd.x, 5.0, vEnd.z);

        // Olha direto para o alvo abaixo
        bombGroup.current.rotation.set(Math.PI / 2, 0, 0);

        // Leve piscada em branco sincronizada com o último tic
        const flash = Math.sin(p2 * Math.PI);
        const whiteColor = new THREE.Color('#ffffff');
        currentColor.copy(yellowColor).lerp(whiteColor, flash * 0.85);

        if (materialRef.current) {
          materialRef.current.color.copy(currentColor);
          materialRef.current.emissive.copy(currentColor);
          materialRef.current.emissiveIntensity = 1.2 + flash * 1.6;
        }
        bombGroup.current.scale.set(1, 1, 1);
      } else {
        // ── Fase 3: Desce com tudo em linha reta + som de preparar para o impacto (4.0s a 5.0s - 1.0s) ──
        if (!diveSoundPlayed.current) {
          diveSoundPlayed.current = true;
          soundManager.playBombDive();
        }

        const p3 = Math.min((elapsed - 4000) / 1000, 1.0);

        if (p3 <= 0.5) {
          // De 4.0s a 4.5s: Desce acelerando em linha reta até o chão
          const u = p3 / 0.5; // 0 to 1
          const accel = u * u; // Aceleração com tudo
          const currY = THREE.MathUtils.lerp(5.0, 0.0, accel);
          bombGroup.current.position.set(vEnd.x, currY, vEnd.z);
        } else {
          // De 4.5s a 5.0s: Atravessa o piso e colapsa na cratera
          const v = (p3 - 0.5) / 0.5;
          const currY = -v * 1.6;
          bombGroup.current.position.set(vEnd.x, currY, vEnd.z);
          const collapseScale = Math.max(0, 1.0 - v * 1.2);
          bombGroup.current.scale.set(collapseScale, collapseScale, collapseScale);
        }

        // Impacto e dano aos 4.5s (0.5s antes de completar a animação total de 5s)
        if (elapsed >= 4500 && !impactTriggered.current) {
          impactTriggered.current = true;
          if (onImpact) onImpact();
        }

        bombGroup.current.rotation.set(Math.PI / 2, 0, 0);

        if (materialRef.current) {
          materialRef.current.color.set('#ffff00');
          materialRef.current.emissive.set('#ffff00');
          materialRef.current.emissiveIntensity = 1.8;
        }
      }
    } else {
      // ════════════════════════════════════════════════════════════════
      // BOMBAS DE INIMIGOS: Trajetória parabólica padrão
      // ════════════════════════════════════════════════════════════════
      const t = Math.min(Math.max(elapsed / duration, 0), 1);

      currentColor.copy(baseStartColor).lerp(yellowColor, t);
      if (materialRef.current) {
        materialRef.current.color.copy(currentColor);
        materialRef.current.emissive.copy(currentColor);
        materialRef.current.emissiveIntensity = 0.6 + t * 1.4;
      }

      bombGroup.current.position.lerpVectors(vStart, vEnd, t);
      const maxHeight = 4;
      bombGroup.current.position.y += Math.sin(t * Math.PI) * maxHeight;

      if (t > 0.85) {
        const plungeProgress = (t - 0.85) / 0.15;
        bombGroup.current.position.y -= plungeProgress * 2.2;
      }

      bombGroup.current.rotation.x = t * Math.PI * 6;
      bombGroup.current.rotation.y = t * Math.PI * 3;

      const currentScale = THREE.MathUtils.lerp(0.2, 1, Math.min(t * 1.5, 1));
      bombGroup.current.scale.set(currentScale, currentScale, currentScale);
    }

    // 4. Gravação e atualização do Ribbon Trail
    const currentPos = bombGroup.current.position.clone();
    trailPositions.current.unshift(currentPos);
    if (trailPositions.current.length > MAX_TRAIL_POINTS) {
      trailPositions.current.pop();
    }

    const pts = trailPositions.current;
    if (pts.length > 2 && ribbonMeshRef.current) {
      const posAttr = ribbonGeo.attributes.position;
      const colAttr = ribbonGeo.attributes.color;
      let vertIndex = 0;

      const up = new THREE.Vector3(0, 1, 0);

      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];

        const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
        let side = new THREE.Vector3().crossVectors(dir, up).normalize();
        if (side.lengthSq() < 0.001) side.set(1, 0, 0);

        // Afunilamento suave: largo na bomba e fino na cauda
        const w1 = (1 - i / pts.length) * 0.28;
        const w2 = (1 - (i + 1) / pts.length) * 0.28;

        const left1 = p1.clone().addScaledVector(side, w1);
        const right1 = p1.clone().addScaledVector(side, -w1);
        const left2 = p2.clone().addScaledVector(side, w2);
        const right2 = p2.clone().addScaledVector(side, -w2);

        // Cor da fita correspondente com gradiente
        const segColor1 = currentColor.clone().lerp(baseStartColor, i / pts.length);
        const segColor2 = currentColor.clone().lerp(baseStartColor, (i + 1) / pts.length);
        const fade1 = Math.max(0, 1 - i / pts.length);
        const fade2 = Math.max(0, 1 - (i + 1) / pts.length);

        const c1R = segColor1.r * fade1;
        const c1G = segColor1.g * fade1;
        const c1B = segColor1.b * fade1;

        const c2R = segColor2.r * fade2;
        const c2G = segColor2.g * fade2;
        const c2B = segColor2.b * fade2;

        const verts = [
          left1, right1, left2,
          right1, right2, left2
        ];
        const colors = [
          c1R, c1G, c1B,   c1R, c1G, c1B,   c2R, c2G, c2B,
          c1R, c1G, c1B,   c2R, c2G, c2B,   c2R, c2G, c2B
        ];

        for (let v = 0; v < 6; v++) {
          posAttr.setXYZ(vertIndex, verts[v].x, verts[v].y, verts[v].z);
          colAttr.setXYZ(vertIndex, colors[v * 3], colors[v * 3 + 1], colors[v * 3 + 2]);
          vertIndex++;
        }
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      ribbonGeo.setDrawRange(0, vertIndex);
    }
  });

  return (
    <>
      {/* Rastro Ribbon Trail luminoso */}
      <mesh ref={ribbonMeshRef} geometry={ribbonGeo}>
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Cubo da bomba animado */}
      <group ref={bombGroup} position={startPos || endPos} scale={[0.2, 0.2, 0.2]}>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[0.7, 0.7, 0.7]} />
          <meshStandardMaterial
            ref={materialRef}
            color={shooterType === 'player' ? '#00ff88' : '#ff0040'}
            roughness={0.25}
            metalness={0.1}
            emissive={shooterType === 'player' ? '#00ff88' : '#ff0040'}
            emissiveIntensity={0.6}
          />
        </mesh>
      </group>
    </>
  );
}

export function BombArea({ centerCol, centerRow, arenaSize = 10, color = '#00ff88', position }) {
  const CELL_SIZE = 1.2;
  const halfGrid = (arenaSize - 1) / 2;

  let cx = 0, cz = 0, width = 3.6, depth = 3.6;

  if (centerCol !== undefined && centerRow !== undefined) {
    const minCol = Math.max(1, centerCol - 1);
    const maxCol = Math.min(arenaSize, centerCol + 1);
    const minRow = Math.max(1, centerRow - 1);
    const maxRow = Math.min(arenaSize, centerRow + 1);

    const colsCount = maxCol - minCol + 1;
    const rowsCount = maxRow - minRow + 1;

    width = colsCount * CELL_SIZE;
    depth = rowsCount * CELL_SIZE;

    const midCol = (minCol + maxCol) / 2;
    const midRow = (minRow + maxRow) / 2;

    cx = (midCol - 1 - halfGrid) * CELL_SIZE;
    cz = (midRow - 1 - halfGrid) * CELL_SIZE;
  } else if (position) {
    cx = position[0];
    cz = position[2];
    const maxBound = (arenaSize * CELL_SIZE) / 2;
    const minX = Math.max(-maxBound, cx - 1.8);
    const maxX = Math.min(maxBound, cx + 1.8);
    const minZ = Math.max(-maxBound, cz - 1.8);
    const maxZ = Math.min(maxBound, cz + 1.8);
    width = Math.max(0.1, maxX - minX);
    depth = Math.max(0.1, maxZ - minZ);
    cx = (minX + maxX) / 2;
    cz = (minZ + maxZ) / 2;
  }

  return (
    <mesh position={[cx, 0.02, cz]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.25}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
