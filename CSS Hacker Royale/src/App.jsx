// ============================================================
//  App.jsx — Grid Battlegrounds: Layout Principal
//  Editor de código CSS + Arena 3D + Cheatsheet
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import Arena3D from './components/Arena3D';
import { useGameState } from './hooks/useGameState';
import { parsePlayerCode, getActiveEditorClass } from './utils/GameEngine';
import MainMenu from './components/MainMenu';
import './App.css';

const EMPTY_CSS = `.player {

}

.bomba {

}

.sniper {

}`;

// ── Componente Principal ────────────────────────────────────
export default function App() {
  const [cssCode, setCssCode] = useState(EMPTY_CSS);
  const [committedCssCode, setCommittedCssCode] = useState(EMPTY_CSS); // Usado apenas para executar ações

  const [bombCountdown, setBombCountdown] = useState(0);
  const [activeTool, setActiveTool] = useState(null);

  const [bombThrowTrigger, setBombThrowTrigger] = useState(0);
  const [sniperShootTrigger, setSniperShootTrigger] = useState(0);

  // User Preference
  const [shouldClearCode, setShouldClearCode] = useState(true);

  // States for the Cheatsheet and Alerts
  const [cheatsheetHovered, setCheatsheetHovered] = useState(false);
  const [clickedTile, setClickedTile] = useState(null); // {col, row}
  const [gameAlert, setGameAlert] = useState(null);

  useEffect(() => {
    if (gameAlert) {
      const timer = setTimeout(() => setGameAlert(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [gameAlert]);

  const gameState = useGameState();

  // ── Ação Global: Rodar Código ──────────────────────────────
  const handleExecuteAll = () => {
    if (gameState.phase !== 'playing') return;

    const parsedCurrent = parsePlayerCode(cssCode);
    const parsedCommitted = parsePlayerCode(committedCssCode);

    let targetCol = parsedCurrent.player?.col;
    let targetRow = parsedCurrent.player?.row;

    // 1. Clamping se estiver fora do grid disponível (-1 Vida)
    if (targetCol !== undefined && targetRow !== undefined) {
      if (targetCol < 1 || targetCol > gameState.arenaSize || targetRow < 1 || targetRow > gameState.arenaSize) {
        targetCol = Math.max(1, Math.min(gameState.arenaSize, targetCol));
        targetRow = Math.max(1, Math.min(gameState.arenaSize, targetRow));
        gameState.applyPlayerDamage(1);
        setGameAlert("⚠️ FORA DA ARENA! -1 Vida");
      }

      // 2. Checagem de Não Sobreposição com Inimigos/Boss
      let collision = false;
      for (const enemy of Object.values(gameState.enemies)) {
        if (enemy.hp <= 0) continue;
        const [er, ec] = enemy.position;
        const [ew, eh] = enemy.size;
        if (targetRow >= er && targetRow < er + eh && targetCol >= ec && targetCol < ec + ew) {
          collision = true;
          break;
        }
      }

      if (collision) {
        setGameAlert("⛔ ESPAÇO OCUPADO! Movimento cancelado.");
        targetCol = gameState.lastPlayerPos.current.col;
        targetRow = gameState.lastPlayerPos.current.row;
      }
    }

    // Monta o CSS efetivo que será aplicado
    let finalCssCode = cssCode;
    if (targetCol !== undefined && targetRow !== undefined) {
      finalCssCode = `.player {\n  grid-column: ${targetCol};\n  grid-row: ${targetRow};\n}\n` +
        (parsedCurrent.bomba ? `.bomba {\n  grid-column: ${parsedCurrent.bomba.col};\n  grid-row: ${parsedCurrent.bomba.row};\n}\n` : '') +
        (parsedCurrent.sniper ? `.sniper {\n  grid-column: ${parsedCurrent.sniper.col};\n  grid-row: ${parsedCurrent.sniper.row};\n}\n` : '');
    }

    const playerMoved =
      targetCol !== parsedCommitted.player?.col ||
      targetRow !== parsedCommitted.player?.row;

    // Aplica o movimento imediatamente visualmente no 3D
    setCommittedCssCode(finalCssCode);

    let delay = 0;
    if (playerMoved) {
      delay = 800; // Tempo de animação de teleporte
    }

    // Após o teleporte, processa os ataques se existirem no CSS atual
    setTimeout(() => {
      if (parsedCurrent.bomba?.col && parsedCurrent.bomba?.row && bombCountdown === 0) {
        setBombCountdown(5);
        setBombThrowTrigger(Date.now());
      }

      if (parsedCurrent.sniper?.col && parsedCurrent.sniper?.row) {
        gameState.fireSniper(parsedCurrent.sniper.col, parsedCurrent.sniper.row);
        setSniperShootTrigger(Date.now());
      }

      // Apaga o código após a execução (se a opção estiver ativa)
      if (shouldClearCode) {
        setCssCode(EMPTY_CSS);
      }
    }, delay);
  };

  // ── Atalhos Globais ───────────────────────────────────────
  useEffect(() => {
    if (gameState.phase === 'menu') return;

    const handleKeyDown = (e) => {
      // Ctrl + Enter: Rodar Código
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleExecuteAll();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.phase, cssCode, committedCssCode, bombCountdown]);

  // ── 20s Bot Timer ─────────────────────────────────────────
  useEffect(() => {
    if (gameState.phase === 'menu') return;
    const id = setInterval(() => gameState.processBotTurns(), 20000);
    return () => clearInterval(id);
  }, [gameState.phase, gameState.processBotTurns]);

  // ── Bomba Countdown ───────────────────────────────────────
  const isCountingRef = useRef(false);
  useEffect(() => {
    if (bombCountdown > 0) {
      isCountingRef.current = true;
      const t = setTimeout(() => setBombCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    } else if (bombCountdown === 0 && isCountingRef.current) {
      isCountingRef.current = false;
      const parsed = parsePlayerCode(committedCssCode);
      if (parsed.bomba?.col && parsed.bomba?.row) {
        gameState.fireBomb(parsed.bomba.col, parsed.bomba.row);
      }
    }
  }, [bombCountdown, committedCssCode, gameState.fireBomb]);

  // ── Interação com Editor ──────────────────────────────────
  const handleEditorInteraction = (e) => {
    const idx = e.target.selectionStart;
    const active = getActiveEditorClass(cssCode, idx);
    setActiveTool(active);
  };

  // Resolve Tool do Robô
  const currentRobotTool = cheatsheetHovered ? 'papel' : activeTool;

  // ── Render ────────────────────────────────────────────────
  if (gameState.phase === 'menu') {
    return (
      <MainMenu
        onStart={gameState.startGame}
        shouldClearCode={shouldClearCode}
        setShouldClearCode={setShouldClearCode}
      />
    );
  }

  // Resolve Boss Info
  const activeBoss = Object.values(gameState.enemies).find(e => e.hp > 0 && e.type === 'boss');

  return (
    <div className="app-root">

      {/* HUD Superior (Vidas) */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 100, display: 'flex', gap: '20px', color: '#00ddaa', fontFamily: 'monospace', fontSize: '18px', background: 'rgba(0,0,0,0.7)', padding: '10px 20px', borderRadius: '4px', alignItems: 'center' }}>
        <div>♥ HP JOGADOR: {gameState.playerHp}/3</div>
        <div>💀 INIMIGOS VIVOS: {Object.values(gameState.enemies).filter(e => e.hp > 0).length}</div>
        <div style={{ color: '#fff', fontSize: '14px', marginLeft: '10px' }}>[Fase {gameState.currentLevel} - {gameState.difficulty}]</div>
      </div>

      {/* Alerta de Jogo (Clamp / Colisão) */}
      {gameAlert && (
        <div style={{
          position: 'absolute', top: '75px', left: '20px', zIndex: 110,
          background: 'rgba(255, 30, 30, 0.85)', color: '#ffffff',
          fontFamily: 'monospace', fontWeight: 'bold', fontSize: '16px',
          padding: '8px 16px', borderRadius: '4px', border: '1px solid #ff5555',
          boxShadow: '0 0 15px rgba(255, 0, 0, 0.6)',
          animation: 'shake 0.3s infinite alternate'
        }}>
          {gameAlert}
        </div>
      )}

      {/* HUD Boss */}
      {activeBoss && (
        <div style={{
          position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
          width: '50%', zIndex: 100, background: 'rgba(0,0,0,0.8)', padding: '10px',
          border: '2px solid #BC0001', borderRadius: '4px',
          animation: 'shake 0.5s infinite alternate'
        }}>
          <div style={{ color: '#BC0001', textAlign: 'center', fontWeight: 'bold', fontSize: '20px', marginBottom: '5px' }}>
            {activeBoss.name}
          </div>
          <div style={{ width: '100%', height: '20px', background: '#333' }}>
            <div style={{
              width: `${(activeBoss.hp / activeBoss.maxHp) * 100}%`,
              height: '100%', background: '#BC0001', transition: 'width 0.2s'
            }} />
          </div>
        </div>
      )}

      {gameState.phase === 'gameover' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(50,0,0,0.8)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ff2222' }}>
          <h1>GAME OVER</h1>
          <button className="action-btn" onClick={() => window.location.reload()} style={{ marginTop: '20px' }}>REINICIAR SISTEMA</button>
        </div>
      )}

      {gameState.phase === 'victory' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,50,20,0.8)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#00ffcc' }}>
          <h1>SISTEMA HACKEADO COM SUCESSO!</h1>
          <p>Você concluiu a dificuldade {gameState.difficulty}</p>
          <button className="action-btn" onClick={() => window.location.reload()} style={{ marginTop: '20px' }}>VOLTAR AO MENU</button>
        </div>
      )}

      {/* SIDEBAR: Editor CSS */}
      <div className="sidebar" style={{ pointerEvents: cheatsheetHovered ? 'none' : 'auto', opacity: cheatsheetHovered ? 0.5 : 1 }}>
        <div className="editor-header">
          <span className="editor-icon">{'</>'}</span>
          <span>EDITOR CSS</span>
        </div>

        <textarea
          className="editor-textarea"
          value={cssCode}
          onChange={e => setCssCode(e.target.value)}
          onKeyUp={handleEditorInteraction}
          onClick={handleEditorInteraction}
          spellCheck="false"
        />

        <div className="editor-actions">
          <button className="action-btn execute-btn" onClick={handleExecuteAll}>
            ▶ RODAR CÓDIGO (Ctrl+Enter)
          </button>

          <button className="action-btn teleport-btn" onClick={handleExecuteAll}>
            🏃‍♂️ TELEPORTAR
          </button>

          <button
            className="action-btn bomb-btn"
            onClick={handleExecuteAll}
            disabled={bombCountdown > 0}
          >
            {bombCountdown > 0
              ? `💣 DETONANDO: ${bombCountdown}s`
              : '💣 DEPLOY BOMBA'}
          </button>

          <button className="action-btn sniper-btn" onClick={handleExecuteAll}>
            🎯 DISPARAR SNIPER
          </button>
        </div>
      </div>

      {/* CANVAS 3D */}
      <div className="canvas-container">
        <Arena3D
          cssCode={committedCssCode}
          previewCode={cssCode}
          enemies={gameState.enemies}
          playerHp={gameState.playerHp}
          activeTool={currentRobotTool}
          playerRevealed={gameState.playerRevealed}
          setPlayerRevealed={gameState.setPlayerRevealed}
          lastPlayerPos={gameState.lastPlayerPos}
          bombCountdown={bombCountdown}
          bombThrowTrigger={bombThrowTrigger}
          sniperShootTrigger={sniperShootTrigger}
          arenaSize={gameState.arenaSize}
          onTileClick={(col, row) => setClickedTile({ col, row })}
          incomingBombs={gameState.incomingBombs}
        />
      </div>

      {/* Folha de Dicas (Cheatsheet) */}
      <div
        className="cheatsheet-container"
        onMouseEnter={() => setCheatsheetHovered(true)}
        onMouseLeave={() => setCheatsheetHovered(false)}
      >
        <div className="cheatsheet-arrow">◀</div>
        <div className="cheatsheet-content">
          <h2 style={{ fontSize: '18px', marginBottom: '10px', textDecoration: 'underline' }}>Guia Hacker</h2>
          <p>Para se mover, use:</p>
          <p><strong>.player</strong> &#123;</p>
          <p>&nbsp;&nbsp;grid-column: X;</p>
          <p>&nbsp;&nbsp;grid-row: Y;</p>
          <p>&#125;</p>
          <br />
          <p>A <strong>.bomba</strong> atinge área 3x3 (-1 Vida).</p>
          <p>A <strong>.sniper</strong> atinge apenas o alvo final (-3 Vidas).</p>
          <br />
          <br />
          <p style={{ color: '#0055cc', fontStyle: 'italic', fontSize: '12px' }}>
            Dica secreta: clique em um bloco e volte aqui...
          </p>
          {clickedTile && (
            <p style={{ color: '#aa0000', fontWeight: 'bold' }}>
              &gt; Bloco clicado: [grid-column: {clickedTile.col}; grid-row: {clickedTile.row}]
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
