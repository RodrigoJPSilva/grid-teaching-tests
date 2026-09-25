import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Player({ position, isRevealed, activeTool, isTerminalOpen }) {
  const meshRef = useRef();

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    const targetOpacity = isRevealed ? 1 : 0.3;
    meshRef.current.material.opacity = THREE.MathUtils.lerp(
      meshRef.current.material.opacity, targetOpacity, 0.1
    );
  });

  return (
    <group position={position}>
      {/* Aura Azul */}
      <pointLight color="#0088ff" intensity={0.6} distance={3} />

      {/* Corpo do player */}
      <mesh ref={meshRef} position={[0, 0.5, 0]}>
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshStandardMaterial
          color="#00ff88"
          transparent
          opacity={isRevealed ? 1 : 0.3}
          roughness={0.4}
          metalness={0.6}
          emissive="#00ff88"
          emissiveIntensity={isRevealed ? 0.5 : 0.1}
        />
      </mesh>

      {/* Óculos Matrix (Terminal aberto) */}
      {isTerminalOpen && (
        <mesh position={[0, 0.7, 0.46]}>
          <boxGeometry args={[0.7, 0.15, 0.04]} />
          <meshBasicMaterial color="black" />
        </mesh>
      )}

      {/* Mini-bomba na mão (editando .bomba) */}
      {activeTool === 'bomba' && (
        <mesh position={[0.65, 0.5, 0]}>
          <boxGeometry args={[0.25, 0.25, 0.25]} />
          <meshStandardMaterial color="#ff0040" emissive="#ff0040" emissiveIntensity={1} />
        </mesh>
      )}

      {/* Sniper na mão (editando .sniper) */}
      {activeTool === 'sniper' && (
        <group position={[0.7, 0.55, 0]}>
          <mesh position={[0, 0, 0.3]}>
            <boxGeometry args={[0.08, 0.08, 0.7]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          <mesh>
            <boxGeometry args={[0.12, 0.18, 0.3]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        </group>
      )}
    </group>
  );
}
