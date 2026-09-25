// ============================================================
//  MenuRobotHead.jsx — Close-up 3D do Robô com Rastreamento de Mouse
//  Estilo Five Nights at Freddy's com iluminação dramática Chiaroscuro
// ============================================================

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Outlines } from '@react-three/drei';
import * as THREE from 'three';
import HorizonGrid from './HorizonGrid';

function RobotHeadModel() {
  const groupRef = useRef();
  const internalModelRef = useRef();
  const headRef = useRef();
  const visorLightRef = useRef();

  const { scene } = useGLTF('/models/RoboAzulModel.glb');

  // Clona a cena e separa as partes estruturais (Cabeça, Tronco, Mãos)
  const { parts } = useMemo(() => {
    const clone = scene.clone(true);
    const p = {};

    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.transparent = true;
        child.material.roughness = 0.45;
        child.material.metalness = 0.75;
        child.castShadow = true;

        if (child.name === 'Object_2006' || child.name === 'CabeçaRoboBranco') child.userData.part = 'head';
        if (child.name === 'Object_2007' || child.name === 'TroncoRoboBranco') child.userData.part = 'torso';
        if (child.name === 'Object_2003' || child.name === 'MaoDireitaRoboBranco') child.userData.part = 'rightHand';
        if (child.name === 'Object_2004' || child.name === 'MaoEsquerdaRoboBranco') child.userData.part = 'leftHand';
      }
    });

    clone.traverse((c) => {
      if (c.userData.part) p[c.userData.part] = c;
    });

    Object.values(p).forEach((node) => {
      node.userData.origPos = node.position.clone();
      node.userData.origRot = node.rotation.clone();
    });

    return { parts: p };
  }, [scene]);

  // Animação e Rastreamento Dinâmico do Cursor do Mouse em Tempo Real
  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const { x, y } = state.pointer; // Normalizado pelo Three.js: x [-1 a 1], y [-1 a 1]

    if (headRef.current) {
      const head = headRef.current;
      const baseRotZ = head.userData.origRot?.z || 0;
      const baseRotX = head.userData.origRot?.x || 0;
      const baseRotY = head.userData.origRot?.y || 0;

      // ── Rotação Z (Yaw Horizontal):
      // Quando o mouse vai para a esquerda (x < 0, onde estão os botões), o robô vira a cabeça para a esquerda
      const targetYaw = -x * 0.75;

      // ── Rotação X (Pitch Vertical):
      // Quando o mouse vai para cima (y > 0), o robô ergue a cabeça; para baixo (y < 0), abaixa
      const targetPitch = -y * 0.45;

      // ── Rotação Y (Roll Sutil):
      // Inclinação sutil de curiosidade (estilo animatrônico FNaF)
      const targetRoll = -x * 0.12;

      // Respiração / Movimento orgânico sutil quando ocioso
      const idleBreathingYaw = Math.sin(t * 1.6) * 0.025;
      const idleBreathingPitch = Math.sin(t * 2.2) * 0.02;

      // Suavização fluida (Lerp Damping)
      head.rotation.z = THREE.MathUtils.lerp(
        head.rotation.z,
        baseRotZ + targetYaw + idleBreathingYaw,
        delta * 7
      );
      head.rotation.x = THREE.MathUtils.lerp(
        head.rotation.x,
        baseRotX + targetPitch + idleBreathingPitch,
        delta * 7
      );
      head.rotation.y = THREE.MathUtils.lerp(
        head.rotation.y,
        baseRotY + targetRoll,
        delta * 7
      );

      // Micro pulsação no visor
      if (visorLightRef.current) {
        visorLightRef.current.intensity = 1.4 + Math.sin(t * 3.5) * 0.3;
      }
    }

    // Leve respiração no tronco
    if (parts.torso) {
      const torsoNode = parts.torso;
      if (torsoNode.userData.origPos) {
        torsoNode.position.z = torsoNode.userData.origPos.z + Math.sin(t * 1.8) * 0.03;
      }
    }
  });

  // Escala para enquadramento dramático de close-up
  const SCALE = 0.28;

  return (
    <group ref={groupRef} position={[1.35, -0.65, 0]}>
      {/* Luz emissiva localizada próxima aos olhos/visor do robô */}
      <pointLight
        ref={visorLightRef}
        position={[0, 0.4, 0.4]}
        color="#00f0ff"
        intensity={1.6}
        distance={2.5}
      />

      {/* Modelo posicionado com a rotação base do player */}
      <group
        ref={internalModelRef}
        scale={[SCALE, SCALE, SCALE]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        {Object.values(parts).map((node, i) => (
          <mesh
            key={i}
            ref={(el) => {
              if (el && node.userData.part) {
                el.userData = node.userData;
                parts[node.userData.part] = el;
                if (node.userData.part === 'head') {
                  headRef.current = el;
                }
              }
            }}
            geometry={node.geometry}
            material={node.material}
            position={node.userData.origPos}
            rotation={node.userData.origRot}
            castShadow
          >
            <Outlines thickness={2} color="#00f0ff" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function MenuRobotHead() {
  return (
    <div className="menu-robot-canvas-container">
      <Canvas
        camera={{ position: [0, 0, 3.8], fov: 38 }}
        style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Iluminação Chiaroscuro estilo Five Nights at Freddy's */}
        <ambientLight intensity={0.12} color="#061220" />

        {/* Rim Light principal cortando a silhueta direita do rosto */}
        <spotLight
          position={[3.2, 2.5, 2.5]}
          target-position={[1.2, 0, 0]}
          color="#d2f4ff"
          intensity={4.8}
          angle={Math.PI / 3}
          penumbra={0.6}
          castShadow
        />

        {/* Luz de preenchimento lateral sutil para revelar contorno mecânico */}
        <directionalLight
          position={[-2.5, -1.0, 1.5]}
          color="#004466"
          intensity={0.6}
        />

        {/* Luz de topo suave */}
        <pointLight
          position={[1.5, 3.0, 1.0]}
          color="#00a8ff"
          intensity={1.2}
          distance={6}
        />

        {/* Grade de Horizonte Synthwave em Loop */}
        <HorizonGrid />

        {/* Modelo do Robô */}
        <RobotHeadModel />
      </Canvas>
    </div>
  );
}

useGLTF.preload('/models/RoboAzulModel.glb');
