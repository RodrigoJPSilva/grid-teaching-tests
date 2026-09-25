import React from 'react';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

export default function Bomb({ position, countdown }) {
  const AREA_SIZE = 3.6; // 3 cells × 1.2 cell_size
  const isAboutToExplode = countdown > 0 && countdown <= 2;
  const color = isAboutToExplode ? '#ffff00' : '#ff0040';

  return (
    <group position={position}>
      {/* Cubo da bomba */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          emissive={color}
          emissiveIntensity={isAboutToExplode ? 1.5 : 0.5}
        />
      </mesh>

      {/* Zona de explosão 3×3 translúcida */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[AREA_SIZE, AREA_SIZE]} />
        <meshBasicMaterial
          color="#ff0040"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Fumaça (contagem > 2) */}
      {countdown > 2 && (
        <Sparkles count={30} scale={1.2} size={3} speed={0.3} opacity={0.4} color="#888" position={[0, 1, 0]} />
      )}

      {/* Faíscas (contagem ≤ 2) */}
      {isAboutToExplode && (
        <Sparkles count={80} scale={2} size={5} speed={3} opacity={1} color="#ffff00" position={[0, 1, 0]} />
      )}
    </group>
  );
}
