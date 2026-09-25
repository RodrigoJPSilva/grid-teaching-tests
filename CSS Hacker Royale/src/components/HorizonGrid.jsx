// ============================================================
//  HorizonGrid.jsx — Grade de Horizonte 3D Synthwave em Loop Contínuo
//  Alinhada com precisão à linha vermelha de referência
//  Movimento lento em direção ao horizonte com brilho neon
// ============================================================

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const HorizonGridShader = {
  uniforms: {
    uTime: { value: 0 },
    uSpeed: { value: 0.22 },
    uLineColor: { value: new THREE.Color('#00f0ff') },
    uGlowColor: { value: new THREE.Color('#00ffaa') },
    uHorizonColor: { value: new THREE.Color('#00f0ff') },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uSpeed;
    uniform vec3 uLineColor;
    uniform vec3 uGlowColor;
    uniform vec3 uHorizonColor;
    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      // vUv.y: 0.0 na base mais próxima da tela, 1.0 exatamente na linha do horizonte
      // vUv.x: 0.0 na borda esquerda a 1.0 na borda direita

      // Perspectiva acentuada: colunas verticais convergem para o centro no horizonte
      float perspectiveFactor = mix(48.0, 14.0, vUv.y);
      float coordX = (vUv.x - 0.5) * perspectiveFactor;

      // Compressão geométrica não linear e movimento contínuo em direção ao horizonte
      float pY = pow(vUv.y, 1.7);
      float coordY = pY * 32.0 - uTime * uSpeed;

      vec2 gridCoords = vec2(coordX, coordY);

      // Cálculo de linhas nítidas anti-aliased
      vec2 grid = abs(fract(gridCoords - 0.5) - 0.5);
      vec2 fw = fwidth(gridCoords);
      vec2 aGrid = grid / max(fw, vec2(0.001));
      float line = 1.0 - clamp(min(aGrid.x, aGrid.y) * 1.3, 0.0, 1.0);

      // Glow suave ao redor das linhas da grade
      float glow = exp(-min(grid.x, grid.y) * 11.0) * 0.7;

      // Mistura da cor da grade (Ciano neon + Verde Matrix)
      vec3 gridColor = uLineColor * line + uGlowColor * glow;

      // ── Feixe Laser e Névoa no Horizonte (Linha Vermelha de Referência) ──
      // Névoa difusa no horizonte
      float horizonFog = pow(vUv.y, 3.8) * 1.6;
      // Laser brilhante marcando o horizonte
      float horizonLaser = smoothstep(0.965, 0.999, vUv.y) * 3.0;
      vec3 horizonEffect = uHorizonColor * (horizonFog + horizonLaser);

      // Fade suave na base inferior (para transição limpa na tela)
      float nearFade = smoothstep(0.0, 0.14, vUv.y);

      // Fade lateral suave para evitar cortes duros
      float sideFade = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);

      // Chão escuro cyberpunk de alta profundidade
      vec3 floorBase = vec3(0.008, 0.018, 0.032) * (1.0 - vUv.y * 0.6);

      vec3 finalColor = floorBase + gridColor + horizonEffect;
      float finalAlpha = clamp(line * 1.1 + glow + horizonFog * 0.8 + horizonLaser, 0.0, 1.0) * nearFade * sideFade;

      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `,
};

export default function HorizonGrid() {
  const meshRef = useRef();
  const materialRef = useRef();

  const uniforms = useMemo(() => {
    return {
      uTime: { value: 0 },
      uSpeed: { value: 0.22 },
      uLineColor: { value: new THREE.Color('#00f0ff') },
      uGlowColor: { value: new THREE.Color('#00ffaa') },
      uHorizonColor: { value: new THREE.Color('#00f0ff') },
    };
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <group position={[0, -1.10, 0.75]} rotation={[-1.395, 0, 0]}>
      {/* Grade com Shader Procedural */}
      <mesh ref={meshRef}>
        <planeGeometry args={[36, 4.57, 1, 1]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={HorizonGridShader.vertexShader}
          fragmentShader={HorizonGridShader.fragmentShader}
          uniforms={uniforms}
          transparent={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Luz difusa do horizonte projetando brilho ciano suave */}
      <pointLight
        position={[0, 2.2, 0]}
        color="#00f0ff"
        intensity={0.8}
        distance={8}
      />
    </group>
  );
}
