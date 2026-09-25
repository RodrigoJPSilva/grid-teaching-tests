import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { gridToPosition3D } from '../utils/GameEngine';

export default function VoxelEnemy({ enemy }) {
  const meshRef = useRef();
  const [x, , z] = gridToPosition3D(enemy.position[1], enemy.position[0]);

  useFrame((state) => {
    if (!meshRef.current) return;
    // Leve flutuação idle
    meshRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 2 + x) * 0.05;
    // Opacidade baseada em revelação
    const targetOpacity = enemy.revealed ? 1 : 0.15;
    meshRef.current.material.opacity = THREE.MathUtils.lerp(
      meshRef.current.material.opacity, targetOpacity, 0.1
    );
  });

  return (
    <group position={[x, 0, z]}>
      <mesh ref={meshRef} position={[0, 0.5, 0]}>
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshStandardMaterial
          color="#ff0040"
          transparent
          opacity={enemy.revealed ? 1 : 0.15}
          roughness={0.4}
          metalness={0.6}
          emissive="#ff0040"
          emissiveIntensity={enemy.revealed ? 0.5 : 0.05}
        />
      </mesh>

      {/* HP Bar (só visível se revelado) */}
      {enemy.revealed && (
        <Billboard position={[0, 1.5, 0]}>
          <Text
            position={[0, 0, 0]}
            fontSize={0.2}
            color="#fff"
            anchorX="center"
            anchorY="middle"
          >
            {enemy.name} [{enemy.hp}HP]
          </Text>
        </Billboard>
      )}
    </group>
  );
}
