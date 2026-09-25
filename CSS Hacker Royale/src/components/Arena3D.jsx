// ============================================================
//  Arena3D.jsx — Cena 3D com cenário VR Missions + Robôs GLB
// ============================================================

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { parsePlayerCode, gridToPosition3D } from '../utils/GameEngine';
import VRFloor from './VRFloor';
import VoxelEnemy from './VoxelEnemy';
import Player from './Player';
import Bomb, { BombArea } from './Bomb';

function LightBootSequence() {
  const ambientLightRef = useRef();
  const dirLightRef = useRef();
  const hemisLightRef = useRef();

  useFrame((state, delta) => {
    if (ambientLightRef.current) ambientLightRef.current.intensity = THREE.MathUtils.lerp(ambientLightRef.current.intensity, 1.5, delta * 2);
    if (dirLightRef.current) dirLightRef.current.intensity = THREE.MathUtils.lerp(dirLightRef.current.intensity, 2.5, delta * 2);
    if (hemisLightRef.current) hemisLightRef.current.intensity = THREE.MathUtils.lerp(hemisLightRef.current.intensity, 1, delta * 2);
  });

  return (
    <>
      <ambientLight ref={ambientLightRef} intensity={0} color="#ffffff" />
      <directionalLight ref={dirLightRef} position={[10, 20, 10]} intensity={0} color="#eef" />
      <hemisphereLight ref={hemisLightRef} skyColor="#4488aa" groundColor="#001111" intensity={0} />
    </>
  );
}

function SniperTrail({ startPos, endPos, startTime }) {
  const meshRef = useRef();
  const vStart = useMemo(() => new THREE.Vector3(...startPos), [startPos]);
  const vEnd = useMemo(() => new THREE.Vector3(...endPos), [endPos]);
  const length = vStart.distanceTo(vEnd);

  useFrame(() => {
    if (!meshRef.current) return;
    const elapsed = Date.now() - startTime;
    // Fade out in 300ms
    meshRef.current.material.opacity = Math.max(0, 1 - elapsed / 300);
  });

  if (Date.now() - startTime > 300) return null;

  return (
    <mesh position={vStart.clone().lerp(vEnd, 0.5)}
      quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), vEnd.clone().sub(vStart).normalize())}>
      <boxGeometry args={[0.05, 0.05, length]} />
      <meshBasicMaterial color="#ff0040" transparent />
    </mesh>
  );
}

export default function Arena3D({
  cssCode, previewCode, enemies,
  playerHp = 3,
  activeTool,
  playerRevealed, setPlayerRevealed, lastPlayerPos,
  bombCountdown, bombThrowTrigger, sniperShootTrigger,
  arenaSize = 10, onTileClick,
  incomingBombs = []
}) {
  const [playerDamageTrigger, setPlayerDamageTrigger] = useState(0);
  const prevPlayerHp = useRef(playerHp);

  useEffect(() => {
    if (playerHp < prevPlayerHp.current) {
      setPlayerDamageTrigger(Date.now());
    }
    prevPlayerHp.current = playerHp;
  }, [playerHp]);
  const gameState = useMemo(() => parsePlayerCode(cssCode), [cssCode]);
  const previewState = useMemo(() => {
    try {
      return parsePlayerCode(previewCode || "");
    } catch(e) {
      return {};
    }
  }, [previewCode]);

  const isMoving =
    gameState.player.col !== lastPlayerPos.current.col ||
    gameState.player.row !== lastPlayerPos.current.row;

  if (isMoving) {
    lastPlayerPos.current = { col: gameState.player.col, row: gameState.player.row };
    setTimeout(() => { if (playerRevealed) setPlayerRevealed(false); }, 0);
  }

  const playerPos3D = gridToPosition3D(gameState.player.col, gameState.player.row, arenaSize);
  const bombaPos3D = gameState.bomba ? gridToPosition3D(gameState.bomba.col, gameState.bomba.row, arenaSize) : null;
  const sniperPos3D = gameState.sniper ? gridToPosition3D(gameState.sniper.col, gameState.sniper.row, arenaSize) : null;

  const previewBombaPos3D = previewState?.bomba ? gridToPosition3D(previewState.bomba.col, previewState.bomba.row, arenaSize) : null;
  const previewSniperPos3D = previewState?.sniper ? gridToPosition3D(previewState.sniper.col, previewState.sniper.row, arenaSize) : null;

  const enemiesInRoom = Object.values(enemies).filter(e => e.hp > 0);

  // ── Hit Effects & Wave Impacts (Floor interaction) ──
  const [hitEffects, setHitEffects] = useState([]);
  const [waveHits, setWaveHits] = useState([]);

  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setHitEffects(prev => prev.filter(h => now - h.time < 2000));
      setWaveHits(prev => prev.filter(w => now - w.time < 2000));
    }, 200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (sniperShootTrigger > 0 && gameState.sniper) {
      setHitEffects(prev => [...prev, { col: gameState.sniper.col, row: gameState.sniper.row, time: Date.now() }]);
    }
  }, [sniperShootTrigger, gameState.sniper]);

  const wasCounting = useRef(false);
  useEffect(() => {
    if (bombCountdown > 0) wasCounting.current = true;
    if (bombCountdown === 0 && wasCounting.current) {
      wasCounting.current = false;
      if (gameState.bomba) {
        const now = Date.now();
        setHitEffects(prev => [...prev, { col: gameState.bomba.col, row: gameState.bomba.row, time: now }]);
        setWaveHits(prev => [...prev, { col: gameState.bomba.col, row: gameState.bomba.row, time: now }]);
      }
    }
  }, [bombCountdown, gameState.bomba]);

  // Impacto em onda das bombas inimigas
  const enemyBombImpacted = useRef(new Set());
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      incomingBombs.forEach(b => {
        if (now - b.spawnTime >= 3000 && !enemyBombImpacted.current.has(b.id)) {
          enemyBombImpacted.current.add(b.id);
          setWaveHits(prev => [...prev, { col: b.col, row: b.row, time: now }]);
          setHitEffects(prev => [...prev, { col: b.col, row: b.row, time: now }]);
        }
      });
    }, 100);
    return () => clearInterval(interval);
  }, [incomingBombs]);

  // ── Throw start position ──
  const throwerPosRef = useRef(playerPos3D);
  useEffect(() => {
    if (bombThrowTrigger > 0) throwerPosRef.current = playerPos3D;
  }, [bombThrowTrigger]);

  // Identifica mira ativa da Sniper e Bomba (ao vivo na prévia e durante o ataque)
  const activeSniperTarget = previewState?.sniper?.col
    ? previewState.sniper
    : (sniperShootTrigger > 0 ? gameState.sniper : null);

  const activeBombTarget = (activeTool === 'bomba' && previewState?.bomba?.col)
    ? previewState.bomba
    : (bombCountdown > 0 ? gameState.bomba : null);

  const occupiedTiles = [
    { col: gameState.player.col, row: gameState.player.row, type: 'player' }
  ];
  enemiesInRoom.forEach(e => {
    // Para chefes, ocupa todos os blocos baseados no size
    for (let c = 0; c < e.size[0]; c++) {
      for (let r = 0; r < e.size[1]; r++) {
        const tileCol = e.position[1] + c;
        const tileRow = e.position[0] + r;

        // Checa se o inimigo está na mira da sniper ou no alcance da bomba
        const isSniperHit = activeSniperTarget &&
          activeSniperTarget.col === tileCol &&
          activeSniperTarget.row === tileRow;

        const isBombHit = activeBombTarget &&
          Math.abs(tileCol - activeBombTarget.col) <= 1 &&
          Math.abs(tileRow - activeBombTarget.row) <= 1;

        const tileType = (isSniperHit || isBombHit) ? 'npc-targeted' : 'npc';

        occupiedTiles.push({ col: tileCol, row: tileRow, type: tileType });
      }
    }
  });

  const hitTiles = hitEffects.map(h => ({ col: h.col, row: h.row, type: 'hit' }));

  const previewTiles = [];
  if (previewState?.player?.col) {
    previewTiles.push({ col: previewState.player.col, row: previewState.player.row, type: 'preview-player' });
  }
  if (previewState?.bomba?.col) {
    previewTiles.push({ col: previewState.bomba.col, row: previewState.bomba.row, type: 'preview-bomb' });
  }
  if (previewState?.sniper?.col) {
    previewTiles.push({ col: previewState.sniper.col, row: previewState.sniper.row, type: 'preview-sniper' });
  }

  let playerLookAt = null;
  if (activeTool === 'bomba' && previewBombaPos3D) playerLookAt = previewBombaPos3D;
  else if (activeTool === 'sniper' && previewSniperPos3D) playerLookAt = previewSniperPos3D;
  else if (activeTool) playerLookAt = 'weapon';

  return (
    <Canvas
      gl={{ antialias: false, stencil: false, depth: true }}
      onCreated={({ gl }) => gl.setClearColor('#000000')}
   >
      <OrthographicCamera makeDefault position={[10, 10, 10]} zoom={40} />
      <OrbitControls />

      <LightBootSequence />

      <VRFloor occupiedTiles={occupiedTiles} hitTiles={hitTiles} previewTiles={previewTiles} waveHits={waveHits} gridSize={arenaSize} onTileClick={onTileClick} />

      <group>
        <Player
          position={playerPos3D}
          isRevealed={playerRevealed}
          activeTool={activeTool}
          throwTrigger={bombThrowTrigger}
          shootTrigger={sniperShootTrigger}
          lookAtTarget={playerLookAt}
          damageTrigger={playerDamageTrigger}
        />
      </group>

      <group>
        {enemiesInRoom.map(enemy => (
          <VoxelEnemy key={enemy.id} enemy={enemy} arenaSize={arenaSize} />
        ))}
      </group>

      {/* Bomba Area do Jogador (apenas durante o countdown ou na prévia com ferramenta ativa) */}
      {bombCountdown > 0 && gameState.bomba && (
        <BombArea
          centerCol={gameState.bomba.col}
          centerRow={gameState.bomba.row}
          arenaSize={arenaSize}
          color="#00ff88"
        />
      )}
      {bombCountdown === 0 && activeTool === 'bomba' && previewState?.bomba?.col && (
        <BombArea
          centerCol={previewState.bomba.col}
          centerRow={previewState.bomba.row}
          arenaSize={arenaSize}
          color="#00ff88"
        />
      )}

      {/* Bomba voadora do Jogador (apenas durante o countdown) */}
      {bombCountdown > 0 && bombThrowTrigger > 0 && bombaPos3D && (
        <Bomb
          startPos={throwerPosRef.current}
          endPos={bombaPos3D}
          startTime={bombThrowTrigger}
          duration={5000}
          shooterType="player"
        />
      )}

      {/* Bombas Inimigas */}
      {incomingBombs.map(b => {
        const targetPos = gridToPosition3D(b.col, b.row, arenaSize);
        let startPos = [targetPos[0], 10, targetPos[2]];
        if (b.shooterType === 'normal' && b.shooterPos) {
          startPos = gridToPosition3D(b.shooterPos[0], b.shooterPos[1], arenaSize);
          startPos[1] = 0.8; // Altura da mão
        }

        return (
          <React.Fragment key={b.id}>
            <BombArea centerCol={b.col} centerRow={b.row} arenaSize={arenaSize} color="#ff0040" />
            <Bomb startPos={startPos} endPos={targetPos} startTime={b.spawnTime} duration={3000} shooterType="npc" />
          </React.Fragment>
        );
      })}

      {/* Sniper Trail */}
      {sniperShootTrigger > 0 && sniperPos3D && (
        <SniperTrail startPos={[playerPos3D[0], 0.5, playerPos3D[2]]} endPos={sniperPos3D} startTime={sniperShootTrigger} />
      )}
    </Canvas>
  );
}
