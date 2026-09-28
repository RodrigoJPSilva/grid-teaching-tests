// ============================================================
//  RobotModel.jsx — Modelo Animado para Player e NPCs
//  Suporta membros separados, animação Idle, Teleporte e Armas
// ============================================================

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { soundManager } from '../utils/SoundManager';

const BASE_SCALE = 0.055;
const TELEPORT_SPEED = 4;

function RecursiveModel({ node, modelType, partsMap, outlineColor }) {
  const setRef = (el) => {
    if (el && node.userData.part) {
      partsMap[node.userData.part] = el;
      el.userData = node.userData;
    }
  };

  if (node.isMesh) {
    return (
      <mesh ref={setRef} geometry={node.geometry} material={node.material} position={node.position} rotation={node.rotation} scale={node.scale} castShadow>
        <Outlines thickness={2} color={outlineColor || (modelType === 'player' ? '#185A74' : '#BC0001')} />
        {node.children.map(child => <RecursiveModel key={child.uuid} node={child} modelType={modelType} partsMap={partsMap} outlineColor={outlineColor} />)}
      </mesh>
    );
  }
  return (
    <group ref={setRef} position={node.position} rotation={node.rotation} scale={node.scale}>
      {node.children.map(child => <RecursiveModel key={child.uuid} node={child} modelType={modelType} partsMap={partsMap} outlineColor={outlineColor} />)}
    </group>
  );
}

// ── Mini-bombas do Boss disparadas para o céu ─────────────
function BossSkyBombs({ skyBombAttack, scaleMultiplier }) {
  const groupRef = useRef();
  const meshesRef = useRef([]);
  const soundsFired = useRef(new Set());

  useEffect(() => {
    soundsFired.current.clear();
  }, [skyBombAttack?.startTime]);

  useFrame(() => {
    if (!skyBombAttack || !groupRef.current) return;
    const elapsed = (Date.now() - skyBombAttack.startTime) / 1000;
    const count = skyBombAttack.bombsCount || 5;

    for (let i = 0; i < count; i++) {
      const tStart = i * 0.2;
      if (elapsed >= tStart && !soundsFired.current.has(i)) {
        soundsFired.current.add(i);
        soundManager.playBossBombLaunch(i);
      }

      const mesh = meshesRef.current[i];
      if (!mesh) continue;
      const tPeak = tStart + 0.2;
      const bElapsed = elapsed - tPeak;

      if (bElapsed >= 0 && bElapsed <= 0.5) {
        mesh.visible = true;
        const u = bElapsed / 0.5; // 0 to 1
        const isRight = (i % 2 === 0);
        const handX = (isRight ? 0.38 : -0.38) * scaleMultiplier;
        const handZ = 0.35 * scaleMultiplier;
        const startY = 1.2 * scaleMultiplier;
        // Sobe da mão em direção ao céu ao longo de 0.5s
        mesh.position.set(handX, startY + u * 6.5, handZ);
      } else {
        mesh.visible = false;
      }
    }
  });

  if (!skyBombAttack) return null;
  const count = skyBombAttack.bombsCount || 5;

  return (
    <group ref={groupRef}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh
          key={i}
          ref={el => { meshesRef.current[i] = el; }}
          visible={false}
        >
          <boxGeometry args={[0.38, 0.38, 0.38]} />
          <meshStandardMaterial
            color="#ff0040"
            emissive="#ff0040"
            emissiveIntensity={1.8}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function RobotModel({
  position = [0, 0, 0],
  isRevealed = true,
  activeTool = null,
  isTerminalOpen = false,
  meshRef,
  modelType = 'player', // 'player' | 'npc' | 'boss'
  throwTrigger = 0,
  shootTrigger = 0,
  scaleMultiplier = 1,
  isChargingBomb = false,
  lookAtTarget = null,
  damageTrigger = 0,
  spawnTime = 0,
  onLanded = null,
  isAwaitingSpawn = false,
  jumpState = null,
  jumpStartPos3D = null,
  jumpTargetPos3D = null,
  landingState = null,
  skyBombAttack = null,
  bombAttack = null,
  isDead = false,
  isFloorElevated = false,
}) {
  const groupRef = useRef();
  const internalModelRef = useRef();

  const defaultOutline = modelType === 'player' ? '#185A74' : '#BC0001';
  const [currentOutlineColor, setCurrentOutlineColor] = useState(defaultOutline);
  const landedTriggered = useRef(false);
  const landingStartTime = useRef(0);
  const whiteColorRef = useMemo(() => new THREE.Color('#ffffff'), []);

  const deathStartTime = useRef(-999);
  const wasDeadRef = useRef(false);

  useEffect(() => {
    if (isDead && !wasDeadRef.current) {
      wasDeadRef.current = true;
      deathStartTime.current = performance.now() / 1000;
    }
  }, [isDead]);

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

  const wasJumpingOrLanding = useRef(false);

  useEffect(() => {
    if (jumpState || landingState) {
      wasJumpingOrLanding.current = true;
    }
  }, [jumpState, landingState]);

  useEffect(() => {
    const key = position.join(',');
    if (key !== prevPos.current && groupRef.current) {
      prevPos.current = key;
      const newPos = new THREE.Vector3(...position);
      setTargetPos(newPos);
      
      const isBossOrJump = modelType === 'boss' || jumpState || landingState || wasJumpingOrLanding.current;
      if (!isBossOrJump) {
        setAnimState('out');
        animTime.current = 0;
      } else {
        groupRef.current.position.copy(newPos);
        setAnimState('idle');
      }

      if (!jumpState && !landingState) {
        wasJumpingOrLanding.current = false;
      }
      resetLookTimer();
    }
  }, [position[0], position[1], position[2], jumpState, landingState, modelType, resetLookTimer]);

  useEffect(() => {
    if (landingState || skyBombAttack || bombAttack) {
      resetLookTimer();
    }
  }, [landingState, skyBombAttack, bombAttack, resetLookTimer]);

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

    // Esconder o personagem completamente até iniciar a descida (durante fade-out para a partida ou espera do Boss)
    if (isAwaitingSpawn || (spawnTime > 0 && Date.now() < spawnTime)) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;

    const t = state.clock.elapsedTime;

    // 0. Animação de Entrada Celestial do Céu (Sky Drop)
    const nowSec = performance.now() / 1000;
    const spawnDuration = modelType === 'player' ? 2.0 : 3.0;
    const spawnElapsed = spawnTime > 0 ? (Date.now() - spawnTime) / 1000 : 999;
    const isSpawning = spawnTime > 0 && spawnElapsed >= 0 && spawnElapsed < spawnDuration;

    let skyYOffset = 0;
    if (isSpawning) {
      const p = Math.min(Math.max(spawnElapsed / spawnDuration, 0), 1);
      const easeOut = 1 - Math.pow(1 - p, 3);
      skyYOffset = 30 * (1 - easeOut);

      const remainingSec = spawnDuration - spawnElapsed;
      if (remainingSec > 0.5) {
        // Personagens completamente brancos com outlines brancos durante a descida
        Object.values(parts).forEach(mesh => {
          if (mesh && mesh.material) {
            if (mesh.material.color) mesh.material.color.set('#ffffff');
            if (mesh.material.emissive) {
              mesh.material.emissive.set('#ffffff');
              mesh.material.emissiveIntensity = 0.8;
            }
          }
        });
        if (currentOutlineColor !== '#ffffff') setCurrentOutlineColor('#ffffff');
      } else {
        // Aos 0.5s restantes para pousar: transiciona suavemente de volta às cores originais
        const transProgress = (0.5 - remainingSec) / 0.5; // 0 to 1
        Object.values(parts).forEach(mesh => {
          if (mesh && mesh.material) {
            if (mesh.userData.origColor && mesh.material.color) {
              mesh.material.color.copy(whiteColorRef).lerp(mesh.userData.origColor, transProgress);
            }
            if (mesh.userData.origEmissive && mesh.material.emissive) {
              mesh.material.emissive.copy(whiteColorRef).lerp(mesh.userData.origEmissive, transProgress);
              mesh.material.emissiveIntensity = THREE.MathUtils.lerp(0.8, mesh.userData.origEmissiveIntensity || 0, transProgress);
            }
          }
        });
        if (currentOutlineColor !== defaultOutline) setCurrentOutlineColor(defaultOutline);
      }
    } else if (spawnTime > 0 && !landedTriggered.current) {
      landedTriggered.current = true;
      landingStartTime.current = nowSec;
      if (currentOutlineColor !== defaultOutline) setCurrentOutlineColor(defaultOutline);
      Object.values(parts).forEach(mesh => {
        if (mesh && mesh.material) {
          if (mesh.userData.origColor && mesh.material.color) mesh.material.color.copy(mesh.userData.origColor);
          if (mesh.userData.origEmissive && mesh.material.emissive) {
            mesh.material.emissive.copy(mesh.userData.origEmissive);
            mesh.material.emissiveIntensity = mesh.userData.origEmissiveIntensity || 0;
          }
        }
      });
      if (onLanded) onLanded();
    }

    // Tremor e squash de impacto ao pousar (duração de 0.25s)
    const landElapsed = nowSec - landingStartTime.current;
    let landSquashY = 1;
    let landSquashXZ = 1;
    if (landElapsed < 0.25) {
      const landP = landElapsed / 0.25;
      const squash = Math.sin(landP * Math.PI) * 0.16;
      landSquashY = 1 - squash;
      landSquashXZ = 1 + squash * 0.5;
    }

    // 0.5. Lógica de Pulo Especial do Boss (5 segundos total)
    const isJumping = !!(jumpState && jumpStartPos3D && jumpTargetPos3D && (Date.now() - jumpState.startTime < 5000));
    const jumpElapsed = isJumping ? (Date.now() - jumpState.startTime) / 1000 : 999;
    let effectiveLookAt = lookAtTarget;

    // 1. Posicionamento, Teleporte ou Pulo do Robô
    if (isJumping) {
      const sm = BASE_SCALE * scaleMultiplier;
      if (jumpElapsed < 2.0) {
        // 1. Olha para o piso alvo por 2 segundos
        effectiveLookAt = jumpTargetPos3D;
        groupRef.current.position.set(jumpStartPos3D[0], jumpStartPos3D[1], jumpStartPos3D[2]);
        internalModelRef.current.scale.set(sm, sm, sm);
      } else if (jumpElapsed < 2.5) {
        // 2. Fica amassado (squash) por 0.5 segundos antes de pular
        effectiveLookAt = jumpTargetPos3D;
        const squashP = (jumpElapsed - 2.0) / 0.5; // 0 to 1
        const squashFactor = Math.sin(squashP * Math.PI * 0.5);
        const squashY = THREE.MathUtils.lerp(1.0, 0.48, squashFactor);
        const expandXZ = THREE.MathUtils.lerp(1.0, 1.28, squashFactor);
        internalModelRef.current.scale.set(sm * expandXZ, sm * squashY, sm * expandXZ);
        const feetYOffset = -(1.0 - squashY) * 0.35 * scaleMultiplier;
        groupRef.current.position.set(jumpStartPos3D[0], jumpStartPos3D[1] + feetYOffset, jumpStartPos3D[2]);
      } else {
        // 3. Salto parabólico no ar por 2.5 segundos (sem girar, mantém postura ereta)
        const jumpP = (jumpElapsed - 2.5) / 2.5; // 0 to 1
        const currX = THREE.MathUtils.lerp(jumpStartPos3D[0], jumpTargetPos3D[0], jumpP);
        const currZ = THREE.MathUtils.lerp(jumpStartPos3D[2], jumpTargetPos3D[2], jumpP);
        const PEAK_HEIGHT = 6.2;
        const arcY = Math.sin(jumpP * Math.PI) * PEAK_HEIGHT;
        groupRef.current.position.set(currX, jumpStartPos3D[1] + arcY, currZ);
        effectiveLookAt = null; // sem giro lateral
        if (jumpP < 0.2) {
          const unP = jumpP / 0.2;
          const unSquashY = THREE.MathUtils.lerp(0.48, 1.0, unP);
          const unExpandXZ = THREE.MathUtils.lerp(1.28, 1.0, unP);
          internalModelRef.current.scale.set(sm * unExpandXZ, sm * unSquashY, sm * unExpandXZ);
        } else {
          internalModelRef.current.scale.set(sm, sm, sm);
        }
      }
    } else if (animState === 'out') {
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
      // Posição com deslocamento de descida celestial
      const floorBaseY = isDead ? (isFloorElevated ? 0.21 : 0.01) : targetPos.y;
      groupRef.current.position.set(targetPos.x, floorBaseY + skyYOffset, targetPos.z);
      const sm = BASE_SCALE * scaleMultiplier;
      internalModelRef.current.scale.set(sm * landSquashXZ, sm * landSquashY, sm * landSquashXZ);
    }

    // 2. Cálculo do Efeito de Dano (Recoil) ou Animação de Morte
    const isDying = isDead;
    const deathElapsed = isDying ? Math.max(0, nowSec - deathStartTime.current) : 0;
    const fallProgress = isDying ? Math.min(deathElapsed / 1.3, 1.0) : 0;
    const easeFall = isDying ? (1 - Math.pow(1 - fallProgress, 3)) : 0;

    const damageElapsed = nowSec - damageStartTime.current;
    const isDamagedActive = !isDying && damageElapsed < 2.0;

    // Recoil com metade do tempo (~0.8s para inclinar para trás e voltar à postura)
    const damageRecoilProgress = Math.min(damageElapsed / 0.8, 1);
    const recoilFactor = damageElapsed < 0.8 ? Math.sin(damageRecoilProgress * Math.PI) : 0;
    const damageRotX = -recoilFactor * (Math.PI / 4); // Rotação X para trás junto com o tronco

    if (isDying) {
      // Animação de Morte: Ao invés de piscar em vermelho, só pisca branco lento
      const slowPulse = (Math.sin(deathElapsed * 4.0) + 1) / 2;
      const intensity = THREE.MathUtils.lerp(0.15, 0.9, slowPulse) * (1 - fallProgress * 0.4);
      Object.values(parts).forEach(mesh => {
        if (mesh && mesh.material) {
          if (mesh.material.color) mesh.material.color.set('#ffffff');
          if (mesh.material.emissive) {
            mesh.material.emissive.set('#ffffff');
            mesh.material.emissiveIntensity = intensity;
          }
        }
      });
      if (currentOutlineColor !== '#ffffff') setCurrentOutlineColor('#ffffff');
    } else if (isDamagedActive) {
      // Piscar em vermelho e branco por 2 segundos durante dano
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

    // 0.4. Animação de Pouso Pós-Salto do Boss (1.5s - antiga animação da bomba reutilizada)
    const isLanding = !!(landingState && (Date.now() - landingState.startTime < (landingState.duration || 1500)));
    const landingElapsed = isLanding ? (Date.now() - landingState.startTime) / 1000 : 999;
    const landingDuration = (landingState?.duration || 1500) / 1000;
    
    let landingCharge = 0;
    if (isLanding) {
      const lp = landingElapsed / landingDuration; // 0 to 1
      if (lp < 0.75) {
        landingCharge = Math.min(landingElapsed / 0.15, 1.0);
      } else {
        landingCharge = Math.max(0, 1.0 - (lp - 0.75) / 0.25);
      }
    }
    const bossLandingRotX = landingCharge * (Math.PI / 4);

    // 0.6. Nova Animação de Disparo de Bombas para o Céu do Boss
    const isSkyBombing = !!(skyBombAttack && (Date.now() - skyBombAttack.startTime < (skyBombAttack.duration + 400)));
    const skyBombElapsed = isSkyBombing ? (Date.now() - skyBombAttack.startTime) / 1000 : 999;
    const skyDur = (skyBombAttack?.duration || 1500) / 1000;

    let skyHeadRotX = 0;
    if (isSkyBombing) {
      if (skyBombElapsed < skyDur) {
        // Cabeça olhando diretamente para o céu usando rotation X
        skyHeadRotX = -Math.PI / 2.2;
      } else {
        // Retorna a cabeça suavemente para o lugar
        const returnP = Math.min((skyBombElapsed - skyDur) / 0.25, 1);
        skyHeadRotX = THREE.MathUtils.lerp(-Math.PI / 2.2, 0, returnP);
      }
    }

    // 0.7. Nova Animação de Disparo Oblíquo de Bombas para Jogador e NPCs (Alternando Mãos)
    const activeBomb = bombAttack || (throwTrigger > 0 && (Date.now() - throwTrigger < 1200) ? { startTime: throwTrigger, bombsCount: 1, duration: 700 } : null);
    const isObliqueBombing = !isDying && !!(activeBomb && (Date.now() - activeBomb.startTime < (activeBomb.duration || 700) + 200));
    const obliqueBombElapsed = isObliqueBombing ? (Date.now() - activeBomb.startTime) / 1000 : 999;
    const obliqueDur = ((activeBomb?.duration || 700)) / 1000;

    let obliqueHeadRotX = 0;
    if (isObliqueBombing) {
      if (obliqueBombElapsed < obliqueDur) {
        // Cabeça inclina para cima (como na animação do Boss) durante o lançamento
        obliqueHeadRotX = -Math.PI / 3;
      } else {
        // Retorna a cabeça suavemente para o lugar
        const returnP = Math.min((obliqueBombElapsed - obliqueDur) / 0.2, 1);
        obliqueHeadRotX = THREE.MathUtils.lerp(-Math.PI / 3, 0, returnP);
      }
    }

    // 3. Animação Idle e Mira
    let targetHeadRotZ = 0;
    
    if (effectiveLookAt && Array.isArray(effectiveLookAt)) {
      const currentPos = groupRef.current.position;
      const dx = effectiveLookAt[0] - currentPos.x;
      const dz = effectiveLookAt[2] - currentPos.z;
      targetHeadRotZ = Math.atan2(dx, dz);
    } else if (!isDying) {
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

      if (isLooking.current && !isLanding && !isSkyBombing && !isObliqueBombing) {
        targetHeadRotZ = lookDirection.current * (Math.PI / 4);
      } else {
        targetHeadRotZ = 0;
      }
    }

    if (parts.head) {
       const baseRotX = parts.head.userData.origRot?.x || 0;
       const baseRotY = parts.head.userData.origRot?.y || 0;
       const baseRotZ = parts.head.userData.origRot?.z || 0;

       if (isDying) {
         // A cabeça faz um rotation X para a direita em 90 graus e um rotation Y para trás em 90 graus, e reduz o position até encostar no chão
         const targetRotX = baseRotX + easeFall * (Math.PI / 2);
         const targetRotY = baseRotY - easeFall * (Math.PI / 2);

         parts.head.rotation.x = THREE.MathUtils.lerp(parts.head.rotation.x, targetRotX, delta * 10);
         parts.head.rotation.y = THREE.MathUtils.lerp(parts.head.rotation.y, targetRotY, delta * 10);
         parts.head.rotation.z = THREE.MathUtils.lerp(parts.head.rotation.z, baseRotZ, delta * 10);

         // Reduz o position até encostar no chão
         const dropZ = easeFall * 6.5;
         const dropY = easeFall * 2.2;
         parts.head.position.z = parts.head.userData.origPos.z - dropZ;
         parts.head.position.y = parts.head.userData.origPos.y - dropY;
       } else {
         // Rotação Z: Idle e mira horizontal (giro de coruja no pescoço)
         parts.head.rotation.z = THREE.MathUtils.lerp(parts.head.rotation.z, baseRotZ + targetHeadRotZ, delta * 15);
         // Rotação Y: Mantém neutro
         parts.head.rotation.y = THREE.MathUtils.lerp(parts.head.rotation.y, baseRotY, delta * 15);
         // Rotação X: Inclina para frente no pouso, para cima nas bombas celestiais/oblíquas, e para trás no dano
         const finalHeadRotX = baseRotX + bossLandingRotX + skyHeadRotX + obliqueHeadRotX + damageRotX;
         parts.head.rotation.x = THREE.MathUtils.lerp(parts.head.rotation.x, finalHeadRotX, delta * 15);

         parts.head.position.z = parts.head.userData.origPos.z + (isDamagedActive ? 0 : Math.sin(t * 2) * 0.1);
       }
    }

    if (parts.torso) {
      const baseTorsoRotX = parts.torso.userData.origRot?.x || 0;
      const baseTorsoRotY = parts.torso.userData.origRot?.y || 0;
      const baseTorsoRotZ = parts.torso.userData.origRot?.z || 0;

      if (isDying) {
        // O corpo cai em rotation Y para frente em 90 graus, e reduz o position até encostar no piso
        const targetTorsoRotY = baseTorsoRotY + easeFall * (Math.PI / 2);
        const dropZ = easeFall * 4.6;
        const dropY = easeFall * 1.5;

        parts.torso.rotation.y = THREE.MathUtils.lerp(parts.torso.rotation.y, targetTorsoRotY, delta * 10);
        parts.torso.rotation.x = THREE.MathUtils.lerp(parts.torso.rotation.x, baseTorsoRotX, delta * 10);
        parts.torso.rotation.z = THREE.MathUtils.lerp(parts.torso.rotation.z, baseTorsoRotZ, delta * 10);

        parts.torso.position.z = parts.torso.userData.origPos.z - dropZ;
        parts.torso.position.y = parts.torso.userData.origPos.y - dropY;
      } else {
        parts.torso.rotation.x = THREE.MathUtils.lerp(parts.torso.rotation.x, baseTorsoRotX + damageRotX, delta * 15);
        parts.torso.position.z = parts.torso.userData.origPos.z + (isDamagedActive ? 0 : Math.sin(t * 2 + 0.2) * 0.05);
      }
    }

    // 4. Ações (Mãos)
    let rightHandZOffset = 0;
    let rightHandYOffset = 0;
    let rightHandRotX = parts.rightHand?.userData.origRot.x || 0;

    let leftHandZOffset = 0;
    let leftHandYOffset = 0;

    if (isDying) {
      const handDropZ = easeFall * 4.8;
      const handDropY = easeFall * 1.5;
      if (parts.rightHand) {
        parts.rightHand.position.z = parts.rightHand.userData.origPos.z - handDropZ;
        parts.rightHand.position.y = parts.rightHand.userData.origPos.y - handDropY;
        parts.rightHand.rotation.y = THREE.MathUtils.lerp(parts.rightHand.rotation.y, -easeFall * (Math.PI / 2), delta * 10);
        parts.rightHand.rotation.x = THREE.MathUtils.lerp(parts.rightHand.rotation.x, 0, delta * 10);
        parts.rightHand.rotation.z = THREE.MathUtils.lerp(parts.rightHand.rotation.z, 0, delta * 10);
      }
      if (parts.leftHand) {
        parts.leftHand.position.z = parts.leftHand.userData.origPos.z - handDropZ;
        parts.leftHand.position.y = parts.leftHand.userData.origPos.y - handDropY;
        parts.leftHand.rotation.y = THREE.MathUtils.lerp(parts.leftHand.rotation.y, easeFall * (Math.PI / 2), delta * 10);
        parts.leftHand.rotation.x = THREE.MathUtils.lerp(parts.leftHand.rotation.x, easeFall * (Math.PI / 4), delta * 10);
        parts.leftHand.rotation.z = THREE.MathUtils.lerp(parts.leftHand.rotation.z, 0, delta * 10);
      }
      weaponScaleRef.current.set(0, 0, 0);
    } else if (!isDamagedActive) {
      rightHandZOffset = Math.sin(t * 2 + 0.4) * 0.15; // Idle base (Up)
      leftHandZOffset = Math.sin(t * 2 + 0.4) * 0.15;

      // Animação de Pouso do Boss: braços erguidos com tremor rápido (antiga animação da bomba)
      if (landingCharge > 0.01) {
        const landingTremble = Math.sin(t * 50) * 0.05 * landingCharge;
        rightHandZOffset += (4.5 * landingCharge) + landingTremble;
        rightHandYOffset += 0.5 * landingCharge;

        leftHandZOffset += (4.5 * landingCharge) - landingTremble;
        leftHandYOffset += 0.5 * landingCharge;
      }

      // Nova Animação do Boss: Sobe uma mão de cada vez (0.2s), atirando bombas pro céu (0.5s)
      if (isSkyBombing) {
        const count = skyBombAttack?.bombsCount || 5;
        for (let i = 0; i < count; i++) {
          const tStart = i * 0.2;
          const tPeak = tStart + 0.2;
          const tEnd = tPeak + 0.5;

          if (skyBombElapsed >= tStart && skyBombElapsed < tEnd) {
            let armProgress = 0;
            if (skyBombElapsed < tPeak) {
              const p = (skyBombElapsed - tStart) / 0.2;
              armProgress = Math.sin(p * Math.PI * 0.5);
            } else {
              const p = (skyBombElapsed - tPeak) / 0.5;
              armProgress = 1.0 - p;
            }

            const zLift = armProgress * 3.8;
            const yLift = armProgress * 0.6;

            if (i % 2 === 0) {
              rightHandZOffset += zLift;
              rightHandYOffset += yLift;
            } else {
              leftHandZOffset += zLift;
              leftHandYOffset += yLift;
            }
          }
        }
      }

      // Nova Animação de Lançamento de Bombas Oblíquas (Jogador e NPC):
      // Sobe uma mão de cada vez em 0.2s, arremessa no ápice e retorna a mão em 0.5s.
      // Se for mais de uma bomba, alterna as mãos (direita para índice par, esquerda para índice ímpar).
      if (isObliqueBombing) {
        const count = activeBomb?.bombsCount || 1;
        for (let i = 0; i < count; i++) {
          const tStart = i * 0.4;
          const tPeak = tStart + 0.2;
          const tEnd = tPeak + 0.5;

          if (obliqueBombElapsed >= tStart && obliqueBombElapsed < tEnd) {
            let armProgress = 0;
            if (obliqueBombElapsed < tPeak) {
              const p = (obliqueBombElapsed - tStart) / 0.2;
              armProgress = Math.sin(p * Math.PI * 0.5);
            } else {
              const p = (obliqueBombElapsed - tPeak) / 0.5;
              armProgress = 1.0 - p;
            }

            const zLift = armProgress * 2.8;
            const yPush = -armProgress * 1.2;

            if (i % 2 === 0) {
              rightHandZOffset += zLift;
              rightHandYOffset += yPush;
            } else {
              leftHandZOffset += zLift;
              leftHandYOffset += yPush;
            }
          }
        }
      }

      if (currentAction === 'shoot') {
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

    if (!isDying) {
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
              <Outlines thickness={2} color={currentOutlineColor} />
            </mesh>
          ))
        ) : (
          clonedScene.children.map(child => (
            <RecursiveModel key={child.uuid} node={child} modelType={modelType} partsMap={parts} outlineColor={currentOutlineColor} />
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

      {/* Mini-bombas atiradas para o céu pelo Boss */}
      <BossSkyBombs skyBombAttack={skyBombAttack} scaleMultiplier={scaleMultiplier} />
    </group>
  );
}


useGLTF.preload('/models/RoboAzulModel.glb');
useGLTF.preload('/models/RoboNPCModel.glb');
