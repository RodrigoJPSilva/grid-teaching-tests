import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrthographicCamera, OrbitControls } from '@react-three/drei';
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

// Demo Scripting Engine
export default function DemoArena({ type, onClose, onSwitch }) {
  const [opacity, setOpacity] = useState(0); // For fade-in/out
  const [phase, setPhase] = useState('fade-in');
  
  // Game states for demo
  const [playerPos, setPlayerPos] = useState([1, 0, 1]);
  const [enemyHp, setEnemyHp] = useState(100);
  const [bombTrigger, setBombTrigger] = useState(0);
  const [bombTarget, setBombTarget] = useState(null);
  const [bombCountdown, setBombCountdown] = useState(0);
  const [sniperTrigger, setSniperTrigger] = useState(0);
  
  const timerRef = useRef(null);

  // Fade In
  useEffect(() => {
    let fadeTimer = setInterval(() => {
      setOpacity(p => {
        if (p >= 1) {
          clearInterval(fadeTimer);
          setPhase('run');
          return 1;
        }
        return p + 0.1;
      });
    }, 100);
    return () => clearInterval(fadeTimer);
  }, [type]);

  // Main Script Loop
  useEffect(() => {
    if (phase !== 'run') return;

    let step = 0;
    
    if (type === 'teleport') {
      timerRef.current = setInterval(() => {
        setPlayerPos([
          Math.floor(Math.random() * 6) + 1,
          0,
          Math.floor(Math.random() * 6) + 1
        ]);
      }, 3000);
    } 
    else if (type === 'bomb') {
      // Hold 2s -> Throw -> Travel 5s -> Reset 3s
      const runSequence = () => {
        setPlayerPos([2, 0, 2]); // Reset
        setBombTarget(null);
        
        setTimeout(() => {
          setBombTrigger(Date.now());
          setBombCountdown(5); // Simulated
          setBombTarget([5, 0, 5]); // Enemy pos
          
          setTimeout(() => {
             // Hit!
             setEnemyHp(0);
             setTimeout(() => {
               // Fade out to reset
               setPhase('fade-out');
             }, 3000);
          }, 5000); // 5s travel
          
        }, 2000); // Hold 2s
      };
      runSequence();
    }
    else if (type === 'sniper') {
       // Hold 2s -> Shoot -> Reset 3s
       const runSequence = () => {
         setPlayerPos([2, 0, 2]); // Reset
         
         setTimeout(() => {
           setSniperTrigger(Date.now());
           setTimeout(() => {
             setEnemyHp(0);
             setTimeout(() => {
               setPhase('fade-out');
             }, 3000);
           }, 100); // Instahit
         }, 2000);
       };
       runSequence();
    }

    return () => clearInterval(timerRef.current);
  }, [phase, type]);

  // Fade Out & Reset
  useEffect(() => {
    if (phase === 'fade-out') {
      let fadeTimer = setInterval(() => {
        setOpacity(p => {
          if (p <= 0) {
            clearInterval(fadeTimer);
            // Reset everything and go to fade-in
            setEnemyHp(100);
            setPlayerPos([1, 0, 1]);
            setPhase('fade-in');
            return 0;
          }
          return p - 0.1;
        });
      }, 100);
      return () => clearInterval(fadeTimer);
    }
  }, [phase]);

  let description = "";
  let dynamicCode = "";
  if (type === 'teleport') {
    description = "Mova o jogador pelo grid. O teleporte usa a propriedade de grid para mover instantaneamente e esquivar de ataques.";
    dynamicCode = `.player {\n  grid-column: ${playerPos[0]};\n  grid-row: ${playerPos[2]};\n}`;
  } else if (type === 'bomb') {
    description = "Joga uma bomba explosiva no alvo. Atinge uma área 3x3 em volta do ponto de impacto e tira 1 vida.";
    dynamicCode = `.bomba {\n  grid-column: 5;\n  grid-row: 5;\n}`;
  } else if (type === 'sniper') {
    description = "Dispara instantaneamente em linha reta! Causa muito dano (3 vidas) mas acerta apenas 1 quadrado.";
    dynamicCode = `.sniper {\n  grid-column: 5;\n  grid-row: 5;\n}`;
  }

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
          
          <VRFloor occupiedTiles={[{col: playerPos[0], row: playerPos[2], type: 'player'}, {col: 5, row: 5, type: 'npc'}]} hitTiles={[]} gridSize={6} />
          
          <Player 
             position={[(playerPos[0]-1-2.5)*1.2, 0.21, (playerPos[2]-1-2.5)*1.2]} 
             activeTool={type === 'bomb' ? 'bomba' : type === 'sniper' ? 'sniper' : null}
             throwTrigger={bombTrigger}
             shootTrigger={sniperTrigger}
          />
          
          <VoxelEnemy 
             enemy={{ position: [5, 5], hp: enemyHp, revealed: true, size: [1, 1], type: 'npc' }} 
             arenaSize={6}
          />
          
          {bombTarget && bombTrigger > 0 && (
             <Bomb 
               startPos={[(playerPos[0]-1-2.5)*1.2, 0.21, (playerPos[2]-1-2.5)*1.2]} 
               endPos={[(bombTarget[0]-1-2.5)*1.2, 0.21, (bombTarget[2]-1-2.5)*1.2]} 
               startTime={bombTrigger} 
               duration={5000} 
             />
          )}
        </Canvas>
      </div>
    </div>
  );
}
