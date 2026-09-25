// ============================================================
//  RobotModel.jsx — Modelo Animado para Player e NPCs
//  Suporta membros separados, animação Idle, Teleporte e Armas
// ============================================================

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
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
  lookAtTarget = null,
  damageTrigger = 0,
}) {
  const groupRef = useRef();
  const internalModelRef = useRef();

  const modelPath = modelType === 'player' ? '/models/RoboAzulModel.glb' : '/models/RoboNPCModel.glb';
  const { scene } = useGLTF(modelPath);

  const weaponContainerRef = useRef();
  const tempPos = useMemo(() => new THREE.Vector3(), []);
  const tempQuat = useMemo(() => new THREE.Quaternion(), []);
  const parentQuat = useMemo(() => new THREE.Quaternion(), []);

  // ── Preparação do Modelo e Mapeamento de Membros ───────────
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.transparent = true;
        child.castShadow = true;
        if (child.material.color) {
          child.userData.origColor = child.material.color.clone();
        }
        if (child.material.emissive) {
          child.userData.origEmissive = child.material.emissive.clone();
          child.userData.origEmissiveIntensity = child.material.emissiveIntensity || 0;
        }

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

  // ── Temporizador de Olhar Aleatório Autônomo (4 a 20s) ──────
  const nextLookDelay = useRef(Math.random() * 16 + 4);
  const lookTimer = useRef(0);
  const isLooking = useRef(false);
  const lookDirection = useRef(1); // 1 = direita, -1 = esquerda
  const lookDuration = useRef(1.8);

  const resetLookTimer = useCallback(() => {
    lookTimer.current = 0;
    isLooking.current = false;
    nextLookDelay.current = Math.random() * 16 + 4;
  }, []);

  useEffect(() => {
    const key = position.join(',');
    if (key !== prevPos.current && groupRef.current) {
      prevPos.current = key;
      setTargetPos(new THREE.Vector3(...position));
      setAnimState('out');
      animTime.current = 0;
      resetLookTimer();
    }
  }, [position[0], position[1], position[2], resetLookTimer]);

  // ── Triggers de Ação (Throw & Shoot) ───────────────────────
  const actionTime = useRef(0);
  const [currentAction, setCurrentAction] = useState(null);

  useEffect(() => {
    if (throwTrigger > 0) {
      setCurrentAction('throw');
      actionTime.current = 0;
      resetLookTimer();
    }
  }, [throwTrigger, resetLookTimer]);

  useEffect(() => {
    if (shootTrigger > 0) {
      setCurrentAction('shoot');
      actionTime.current = 0;
      resetLookTimer();
    }
  }, [shootTrigger, resetLookTimer]);

  // ── Dano e Reação Corporal ────────────────────────────────
  const damageStartTime = useRef(-999);
  const damageFlashing = useRef(false);

  useEffect(() => {
    if (damageTrigger > 0) {
      damageStartTime.current = performance.now() / 1000;
      resetLookTimer();
    }
  }, [damageTrigger, resetLookTimer]);

  useEffect(() => {
    if (isChargingBomb) {
      resetLookTimer();
    }
  }, [isChargingBomb, resetLookTimer]);

  // ── Arma: Efeito de Teleporte (Scale) ───────────────────────
  const weaponScaleRef = useRef(new THREE.Vector3(0, 0, 0));
  const prevTool = useRef(activeTool);
  const bossChargeLevel = useRef(0);

  useEffect(() => {
    if (activeTool !== prevTool.current) {
      // Começa do zero sempre que a arma muda para fazer o pop-in
      weaponScaleRef.current.set(0.1, 3, 0.1);
      prevTool.current = activeTool;
      resetLookTimer();
    }
  }, [activeTool, resetLookTimer]);

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

    // 2. Cálculo do Efeito de Dano (Recoil em metade do tempo + Piscar Vermelho/Branco por 2s)
    const nowSec = performance.now() / 1000;
    const damageElapsed = nowSec - damageStartTime.current;
    const isDamagedActive = damageElapsed < 2.0;

    // Recoil com metade do tempo (~0.8s para inclinar para trás e voltar à postura)
    const damageRecoilProgress = Math.min(damageElapsed / 0.8, 1);
    const recoilFactor = damageElapsed < 0.8 ? Math.sin(damageRecoilProgress * Math.PI) : 0;
    const damageRotX = -recoilFactor * (Math.PI / 4); // Rotação X para trás junto com o tronco

    // Piscar em vermelho e branco por 2 segundos
    if (isDamagedActive) {
      const isWhite = Math.floor(damageElapsed * 10) % 2 === 0;
      const flashColor = isWhite ? '#ffffff' : '#ff0022';
      Object.values(parts).forEach(mesh => {
        if (mesh && mesh.material) {
          if (mesh.material.color) mesh.material.color.set(flashColor);
          if (mesh.material.emissive) {
            mesh.material.emissive.set(flashColor);
            mesh.material.emissiveIntensity = 0.8;
          }
        }
      });
      damageFlashing.current = true;
    } else if (damageFlashing.current) {
      // Restaura cores originais ao finalizar o efeito de 2s
      Object.values(parts).forEach(mesh => {
        if (mesh && mesh.material) {
          if (mesh.userData.origColor && mesh.material.color) {
            mesh.material.color.copy(mesh.userData.origColor);
          }
          if (mesh.userData.origEmissive && mesh.material.emissive) {
            mesh.material.emissive.copy(mesh.userData.origEmissive);
            mesh.material.emissiveIntensity = mesh.userData.origEmissiveIntensity || 0;
          }
        }
      });
      damageFlashing.current = false;
    }

    // Carregamento de Ataque do Chefe (transição suave)
    bossChargeLevel.current = THREE.MathUtils.lerp(
      bossChargeLevel.current,
      isChargingBomb ? 1 : 0,
      delta * 2
    );
    const charge = bossChargeLevel.current;
    // Quando o NPC boss for atacar, a cabeça faz rotation X para frente
    const bossAttackRotX = charge * (Math.PI / 4);

    // 3. Animação Idle (Olhar ao redor aleatório de 4 a 20s no eixo Z) e Mira
    let targetHeadRotZ = 0;
    
    if (lookAtTarget && Array.isArray(lookAtTarget)) {
      const dx = lookAtTarget[0] - position[0];
      const dz = lookAtTarget[2] - position[2];
      targetHeadRotZ = Math.atan2(dx, dz);
    } else {
      lookTimer.current += delta;
      if (!isLooking.current) {
        if (lookTimer.current >= nextLookDelay.current) {
          isLooking.current = true;
          lookDirection.current = Math.random() > 0.5 ? 1 : -1;
          lookTimer.current = 0;
        }
      } else {
        if (lookTimer.current >= lookDuration.current) {
          isLooking.current = false;
          lookTimer.current = 0;
          nextLookDelay.current = Math.random() * 16 + 4;
        }
      }

      if (isLooking.current) {
        targetHeadRotZ = lookDirection.current * (Math.PI / 4);
      } else {
        targetHeadRotZ = 0;
      }
    }

    if (parts.head) {
       const baseRotX = parts.head.userData.origRot?.x || 0;
       const baseRotY = parts.head.userData.origRot?.y || 0;
       const baseRotZ = parts.head.userData.origRot?.z || 0;

       // Rotação Z: Idle e mira horizontal (giro de coruja no pescoço)
       parts.head.rotation.z = THREE.MathUtils.lerp(parts.head.rotation.z, baseRotZ + targetHeadRotZ, delta * 15);
       // Rotação Y: Mantém neutro
       parts.head.rotation.y = THREE.MathUtils.lerp(parts.head.rotation.y, baseRotY, delta * 15);
       // Rotação X: Inclina para frente no ataque do Boss, e para trás no dano
       const finalHeadRotX = baseRotX + bossAttackRotX + damageRotX;
       parts.head.rotation.x = THREE.MathUtils.lerp(parts.head.rotation.x, finalHeadRotX, delta * 15);

       parts.head.position.z = parts.head.userData.origPos.z + (isDamagedActive ? 0 : Math.sin(t * 2) * 0.1);
    }

    if (parts.torso) {
      const baseTorsoRotX = parts.torso.userData.origRot?.x || 0;
      parts.torso.rotation.x = THREE.MathUtils.lerp(parts.torso.rotation.x, baseTorsoRotX + damageRotX, delta * 15);
      parts.torso.position.z = parts.torso.userData.origPos.z + (isDamagedActive ? 0 : Math.sin(t * 2 + 0.2) * 0.05);
    }

    // 4. Ações (Mãos - paradas durante dano)
    let rightHandZOffset = 0;
    let rightHandYOffset = 0;
    let rightHandRotX = parts.rightHand?.userData.origRot.x || 0;

    let leftHandZOffset = 0;
    let leftHandYOffset = 0;

    if (!isDamagedActive) {
      rightHandZOffset = Math.sin(t * 2 + 0.4) * 0.15; // Idle base (Up)
      leftHandZOffset = Math.sin(t * 2 + 0.4) * 0.15;

      // Ataque do Boss: braços sobem o triplo (4.5 ao invés de 1.5)
      if (charge > 0.01) {
        const tremble = Math.sin(t * 50) * 0.05 * charge;
        rightHandZOffset += (4.5 * charge) + tremble;
        rightHandYOffset += 0.5 * charge;

        leftHandZOffset += (4.5 * charge) - tremble;
        leftHandYOffset += 0.5 * charge;
      }

      if (currentAction === 'throw') {
        actionTime.current += delta * 2;
        const at = actionTime.current;
        if (at < 1) {
          rightHandZOffset += Math.sin(at * Math.PI) * 2; // Up
          rightHandYOffset += -Math.sin(at * Math.PI) * 2; // Pull Back
        } else {
          setCurrentAction(null);
        }
      } else if (currentAction === 'shoot') {
        actionTime.current += delta * 5;
        const at = actionTime.current;
        if (at < 1) {
          rightHandYOffset += -Math.sin(at * Math.PI) * 1.5; // Recoil
          rightHandRotX += Math.sin(at * Math.PI) * 0.5; // Lift barrel
        } else {
          setCurrentAction(null);
        }
      } else if (activeTool) {
        rightHandZOffset += 1.0;
        rightHandYOffset += 0.5;
      }
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

    // 5. Ancoragem da arma na mão
    if (weaponContainerRef.current && parts.rightHand) {
      parts.rightHand.getWorldPosition(tempPos);
      if (weaponContainerRef.current.parent) {
        weaponContainerRef.current.parent.worldToLocal(tempPos);
      }
      weaponContainerRef.current.position.copy(tempPos);

      parts.rightHand.getWorldQuaternion(tempQuat);
      if (weaponContainerRef.current.parent) {
        weaponContainerRef.current.parent.getWorldQuaternion(parentQuat);
        tempQuat.premultiply(parentQuat.invert());
      }
      weaponContainerRef.current.quaternion.copy(tempQuat);

      if (modelType === 'player') {
        weaponContainerRef.current.translateX(0.1);
        weaponContainerRef.current.translateY(0.1);
      } else {
        weaponContainerRef.current.translateY(-0.1);
      }
    }
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

      {/* Armas ancoradas perfeitamente */}
      <group ref={weaponContainerRef} scale={weaponScaleRef.current}>
        {activeTool === 'bomba' && (
          <mesh>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial
              color={modelType === 'player' ? '#00ff88' : '#ff0040'}
              emissive={modelType === 'player' ? '#00ff88' : '#ff0040'}
              emissiveIntensity={1.5}
            />
          </mesh>
        )}

        {activeTool === 'sniper' && (
          <group position={[0, 0, 0.1]}>
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
          <mesh rotation={[0, -Math.PI / 4, 0]}>
            <planeGeometry args={[0.2, 0.3]} />
            <meshBasicMaterial color="#f4f0e6" side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
    </group>
  );
}


useGLTF.preload('/models/RoboAzulModel.glb');
useGLTF.preload('/models/RoboNPCModel.glb');
