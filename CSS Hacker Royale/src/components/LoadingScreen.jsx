// ============================================================
//  LoadingScreen.jsx — Tela de Carregamento Cyberpunk
//  Lado Esquerdo: Contador numérico 0-100% com status do sistema
//  Lado Direito: Cabeça 3D do Robô com rotação contínua no eixo Y
// ============================================================

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Outlines } from '@react-three/drei';
import * as THREE from 'three';

// ── Modelo 3D da Cabeça Isolada com Rotação Y Contínua ────────
function RotatingRobotHead() {
  const pivotRef = useRef();
  const visorLightRef = useRef();
  const { scene } = useGLTF('/models/RoboAzulModel.glb');

  // Isola a malha da cabeça (Object_2006 / CabeçaRoboBranco) e centraliza o pivô
  const headData = useMemo(() => {
    let headMesh = null;
    scene.traverse((child) => {
      if (child.isMesh && (child.name === 'Object_2006' || child.name === 'CabeçaRoboBranco')) {
        headMesh = child;
      }
    });

    if (!headMesh) return null;

    const geom = headMesh.geometry.clone();
    geom.center(); // Centraliza os vértices em (0, 0, 0) para rotação perfeita no eixo
    geom.computeBoundingBox();

    const box = geom.boundingBox;
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    // Normaliza a escala para enquadramento perfeito na câmera
    const normScale = maxDim > 0 ? 1.85 / maxDim : 0.6;

    const mat = headMesh.material.clone();
    mat.transparent = true;
    mat.roughness = 0.35;
    mat.metalness = 0.85;

    return { geom, mat, normScale };
  }, [scene]);

  // Rotação contínua e suave no eixo Y
  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    if (pivotRef.current) {
      // Giro contínuo de 360 graus no eixo Y (Yaw)
      pivotRef.current.rotation.y += delta * 2.6;
    }

    if (visorLightRef.current) {
      // Pulsação sutil no visor ciano do robô
      visorLightRef.current.intensity = 2.4 + Math.sin(t * 4.5) * 0.6;
    }
  });

  if (!headData) return null;

  return (
    <group ref={pivotRef}>
      {/* Luz emissiva próxima ao visor/olhos */}
      <pointLight
        ref={visorLightRef}
        position={[0, 0.25, 0.95]}
        color="#00f0ff"
        intensity={2.8}
        distance={3.2}
      />

      {/* Orientação base com a rotação vertical correta do modelo */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <mesh
          geometry={headData.geom}
          material={headData.mat}
          scale={[headData.normScale, headData.normScale, headData.normScale]}
          castShadow
        >
          <Outlines thickness={2.4} color="#00f0ff" />
        </mesh>
      </group>
    </group>
  );
}

// ── Componente Principal de Tela de Carregamento ──────────────
export default function LoadingScreen({
  title = 'INICIALIZANDO SISTEMA HACKER',
  onOpaque,
  onComplete,
  minDuration = 1500, // Duração mínima de ~1.5s conforme escolha do usuário
}) {
  const [displayPercent, setDisplayPercent] = useState(0);
  const [isEntered, setIsEntered] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const onOpaqueRef = useRef(onOpaque);
  onOpaqueRef.current = onOpaque;

  useEffect(() => {
    let isMounted = true;
    const startTime = performance.now();
    let assetsConfirmed = false;

    // Dispara o Fade In no próximo frame
    const enterRaf = requestAnimationFrame(() => {
      if (isMounted) setIsEntered(true);
    });

    // Notifica que a tela de carregamento atingiu opacidade total (350ms)
    // Esse é o momento ideal para trocar a cena em segundo plano com cobertura 100%
    const opaqueTimer = setTimeout(() => {
      if (isMounted && onOpaqueRef.current) {
        onOpaqueRef.current();
      }
    }, 350);

    // 1. Verificação de fontes prontas no DOM
    const fontPromise = document.fonts ? document.fonts.ready : Promise.resolve();

    // 2. Pré-carregamento dos modelos Three.js essenciais
    useGLTF.preload('/models/RoboAzulModel.glb');
    useGLTF.preload('/models/RoboNPCModel.glb');

    // 3. Monitoramento do DefaultLoadingManager
    const loadingPromise = new Promise((resolve) => {
      if (THREE.DefaultLoadingManager.isLoading) {
        const prevOnLoad = THREE.DefaultLoadingManager.onLoad;
        THREE.DefaultLoadingManager.onLoad = () => {
          if (prevOnLoad) prevOnLoad();
          resolve();
        };
      } else {
        // Se nada estiver pendente no momento (cache rápido), aguarda um tick
        setTimeout(resolve, 80);
      }
    });

    Promise.all([fontPromise, loadingPromise]).then(() => {
      assetsConfirmed = true;
    });

    // 4. Loop de interpolação fluida do contador (0 a 100%)
    let animId;
    let completedTriggered = false;

    const tick = () => {
      if (!isMounted) return;
      const elapsed = performance.now() - startTime;
      const timeRatio = elapsed / minDuration;

      if (assetsConfirmed && timeRatio >= 1) {
        setDisplayPercent(100);
        if (!completedTriggered) {
          completedTriggered = true;
          // Pausa sutil de 120ms em 100% para o usuário registrar a conclusão
          setTimeout(() => {
            if (!isMounted) return;
            setIsExiting(true);
            // Duração do Fade Out (400ms)
            setTimeout(() => {
              if (isMounted && onComplete) onComplete();
            }, 400);
          }, 120);
        }
        return;
      }

      // Se ainda carregando assets além de minDuration, trava suavemente em 94%
      const cap = assetsConfirmed ? 100 : 94;
      const currentVal = Math.min(cap, Math.floor(timeRatio * 100));
      setDisplayPercent(currentVal);

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      isMounted = false;
      cancelAnimationFrame(enterRaf);
      clearTimeout(opaqueTimer);
      cancelAnimationFrame(animId);
    };
  }, [minDuration, onComplete]);

  // Mensagens dinâmicas de status técnico hacker
  const statusMessage = useMemo(() => {
    if (displayPercent < 22) return 'ESTABELECENDO CONEXÃO COM O NÚCLEO...';
    if (displayPercent < 45) return 'CARREGANDO MALHAS 3D & TEXTURAS...';
    if (displayPercent < 72) return 'SINTETIZANDO SHADERS & MATRIZ VOXEL...';
    if (displayPercent < 99) return 'SINCRONIZANDO ARENA DE COMBATE...';
    return 'SISTEMA PRONTO • INICIANDO EXECUÇÃO';
  }, [displayPercent]);

  return (
    <div
      className={`loading-screen-root ${
        isEntered ? 'loading-screen-entered' : ''
      } ${isExiting ? 'loading-screen-exit' : ''}`}
    >
      {/* Linhas CRT e vinheta atmosférica escura */}
      <div className="loading-crt-scanlines" />
      <div className="loading-vignette" />

      {/* Conteúdo centralizado */}
      <div className="loading-content-wrapper">

        {/* ── LADO ESQUERDO: Contador 0 a 100% & Status Neon ── */}
        <div className="loading-left-hud">
          <div className="loading-badge-row">
            <span className="loading-badge-tag">TACTICAL_LOADER</span>
            <span className="loading-badge-version">READY_CHECK // 01</span>
          </div>

          <h2 className="loading-title">{title}</h2>

          {/* Contador Numérico Neon em Grande Escala */}
          <div className="loading-counter-display">
            <span className="loading-digits">{displayPercent}</span>
            <span className="loading-percent-symbol">%</span>
          </div>

          {/* Barra de Progresso Cyberpunk */}
          <div className="loading-bar-track">
            <div
              className="loading-bar-fill"
              style={{ width: `${displayPercent}%` }}
            />
            <div
              className="loading-bar-flare"
              style={{ left: `${displayPercent}%` }}
            />
          </div>

          {/* Mensagem de Diagnóstico Técnico */}
          <div className="loading-status-box">
            <span className="loading-status-chevron">▶</span>
            <span className="loading-status-text">{statusMessage}</span>
          </div>

          <div className="loading-telemetry-row">
            <span className="loading-telem-item">
              <span className="telem-dot active" /> ASSETS: {displayPercent >= 45 ? 'OK' : 'SYNC'}
            </span>
            <span className="loading-telem-item">
              <span className="telem-dot active" /> SHADERS: {displayPercent >= 72 ? 'COMPILED' : 'BUILD'}
            </span>
            <span className="loading-telem-item">
              <span className="telem-dot active" /> BUFFER: 100%
            </span>
          </div>
        </div>

        {/* ── LADO DIREITO: Cabeça 3D do Robô com Rotação Y ── */}
        <div className="loading-robot-canvas-box">
          {/* Anel cibernético sutil de fundo */}
          <div className="loading-canvas-glow-ring" />
          <div className="loading-canvas-reticle" />

          <Canvas
            camera={{ position: [0, 0, 3.2], fov: 42 }}
            gl={{ antialias: true, alpha: true }}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Iluminação Chiaroscuro ciano/azul */}
            <ambientLight intensity={0.35} color="#08182b" />

            <spotLight
              position={[3.0, 3.2, 2.5]}
              target-position={[0, 0, 0]}
              color="#bbf2ff"
              intensity={4.2}
              angle={0.65}
              penumbra={0.6}
            />

            <directionalLight
              position={[-3.0, -1.0, 1.5]}
              color="#005577"
              intensity={1.2}
            />

            <pointLight
              position={[0, 2.5, 1.0]}
              color="#00a8ff"
              intensity={1.0}
              distance={5}
            />

            <Suspense fallback={null}>
              <RotatingRobotHead />
            </Suspense>
          </Canvas>

          {/* Marcador de enquadramento da cabeça */}
          <span className="loading-frame-corner top-left" />
          <span className="loading-frame-corner top-right" />
          <span className="loading-frame-corner bottom-left" />
          <span className="loading-frame-corner bottom-right" />
        </div>

      </div>
    </div>
  );
}

useGLTF.preload('/models/RoboAzulModel.glb');
useGLTF.preload('/models/RoboNPCModel.glb');
