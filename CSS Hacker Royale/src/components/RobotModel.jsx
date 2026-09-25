// ============================================================
//  RobotModel.jsx — Modelo Animado para Player e NPCs
//  Suporta membros separados, animação Idle, Teleporte e Armas
// ============================================================

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Outlines } from '@react-three/drei';
import * as THREE from 'three';

const BASE_SCALE = 0.055; 
const TELEPORT_SPEED = 4;

function RecursiveModel({ node, modelType, partsMap }) {
  const setRef = (el) => {
    if (el && node.userData.part) {
      partsMap[node.userData.part] = el;
      el.userData = node.userData;
    }
  };

  if (node.isMesh) {
    return (
      <mesh ref={setRef} geometry={node.geometry} material={node.material} position={node.position} rotation={node.rotation} scale={node.scale} castShadow>
        <Outlines thickness={2} color={modelType === 'player' ? '#185A74' : '#BC0001'} />
        {node.children.map(child => <RecursiveModel key={child.uuid} node={child} modelType={modelType} partsMap={partsMap} />)}
      </mesh>
    );
  }
  return (
    <group ref={setRef} position={node.position} rotation={node.rotation} scale={node.scale}>
      {node.children.map(child => <RecursiveModel key={child.uuid} node={child} modelType={modelType} partsMap={partsMap} />)}
    </group>
  );
}

export default function RobotModel({
  position = [0, 0, 0],
  isRevealed = true,
  activeTool = null,
  isTerminalOpen = false,
  meshRef,
  modelType = 'player', // 'player' | 'npc'
  throwTrigger = 0,
  shootTrigger = 0,
  scaleMultiplier = 1,
  isChargingBomb = false,
}) {
  const groupRef = useRef();
  const internalModelRef = useRef();

  const modelPath = modelType === 'player' ? '/models/RoboAzulModel.glb' : '/models/RoboNPCModel.glb';
  const { scene } = useGLTF(modelPath);

  // ── Preparação do Modelo e Mapeamento de Membros ───────────
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.transparent = true;
        child.castShadow = true;
        
        // Identificar as partes baseadas no nome gerado
        if (child.name === 'Object_2006' || child.name === 'CabeçaRoboBranco') child.userData.part = 'head';
        if (child.name === 'Object_2007' || child.name === 'TroncoRoboBranco') child.userData.part = 'torso';
        if (child.name === 'Object_2003' || child.name === 'MaoDireitaRoboBranco') child.userData.part = 'rightHand';
        if (child.name === 'Object_2004' || child.name === 'MaoEsquerdaRoboBranco') child.userData.part = 'leftHand';
      }
    });
    return clone;
  }, [scene]);

  const parts = useMemo(() => {
    const p = {};
    clonedScene.traverse(c => {
      if (c.userData.part) p[c.userData.part] = c;
    });
    Object.values(p).forEach(node => {
      node.userData.origPos = node.position.clone();
      node.userData.origRot = node.rotation.clone();
    });
    return p;
  }, [clonedScene]);

  useEffect(() => {
    if (meshRef) meshRef.current = internalModelRef.current;
  }, [meshRef, clonedScene]);

  // ── Animação de Teletransporte de Movimento ────────────────
  const [targetPos, setTargetPos] = useState(() => new THREE.Vector3(...position));
  const [animState, setAnimState] = useState('idle');
  const animTime = useRef(0);
  const prevPos = useRef(position.join(','));

  useEffect(() => {
    const key = position.join(',');
    if (key !== prevPos.current && groupRef.current) {
      prevPos.current = key;
      setTargetPos(new THREE.Vector3(...position));
      setAnimState('out');
      animTime.current = 0;
    }
  }, [position[0], position[1], position[2]]);

  // ── Triggers de Ação (Throw & Shoot) ───────────────────────
  const actionTime = useRef(0);
  const [currentAction, setCurrentAction] = useState(null);

  useEffect(() => {
    if (throwTrigger > 0) {
      setCurrentAction('throw');
      actionTime.current = 0;
    }
  }, [throwTrigger]);

  useEffect(() => {
    if (shootTrigger > 0) {
      setCurrentAction('shoot');
      actionTime.current = 0;
    }
  }, [shootTrigger]);

  // ── Arma: Efeito de Teleporte (Scale) ───────────────────────
  const weaponScaleRef = useRef(new THREE.Vector3(0, 0, 0));
  const prevTool = useRef(activeTool);
  const bossChargeLevel = useRef(0);
  
  useEffect(() => {
    if (activeTool !== prevTool.current) {
      // Começa do zero sempre que a arma muda para fazer o pop-in
      weaponScaleRef.current.set(0.1, 3, 0.1); 
      prevTool.current = activeTool;
    }
  }, [activeTool]);

  // ── Main Loop (useFrame) ───────────────────────────────────
  useFrame((state, delta) => {
    if (!groupRef.current || !internalModelRef.current) return;
    const t = state.clock.elapsedTime;

    // 1. Teleporte do Robô
    if (animState === 'out') {
      animTime.current += delta * TELEPORT_SPEED;
      const pt = Math.min(animTime.current, 1);
      const sm = BASE_SCALE * scaleMultiplier;
      internalModelRef.current.scale.set(sm * (1 - pt * 0.7), sm * (1 + pt * 2), sm * (1 - pt * 0.7));
      const newOpacity = (1 - pt) * (isRevealed ? 1 : 0.25);
      Object.values(parts).forEach(m => { if (m?.material) m.material.opacity = newOpacity; });
      if (pt >= 1) {
        groupRef.current.position.copy(targetPos);
        setAnimState('in');
        animTime.current = 0;
      }
    } else if (animState === 'in') {
      animTime.current += delta * TELEPORT_SPEED;
      const pt = Math.min(animTime.current, 1);
      const sm = BASE_SCALE * scaleMultiplier;
      internalModelRef.current.scale.set(sm * (0.3 + pt * 0.7), sm * (3 - pt * 2), sm * (0.3 + pt * 0.7));
      const newOpacity = pt * (isRevealed ? 1 : 0.25);
      Object.values(parts).forEach(m => { if (m?.material) m.material.opacity = newOpacity; });
      if (pt >= 1) {
        internalModelRef.current.scale.set(sm, sm, sm);
        setAnimState('idle');
      }
    } else {
      // Mantém a opacidade de stealth
      const targetOpacity = isRevealed ? 1 : 0.25;
      Object.values(parts).forEach((mesh) => {
        if (mesh && mesh.material) {
          mesh.material.opacity = THREE.MathUtils.lerp(mesh.material.opacity, targetOpacity, 0.08);
        }
      });
    }

    // 2. Animação Idle (Breathing) - Local Z is Up
    if (parts.head) parts.head.position.z = parts.head.userData.origPos.z + Math.sin(t * 2) * 0.1;
    if (parts.torso) parts.torso.position.z = parts.torso.userData.origPos.z + Math.sin(t * 2 + 0.2) * 0.05;
    if (parts.leftHand) parts.leftHand.position.z = parts.leftHand.userData.origPos.z + Math.sin(t * 2 + 0.4) * 0.15;

    // 3. Ações (Mãos)
    let rightHandZOffset = Math.sin(t * 2 + 0.4) * 0.15; // Idle base (Up)
    let rightHandYOffset = 0; // Forward/Backward
    let rightHandRotX = parts.rightHand?.userData.origRot.x || 0;
    
    let leftHandZOffset = Math.sin(t * 2 + 0.4) * 0.15;
    let leftHandYOffset = 0;
    
    // Animação de Carregamento (Chefe) com transição suave
    bossChargeLevel.current = THREE.MathUtils.lerp(
      bossChargeLevel.current, 
      isChargingBomb ? 1 : 0, 
      delta * 2
    );
    
    const charge = bossChargeLevel.current;
    if (charge > 0.01) {
      const tremble = Math.sin(t * 50) * 0.05 * charge;
      rightHandZOffset += (1.5 * charge) + tremble;
      rightHandYOffset += 0.5 * charge;
      
      leftHandZOffset += (1.5 * charge) - tremble;
      leftHandYOffset += 0.5 * charge;
    }

    if (currentAction === 'throw') {
      actionTime.current += delta * 2;
      const at = actionTime.current;
      if (at < 1) {
        rightHandZOffset += Math.sin(at * Math.PI) * 2; // Up
        rightHandYOffset += -Math.sin(at * Math.PI) * 2; // Pull Back (Negative local Y)
      } else {
        setCurrentAction(null);
      }
    } else if (currentAction === 'shoot') {
      actionTime.current += delta * 5;
      const at = actionTime.current;
      if (at < 1) {
        rightHandYOffset += -Math.sin(at * Math.PI) * 1.5; // Recoil (Pull Back)
        rightHandRotX += Math.sin(at * Math.PI) * 0.5; // Lift barrel
      } else {
        setCurrentAction(null);
      }
    } else if (activeTool) {
      // Holding weapon idle
      rightHandZOffset += 1.0; // Up
      rightHandYOffset += 0.5; // Forward
    }

    if (parts.rightHand) {
      parts.rightHand.position.z = parts.rightHand.userData.origPos.z + rightHandZOffset;
      parts.rightHand.position.y = parts.rightHand.userData.origPos.y + rightHandYOffset; 
      
      if (modelType === 'player') {
        parts.rightHand.position.x = parts.rightHand.userData.origPos.x * 0.5;
        parts.rightHand.rotation.x = rightHandRotX;
      } else {
        parts.rightHand.position.x = parts.rightHand.userData.origPos.x;
        parts.rightHand.rotation.x = rightHandRotX;
      }
    }
    if (parts.leftHand) {
      parts.leftHand.position.z = parts.leftHand.userData.origPos.z + leftHandZOffset;
      parts.leftHand.position.y = parts.leftHand.userData.origPos.y + leftHandYOffset;
      
      if (modelType === 'player') {
        parts.leftHand.position.x = parts.leftHand.userData.origPos.x * 0.5;
      } else {
        parts.leftHand.position.x = parts.leftHand.userData.origPos.x;
      }
    }

    // 4. Animação de Teleporte da Arma (Scale Pop-in)
    weaponScaleRef.current.x = THREE.MathUtils.lerp(weaponScaleRef.current.x, 1, 0.2);
    weaponScaleRef.current.y = THREE.MathUtils.lerp(weaponScaleRef.current.y, 1, 0.2);
    weaponScaleRef.current.z = THREE.MathUtils.lerp(weaponScaleRef.current.z, 1, 0.2);
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Luz da Aura */}
      <pointLight color={modelType === 'player' ? '#00ffcc' : '#ff2244'} intensity={isRevealed ? 1.5 : 0.5} distance={5} />

      {/* Modelo Animado */}
      <group ref={internalModelRef} scale={[BASE_SCALE * scaleMultiplier, BASE_SCALE * scaleMultiplier, BASE_SCALE * scaleMultiplier]} rotation={modelType === 'player' ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}>
        {modelType === 'player' ? (
          Object.values(parts).map((node, i) => (
            <mesh
              key={i}
              ref={(el) => {
                if (el && node.userData.part) {
                  el.userData = node.userData;
                  parts[node.userData.part] = el;
                }
              }}
              geometry={node.geometry}
              material={node.material}
              position={node.userData.origPos}
              rotation={node.userData.origRot}
              castShadow
            >
              <Outlines thickness={2} color="#185A74" />
            </mesh>
          ))
        ) : (
          clonedScene.children.map(child => (
            <RecursiveModel key={child.uuid} node={child} modelType={modelType} partsMap={parts} />
          ))
        )}
      </group>

      {/* Acessórios atrelados ao grupo geral, precisamos escalar manualmente */}
      {/* Óculos Matrix */}
      {isTerminalOpen && (
        <mesh position={[0, 0.38, 0.12]}>
          <boxGeometry args={[0.25, 0.06, 0.02]} />
          <meshBasicMaterial color="black" />
        </mesh>
      )}

      {/* Armas (Seguem a mão direita aproximadamente na cena geral) */}
      {activeTool === 'bomba' && (
        <mesh position={[0.25, 0.3, 0.1]} scale={weaponScaleRef.current}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color="#ff0040" emissive="#ff0040" emissiveIntensity={1.5} />
        </mesh>
      )}

      {activeTool === 'sniper' && (
        <group position={[0.28, 0.3, 0.15]} scale={weaponScaleRef.current}>
          <mesh position={[0, 0, 0.15]}>
            <boxGeometry args={[0.04, 0.04, 0.35]} />
            <meshStandardMaterial color="#333" metalness={0.8} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.06, 0.09, 0.14]} />
            <meshStandardMaterial color="#111" metalness={0.6} />
          </mesh>
        </group>
      )}

      {activeTool === 'papel' && (
        <mesh position={[0.2, 0.3, 0.2]} rotation={[0, -Math.PI / 4, 0]} scale={weaponScaleRef.current}>
          <planeGeometry args={[0.2, 0.3]} />
          <meshBasicMaterial color="#f4f0e6" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}


useGLTF.preload('/models/RoboAzulModel.glb');
useGLTF.preload('/models/RoboNPCModel.glb');
