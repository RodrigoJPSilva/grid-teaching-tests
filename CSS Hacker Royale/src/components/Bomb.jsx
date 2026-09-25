import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

export default function Bomb({ startPos, endPos, startTime, duration = 5000 }) {
  const [isAboutToExplode, setIsAboutToExplode] = React.useState(false);
  const color = isAboutToExplode ? '#ffff00' : '#ff0040';
  
  const bombGroup = useRef();
  
  // Create vectors once to avoid garbage collection overhead in useFrame
  const vStart = useMemo(() => startPos ? new THREE.Vector3(...startPos) : new THREE.Vector3(), [startPos]);
  const vEnd = useMemo(() => endPos ? new THREE.Vector3(...endPos) : new THREE.Vector3(), [endPos]);

  useFrame(() => {
    if (!bombGroup.current || !startTime) return;
    
    const elapsed = Date.now() - startTime;
    const t = Math.min(Math.max(elapsed / duration, 0), 1);
    
    if (t > 0.6 && !isAboutToExplode) setIsAboutToExplode(true);
    
    // Lerp X e Z
    bombGroup.current.position.lerpVectors(vStart, vEnd, t);
    
    // Adiciona o arco parabólico no Y
    const maxHeight = 4; // altura máxima do lançamento
    bombGroup.current.position.y += Math.sin(t * Math.PI) * maxHeight;
    
    // Rotação pra dar um efeito de giro no ar
    bombGroup.current.rotation.x = t * Math.PI * 4;
    bombGroup.current.rotation.y = t * Math.PI * 2;
  });

  return (
    <group ref={bombGroup} position={startPos || endPos}>
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

      {/* Zona de explosão 3×3 translúcida no chão */}
      {/* Como o grupo inteiro gira e viaja, a zona de explosão precisa ficar estática no alvo final! */}
    </group>
  );
}

export function BombArea({ position }) {
  const AREA_SIZE = 3.6; 
  return (
    <mesh position={[position[0], 0.02, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[AREA_SIZE, AREA_SIZE]} />
      <meshBasicMaterial
        color="#ff0040"
        transparent
        opacity={0.15}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
