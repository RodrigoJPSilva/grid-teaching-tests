// ============================================================
//  App.jsx — Grid Battlegrounds: Layout Principal
//  Editor de código CSS + Arena 3D + Cheatsheet + i18n + Menu Radial + Diálogo
// ============================================================

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Arena3D from './components/Arena3D';
import { useGameState } from './hooks/useGameState';
import { parsePlayerCode, getActiveEditorClass, gridToPosition3D } from './utils/GameEngine';
import MainMenu from './components/MainMenu';
import DemoArena from './components/DemoArena';
import LoadingScreen from './components/LoadingScreen';
import DialogueBox from './components/DialogueBox';
import RadialMenu from './components/RadialMenu';
import RotateDeviceOverlay from './components/RotateDeviceOverlay';
import { detectUserLanguage, t } from './utils/i18n';
import { soundManager } from './utils/SoundManager';
import './App.css';

const EMPTY_CSS = `.player {

}

.bomba {

}

.sniper {

}`;

// ── Componente Principal ────────────────────────────────────
export default function App() {
  const [language, setLanguage] = useState(detectUserLanguage);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(
      ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    );
  });
  const [inputMode, setInputMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
      if (touch) return 'radial';
    }
    return 'radial';
  }); // 'radial' | 'code'
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [gridSize, setGridSize] = useState(10);
  const [isCameraCentered, setIsCameraCentered] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const touch = Boolean(
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
      );
      setIsMobile(touch);
      if (typeof document !== 'undefined') {
        document.body.classList.toggle('is-mobile-device', touch);
      }
      if (touch) {
        setInputMode('radial');
        setIsEditorVisible(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  const [cssCode, setCssCode] = useState(EMPTY_CSS);
  const [committedCssCode, setCommittedCssCode] = useState(EMPTY_CSS);

  const [bombCountdown, setBombCountdown] = useState(0);
  const [activeTool, setActiveTool] = useState(null);
  const [activePlayerBomb, setActivePlayerBomb] = useState(null);

  const [bombThrowTrigger, setBombThrowTrigger] = useState(0);
  const [sniperShootTrigger, setSniperShootTrigger] = useState(0);

  // User Preference
  const [shouldClearCode, setShouldClearCode] = useState(false);

  // States for the Cheatsheet, Radial Menu, and Alerts
  const [cheatsheetHovered, setCheatsheetHovered] = useState(false);
  const [clickedTile, setClickedTile] = useState(null);
  const [radialMenuState, setRadialMenuState] = useState(null); // { col, row, screenX, screenY }
  const [gameAlert, setGameAlert] = useState(null);

  // Demonstrações ativas e timing de spawn
  const [activeDemo, setActiveDemo] = useState(null);
  const [playerSpawnTime, setPlayerSpawnTime] = useState(0);
  const [cameraMode, setCameraMode] = useState('3D');

  // Tutorial Interativo (Passos 1 a 4)
  const [tutorialStep, setTutorialStep] = useState(1);
  const [tutTeleportSuccess, setTutTeleportSuccess] = useState(false);
  const [tutBombTriggered, setTutBombTriggered] = useState(false);
  const [tutSniperTriggered, setTutSniperTriggered] = useState(false);

  const [bossIntroState, setBossIntroState] = useState({
    letterbox: false,
    showHp: false,
    hpFillPercent: undefined,
    isIntroActive: false
  });

  // ── Sistema de Loading com Robô 3D e HUD 0-100% ────────────
  const [loadingState, setLoadingState] = useState({
    active: true,
    key: 'boot',
    title: t('tacticalSystem', language),
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

  const gameState = useGameState(inputMode);

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

  const handleStartGame = (difficulty, size, controlMode = 'radial') => {
    const finalMode = isMobile ? 'radial' : (controlMode || inputMode || 'radial');
    setInputMode(finalMode);
    setLoadingState({
      active: true,
      key: `game-${Date.now()}`,
      title: `${t('start', language)} [${difficulty.toUpperCase()}]`,
      minDuration: 1500,
      onOpaque: () => {
        gameState.startGame(difficulty, size || gridSize);
        setActivePlayerBomb(null);
        setBombCountdown(0);
        if (difficulty === 'Facil') {
          setTutorialStep(1);
          setTutTeleportSuccess(false);
          setTutBombTriggered(false);
          setTutSniperTriggered(false);
        } else {
          setTutorialStep(0);
        }
        if (finalMode === 'radial') {
          setIsEditorVisible(false);
        } else {
          setIsEditorVisible(true);
        }
      },
      onComplete: () => {
        setLoadingState(prev => ({ ...prev, active: false }));
        const spawnStart = Date.now() + 1000;
        setPlayerSpawnTime(spawnStart);
        gameState.resetSpawnTimes(spawnStart);
        soundManager.startBattleMusic();
      }
    });
  };

  const handleOpenDemo = (demoType) => {
    setLoadingState({
      active: true,
      key: `demo-${demoType}-${Date.now()}`,
      title: `${t('training', language)}: ${demoType.toUpperCase()}`,
      minDuration: 1500,
      onOpaque: () => {
        setActiveDemo(demoType);
        soundManager.startBattleMusic();
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
      title: t('returnMenu', language),
      minDuration: 1500,
      onOpaque: () => {
        setActiveDemo(null);
      },
      onComplete: () => {
        setLoadingState(prev => ({ ...prev, active: false }));
        soundManager.startMenuMusic();
      }
    });
  };

  useEffect(() => {
    if (gameState.phase === 'menu') {
      soundManager.startMenuMusic();
    } else if (gameState.phase === 'victory' || gameState.phase === 'gameover') {
      soundManager.stopMusic();
    }
  }, [gameState.phase]);

  // ── Ação Global: Rodar Código ──────────────────────────────
  const handleExecuteAll = () => {
    if (gameState.phase !== 'playing') return;
    soundManager.playUIClick();

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
        setGameAlert(t('alertOutOfBounds', language));
      }

      // 2. Checagem de Não Sobreposição com Inimigos Vivos
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
        setGameAlert(t('alertCollision', language));
        targetCol = gameState.lastPlayerPos.current.col;
        targetRow = gameState.lastPlayerPos.current.row;
      }

      gameState.lastPlayerPos.current = { col: targetCol, row: targetRow };
      gameState.setLastParsedPos({ col: targetCol, row: targetRow });
      if (gameState.recordPlayerMove) {
        gameState.recordPlayerMove(targetCol, targetRow);
      }

      // Verificação do Tutorial Passo 2 (Teletransporte para o bloco amarelo 3, 3)
      if (gameState.difficulty === 'Facil' && tutorialStep === 2) {
        if (targetCol === 3 && targetRow === 3) {
          setTutTeleportSuccess(true);
          soundManager.playTutorialSuccess();
          setTimeout(() => {
            setTutorialStep(3);
            gameState.spawnTutorialBombTargets();
          }, 1800);
        }
      }
    }

    // 3. Disparo de Armas
    if (parsedCurrent.bomba?.col && parsedCurrent.bomba?.row) {
      if (!parsedCommitted.bomba || parsedCurrent.bomba.col !== parsedCommitted.bomba.col || parsedCurrent.bomba.row !== parsedCommitted.bomba.row) {
        setBombCountdown(5);
        const throwStart = Date.now();
        setBombThrowTrigger(throwStart);
        const pCol = targetCol || gameState.lastPlayerPos.current.col;
        const pRow = targetRow || gameState.lastPlayerPos.current.row;
        const pPos3D = gridToPosition3D(pCol, pRow, gameState.arenaSize);
        setActivePlayerBomb({
          id: `bomb-${throwStart}`,
          startTime: throwStart,
          throwerPos: pPos3D,
          targetCol: parsedCurrent.bomba.col,
          targetRow: parsedCurrent.bomba.row
        });
        soundManager.playBombLaunch();
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
    }
  }, [bombCountdown]);

  // Dano e impacto da bomba ativa do jogador (4.5s após lançamento, garantido mesmo se o jogador mover)
  useEffect(() => {
    if (!activePlayerBomb) return;
    const now = Date.now();
    const elapsed = now - activePlayerBomb.startTime;
    const delay = Math.max(0, 4500 - elapsed);
    const finishDelay = Math.max(0, 5000 - elapsed);

    const hitTimer = setTimeout(() => {
      gameState.fireBomb(activePlayerBomb.targetCol, activePlayerBomb.targetRow);
    }, delay);

    const endTimer = setTimeout(() => {
      setActivePlayerBomb(null);
    }, finishDelay);

    return () => {
      clearTimeout(hitTimer);
      clearTimeout(endTimer);
    };
  }, [activePlayerBomb?.id]);

  // ── Interação com o Piso (Clique para Cheatsheet ou Menu Radial) ──
  const handleTileClick = (col, row, e) => {
    setClickedTile({ col, row });
    if (inputMode === 'radial' && gameState.phase === 'playing') {
      const clickX = e?.clientX || (e?.nativeEvent && e.nativeEvent.clientX) || window.innerWidth / 2;
      const clickY = e?.clientY || (e?.nativeEvent && e.nativeEvent.clientY) || window.innerHeight / 2;
      setRadialMenuState({ col, row, screenX: clickX, screenY: clickY });
    }
  };

  // ── Execução Direta de Ações do Menu Radial ──────────────────
  const handleRadialAction = (action, col, row) => {
    // Fecha o menu radial e faz o piso selecionado descer suavemente
    setRadialMenuState(null);

    const playerCol = gameState.lastParsedPos?.col || gameState.lastPlayerPos?.current?.col || 1;
    const playerRow = gameState.lastParsedPos?.row || gameState.lastPlayerPos?.current?.row || 1;

    if (action === 'teleport') {
      let newCode = `.player {\n  grid-column: ${col};\n  grid-row: ${row};\n}\n\n`;
      if (activePlayerBomb) {
        newCode += `.bomba {\n  grid-column: ${activePlayerBomb.targetCol};\n  grid-row: ${activePlayerBomb.targetRow};\n}\n\n`;
      } else {
        newCode += `.bomba {\n\n}\n\n`;
      }
      newCode += `.sniper {\n\n}`;
      setCssCode(newCode);
      setCommittedCssCode(newCode);

      gameState.lastPlayerPos.current = { col, row };
      gameState.setLastParsedPos({ col, row });
      if (gameState.recordPlayerMove) {
        gameState.recordPlayerMove(col, row);
      }
      soundManager.playMove();

      if (gameState.difficulty === 'Facil' && tutorialStep === 2) {
        if (col === 3 && row === 3) {
          setTutTeleportSuccess(true);
          soundManager.playTutorialSuccess();
          setTimeout(() => {
            setTutorialStep(3);
            gameState.spawnTutorialBombTargets();
          }, 1800);
        }
      }
    } else if (action === 'bomba') {
      const newCode = `.player {\n  grid-column: ${playerCol};\n  grid-row: ${playerRow};\n}\n\n.bomba {\n  grid-column: ${col};\n  grid-row: ${row};\n}\n\n.sniper {\n\n}`;
      setCssCode(newCode);
      setCommittedCssCode(newCode);
      setBombCountdown(5);
      const throwStart = Date.now();
      setBombThrowTrigger(throwStart);
      const pPos3D = gridToPosition3D(playerCol, playerRow, gameState.arenaSize);
      setActivePlayerBomb({
        id: `bomb-${throwStart}`,
        startTime: throwStart,
        throwerPos: pPos3D,
        targetCol: col,
        targetRow: row
      });
      soundManager.playBombLaunch();
    } else if (action === 'sniper') {
      const newCode = `.player {\n  grid-column: ${playerCol};\n  grid-row: ${playerRow};\n}\n\n.bomba {\n\n}\n\n.sniper {\n  grid-column: ${col};\n  grid-row: ${row};\n}`;
      setCssCode(newCode);
      setCommittedCssCode(newCode);
      setSniperShootTrigger(Date.now());
      gameState.fireSniper(col, row);
      soundManager.playSniperShot();
    }
  };

  // ── Verificação de Conclusão dos Passos 3 e 4 do Tutorial ────
  const enemiesList = useMemo(() => Object.values(gameState.enemies), [gameState.enemies]);

  useEffect(() => {
    if (gameState.difficulty !== 'Facil') return;

    if (tutorialStep === 3) {
      // Passo 3: 3 inimigos da bomba
      if (enemiesList.length === 3 && enemiesList.every(e => e.hp <= 0)) {
        if (!tutBombTriggered) {
          setTutBombTriggered(true);
          soundManager.playTutorialSuccess();
          setTimeout(() => {
            setTutorialStep(4);
            gameState.spawnTutorialSniperTarget(8, 8);
          }, 2400);
        }
      }
    } else if (tutorialStep === 4) {
      // Passo 4: 1 inimigo da sniper
      if (enemiesList.length >= 1 && enemiesList.every(e => e.hp <= 0)) {
        if (!tutSniperTriggered) {
          setTutSniperTriggered(true);
          soundManager.playTutorialSuccess();
        }
      }
    }
  }, [enemiesList, tutorialStep, tutBombTriggered, tutSniperTriggered, gameState]);

  // ── Destaque de Pisos no Tutorial ─────────────────────────
  const tutorialHighlightTiles = useMemo(() => {
    if (gameState.difficulty !== 'Facil' || tutorialStep === 0) return [];

    if (tutorialStep === 2) {
      return [{
        col: 3,
        row: 3,
        color: tutTeleportSuccess ? 'green' : 'yellow'
      }];
    }

    if (tutorialStep === 3) {
      // Piso amarelo ideal para acertar os 3 inimigos com a bomba 3x3
      return [{
        col: 7,
        row: 3,
        color: 'yellow'
      }];
    }

    if (tutorialStep === 4) {
      // Piso amarelo onde está o robô para o tiro sniper
      return [{
        col: 8,
        row: 8,
        color: 'yellow'
      }];
    }

    return [];
  }, [gameState.difficulty, tutorialStep, tutTeleportSuccess]);

  const handleEditorInteraction = (e) => {
    const idx = e.target.selectionStart;
    const active = getActiveEditorClass(cssCode, idx);
    setActiveTool(active);
  };

  const currentRobotTool = cheatsheetHovered ? 'papel' : activeTool;
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
          language={language}
          setLanguage={setLanguage}
          inputMode={inputMode}
          setInputMode={setInputMode}
          gridSize={gridSize}
          setGridSize={setGridSize}
          isMobile={isMobile}
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

          {/* HUD Superior (Vidas / Inimigos / Fase) no Canto Superior Direito */}
          <div className="top-game-hud">
            <div>{t('playerHp', language)} {gameState.playerHp}/3</div>
            <div>{t('enemiesAlive', language)} {Object.values(gameState.enemies).filter(e => e.hp > 0).length}</div>
            <div className="top-game-hud-level">
              [{t('level', language)} {gameState.currentLevel} - {gameState.difficulty === 'Facil' ? t('easy', language) : gameState.difficulty === 'Normal' ? t('normal', language) : t('matrix', language)}]
            </div>
          </div>

          {/* Botão Alternador do Editor no modo Menu Radial */}
          {inputMode === 'radial' && (
            <button
              type="button"
              className="toggle-editor-btn"
              onClick={() => setIsEditorVisible(v => !v)}
              title={isEditorVisible ? t('hideEditorBtn', language) : t('showEditorBtn', language)}
            >
              <span>{isEditorVisible ? '◀' : '▶'}</span>
              <span>{isEditorVisible ? t('hideEditorBtn', language) : t('showEditorBtn', language)}</span>
            </button>
          )}

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

          {/* Game Over Screen */}
          {gameState.phase === 'gameover' && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(50,0,0,0.88)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ff2222' }}>
              <h1 style={{ fontSize: '3rem', letterSpacing: '4px', marginBottom: '10px' }}>{t('gameOver', language)}</h1>
              <button className="action-btn" onClick={() => window.location.reload()} style={{ marginTop: '20px', width: 'auto', padding: '12px 30px' }}>
                {t('restartSystem', language)}
              </button>
            </div>
          )}

          {/* Victory Screen */}
          {gameState.phase === 'victory' && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,50,20,0.88)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#00ffcc' }}>
              <h1 style={{ fontSize: '2.5rem', letterSpacing: '3px', marginBottom: '10px' }}>{t('victoryTitle', language)}</h1>
              <p style={{ fontSize: '1.2rem' }}>{t('victoryDesc', language)} {gameState.difficulty}</p>
              <button className="action-btn" onClick={() => window.location.reload()} style={{ marginTop: '20px', width: 'auto', padding: '12px 30px' }}>
                {t('returnMenu', language)}
              </button>
            </div>
          )}

          {/* SIDEBAR: Editor CSS (Ocultável no Modo Menu Radial) */}
          {isEditorVisible && (
            <div className="sidebar" style={{ pointerEvents: cheatsheetHovered ? 'none' : 'auto', opacity: cheatsheetHovered ? 0.5 : 1 }}>
              <div className="editor-header">
                <span className="editor-icon">{'</>'}</span>
                <span>{t('editorTitle', language)}</span>
                <button
                  type="button"
                  onClick={() => setIsEditorVisible(false)}
                  title={t('hideEditorBtn', language)}
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    color: '#88a8b8',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    padding: '4px 8px'
                  }}
                >
                  ✕
                </button>
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
                  {t('runCode', language)}
                </button>

                {/* Seletor de Câmeras */}
                <div className="camera-mode-selector">
                  <button
                    type="button"
                    className={`camera-btn ${cameraMode === '3D' ? 'active' : ''}`}
                    onClick={() => { soundManager.playUIClick(); setCameraMode('3D'); }}
                    title={t('camera3D', language)}
                  >
                    {t('camera3D', language)}
                  </button>
                  <button
                    type="button"
                    className={`camera-btn ${cameraMode === '2D' ? 'active' : ''}`}
                    onClick={() => { soundManager.playUIClick(); setCameraMode('2D'); }}
                    title={t('camera2D', language)}
                  >
                    {t('camera2D', language)}
                  </button>
                  <button
                    type="button"
                    className={`camera-btn ${cameraMode === 'livre' ? 'active' : ''}`}
                    onClick={() => { soundManager.playUIClick(); setCameraMode('livre'); }}
                    title={t('cameraFree', language)}
                  >
                    {t('cameraFree', language)}
                  </button>
                  <button
                    type="button"
                    className={`camera-btn recenter-camera-btn ${isCameraCentered ? 'active' : ''}`}
                    onClick={() => { soundManager.playUIClick(); setIsCameraCentered(v => !v); }}
                    title={t('recenterCamera', language)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '3px' }}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="22" y1="12" x2="18" y2="12" />
                      <line x1="6" y1="12" x2="2" y2="12" />
                      <line x1="12" y1="6" x2="12" y2="2" />
                      <line x1="12" y1="22" x2="12" y2="18" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    {t('recenterCamera', language)}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CANVAS 3D */}
          <div className="canvas-container">
            {/* HUD Flutuante no Modo Menu Radial (quando o editor estiver oculto) */}
            {!isEditorVisible && (
              <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 100, display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div className="camera-mode-selector" style={{ margin: 0 }}>
                  <button
                    type="button"
                    className={`camera-btn ${cameraMode === '3D' ? 'active' : ''}`}
                    onClick={() => { soundManager.playUIClick(); setCameraMode('3D'); }}
                    title={t('camera3D', language)}
                  >
                    {t('camera3D', language)}
                  </button>
                  <button
                    type="button"
                    className={`camera-btn ${cameraMode === '2D' ? 'active' : ''}`}
                    onClick={() => { soundManager.playUIClick(); setCameraMode('2D'); }}
                    title={t('camera2D', language)}
                  >
                    {t('camera2D', language)}
                  </button>
                  <button
                    type="button"
                    className={`camera-btn ${cameraMode === 'livre' ? 'active' : ''}`}
                    onClick={() => { soundManager.playUIClick(); setCameraMode('livre'); }}
                    title={t('cameraFree', language)}
                  >
                    {t('cameraFree', language)}
                  </button>
                  <button
                    type="button"
                    className={`camera-btn recenter-camera-btn ${isCameraCentered ? 'active' : ''}`}
                    onClick={() => { soundManager.playUIClick(); setIsCameraCentered(v => !v); }}
                    title={t('recenterCamera', language)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '3px' }}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="22" y1="12" x2="18" y2="12" />
                      <line x1="6" y1="12" x2="2" y2="12" />
                      <line x1="12" y1="6" x2="12" y2="2" />
                      <line x1="12" y1="22" x2="12" y2="18" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    {t('recenterCamera', language)}
                  </button>
                </div>
                {!isMobile && (
                  <button
                    type="button"
                    className="camera-btn"
                    onClick={() => setIsEditorVisible(true)}
                    style={{ width: 'auto', padding: '0 12px', height: '32px' }}
                  >
                    {'</> ' + t('showEditorBtn', language)}
                  </button>
                )}
              </div>
            )}
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
              onTileClick={handleTileClick}
              selectedTile={radialMenuState ? { col: radialMenuState.col, row: radialMenuState.row } : null}
              incomingBombs={gameState.incomingBombs}
              playerSpawnTime={playerSpawnTime}
              difficulty={gameState.difficulty}
              onBossIntroChange={setBossIntroState}
              triggerBossDescent={gameState.triggerBossDescent}
              completeBossIntro={gameState.completeBossIntro}
              cameraMode={cameraMode}
              tutorialStep={tutorialStep}
              currentLevel={gameState.currentLevel}
              highlightTiles={tutorialHighlightTiles}
              activePlayerBomb={activePlayerBomb}
              speedMultiplier={inputMode === 'radial' ? 2 : 1}
              isMobile={isMobile}
              isCameraCentered={isCameraCentered}
              setIsCameraCentered={setIsCameraCentered}
            />

            {/* ── BLOCO DE CONVERSA DO PERSONAGEM (Substituindo a TV) ── */}
            {gameState.difficulty === 'Facil' && tutorialStep >= 1 && tutorialStep <= 4 && (
              <DialogueBox
                title="AI TACTICAL ADVISOR"
                stepLabel={`[TUTORIAL ${tutorialStep}/4]`}
                message={
                  tutorialStep === 1
                    ? t('tutWelcome', language)
                    : tutorialStep === 2
                    ? (tutTeleportSuccess ? t('tutTeleportSuccess', language) : t('tutTeleport', language))
                    : tutorialStep === 3
                    ? (tutBombTriggered ? t('tutBombSuccess', language) : t('tutBomb', language))
                    : (tutSniperTriggered ? t('tutSniperSuccess', language) : t('tutSniper', language))
                }
                onAction={
                  tutorialStep === 1
                    ? () => setTutorialStep(2)
                    : tutorialStep === 4 && tutSniperTriggered
                    ? () => {
                        setTutorialStep(0);
                        if (gameState.completeTutorialAndStartGame) {
                          gameState.completeTutorialAndStartGame();
                        } else if (gameState.setIsTutorialActive) {
                          gameState.setIsTutorialActive(false);
                        }
                      }
                    : null
                }
                actionLabel={
                  tutorialStep === 1
                    ? t('continueBtn', language)
                    : tutorialStep === 4 && tutSniperTriggered
                    ? t('finishBtn', language)
                    : t('nextBtn', language)
                }
              />
            )}
          </div>

          {/* ── MENU RADIAL TÁTICO NO PISO ── */}
          {radialMenuState && (
            <RadialMenu
              col={radialMenuState.col}
              row={radialMenuState.row}
              screenX={radialMenuState.screenX}
              screenY={radialMenuState.screenY}
              onSelect={handleRadialAction}
              onClose={() => setRadialMenuState(null)}
              language={language}
            />
          )}

          {/* Folha de Dicas (Cheatsheet) - Oculta no Mobile */}
          {!isMobile && (
            <div
              className="cheatsheet-container"
              onMouseEnter={() => setCheatsheetHovered(true)}
              onMouseLeave={() => setCheatsheetHovered(false)}
            >
              <div className="cheatsheet-arrow">◀</div>
              <div className="cheatsheet-content">
                <h2>{t('hackerGuide', language)}</h2>
                <p>{t('toMoveUse', language)}</p>
                <p><strong>.player</strong> &#123;</p>
                <p>&nbsp;&nbsp;grid-column: X;</p>
                <p>&nbsp;&nbsp;grid-row: Y;</p>
                <p>&#125;</p>
                <div className="cheatsheet-spacer" />
                <p>{t('bombInfo', language)}</p>
                <p>{t('sniperInfo', language)}</p>
                <div className="cheatsheet-spacer" />
                <div className="cheatsheet-spacer" />
                <p className="cheatsheet-tip">
                  {t('secretTip', language)}
                </p>
                {clickedTile && (
                  <p className="cheatsheet-clicked">
                    {t('clickedTile', language)} [grid-column: {clickedTile.col}; grid-row: {clickedTile.row}]
                  </p>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Tela de Carregamento Global */}
      {loadingState.active && (
        <LoadingScreen
          key={loadingState.key || 'loader'}
          title={loadingState.title}
          onOpaque={loadingState.onOpaque}
          onComplete={loadingState.onComplete}
          minDuration={loadingState.minDuration || 1500}
        />
      )}

      {/* Overlay de Rotação para Mobile Horizontal Obrigatório */}
      <RotateDeviceOverlay language={language} />
    </>
  );
}
