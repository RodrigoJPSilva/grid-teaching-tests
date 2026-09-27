// ============================================================
//  Arena3D.jsx — Cena 3D com cenário VR Missions + Robôs GLB
// ============================================================

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { parsePlayerCode, gridToPosition3D } from '../utils/GameEngine';
import VRFloor from './VRFloor';
import VoxelEnemy from './VoxelEnemy';
import Player from './Player';
import Bomb, { BombArea } from './Bomb';
import ArenaTV from './ArenaTV';
import { soundManager } from '../utils/SoundManager';

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

// ── Indicador de Área de Impacto da Onda de Choque do Boss (4x4 com Clamping no Grid) ────────
function BossWaveImpactArea({ centerCol, centerRow, arenaSize = 10 }) {
  const CELL_SIZE = 1.2;
  const halfGrid = (arenaSize - 1) / 2;

  // Limites da área 4x4 (1 piso de margem ao redor do Boss 2x2), rigidamente contida na arena
  const minR = Math.max(1, Math.round(centerRow - 1.5));
  const maxR = Math.min(arenaSize, Math.round(centerRow + 1.5));
  const minC = Math.max(1, Math.round(centerCol - 1.5));
  const maxC = Math.min(arenaSize, Math.round(centerCol + 1.5));

  const rowsCount = Math.max(1, maxR - minR + 1);
  const colsCount = Math.max(1, maxC - minC + 1);

  const midRow = (minR + maxR) / 2;
  const midCol = (minC + maxC) / 2;

  const cx = (midCol - 1 - halfGrid) * CELL_SIZE;
  const cz = (midRow - 1 - halfGrid) * CELL_SIZE;
  const width = colsCount * CELL_SIZE;
  const depth = rowsCount * CELL_SIZE;

  return (
    <mesh position={[cx, 0.015, cz]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial
        color="#ffaa00"
        transparent
        opacity={0.22}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── Tremor Suave de Tela (Camera Shake) ───────────────────────────
function CameraRig({ screenShakeTime }) {
  useFrame(({ camera }) => {
    if (!screenShakeTime) return;
    const elapsed = Date.now() - screenShakeTime;
    if (elapsed < 400) {
      const intensity = (1 - elapsed / 400) * 0.25;
      camera.position.x += (Math.random() - 0.5) * intensity;
      camera.position.y += (Math.random() - 0.5) * intensity;
    }
  });
  return null;
}

// ── Controlador Multi-Câmeras: 3D, 2D e Livre + Cinemática do Boss ──
function CameraController({ cameraMode = '3D', arenaSize = 10, introPhase = null, bossPos3D = null }) {
  const { camera } = useThree();
  const controlsRef = useRef();

  // Zoom dinâmico calibrado para enquadramento justo conforme Imagem 4
  const zoom3D = useMemo(() => Math.round((48 * 10) / arenaSize), [arenaSize]);
  const zoom2D = useMemo(() => Math.round((42 * 10) / arenaSize), [arenaSize]);

  // Alvos da Câmera
  const targets = useMemo(() => ({
    '3D': {
      pos: new THREE.Vector3(0, 14, 14),
      lookAt: new THREE.Vector3(0, 0, 0),
      up: new THREE.Vector3(0, 1, 0),
      zoom: zoom3D
    },
    '2D': {
      pos: new THREE.Vector3(-0.8, 25, 0),
      lookAt: new THREE.Vector3(-0.8, 0, 0),
      up: new THREE.Vector3(0, 0, -1), // Garante que -Z é UP e +X é RIGHT (Imagem 3)
      zoom: zoom2D
    },
    'livre': {
      pos: new THREE.Vector3(0, 14, 14),
      lookAt: new THREE.Vector3(0, 0, 0),
      up: new THREE.Vector3(0, 1, 0),
      zoom: zoom3D
    }
  }), [zoom3D, zoom2D]);

  useFrame((state, delta) => {
    if (!camera) return;

    // Prioridade 1: Cinemática do Boss (zoom in / descent / growth)
    if (introPhase === 'zoom_in' || introPhase === 'boss_descent' || introPhase === 'mario_growth') {
      if (bossPos3D) {
        camera.up.set(0, 1, 0);
        const targetX = bossPos3D[0] + 5;
        const targetY = 6;
        const targetZ = bossPos3D[2] + 5;
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, delta * 6);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, delta * 6);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, delta * 6);
        camera.zoom = THREE.MathUtils.lerp(camera.zoom, 65, delta * 6);
        if (controlsRef.current) {
          controlsRef.current.target.lerp(new THREE.Vector3(bossPos3D[0], 0.5, bossPos3D[2]), delta * 6);
          controlsRef.current.update();
        }
        camera.updateProjectionMatrix();
        return;
      }
    }

    // Prioridade 2: Transição de Câmera ou retorno do zoom out do Boss
    if (cameraMode !== 'livre' || introPhase === 'zoom_out') {
      const activePreset = targets[cameraMode] || targets['3D'];
      const speed = delta * 6;

      camera.position.lerp(activePreset.pos, speed);
      camera.up.lerp(activePreset.up, speed);
      camera.zoom = THREE.MathUtils.lerp(camera.zoom, activePreset.zoom, speed);

      if (controlsRef.current) {
        controlsRef.current.target.lerp(activePreset.lookAt, speed);
        controlsRef.current.update();
      }
      camera.updateProjectionMatrix();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={cameraMode === 'livre' && (introPhase === null || introPhase === 'completed')}
      enableDamping
      dampingFactor={0.1}
    />
  );
}

export default function Arena3D({
  cssCode, previewCode, enemies,
  playerHp = 3,
  activeTool,
  playerRevealed, setPlayerRevealed, lastPlayerPos,
  bombCountdown, bombThrowTrigger, sniperShootTrigger,
  arenaSize = 10, onTileClick,
  incomingBombs = [],
  playerSpawnTime = 0,
  difficulty = 'Normal',
  onBossIntroChange = null,
  triggerBossDescent = null,
  completeBossIntro = null,
  cameraMode = '3D',
  tutorialStep = 0,
  currentLevel = 1,
}) {
  const [playerDamageTrigger, setPlayerDamageTrigger] = useState(0);
  const prevPlayerHp = useRef(playerHp);

  // Tick de sincronização para elevação dos pisos durante o sky drop
  const [, setSpawnTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const isPlayerSpawning = playerSpawnTime > 0 && now >= playerSpawnTime && (now - playerSpawnTime < 2500);
      const isEnemySpawning = Object.values(enemies).some(e => e.spawnTime > 0 && now >= e.spawnTime && (now - e.spawnTime < 3500));
      if (isPlayerSpawning || isEnemySpawning) {
        setSpawnTick(t => t + 1);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [playerSpawnTime, enemies]);

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
    soundManager.playMove();
    setTimeout(() => { if (playerRevealed) setPlayerRevealed(false); }, 0);
  }

  const playerPos3D = gridToPosition3D(gameState.player.col, gameState.player.row, arenaSize);
  const bombaPos3D = gameState.bomba ? gridToPosition3D(gameState.bomba.col, gameState.bomba.row, arenaSize) : null;
  const sniperPos3D = gameState.sniper ? gridToPosition3D(gameState.sniper.col, gameState.sniper.row, arenaSize) : null;

  const previewBombaPos3D = previewState?.bomba ? gridToPosition3D(previewState.bomba.col, previewState.bomba.row, arenaSize) : null;
  const previewSniperPos3D = previewState?.sniper ? gridToPosition3D(previewState.sniper.col, previewState.sniper.row, arenaSize) : null;

  const enemiesInRoom = Object.values(enemies).filter(e => e.hp > 0);
  const bossEnemy = enemiesInRoom.find(e => e.type === 'boss');

  // ── Sequência Cinemática de Introdução do Boss ──────────────
  const [bossIntroPhase, setBossIntroPhase] = useState(null);
  // 'waiting_player' | 'zoom_in' | 'boss_descent' | 'mario_growth' | 'zoom_out' | 'hp_fill' | 'completed'
  const [bossScale, setBossScale] = useState(1);
  const [bossFootprint, setBossFootprint] = useState([1, 1]);
  const bossIntroStartedRef = useRef(false);
  const bossPhaseTimerRef = useRef(0);

  // Iniciar sequência do Boss quando ele surge
  useEffect(() => {
    if (!bossEnemy) {
      bossIntroStartedRef.current = false;
      setBossIntroPhase(null);
      setBossScale(1);
      setBossFootprint([1, 1]);
      return;
    }

    if (bossEnemy.isIntroActive && !bossIntroStartedRef.current) {
      bossIntroStartedRef.current = true;
      if (difficulty === 'Matrix') {
        setBossIntroPhase('waiting_player');
        bossPhaseTimerRef.current = Date.now();
      } else {
        setBossIntroPhase('perigo_warning');
        bossPhaseTimerRef.current = Date.now();
        soundManager.startDangerSiren(2600);
        if (onBossIntroChange) {
          onBossIntroChange({ letterbox: true, showHp: false, hpFillPercent: 0, isIntroActive: true });
        }
      }
    }
  }, [bossEnemy, difficulty, onBossIntroChange]);

  // Loop de Transições da Cinemática do Boss
  useEffect(() => {
    if (!bossIntroPhase || bossIntroPhase === 'completed') return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - bossPhaseTimerRef.current;

      if (bossIntroPhase === 'waiting_player') {
        // Aguarda jogador pousar (2s após spawnTime)
        const playerLanded = playerSpawnTime > 0 && now >= playerSpawnTime && (now - playerSpawnTime >= 2000);
        if (playerLanded) {
          setBossIntroPhase('perigo_warning');
          bossPhaseTimerRef.current = now;
          soundManager.startDangerSiren(2600);
          if (onBossIntroChange) {
            onBossIntroChange({ letterbox: true, showHp: false, hpFillPercent: 0, isIntroActive: true });
          }
        }
      } else if (bossIntroPhase === 'perigo_warning') {
        // 2.6s de tela de PERIGO piscando a 0.2s na TV com sirene de alarme
        if (elapsed >= 2600) {
          setBossIntroPhase('zoom_in');
          bossPhaseTimerRef.current = now;
        }
      } else if (bossIntroPhase === 'zoom_in') {
        // 0.5s de zoom e foco
        if (elapsed >= 500) {
          setBossIntroPhase('boss_descent');
          bossPhaseTimerRef.current = now;
          if (bossEnemy && triggerBossDescent) {
            triggerBossDescent(bossEnemy.id, now);
          }
        }
      } else if (bossIntroPhase === 'boss_descent') {
        // 2s de descida do Boss
        if (elapsed >= 2000) {
          setBossIntroPhase('mario_growth');
          bossPhaseTimerRef.current = now;
        }
      } else if (bossIntroPhase === 'mario_growth') {
        // 0.7s de crescimento piscando pequeno/grande estilo Super Mario World
        if (elapsed < 700) {
          const blink = Math.floor(elapsed / 70) % 2 === 0;
          setBossScale(blink ? 2.0 : 1.0);
        } else {
          setBossScale(2.0);
          setBossFootprint([2, 2]);
          setBossIntroPhase('zoom_out');
          bossPhaseTimerRef.current = now;
          if (onBossIntroChange) {
            onBossIntroChange({ letterbox: false, showHp: false, hpFillPercent: 0, isIntroActive: true });
          }
        }
      } else if (bossIntroPhase === 'zoom_out') {
        // 0.5s retirando zoom
        if (elapsed >= 500) {
          setBossIntroPhase('hp_fill');
          bossPhaseTimerRef.current = now;
          if (onBossIntroChange) {
            onBossIntroChange({ letterbox: false, showHp: true, hpFillPercent: 0, isIntroActive: true });
          }
        }
      } else if (bossIntroPhase === 'hp_fill') {
        // Preenchimento de HP animado (800ms)
        const p = Math.min((elapsed / 800) * 100, 100);
        if (onBossIntroChange) {
          onBossIntroChange({ letterbox: false, showHp: true, hpFillPercent: p, isIntroActive: true });
        }
        if (elapsed >= 800) {
          setBossIntroPhase('completed');
          if (onBossIntroChange) {
            onBossIntroChange({ letterbox: false, showHp: true, hpFillPercent: undefined, isIntroActive: false });
          }
          if (bossEnemy && completeBossIntro) {
            completeBossIntro(bossEnemy.id);
          }
        }
      }
    }, 40);

    return () => clearInterval(interval);
  }, [bossIntroPhase, playerSpawnTime, bossEnemy, triggerBossDescent, completeBossIntro, onBossIntroChange]);

  const bossPos3D = useMemo(() => {
    if (!bossEnemy) return null;
    const centerCol = bossEnemy.position[1] + (bossFootprint[0] - 1) / 2;
    const centerRow = bossEnemy.position[0] + (bossFootprint[1] - 1) / 2;
    return gridToPosition3D(centerCol, centerRow, arenaSize);
  }, [bossEnemy, bossFootprint, arenaSize]);

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
      soundManager.playSniperShot();
    }
  }, [sniperShootTrigger, gameState.sniper]);

  const wasCounting = useRef(false);
  useEffect(() => {
    if (bombCountdown > 0) {
      wasCounting.current = true;
      soundManager.playBombBeep();
    }
    if (wasCounting.current && bombCountdown === 0) {
      wasCounting.current = false;
      if (gameState.bomba) {
        setWaveHits(prev => [...prev, { col: gameState.bomba.col, row: gameState.bomba.row, time: Date.now() }]);
        soundManager.playExplosion();
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
          soundManager.playExplosion();
        }
      });
    }, 100);
    return () => clearInterval(interval);
  }, [incomingBombs]);

  // Efeito de Impacto e Tremor de Tela no Pouso do Boss
  const [screenShake, setScreenShake] = useState(0);
  const bossLandedRef = useRef(new Set());

  useEffect(() => {
    enemiesInRoom.forEach(e => {
      if (e.type === 'boss' && e.landingState && !bossLandedRef.current.has(e.landingState.startTime)) {
        bossLandedRef.current.add(e.landingState.startTime);
        const [row, col] = e.position;
        const now = Date.now();
        setWaveHits(prev => [
          ...prev,
          { col: col, row: row, time: now },
          { col: col + 1, row: row, time: now },
          { col: col, row: row + 1, time: now },
          { col: col + 1, row: row + 1, time: now }
        ]);
        setHitEffects(prev => [
          ...prev,
          { col: col, row: row, time: now },
          { col: col + 1, row: row, time: now },
          { col: col, row: row + 1, time: now },
          { col: col + 1, row: row + 1, time: now }
        ]);
        setScreenShake(now);
        soundManager.playBossLand();
      }
    });
  }, [enemiesInRoom]);

  // ── Throw start position ──
  const throwerPosRef = useRef(playerPos3D);
  useEffect(() => {
    if (bombThrowTrigger > 0) {
      throwerPosRef.current = [...playerPos3D];
      soundManager.playBombLaunch();
    }
  }, [bombThrowTrigger, playerPos3D]);

  const activeSniperTarget = previewState?.sniper?.col
    ? previewState.sniper
    : (sniperShootTrigger > 0 ? gameState.sniper : null);

  const activeBombTarget = (activeTool === 'bomba' && previewState?.bomba?.col)
    ? previewState.bomba
    : (bombCountdown > 0 ? gameState.bomba : null);

  const now = Date.now();
  const isPlayerDescending = playerSpawnTime > 0 && now >= playerSpawnTime && (now - playerSpawnTime < 1500);

  const occupiedTiles = [
    { col: gameState.player.col, row: gameState.player.row, type: isPlayerDescending ? 'descending' : 'player' }
  ];

  enemiesInRoom.forEach(e => {
    const isBoss = e.type === 'boss';
    const isEnemyDescending = e.spawnTime > 0 && now >= e.spawnTime && (now - e.spawnTime < 2500);
    const currentFootprint = isBoss ? bossFootprint : e.size;

    for (let c = 0; c < currentFootprint[0]; c++) {
      for (let r = 0; r < currentFootprint[1]; r++) {
        const tileCol = e.position[1] + c;
        const tileRow = e.position[0] + r;

        const isSniperHit = activeSniperTarget &&
          activeSniperTarget.col === tileCol &&
          activeSniperTarget.row === tileRow;

        const isBombHit = activeBombTarget &&
          Math.abs(tileCol - activeBombTarget.col) <= 1 &&
          Math.abs(tileRow - activeBombTarget.row) <= 1;

        let tileType = (isSniperHit || isBombHit) ? 'npc-targeted' : 'npc';
        if (isEnemyDescending || (isBoss && (bossIntroPhase === 'waiting_player' || bossIntroPhase === 'zoom_in' || bossIntroPhase === 'boss_descent' || e.spawnTime === 0))) {
          tileType = 'descending';
        }

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

  const handlePlayerLanded = () => {};
  const defaultZoom3D = Math.round((48 * 10) / arenaSize);

  return (
    <Canvas
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false, stencil: false, depth: true }}
      dpr={[1, 2]}
      onCreated={({ gl }) => gl.setClearColor('#03060a')}
    >
      <OrthographicCamera makeDefault position={[0, 14, 14]} zoom={defaultZoom3D} />
      <CameraController cameraMode={cameraMode} arenaSize={arenaSize} introPhase={bossIntroPhase} bossPos3D={bossPos3D} />
      <CameraRig screenShakeTime={screenShake} />

      <LightBootSequence />

      <VRFloor occupiedTiles={occupiedTiles} hitTiles={hitTiles} previewTiles={previewTiles} waveHits={waveHits} gridSize={arenaSize} onTileClick={onTileClick} />

      {/* Televisão 3D na Arena (Tutorial, HUD e Alerta de Perigo) */}
      <ArenaTV
        cameraMode={cameraMode}
        gridSize={arenaSize}
        tutorialStep={tutorialStep}
        isWarningActive={bossIntroPhase === 'perigo_warning'}
        playerHp={playerHp}
        enemiesCount={enemiesInRoom.length}
        currentLevel={currentLevel}
        difficulty={difficulty}
      />

      <group>
        <Player
          position={playerPos3D}
          isRevealed={playerRevealed}
          activeTool={activeTool}
          throwTrigger={bombThrowTrigger}
          shootTrigger={sniperShootTrigger}
          lookAtTarget={playerLookAt}
          damageTrigger={playerDamageTrigger}
          spawnTime={playerSpawnTime}
          onLanded={handlePlayerLanded}
          isAwaitingSpawn={playerSpawnTime === 0 || now < playerSpawnTime}
        />
      </group>

      <group>
        {enemiesInRoom.map(enemy => (
          <VoxelEnemy
            key={enemy.id}
            enemy={enemy}
            arenaSize={arenaSize}
            onLanded={() => handleEnemyLanded(enemy)}
            isAwaitingSpawn={enemy.type === 'boss' ? (bossIntroPhase === 'waiting_player' || bossIntroPhase === 'zoom_in' || (!bossIntroPhase && (enemy.spawnTime === 0 || now < enemy.spawnTime))) : (enemy.spawnTime === 0 || now < enemy.spawnTime)}
            scaleOverride={enemy.type === 'boss' ? bossScale : null}
          />
        ))}
      </group>

      {/* Alvo e Área de Onda de Choque do Pulo do Boss (5 segundos visível) */}
      {enemiesInRoom.map(enemy => {
        if (enemy.type === 'boss' && enemy.jumpState) {
          const [tRow, tCol] = enemy.jumpState.targetPos;
          const centerCol = tCol + (enemy.size[0] - 1) / 2;
          const centerRow = tRow + (enemy.size[1] - 1) / 2;
          return (
            <React.Fragment key={`boss-jump-target-${enemy.id}`}>
              <BombArea centerCol={centerCol} centerRow={centerRow} arenaSize={arenaSize} color="#ff0040" />
              <BossWaveImpactArea centerCol={centerCol} centerRow={centerRow} arenaSize={arenaSize} />
            </React.Fragment>
          );
        }
        return null;
      })}

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
      {bombCountdown > 0 && bombThrowTrigger > 0 && bombaPos3D && throwerPosRef.current && (
        <Bomb
          startPos={[throwerPosRef.current[0] + 0.28, 0.8, throwerPosRef.current[2]]}
          endPos={bombaPos3D}
          startTime={bombThrowTrigger + 200}
          duration={4800}
          shooterType="player"
        />
      )}

      {/* Bombas Inimigas */}
      {incomingBombs.map(b => {
        const targetPos = gridToPosition3D(b.col, b.row, arenaSize);
        let startPos = [targetPos[0], 10, targetPos[2]];
        if (b.shooterType === 'normal' && b.shooterPos) {
          startPos = gridToPosition3D(b.shooterPos[0], b.shooterPos[1], arenaSize);
          const handOffset = b.hand === 'left' ? -0.28 : 0.28;
          startPos[0] += handOffset;
          startPos[1] = 0.8;
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
