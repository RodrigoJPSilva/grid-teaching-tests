// ============================================================
//  App.jsx — Grid Battlegrounds: Layout Principal
//  Editor de código CSS + Arena 3D + Cheatsheet
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Arena3D from './components/Arena3D';
import { useGameState } from './hooks/useGameState';
import { parsePlayerCode, getActiveEditorClass } from './utils/GameEngine';
import MainMenu from './components/MainMenu';
import DemoArena from './components/DemoArena';
import LoadingScreen from './components/LoadingScreen';
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
  const [committedCssCode, setCommittedCssCode] = useState(EMPTY_CSS);

  const [bombCountdown, setBombCountdown] = useState(0);
  const [activeTool, setActiveTool] = useState(null);

  const [bombThrowTrigger, setBombThrowTrigger] = useState(0);
  const [sniperShootTrigger, setSniperShootTrigger] = useState(0);

  // User Preference
  const [shouldClearCode, setShouldClearCode] = useState(false);

  // States for the Cheatsheet and Alerts
  const [cheatsheetHovered, setCheatsheetHovered] = useState(false);
  const [clickedTile, setClickedTile] = useState(null);
  const [gameAlert, setGameAlert] = useState(null);

  // Demonstrações ativas e timing de spawn
  const [activeDemo, setActiveDemo] = useState(null);
  const [playerSpawnTime, setPlayerSpawnTime] = useState(0);
  const [bossIntroState, setBossIntroState] = useState({
    letterbox: false,
    showHp: false,
    hpFillPercent: undefined,
    isIntroActive: false
  });

  // ── Sistema de Loading com Robô 3D e HUD 0-100% ────────────
  const [loadingState, setLoadingState] = useState({
    active: true, // Inicia ativo no boot inicial da aplicação
    key: 'boot',
    title: 'INICIALIZANDO SISTEMA HACKER',
    minDuration: 1500,
    onOpaque: null,
    onComplete: () => {
      setLoadingState(prev => ({ ...prev, active: false }));
    }
  });

  useEffect(() => {
    if (gameAlert) {
      const timer = setTimeout(() => setGameAlert(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [gameAlert]);

  const gameState = useGameState();

  useEffect(() => {
    window.__triggerBossJump = () => {
      gameState.triggerBossJump();
    };
    window.__gameState = gameState;
    return () => {
      delete window.__triggerBossJump;
      delete window.__gameState;
    };
  }, [gameState]);

  const handleStartGame = (difficulty, gridSize) => {
    setLoadingState({
      active: true,
      key: `game-${Date.now()}`,
      title: `CARREGANDO ARENA [${difficulty.toUpperCase()}]`,
      minDuration: 1500,
      onOpaque: () => {
        gameState.startGame(difficulty, gridSize);
      },
      onComplete: () => {
        setLoadingState(prev => ({ ...prev, active: false }));
        // 1 segundo a mais para iniciar as animações de surgimento dos robôs após o término do loader
        const spawnStart = Date.now() + 1000;
        setPlayerSpawnTime(spawnStart);
        gameState.resetSpawnTimes(spawnStart);
      }
    });
  };

  const handleOpenDemo = (demoType) => {
    setLoadingState({
      active: true,
      key: `demo-${demoType}-${Date.now()}`,
      title: `SIMULAÇÃO TÁTICA: ${demoType.toUpperCase()}`,
      minDuration: 1500,
      onOpaque: () => {
        setActiveDemo(demoType);
      },
      onComplete: () => {
        setLoadingState(prev => ({ ...prev, active: false }));
      }
    });
  };

  const handleCloseDemo = () => {
    setLoadingState({
      active: true,
      key: `menu-${Date.now()}`,
      title: 'RETORNANDO AO MENU PRINCIPAL',
      minDuration: 1500,
      onOpaque: () => {
        setActiveDemo(null);
      },
      onComplete: () => {
        setLoadingState(prev => ({ ...prev, active: false }));
      }
    });
  };

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
        gameState.applyPlayerDamage(1);
        setGameAlert("💥 COLISÃO COM INIMIGO! -1 Vida");
        targetCol = gameState.lastPlayerPos.current.col;
        targetRow = gameState.lastPlayerPos.current.row;
      }

      gameState.lastPlayerPos.current = { col: targetCol, row: targetRow };
      gameState.setLastParsedPos({ col: targetCol, row: targetRow });
    }

    // 3. Disparo de Armas
    if (parsedCurrent.bomba?.col && parsedCurrent.bomba?.row) {
      if (!parsedCommitted.bomba || parsedCurrent.bomba.col !== parsedCommitted.bomba.col || parsedCurrent.bomba.row !== parsedCommitted.bomba.row) {
        setBombCountdown(5);
        setBombThrowTrigger(Date.now());
      }
    }

    if (parsedCurrent.sniper?.col && parsedCurrent.sniper?.row) {
      if (!parsedCommitted.sniper || parsedCurrent.sniper.col !== parsedCommitted.sniper.col || parsedCurrent.sniper.row !== parsedCommitted.sniper.row) {
        setSniperShootTrigger(Date.now());
        gameState.fireSniper(parsedCurrent.sniper.col, parsedCurrent.sniper.row);
      }
    }

    setCommittedCssCode(cssCode);
    if (shouldClearCode) {
      setCssCode(EMPTY_CSS);
      setActiveTool(null);
    }
  };

  // Keyboard shortcut Ctrl+Enter
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleExecuteAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Bomba Countdown
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

  const handleEditorInteraction = (e) => {
    const idx = e.target.selectionStart;
    const active = getActiveEditorClass(cssCode, idx);
    setActiveTool(active);
  };

  const currentRobotTool = cheatsheetHovered ? 'papel' : activeTool;

  // ── Render Unificado ───────────────────────────────────────
  const activeBoss = Object.values(gameState.enemies).find(e => e.hp > 0 && e.type === 'boss');

  return (
    <>
      {activeDemo ? (
        <DemoArena
          type={activeDemo}
          onClose={handleCloseDemo}
          onSwitch={setActiveDemo}
        />
      ) : gameState.phase === 'menu' ? (
        <MainMenu
          onStart={handleStartGame}
          onOpenDemo={handleOpenDemo}
          shouldClearCode={shouldClearCode}
          setShouldClearCode={setShouldClearCode}
        />
      ) : (
        <div className="app-root">

      {/* Letterbox Cinematográfico do Boss */}
      {bossIntroState.letterbox && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '11vh', background: '#000000', zIndex: 90000, pointerEvents: 'none' }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '11vh', background: '#000000', zIndex: 90000, pointerEvents: 'none' }} />
        </>
      )}

      {/* HUD Superior (Vidas / Inimigos / Fase) no Canto Superior Direito com leve borda branca */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 100,
        display: 'flex',
        gap: '20px',
        color: '#00ddaa',
        fontFamily: 'monospace',
        fontSize: '18px',
        background: 'rgba(0,0,0,0.78)',
        border: '1px solid rgba(255, 255, 255, 0.45)',
        boxShadow: '0 0 12px rgba(255, 255, 255, 0.15)',
        padding: '10px 20px',
        borderRadius: '4px',
        alignItems: 'center'
      }}>
        <div>♥ HP JOGADOR: {gameState.playerHp}/3</div>
        <div>💀 INIMIGOS VIVOS: {Object.values(gameState.enemies).filter(e => e.hp > 0).length}</div>
        <div style={{ color: '#fff', fontSize: '14px', marginLeft: '10px' }}>[Fase {gameState.currentLevel} - {gameState.difficulty}]</div>
      </div>

      {/* Alerta de Jogo (Clamp / Colisão) */}
      {gameAlert && (
        <div style={{
          position: 'absolute', top: '75px', right: '20px', zIndex: 110,
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
      {activeBoss && (bossIntroState.showHp || !bossIntroState.isIntroActive) && (
        <div style={{
          position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
          width: '50%', zIndex: 100, background: 'rgba(0,0,0,0.85)', padding: '12px 16px',
          border: '2px solid #BC0001', borderRadius: '4px',
          boxShadow: '0 0 20px rgba(188, 0, 1, 0.4)'
        }}>
          <div style={{ color: '#ff2233', textAlign: 'center', fontWeight: 'bold', fontSize: '18px', marginBottom: '8px', letterSpacing: '2px', textTransform: 'uppercase' }}>
            {activeBoss.name}
          </div>
          <div style={{ width: '100%', height: '18px', background: '#1a1a1a', borderRadius: '2px', overflow: 'hidden', border: '1px solid #440000' }}>
            <div style={{
              width: bossIntroState.hpFillPercent !== undefined
                ? `${bossIntroState.hpFillPercent}%`
                : `${(activeBoss.hp / activeBoss.maxHp) * 100}%`,
              height: '100%', background: 'linear-gradient(90deg, #880000, #ff0033)', transition: 'width 0.25s'
            }} />
          </div>
        </div>
      )}

      {gameState.phase === 'gameover' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(50,0,0,0.85)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ff2222' }}>
          <h1>GAME OVER</h1>
          <button className="action-btn" onClick={() => window.location.reload()} style={{ marginTop: '20px' }}>REINICIAR SISTEMA</button>
        </div>
      )}

      {gameState.phase === 'victory' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,50,20,0.85)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#00ffcc' }}>
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
          playerSpawnTime={playerSpawnTime}
          difficulty={gameState.difficulty}
          onBossIntroChange={setBossIntroState}
          triggerBossDescent={gameState.triggerBossDescent}
          completeBossIntro={gameState.completeBossIntro}
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
      )}

      {/* Tela de Carregamento Global com Fade In e Fade Out */}
      {loadingState.active && (
        <LoadingScreen
          key={loadingState.key || 'loader'}
          title={loadingState.title}
          onOpaque={loadingState.onOpaque}
          onComplete={loadingState.onComplete}
          minDuration={loadingState.minDuration || 1500}
        />
      )}
    </>
  );
}
