import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrthographicCamera, OrbitControls } from '@react-three/drei';
import { gridToPosition3D } from '../utils/GameEngine';
import VRFloor from './VRFloor';
import Player from './Player';
import VoxelEnemy from './VoxelEnemy';
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
    meshRef.current.material.opacity = Math.max(0, 1 - elapsed / 300);
  });

  if (Date.now() - startTime > 300) return null;

  return (
    <mesh
      position={vStart.clone().lerp(vEnd, 0.5)}
      quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), vEnd.clone().sub(vStart).normalize())}
    >
      <boxGeometry args={[0.05, 0.05, length]} />
      <meshBasicMaterial color="#00ffcc" transparent />
    </mesh>
  );
}

// Demo Scripting Engine
export default function DemoArena({ type, onClose, onSwitch }) {
  const [opacity] = useState(1);
  const [phase] = useState('run');
  
  // Game states for demo
  const [playerColRow, setPlayerColRow] = useState([2, 2]);
  const [enemyHp, setEnemyHp] = useState(3);
  const [bombTrigger, setBombTrigger] = useState(0);
  const [bombActive, setBombActive] = useState(false);
  const [bombCountdown, setBombCountdown] = useState(0);
  const [sniperTrigger, setSniperTrigger] = useState(0);
  const [waveHits, setWaveHits] = useState([]);
  const [hitTiles, setHitTiles] = useState([]);

  // Main Script Loop (Continuous smooth cycle)
  useEffect(() => {
    if (phase !== 'run') return;

    let active = true;

    if (type === 'teleport') {
      const interval = setInterval(() => {
        if (!active) return;
        const newCol = Math.floor(Math.random() * 5) + 1;
        const newRow = Math.floor(Math.random() * 5) + 1;
        // Evita cair em cima do inimigo em (5, 5)
        if (newCol === 5 && newRow === 5) {
          setPlayerColRow([3, 3]);
        } else {
          setPlayerColRow([newCol, newRow]);
        }
      }, 2500);

      return () => {
        active = false;
        clearInterval(interval);
      };
    } 
    else if (type === 'bomb') {
      const runSequence = () => {
        if (!active) return;
        setPlayerColRow([2, 2]);
        setBombCountdown(5);
        setBombActive(false);
        setWaveHits([]);
        setEnemyHp(3);

        setTimeout(() => {
          if (!active) return;
          const now = Date.now();
          setBombTrigger(now);
          setBombActive(true);

          let count = 5;
          const countInterval = setInterval(() => {
            count--;
            setBombCountdown(count);
            if (count <= 0) clearInterval(countInterval);
          }, 1000);

          setTimeout(() => {
            if (!active) return;
            // Impacto da bomba aos 5 segundos
            setBombActive(false);
            setBombCountdown(0);
            setWaveHits([{ col: 5, row: 5, time: Date.now() }]);
            setEnemyHp(0);

            setTimeout(() => {
              if (!active) return;
              runSequence();
            }, 3000);
          }, 5000);

        }, 1500);
      };

      runSequence();
      return () => { active = false; };
    }
    else if (type === 'sniper') {
      const runSequence = () => {
        if (!active) return;
        setPlayerColRow([2, 2]);
        setEnemyHp(3);
        setHitTiles([]);

        setTimeout(() => {
          if (!active) return;
          const now = Date.now();
          setSniperTrigger(now);
          setHitTiles([{ col: 5, row: 5, time: now }]);

          setTimeout(() => {
            if (!active) return;
            setEnemyHp(0);

            setTimeout(() => {
              if (!active) return;
              runSequence();
            }, 3000);
          }, 100);

        }, 1500);
      };

      runSequence();
      return () => { active = false; };
    }
  }, [phase, type]);

  let description = "";
  let dynamicCode = "";
  if (type === 'teleport') {
    description = "Mova o jogador pelo grid. O teleporte usa a propriedade de grid para mover instantaneamente e esquivar de ataques.";
    dynamicCode = `.player {\n  grid-column: ${playerColRow[0]};\n  grid-row: ${playerColRow[1]};\n}`;
  } else if (type === 'bomb') {
    description = "Joga uma bomba explosiva no alvo. Atinge uma área 3x3 em volta do ponto de impacto e tira 1 vida.";
    dynamicCode = `.bomba {\n  grid-column: 5;\n  grid-row: 5;\n}`;
  } else if (type === 'sniper') {
    description = "Dispara instantaneamente em linha reta! Causa muito dano (3 vidas) mas acerta apenas 1 quadrado.";
    dynamicCode = `.sniper {\n  grid-column: 5;\n  grid-row: 5;\n}`;
  }

  const playerPos3D = gridToPosition3D(playerColRow[0], playerColRow[1], 6);
  const enemyPos3D = gridToPosition3D(5, 5, 6);

  // O inimigo em (5, 5) muda de cor para #2CFF05 quando na mira (sniper ou bomba)
  const isEnemyTargeted = type === 'bomb' || type === 'sniper';

  const occupiedTiles = [
    { col: playerColRow[0], row: playerColRow[1], type: 'player' },
    { col: 5, row: 5, type: isEnemyTargeted ? 'npc-targeted' : 'npc' }
  ];

  return (
    <div className="demo-overlay" style={{
      position: 'absolute', top:0, left:0, right:0, bottom:0,
      backgroundColor: `rgba(0,0,0,${1 - opacity})`,
      transition: 'background-color 0.1s',
      zIndex: 1000, display: 'flex'
    }}>
      <div style={{ padding: '20px', background: '#111', width: '320px', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '20px' }}>Demonstração</h2>
        
        <div style={{ color: '#00ffcc', fontWeight: 'bold' }}>Habilidade Ativa:</div>
        <div style={{ color: '#fff', fontSize: '1.5rem', marginTop: '5px', textTransform: 'uppercase' }}>{type}</div>
        
        <p style={{ color: '#aaa', fontSize: '0.9rem', marginTop: '15px', lineHeight: '1.4' }}>
          {description}
        </p>

        <div style={{ marginTop: '20px', background: '#000', padding: '15px', borderRadius: '4px', border: '1px solid #333' }}>
          <pre style={{ color: '#00ddaa', margin: 0, fontSize: '0.9rem', fontFamily: 'monospace' }}>
            {dynamicCode}
          </pre>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ borderTop: '1px solid #333', paddingTop: '20px' }}>
          <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '10px' }}>Outras Demonstrações:</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {type !== 'teleport' && <button className="action-btn" onClick={() => onSwitch('teleport')}>Teletransporte</button>}
            {type !== 'bomb' && <button className="action-btn" onClick={() => onSwitch('bomb')}>Bomba</button>}
            {type !== 'sniper' && <button className="action-btn" onClick={() => onSwitch('sniper')}>Sniper</button>}
          </div>
        </div>
        
        <button className="action-btn" onClick={onClose} style={{ marginTop: '20px', background: '#BC0001', color: 'white' }}>VOLTAR AO MENU</button>
      </div>
      
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas gl={{ antialias: false, depth: true }} onCreated={({ gl }) => gl.setClearColor('#000000')}>
          <OrthographicCamera makeDefault position={[10, 10, 10]} zoom={50} />
          <OrbitControls />
          <LightBootSequence />
          
          <VRFloor
            occupiedTiles={occupiedTiles}
            hitTiles={hitTiles}
            waveHits={waveHits}
            gridSize={6}
          />
          
          <Player 
             position={playerPos3D}
             activeTool={type === 'bomb' ? 'bomba' : type === 'sniper' ? 'sniper' : null}
             throwTrigger={bombTrigger}
             shootTrigger={sniperTrigger}
             lookAtTarget={isEnemyTargeted ? enemyPos3D : null}
          />
          
          <VoxelEnemy 
             enemy={{ position: [5, 5], hp: enemyHp, revealed: true, size: [1, 1], type: 'npc' }} 
             arenaSize={6}
          />
          
          {/* BombArea da demonstração com clamping na arena 6x6 e cor #00ff88 */}
          {type === 'bomb' && (bombCountdown > 0 || bombActive) && (
            <BombArea
              centerCol={5}
              centerRow={5}
              arenaSize={6}
              color="#00ff88"
            />
          )}

          {/* Bomba voadora da demonstração com ribbon trail e desaparecendo no impacto */}
          {type === 'bomb' && bombActive && bombTrigger > 0 && (
             <Bomb 
               startPos={playerPos3D} 
               endPos={enemyPos3D} 
               startTime={bombTrigger} 
               duration={5000}
               shooterType="player"
             />
          )}

          {/* Sniper Trail da demonstração */}
          {type === 'sniper' && sniperTrigger > 0 && (
            <SniperTrail
              startPos={[playerPos3D[0], 0.5, playerPos3D[2]]}
              endPos={enemyPos3D}
              startTime={sniperTrigger}
            />
          )}
        </Canvas>
      </div>
    </div>
  );
}
