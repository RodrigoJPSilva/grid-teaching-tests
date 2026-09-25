// ============================================================
//  App.jsx — CSS Hacker Royale: Layout Principal
//  Editor de código CSS + Arena 3D + Mini Terminal
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import Arena3D from './components/Arena3D';
import { useGameState } from './hooks/useGameState';
import { parsePlayerCode, getActiveEditorClass } from './utils/GameEngine';
import './App.css';

// ── Menu de Configuração (aparece antes do jogo) ────────────
function ConfigMenu({ onStart }) {
  const [botCount, setBotCount] = useState(3);
  const [difficulty, setDifficulty] = useState('Facil');

  return (
    <div className="menu-overlay">
      <div className="menu-box">
        <h1 className="menu-title">CSS HACKER<br/>ROYALE</h1>
        <p className="menu-sub">Turma 3DM — SENAI Suíço-Brasileira</p>

        <div className="menu-field">
          <label>NÚMERO DE BOTS (1–5):</label>
          <input
            type="range" min="1" max="5" value={botCount}
            onChange={e => setBotCount(Number(e.target.value))}
          />
          <span className="range-value">{botCount}</span>
        </div>

        <div className="menu-field">
          <label>DIFICULDADE:</label>
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
            <option value="Facil">Fácil</option>
            <option value="Matrix">Matrix</option>
          </select>
        </div>

        <button className="start-btn" onClick={() => onStart(botCount, difficulty)}>
          ▶ INICIAR SISTEMA
        </button>
      </div>
    </div>
  );
}

// ── Mini Terminal (overlay Ctrl+J) ──────────────────────────
function MiniTerminal({ history, currentPath, onCommand, onClose }) {
  const inputRef = useRef(null);
  const endRef = useRef(null);
  const [cmdHistory, setCmdHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cmd = inputRef.current.value.trim();
    if (!cmd) return;
    setCmdHistory(prev => [cmd, ...prev]);
    setHistIdx(-1);
    const result = onCommand(cmd);
    inputRef.current.value = '';
    if (result === 'CLOSE_TERMINAL') onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHistIdx(prev => {
        const next = Math.min(prev + 1, cmdHistory.length - 1);
        if (inputRef.current) inputRef.current.value = cmdHistory[next] || '';
        return next;
      });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHistIdx(prev => {
        const next = Math.max(prev - 1, -1);
        if (inputRef.current) inputRef.current.value = next === -1 ? '' : cmdHistory[next] || '';
        return next;
      });
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const val = inputRef.current.value;
      const cmds = ['dir', 'cd ..', 'cd ./', 'code .', 'help', 'status', 'clear', 'sonar'];
      const match = cmds.find(c => c.startsWith(val) && c !== val);
      if (match) inputRef.current.value = match;
    }
  };

  return (
    <div className="mini-terminal-overlay" onClick={e => e.stopPropagation()}>
      <div className="terminal-header">
        <span>TERMINAL // {currentPath}</span>
        <button type="button" onClick={onClose} className="close-btn">✕</button>
      </div>
      <div className="terminal-history">
        {history.map((line, i) => {
          const text = typeof line === 'string' ? line : line.text;
          const type = typeof line === 'string' ? 'output' : line.type;
          return (
            <div key={i} className={`terminal-line type-${type}`}>
              {text}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={handleSubmit} className="terminal-form">
        <span className="terminal-prompt">
          <span style={{ color: '#3fb950' }}>hacker</span>
          <span style={{ color: '#8b949e' }}>@</span>
          <span style={{ color: '#58a6ff' }}>arena</span>
          <span style={{ color: '#8b949e' }}>:</span>
          <span style={{ color: '#d2a8ff' }}>{currentPath}</span>
          <span style={{ color: '#8b949e' }}>$ </span>
        </span>
        <input
          ref={inputRef}
          type="text"
          className="terminal-input"
          autoComplete="off"
          spellCheck="false"
          onKeyDown={handleKeyDown}
          placeholder="Digite um comando..."
        />
      </form>
    </div>
  );
}

// ── Componente Principal ────────────────────────────────────
export default function App() {
  const DEFAULT_CSS = `.player {
  grid-column: 1;
  grid-row: 1;
}

.bomba {
  /* Remova os comentários para armar: */
  /* grid-column: 3; */
  /* grid-row: 3; */
}

.sniper {
  /* Mira exata (insta-kill): */
  /* grid-column: 4; */
  /* grid-row: 4; */
}`;

  const [cssCode, setCssCode] = useState(DEFAULT_CSS);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [bombCountdown, setBombCountdown] = useState(0);
  const [activeTool, setActiveTool] = useState(null);

  const gameState = useGameState();

  // ── Atalhos Globais ───────────────────────────────────────
  useEffect(() => {
    if (gameState.phase === 'menu') return;

    const handleKeyDown = (e) => {
      // Ctrl+J: Toggle terminal
      if (e.ctrlKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsTerminalOpen(prev => !prev);
        return;
      }
      // Shift+F / Ctrl+Shift+F: Scanners
      if (e.shiftKey && e.key === 'F') {
        e.preventDefault();
        if (e.ctrlKey) {
          gameState.scanAll();
        } else {
          gameState.scanCurrent();
        }
        setIsTerminalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.phase, gameState.scanAll, gameState.scanCurrent]);

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
      const parsed = parsePlayerCode(cssCode);
      if (parsed.bomba?.col && parsed.bomba?.row) {
        gameState.fireBomb(parsed.bomba.col, parsed.bomba.row);
      } else {
        gameState.addTerminalLine('[SISTEMA] Bomba não armada no CSS.', 'error');
      }
      setIsTerminalOpen(true);
    }
  }, [bombCountdown, cssCode, gameState.fireBomb, gameState.addTerminalLine]);

  // ── Ações do Editor ───────────────────────────────────────
  const handleDeployBomb = () => {
    if (bombCountdown > 0) return;
    setBombCountdown(5);
    gameState.addTerminalLine('[BOMBA] Contagem regressiva iniciada: 5s...', 'system');
  };

  const handleFireSniper = () => {
    const parsed = parsePlayerCode(cssCode);
    if (parsed.sniper?.col && parsed.sniper?.row) {
      gameState.fireSniper(parsed.sniper.col, parsed.sniper.row);
    } else {
      gameState.addTerminalLine('[SNIPER] Não armada! Edite .sniper no código.', 'error');
    }
    setIsTerminalOpen(true);
  };

  const handleEditorInteraction = (e) => {
    const idx = e.target.selectionStart;
    const active = getActiveEditorClass(cssCode, idx);
    setActiveTool(active);
  };

  // ── Render ────────────────────────────────────────────────
  if (gameState.phase === 'menu') {
    return <ConfigMenu onStart={gameState.startGame} />;
  }

  return (
    <div className="app-root">
      {/* SIDEBAR: Editor CSS */}
      <div className="sidebar">
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
          <button
            className="action-btn bomb-btn"
            onClick={handleDeployBomb}
            disabled={bombCountdown > 0}
          >
            {bombCountdown > 0
              ? `💣 DETONANDO: ${bombCountdown}s`
              : '💣 DEPLOY BOMBA (5s)'}
          </button>
          <button className="action-btn sniper-btn" onClick={handleFireSniper}>
            🎯 DISPARAR SNIPER
          </button>
        </div>

        <div className="room-indicator">
          SALA: {gameState.activeRoom || '—'}
        </div>
      </div>

      {/* CANVAS 3D */}
      <div className="canvas-container">
        <Arena3D
          cssCode={cssCode}
          activeRoom={gameState.activeRoom}
          enemies={gameState.enemies}
          isTerminalOpen={isTerminalOpen}
          activeTool={activeTool}
          playerRevealed={gameState.playerRevealed}
          setPlayerRevealed={gameState.setPlayerRevealed}
          lastPlayerPos={gameState.lastPlayerPos}
          bombCountdown={bombCountdown}
        />
      </div>

      {/* MINI TERMINAL */}
      {isTerminalOpen && (
        <MiniTerminal
          history={gameState.terminalHistory}
          currentPath={gameState.currentPath}
          onCommand={gameState.processCommand}
          onClose={() => setIsTerminalOpen(false)}
        />
      )}

      {/* Dica de atalho */}
      <div className="terminal-hint">
        <kbd>Ctrl</kbd>+<kbd>J</kbd> terminal &nbsp;
        <kbd>Shift</kbd>+<kbd>F</kbd> scan
      </div>
    </div>
  );
}
