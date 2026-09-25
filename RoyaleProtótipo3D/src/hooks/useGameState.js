// ============================================================
//  useGameState.js — Hook Central de Estado do CSS Hacker Royale
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { FILESYSTEM, ARENA_SIZE } from '../constants/gameData';

function cloneFS() {
  return JSON.parse(JSON.stringify(FILESYSTEM));
}

export function useGameState() {
  const [phase, setPhase] = useState('menu');
  const [currentPath, setCurrentPath] = useState('/');
  const [activeRoom, setActiveRoom] = useState(null);
  const [terminalHistory, setTerminalHistory] = useState([]);
  const lineCounter = useRef(0);
  const fsRef = useRef(cloneFS());

  const [enemies, setEnemies] = useState({});
  const [difficulty, setDifficulty] = useState('Facil');
  const [playerRevealed, setPlayerRevealed] = useState(false);
  const lastPlayerPos = useRef({ col: 1, row: 1 });

  // ── Utilidades ────────────────────────────────────────────
  const addTerminalLine = useCallback((text, type = 'output') => {
    setTerminalHistory(prev => [
      ...prev,
      { id: `line-${lineCounter.current++}`, text, type },
    ]);
  }, []);

  const clearTerminal = useCallback(() => setTerminalHistory([]), []);

  // ── Inicializar Jogo ──────────────────────────────────────
  const startGame = useCallback((botCount, diff) => {
    setDifficulty(diff);
    const fs = cloneFS();
    const rooms = ['/arena/grid-zone', '/arena/flex-zone', '/intel/recon'];
    const newEnemies = {};

    for (let i = 0; i < botCount; i++) {
      const id = `bot-${i}`;
      const room = rooms[i % rooms.length];
      if (fs[room]) {
        fs[room].hasEnemy = true;
        fs[room].enemyId = id;
      }
      newEnemies[id] = {
        id,
        name: `Agent-${String.fromCharCode(65 + i)}`,
        hp: diff === 'Matrix' ? 200 : 100,
        position: [
          Math.floor(Math.random() * ARENA_SIZE) + 1,
          Math.floor(Math.random() * ARENA_SIZE) + 1,
        ],
        revealed: false,
        room,
      };
    }

    fsRef.current = fs;
    setEnemies(newEnemies);
    setPhase('playing');
    setCurrentPath('/');
    setActiveRoom(null);
    setTerminalHistory([
      { id: 'boot-0', text: '> Inicializando CSS HACKER ROYALE v3.0...', type: 'system' },
      { id: 'boot-1', text: `> Modo ${diff} ativado. ${botCount} agentes despachados.`, type: 'system' },
      { id: 'boot-2', text: '> Pressione Ctrl+J para abrir o terminal.', type: 'system' },
      { id: 'boot-3', text: '> Digite "help" para ver os comandos.', type: 'system' },
    ]);
  }, []);

  // ── Comandos do Terminal ──────────────────────────────────
  const processCommand = useCallback(
    (rawInput) => {
      const input = rawInput.trim().toLowerCase();
      const parts = input.split(/\s+/);
      const cmd = parts[0];

      addTerminalLine(`> ${rawInput}`, 'command');

      if (cmd === 'help') {
        addTerminalLine('╔═══════════════════════════════════════════╗', 'system');
        addTerminalLine('║         COMANDOS DISPONÍVEIS              ║', 'system');
        addTerminalLine('╠═══════════════════════════════════════════╣', 'system');
        addTerminalLine('║  dir           → Lista conteúdo da pasta  ║', 'system');
        addTerminalLine('║  cd ./pasta    → Entra na pasta           ║', 'system');
        addTerminalLine('║  cd ..         → Volta uma pasta          ║', 'system');
        addTerminalLine('║  code .        → ATIVA A ARENA NESTA SALA ║', 'system');
        addTerminalLine('║  status        → HP e info                ║', 'system');
        addTerminalLine('║  clear         → Limpa o terminal         ║', 'system');
        addTerminalLine('╠═══════════════════════════════════════════╣', 'system');
        addTerminalLine('║  [Shift+F]       → Scan diretório atual   ║', 'system');
        addTerminalLine('║  [Ctrl+Shift+F]  → Scan global            ║', 'system');
        addTerminalLine('╚═══════════════════════════════════════════╝', 'system');
        return true;
      }

      if (cmd === 'clear') { clearTerminal(); return true; }

      if (cmd === 'status') {
        addTerminalLine(`[STATUS] Path: ${currentPath}`, 'success');
        addTerminalLine(`[STATUS] Sala Ativa: ${activeRoom || '(nenhuma — use code .)'}`, 'success');
        const alive = Object.values(enemies).filter(e => e.hp > 0);
        addTerminalLine(`[STATUS] Inimigos vivos: ${alive.length}`, 'success');
        return true;
      }

      if (cmd === 'dir') {
        const fs = fsRef.current;
        const node = fs[currentPath];
        if (!node) { addTerminalLine('[ERRO] Diretório corrompido.', 'error'); return true; }
        addTerminalLine(`Conteúdo de ${currentPath}:`, 'output');
        if (!node.children || node.children.length === 0) {
          addTerminalLine('  (vazio)', 'output');
        } else {
          node.children.forEach(child => {
            const childPath = currentPath === '/' ? `/${child}` : `${currentPath}/${child}`;
            const childNode = fs[childPath];
            const tag = childNode?.hasEnemy ? ' ⚠️ [AMEAÇA]' : '';
            addTerminalLine(`  📁 ${child}/${tag}`, 'output');
          });
        }
        return true;
      }

      if (cmd === 'cd') {
        const target = parts.slice(1).join(' ');
        const fs = fsRef.current;
        if (target === '..' || target === '../') {
          if (currentPath === '/') { addTerminalLine('[AVISO] Já está na raiz.', 'error'); return true; }
          const segments = currentPath.split('/').filter(Boolean);
          segments.pop();
          const newPath = segments.length === 0 ? '/' : '/' + segments.join('/');
          setCurrentPath(newPath);
          addTerminalLine(`[OK] Movido para ${newPath}`, 'success');
          return true;
        }
        const folderName = target.replace('./', '').replace(/\//g, '');
        const newPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`;
        if (!fs[newPath]) {
          addTerminalLine(`[ERRO] Pasta não encontrada: "${folderName}"`, 'error');
          addTerminalLine('[DICA] Use "dir" para ver as pastas.', 'system');
          return true;
        }
        setCurrentPath(newPath);
        addTerminalLine(`[OK] Movido para ${newPath}`, 'success');
        if (fs[newPath]?.hasEnemy) addTerminalLine('⚠️  Algo se move nesta pasta...', 'error');
        return true;
      }

      if (input === 'code .') {
        addTerminalLine(`[SISTEMA] Abrindo arena: ${currentPath}...`, 'system');
        addTerminalLine('[SISTEMA] Grid 6x6 materializado!', 'success');
        setActiveRoom(currentPath);
        return 'CLOSE_TERMINAL';
      }

      if (cmd === 'sonar') {
        addTerminalLine('[SONAR] Use Shift+F (local) ou Ctrl+Shift+F (global).', 'system');
        return true;
      }

      addTerminalLine(`[ERRO] Comando desconhecido: "${rawInput}"`, 'error');
      addTerminalLine('[DICA] Digite "help" para ver os comandos.', 'system');
      return false;
    },
    [currentPath, activeRoom, enemies, addTerminalLine, clearTerminal]
  );

  // ── Scanners ──────────────────────────────────────────────
  const scanCurrent = useCallback(() => {
    setPlayerRevealed(true);
    const scanRoom = activeRoom || currentPath;
    addTerminalLine(`[SCAN] Varrendo sala: ${scanRoom}...`, 'system');
    const botsInRoom = Object.values(enemies).filter(e => e.room === scanRoom && e.hp > 0);
    if (botsInRoom.length > 0) {
      setEnemies(prev => {
        const updated = { ...prev };
        botsInRoom.forEach(b => {
          updated[b.id] = { ...updated[b.id], revealed: true };
        });
        return updated;
      });
      botsInRoom.forEach(b => {
        addTerminalLine(`[ALERTA] ${b.name} em [Row:${b.position[0]}, Col:${b.position[1]}]`, 'error');
      });
    } else {
      addTerminalLine('[SCAN] Nenhum inimigo nesta sala.', 'success');
    }
  }, [activeRoom, currentPath, enemies, addTerminalLine]);

  const scanAll = useCallback(() => {
    setPlayerRevealed(true);
    addTerminalLine('[SONAR GLOBAL] Varrendo todo o filesystem...', 'system');
    let found = 0;
    Object.values(enemies).forEach(b => {
      if (b.hp > 0) {
        addTerminalLine(`[ALERTA] ${b.name} em: ${b.room}`, 'error');
        found++;
      }
    });
    addTerminalLine(`[SONAR] Total: ${found} ameaça(s).`, 'success');
  }, [enemies, addTerminalLine]);

  // ── Armas do Jogador ──────────────────────────────────────
  const fireBomb = useCallback((col, row) => {
    if (!activeRoom) { addTerminalLine('[ERRO] Sala não ativa! Use "code ." primeiro.', 'error'); return; }
    setPlayerRevealed(true);
    let hitSomething = false;
    setEnemies(prev => {
      const updated = { ...prev };
      Object.values(updated).forEach(enemy => {
        if (enemy.hp <= 0 || enemy.room !== activeRoom) return;
        const [er, ec] = enemy.position;
        if (Math.abs(er - row) <= 1 && Math.abs(ec - col) <= 1) {
          const newHp = Math.max(0, enemy.hp - 50);
          updated[enemy.id] = { ...enemy, hp: newHp, revealed: true };
          hitSomething = true;
          addTerminalLine(`[BOMBA] 💥 ${enemy.name}! -50 HP (restante: ${newHp})`, 'success');
          if (newHp <= 0) addTerminalLine(`[KILL] ${enemy.name} ELIMINADO!`, 'success');
        }
      });
      return updated;
    });
    if (!hitSomething) addTerminalLine(`[BOMBA] Nenhum alvo em [Col:${col}, Row:${row}].`, 'output');
  }, [activeRoom, addTerminalLine]);

  const fireSniper = useCallback((col, row) => {
    if (!activeRoom) { addTerminalLine('[ERRO] Sala não ativa! Use "code ." primeiro.', 'error'); return; }
    setPlayerRevealed(true);
    let hitSomething = false;
    setEnemies(prev => {
      const updated = { ...prev };
      Object.values(updated).forEach(enemy => {
        if (enemy.hp <= 0 || enemy.room !== activeRoom) return;
        const [er, ec] = enemy.position;
        if (er === row && ec === col) {
          updated[enemy.id] = { ...enemy, hp: 0, revealed: true };
          hitSomething = true;
          addTerminalLine(`[SNIPER] 🎯 HEADSHOT! ${enemy.name} abatido!`, 'success');
        }
      });
      return updated;
    });
    if (!hitSomething) addTerminalLine(`[SNIPER] Tiro perdido em [Col:${col}, Row:${row}].`, 'output');
  }, [activeRoom, addTerminalLine]);

  // ── IA dos Bots ───────────────────────────────────────────
  const processBotTurns = useCallback(() => {
    if (!activeRoom) return;
    setEnemies(prev => {
      const updated = { ...prev };
      let acted = false;
      Object.values(updated).forEach(enemy => {
        if (enemy.hp <= 0 || enemy.room !== activeRoom) return;
        const dr = Math.random() > 0.5 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        const dc = Math.random() > 0.5 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        const newRow = Math.max(1, Math.min(ARENA_SIZE, enemy.position[0] + dr));
        const newCol = Math.max(1, Math.min(ARENA_SIZE, enemy.position[1] + dc));
        updated[enemy.id] = { ...enemy, position: [newRow, newCol], revealed: false };
        acted = true;
        addTerminalLine(`[BOT] Inimigo se moveu na sala ${activeRoom}.`, 'system');
      });
      return acted ? updated : prev;
    });
  }, [activeRoom, addTerminalLine]);

  return {
    phase, startGame, currentPath, activeRoom,
    terminalHistory, enemies, playerRevealed,
    setPlayerRevealed, lastPlayerPos,
    processCommand, scanCurrent, scanAll,
    fireBomb, fireSniper, processBotTurns, addTerminalLine,
  };
}
