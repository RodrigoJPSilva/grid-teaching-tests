// ============================================================
//  DialogueBox.jsx — Caixa de Diálogo do Personagem
//  Substitui a TV e implementa o design com:
//  - Moldura e divisor em VERMELHO
//  - Área da cabeça do robô com destaque em AMARELO
//  - Texto do diálogo em VERDE NEON
// ============================================================

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Outlines } from '@react-three/drei';
import * as THREE from 'three';
import styles from './DialogueBox.module.css';

function RobotHeadAvatar() {
  const headRef = useRef();
  const visorLightRef = useRef();
  const { scene } = useGLTF('/models/RoboAzulModel.glb');

  const { headGeo, headMat } = useMemo(() => {
    let geo = null;
    let mat = null;

    scene.traverse((child) => {
      if (child.isMesh && (child.name === 'Object_2006' || child.name === 'CabeçaRoboBranco')) {
        geo = child.geometry.clone();
        geo.center(); // Centraliza os vértices perfeitamente na origem [0, 0, 0]
        mat = child.material.clone();
        mat.roughness = 0.35;
        mat.metalness = 0.8;
      }
    });

    return { headGeo: geo, headMat: mat };
  }, [scene]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (headRef.current) {
      // Movimento sutil da cabeça enquanto fala
      headRef.current.rotation.z = Math.sin(t * 2.2) * 0.15;
      headRef.current.rotation.x = -Math.PI / 2 + Math.sin(t * 3.0) * 0.1;
      headRef.current.rotation.y = Math.cos(t * 1.5) * 0.1;
    }
    if (visorLightRef.current) {
      visorLightRef.current.intensity = 1.8 + Math.sin(t * 5) * 0.5;
    }
  });

  const SCALE = 0.14;

  if (!headGeo || !headMat) return null;

  return (
    <group position={[0, 0, 0]}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 3]} intensity={2.8} color="#d4f4ff" />
      <pointLight ref={visorLightRef} position={[0, 0.2, 1.2]} color="#00f0ff" intensity={2.2} />

      <group ref={headRef} scale={[SCALE, SCALE, SCALE]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh
          geometry={headGeo}
          material={headMat}
          position={[0, 0, 0]}
        >
          <Outlines thickness={2} color="#00ffcc" />
        </mesh>
      </group>
    </group>
  );
}

export default function DialogueBox({
  message = '',
  title = 'AI TACTICAL ADVISOR',
  stepLabel = null,
  onAction = null,
  actionLabel = 'CONTINUAR ▶',
  isTyping = false,
}) {
  const [displayedText, setDisplayedText] = useState('');

  // Efeito de digitação suave estilo terminal
  useEffect(() => {
    setDisplayedText('');
    let idx = 0;
    const interval = setInterval(() => {
      idx += 2;
      if (idx >= message.length) {
        setDisplayedText(message);
        clearInterval(interval);
      } else {
        setDisplayedText(message.slice(0, idx));
      }
    }, 18);

    return () => clearInterval(interval);
  }, [message]);

  return (
    <div className={styles.dialogueRoot}>
      {/* ── Seção da Cabeça do Robô (Esquerda com borda vermelha e interior amarelo) ── */}
      <div className={styles.avatarSection}>
        <div className={styles.avatarYellowFrame}>
          <div className={styles.avatarCanvasWrapper}>
            <Canvas
              camera={{ position: [0, 0, 2.2], fov: 45 }}
              gl={{ antialias: true, alpha: true }}
              style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
            >
              <RobotHeadAvatar />
            </Canvas>
          </div>
        </div>
      </div>

      {/* ── Divisória Vertical em Vermelho ── */}
      <div className={styles.redDivider} />

      {/* ── Seção de Texto (Direita com texto verde) ── */}
      <div className={styles.contentSection}>
        <div className={styles.headerRow}>
          <div className={styles.speakerBadge}>
            <span className={styles.speakerDot} />
            <span>{title}</span>
          </div>
          {stepLabel && <div className={styles.stepBadge}>{stepLabel}</div>}
        </div>

        <div className={styles.messageText}>
          {displayedText}
        </div>

        <div className={styles.footerRow}>
          {onAction && (
            <button
              type="button"
              className={styles.actionButton}
              onClick={onAction}
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
