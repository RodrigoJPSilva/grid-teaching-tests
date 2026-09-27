// ============================================================
//  ArenaTV.jsx — Televisão 3D na Arena com Haste e Moldura
//  Referência Imagem 1: Monitor widescreen em suporte/haste
//  Referência Imagem 2: Alerta "PERIGO" piscando em loop a 0.2s
//  Referência Imagem 3: Reposicionamento para 2D no canto superior
// ============================================================

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

const CELL_SIZE = 1.2;

export default function ArenaTV({
  cameraMode = '3D', // '3D' | '2D' | 'livre'
  gridSize = 10,
  tutorialStep = 0, // 0: inativo/HUD, 1: dica mover, 2: dica atacar, 3: "agora está valendo!", 4: concluído
  isWarningActive = false,
  playerHp = 3,
  enemiesCount = 1,
  currentLevel = 1,
  difficulty = 'Facil'
}) {
  const groupRef = useRef();

  const halfTotal = (gridSize * CELL_SIZE) / 2;
  const wallOffset = halfTotal + 0.15;

  // Posições alvo em 3D e 2D
  // 3D: Montada na parede Norte com haste fixada, visível de frente
  // 2D: Canto superior esquerdo fora da arena (área vermelha da Imagem 3), virada para cima
  const targetTransform = useMemo(() => {
    if (cameraMode === '2D') {
      return {
        pos: new THREE.Vector3(-halfTotal - 1.8, 0.45, -halfTotal + 2.0),
        rot: new THREE.Euler(-Math.PI / 2, 0, 0),
        poleVisible: false,
        scale: 0.95
      };
    }

    // Modo 3D e Livre: Parede Norte da arena
    return {
      pos: new THREE.Vector3(-halfTotal * 0.35, 2.3, -wallOffset + 0.08),
      rot: new THREE.Euler(0.12, 0, 0),
      poleVisible: true,
      scale: 1.0
    };
  }, [cameraMode, halfTotal, wallOffset]);

  // Transição suave (LERP) entre posições e rotações de câmera
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const speed = delta * 6;

    groupRef.current.position.lerp(targetTransform.pos, speed);

    // Interpolação suave de rotação usando quaternions
    const currentQ = groupRef.current.quaternion;
    const targetQ = new THREE.Quaternion().setFromEuler(targetTransform.rot);
    currentQ.slerp(targetQ, speed);

    const targetScale = new THREE.Vector3(targetTransform.scale, targetTransform.scale, targetTransform.scale);
    groupRef.current.scale.lerp(targetScale, speed);
  });

  const TV_WIDTH = 3.2;
  const TV_HEIGHT = 1.8;
  const TV_DEPTH = 0.08;
  const POLE_HEIGHT = 2.4;

  return (
    <group ref={groupRef} position={targetTransform.pos} rotation={targetTransform.rot}>
      {/* ── Moldura da TV (Bezel Escuro Metálico) ───────────── */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[TV_WIDTH, TV_HEIGHT, TV_DEPTH]} />
        <meshStandardMaterial color="#0c1117" roughness={0.35} metalness={0.8} />
      </mesh>

      {/* Friso Metálico de Contorno */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(TV_WIDTH + 0.02, TV_HEIGHT + 0.02, TV_DEPTH + 0.01)]} />
        <lineBasicMaterial color="#00ffcc" opacity={0.4} transparent />
      </lineSegments>

      {/* ── Painel / Tela da TV (Preto Emissivo) ─────────────── */}
      <mesh position={[0, 0, TV_DEPTH / 2 + 0.002]}>
        <planeGeometry args={[TV_WIDTH - 0.12, TV_HEIGHT - 0.12]} />
        <meshBasicMaterial color="#03080f" />
      </mesh>

      {/* ── Haste / Pedestal de Montagem (Imagem 1) ─────────── */}
      <group position={[0, -TV_HEIGHT / 2 - POLE_HEIGHT / 2, -0.02]}>
        <mesh>
          <cylinderGeometry args={[0.045, 0.045, POLE_HEIGHT, 16]} />
          <meshStandardMaterial color="#1a222d" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Base de fixação */}
        <mesh position={[0, -POLE_HEIGHT / 2 + 0.05, 0]}>
          <boxGeometry args={[0.25, 0.1, 0.25]} />
          <meshStandardMaterial color="#0d141d" roughness={0.5} metalness={0.6} />
        </mesh>
      </group>

      {/* ── Interface da Tela da TV (HTML Transform Nítido) ─── */}
      <Html
        transform
        distanceFactor={2.4}
        position={[0, 0, TV_DEPTH / 2 + 0.008]}
        pointerEvents="none"
      >
        <div style={{
          width: '420px',
          height: '235px',
          background: isWarningActive ? '#150000' : 'rgba(3, 7, 18, 0.94)',
          border: isWarningActive ? '2px solid #ff0033' : '2px solid #00f0ff',
          boxShadow: isWarningActive ? '0 0 25px rgba(255, 0, 50, 0.6), inset 0 0 20px rgba(255, 0, 0, 0.3)' : '0 0 20px rgba(0, 240, 255, 0.3), inset 0 0 15px rgba(0, 200, 255, 0.1)',
          borderRadius: '4px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '10px',
          boxSizing: 'border-box',
          fontFamily: "'Share Tech Mono', 'Orbitron', monospace",
          color: '#ffffff',
          position: 'relative',
          userSelect: 'none'
        }}>
          {/* Scanlines CRT na tela */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.35) 0px, rgba(0, 0, 0, 0.35) 1px, transparent 1px, transparent 3px)',
            pointerEvents: 'none',
            zIndex: 10
          }} />

          {/* ═══════════════════════════════════════════════════════
              ESTADO 1: ALERTA "PERIGO" PISCANTE A 0.2s (MEGAMAN ZX ADVENT)
             ═══════════════════════════════════════════════════════ */}
          {isWarningActive ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 5,
              animation: 'perigoBlink 0.2s infinite steps(2, start)'
            }}>
              {/* Barra superior de perigo com listras de contenção */}
              <div style={{
                width: '100%',
                height: '14px',
                background: 'repeating-linear-gradient(45deg, #ff0033, #ff0033 10px, #1a0000 10px, #1a0000 20px)',
                borderBottom: '2px solid #ff0033',
                marginBottom: '10px'
              }} />

              {/* Título de Perigo Estilizado */}
              <div style={{
                fontSize: '44px',
                fontWeight: '900',
                letterSpacing: '8px',
                color: '#ff1133',
                textShadow: '0 0 15px #ff0033, 0 0 30px #ff0000',
                lineHeight: '1'
              }}>
                PERIGO
              </div>

              <div style={{
                fontSize: '12px',
                color: '#ff8899',
                letterSpacing: '3px',
                marginTop: '6px',
                fontWeight: 'bold'
              }}>
                // BOSS DETECTADO //
              </div>

              {/* Barra inferior de perigo */}
              <div style={{
                width: '100%',
                height: '14px',
                background: 'repeating-linear-gradient(-45deg, #ff0033, #ff0033 10px, #1a0000 10px, #1a0000 20px)',
                borderTop: '2px solid #ff0033',
                marginTop: '10px'
              }} />
            </div>
          ) : tutorialStep === 1 ? (
            /* ═══════════════════════════════════════════════════════
               ESTADO 2: TUTORIAL PASSO 1 — MOVIMENTO
               ═══════════════════════════════════════════════════════ */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', zIndex: 5 }}>
              <div style={{
                background: 'rgba(0, 240, 255, 0.15)',
                padding: '4px 8px',
                borderLeft: '4px solid #00f0ff',
                fontSize: '13px',
                fontWeight: 'bold',
                color: '#00ffff',
                letterSpacing: '1px'
              }}>
                TUTORIAL HACKER [1/2]
              </div>

              <div style={{ fontSize: '12px', color: '#cceeff', margin: '8px 0 4px 0' }}>
                Para mover seu robô, use a sintaxe CSS:
              </div>

              <div style={{
                background: '#040b14',
                border: '1px solid #1a3344',
                padding: '6px 10px',
                borderRadius: '3px',
                fontFamily: 'monospace',
                fontSize: '13px',
                color: '#00ff88',
                lineHeight: '1.4'
              }}>
                <div><span style={{ color: '#ff77aa' }}>.player</span> &#123;</div>
                <div style={{ paddingLeft: '12px' }}>column: <span style={{ color: '#ffd700' }}>2</span>;</div>
                <div style={{ paddingLeft: '12px' }}>row: <span style={{ color: '#ffd700' }}>2</span>;</div>
                <div>&#125;</div>
              </div>

              <div style={{
                marginTop: 'auto',
                fontSize: '11px',
                color: '#00ddaa',
                textAlign: 'center',
                animation: 'pulseText 1s infinite alternate'
              }}>
                ▶ Digite e clique em "RODAR CÓDIGO"!
              </div>
            </div>
          ) : tutorialStep === 2 ? (
            /* ═══════════════════════════════════════════════════════
               ESTADO 3: TUTORIAL PASSO 2 — ATAQUE
               ═══════════════════════════════════════════════════════ */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', zIndex: 5 }}>
              <div style={{
                background: 'rgba(255, 170, 0, 0.15)',
                padding: '4px 8px',
                borderLeft: '4px solid #ffaa00',
                fontSize: '13px',
                fontWeight: 'bold',
                color: '#ffaa00',
                letterSpacing: '1px'
              }}>
                TUTORIAL HACKER [2/2]
              </div>

              <div style={{ fontSize: '12px', color: '#ffeecc', margin: '8px 0 4px 0' }}>
                Excelente! Agora mire no robô inimigo:
              </div>

              <div style={{
                background: '#040b14',
                border: '1px solid #332a14',
                padding: '6px 10px',
                borderRadius: '3px',
                fontFamily: 'monospace',
                fontSize: '13px',
                color: '#ffbb33',
                lineHeight: '1.4'
              }}>
                <div><span style={{ color: '#ff77aa' }}>.bomba</span> &#123;</div>
                <div style={{ paddingLeft: '12px' }}>column: <span style={{ color: '#ffd700' }}>4</span>;</div>
                <div style={{ paddingLeft: '12px' }}>row: <span style={{ color: '#ffd700' }}>4</span>;</div>
                <div>&#125;</div>
              </div>

              <div style={{
                marginTop: 'auto',
                fontSize: '11px',
                color: '#ffbb33',
                textAlign: 'center',
                animation: 'pulseText 1s infinite alternate'
              }}>
                ▶ Lance a bomba ou sniper para atacar!
              </div>
            </div>
          ) : tutorialStep === 3 ? (
            /* ═══════════════════════════════════════════════════════
               ESTADO 4: AVISO "AGORA ESTÁ VALENDO!"
               ═══════════════════════════════════════════════════════ */
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              zIndex: 5
            }}>
              <div style={{
                fontSize: '13px',
                color: '#00ffcc',
                letterSpacing: '2px',
                fontWeight: 'bold',
                marginBottom: '8px'
              }}>
                ★ DICAS CONCLUÍDAS! ★
              </div>

              <div style={{
                fontSize: '24px',
                fontWeight: '900',
                color: '#00ff88',
                textShadow: '0 0 15px rgba(0, 255, 136, 0.8)',
                letterSpacing: '3px',
                lineHeight: '1.2',
                animation: 'pulseText 0.5s infinite alternate'
              }}>
                AGORA ESTÁ<br />VALENDO!
              </div>

              <div style={{
                fontSize: '11px',
                color: '#88eebb',
                marginTop: '10px'
              }}>
                SISTEMA EM MODO DE COMBATE REAL
              </div>
            </div>
          ) : (
            /* ═══════════════════════════════════════════════════════
               ESTADO 5: MENU DE HUD NA TV (VIDA, INIMIGOS, FASE)
               ═══════════════════════════════════════════════════════ */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 5 }}>
              {/* Cabeçalho com indicador de status */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #1a3344',
                paddingBottom: '4px'
              }}>
                <span style={{ fontSize: '11px', color: '#00f0ff', letterSpacing: '2px', fontWeight: 'bold' }}>
                  ARENA MONITOR v2.4
                </span>
                <span style={{
                  fontSize: '10px',
                  color: '#00ff88',
                  background: 'rgba(0, 255, 136, 0.15)',
                  padding: '2px 6px',
                  borderRadius: '2px',
                  border: '1px solid #00ff88'
                }}>
                  ONLINE
                </span>
              </div>

              {/* Status principal em cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: 'auto 0' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(0, 255, 136, 0.1)',
                  padding: '6px 12px',
                  borderRadius: '3px',
                  borderLeft: '4px solid #00ff88'
                }}>
                  <span style={{ fontSize: '13px', color: '#00ff88', fontWeight: 'bold' }}>♥ HP JOGADOR</span>
                  <span style={{ fontSize: '16px', color: '#ffffff', fontWeight: 'bold' }}>{playerHp} / 3</span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255, 50, 80, 0.1)',
                  padding: '6px 12px',
                  borderRadius: '3px',
                  borderLeft: '4px solid #ff3355'
                }}>
                  <span style={{ fontSize: '13px', color: '#ff5577', fontWeight: 'bold' }}>💀 INIMIGOS VIVOS</span>
                  <span style={{ fontSize: '16px', color: '#ffffff', fontWeight: 'bold' }}>{enemiesCount}</span>
                </div>
              </div>

              {/* Rodapé com Fase e Dificuldade */}
              <div style={{
                textAlign: 'center',
                fontSize: '12px',
                color: '#77aacc',
                borderTop: '1px solid #1a3344',
                paddingTop: '4px'
              }}>
                [ Fase {currentLevel} — {difficulty} ]
              </div>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}
