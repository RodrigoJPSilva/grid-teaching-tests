// ============================================================
//  RobotModel.jsx — Modelo GLB reutilizável (Player + NPCs)
//  Carrega o robozinho voxel e aplica tint, animações, e acessórios
// ============================================================

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export default function RobotModel({
  position = [0, 0, 0],
  tintColor = '#4488ff',
  isRevealed = true,
  activeTool = null,
  isTerminalOpen = false,
  scale = 0.5,
}) {
  const groupRef = useRef();
  const modelRef = useRef();

  // Carregar GLB
  const { scene } = useGLTF('/models/robot.glb');

  // Clonar a cena para cada instância (Player vs NPCs)
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child.isMesh) {
        // Clonar material para não afetar outras instâncias
        child.material = child.material.clone();
        child.material.transparent = true;

        // Aplicar tint de cor por cima da cor original
        const originalColor = new THREE.Color(child.material.color);
        const tint = new THREE.Color(tintColor);
        child.material.color = originalColor.lerp(tint, 0.35);

        child.material.emissive = new THREE.Color(tintColor);
        child.material.emissiveIntensity = 0.15;
        child.castShadow = true;
      }
    });
    return clone;
  }, [scene, tintColor]);

  // ── Animação de Teletransporte ────────────────────────────
  const [targetPos, setTargetPos] = useState(() => new THREE.Vector3(...position));
  const [animState, setAnimState] = useState('idle');
  const animTime = useRef(0);

  useEffect(() => {
    const newPos = new THREE.Vector3(...position);
    if (!newPos.equals(targetPos) && groupRef.current) {
      setTargetPos(newPos);
      setAnimState('out');
      animTime.current = 0;
    }
  }, [position[0], position[1], position[2]]);

  useFrame((state, delta) => {
    if (!groupRef.current || !modelRef.current) return;

    const speed = 4;

    if (animState === 'out') {
      animTime.current += delta * speed;
      const t = Math.min(animTime.current, 1);

      // Stretch para cima + fade out
      modelRef.current.scale.set(
        scale * (1 - t * 0.7),
        scale * (1 + t * 2),
        scale * (1 - t * 0.7)
      );
      setMaterialOpacity(clonedScene, (1 - t) * (isRevealed ? 1 : 0.25));

      if (t >= 1) {
        groupRef.current.position.copy(targetPos);
        setAnimState('in');
        animTime.current = 0;
      }
    } else if (animState === 'in') {
      animTime.current += delta * speed;
      const t = Math.min(animTime.current, 1);

      // Squeeze de volta ao tamanho normal
      modelRef.current.scale.set(
        scale * (0.3 + t * 0.7),
        scale * (3 - t * 2),
        scale * (0.3 + t * 0.7)
      );
      setMaterialOpacity(clonedScene, t * (isRevealed ? 1 : 0.25));

      if (t >= 1) {
        modelRef.current.scale.set(scale, scale, scale);
        setAnimState('idle');
      }
    } else {
      // Idle: flutuação suave
      const float = Math.sin(state.clock.elapsedTime * 2) * 0.04;
      modelRef.current.position.y = float;

      // Ajustar opacidade suavemente
      const targetOpacity = isRevealed ? 1 : 0.25;
      clonedScene.traverse((child) => {
        if (child.isMesh) {
          child.material.opacity = THREE.MathUtils.lerp(
            child.material.opacity, targetOpacity, 0.08
          );
          child.material.emissiveIntensity = isRevealed ? 0.2 : 0.05;
        }
      });
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Aura (cor do tint) */}
      <pointLight color={tintColor} intensity={isRevealed ? 0.6 : 0.15} distance={3} />

      {/* Modelo 3D */}
      <group ref={modelRef} scale={[scale, scale, scale]}>
        <primitive object={clonedScene} />
      </group>

      {/* Óculos Matrix (quando terminal aberto) */}
      {isTerminalOpen && (
        <mesh position={[0, 0.55 * scale * 2, 0.25 * scale * 2]}>
          <boxGeometry args={[0.5 * scale * 2, 0.1 * scale * 2, 0.03]} />
          <meshBasicMaterial color="black" />
        </mesh>
      )}

      {/* Mini-bomba na mão (editando .bomba) */}
      {activeTool === 'bomba' && (
        <mesh position={[0.4 * scale * 2, 0.2 * scale * 2, 0]}>
          <boxGeometry args={[0.15, 0.15, 0.15]} />
          <meshStandardMaterial color="#ff0040" emissive="#ff0040" emissiveIntensity={1.5} />
        </mesh>
      )}

      {/* Sniper na mão (editando .sniper) */}
      {activeTool === 'sniper' && (
        <group position={[0.45 * scale * 2, 0.25 * scale * 2, 0]}>
          <mesh position={[0, 0, 0.2]}>
            <boxGeometry args={[0.06, 0.06, 0.5]} />
            <meshStandardMaterial color="#333" metalness={0.8} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.1, 0.13, 0.2]} />
            <meshStandardMaterial color="#111" metalness={0.6} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// Helper para aplicar opacidade em todos os materiais do modelo
function setMaterialOpacity(scene, opacity) {
  scene.traverse((child) => {
    if (child.isMesh) {
      child.material.opacity = opacity;
    }
  });
}

// Preload do modelo
useGLTF.preload('/models/robot.glb');
