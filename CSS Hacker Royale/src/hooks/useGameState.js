// ============================================================
//  useGameState.js — Lógica de Fases e IA dos Inimigos
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';

const WAVES = {
  Facil: {
    1: { bots: 1, type: 'normal', hp: 3, bombDelay: [10000], teleDelay: [20000], size: [1,1], bombs: 1 },
    2: { bots: 2, type: 'normal', hp: 3, bombDelay: [5000, 10000], teleDelay: [20000, 20000], size: [1,1], bombs: 2 },
    3: { bots: 1, type: 'boss', hp: 30, bombDelay: [5000], teleDelay: [20000], size: [2,2], bombs: 5 } // 4 blocos
  },
  Normal: {
    1: { bots: 3, type: 'normal', hp: 3, bombDelay: [5000, 10000, 15000], teleDelay: [15000, 25000], size: [1,1], bombs: 1 },
    2: { bots: 3, type: 'normal', hp: 3, bombDelay: [6000, 9000, 12000], teleDelay: [15000, 25000], size: [1,1], bombs: 2 },
    3: { bots: 1, type: 'boss', hp: 30, bombDelay: [5000], teleDelay: [10000, 40000], size: [2,2], bombs: 5 }
  },
  Matrix: {
    1: { bots: 1, type: 'boss', hp: 30, bombDelay: [1000], teleDelay: [20000], size: [2,2], bombs: 1 },
    2: { bots: 2, type: 'boss', hp: 30, bombDelay: [1000, 1000], teleDelay: [20000, 20000], size: [2,1], bombs: 4 }, // 2 blocos
  }
};

export function useGameState() {
  const [phase, setPhase] = useState('menu'); // menu, playing, gameover, victory
  const [difficulty, setDifficulty] = useState('Facil');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [arenaSize, setArenaSize] = useState(10);
  
  const [enemies, setEnemies] = useState({});
  const [playerHp, setPlayerHp] = useState(3);
  
  const lastPlayerPos = useRef({ col: 1, row: 1 });
  const [lastParsedPos, setLastParsedPos] = useState({ col: 1, row: 1 });

  // Bombas atiradas pelos NPCs contra o jogador
  const [incomingBombs, setIncomingBombs] = useState([]);

  // ── Controle de Fases ─────────────────────────────────────
  const spawnWave = useCallback((diff, level, customSize) => {
    const wave = WAVES[diff][level];
    if (!wave) {
      setPhase('victory');
      return;
    }

    const newEnemies = {};
    for (let i = 0; i < wave.bots; i++) {
      const id = `bot-${level}-${i}`;
      const bDelay = wave.bombDelay[i % wave.bombDelay.length];
      let tDelay = wave.teleDelay[i % wave.teleDelay.length];
      if (wave.teleDelay.length === 2 && wave.teleDelay[0] !== wave.teleDelay[1]) {
         // Random range se forem dois valores
         tDelay = Math.random() * (wave.teleDelay[1] - wave.teleDelay[0]) + wave.teleDelay[0];
      }

      newEnemies[id] = {
        id,
        name: wave.type === 'boss' ? 'FINAL BOSS' : `Agente-${String.fromCharCode(65 + i)}`,
        type: wave.type,
        hp: wave.hp,
        maxHp: wave.hp,
        size: wave.size,
        position: [
          Math.floor(Math.random() * (customSize - wave.size[1])) + 1, // row
          Math.floor(Math.random() * (customSize - wave.size[0])) + 1, // col
        ],
        revealed: true,
        bombDelay: bDelay,
        teleDelay: tDelay,
        lastBombTime: Date.now(),
        lastTeleTime: Date.now(),
        bombsToFire: wave.bombs
      };
    }
    setEnemies(newEnemies);
    setCurrentLevel(level);
  }, []);

  const startGame = useCallback((diff, customSize = 10) => {
    setDifficulty(diff);
    setArenaSize(customSize);
    setPlayerHp(3);
    setPhase('playing');
    setIncomingBombs([]);
    spawnWave(diff, 1, customSize);
  }, [spawnWave]);

  // Checar mudança de fase quando inimigos morrem
  useEffect(() => {
    if (phase !== 'playing') return;
    const aliveCount = Object.values(enemies).filter(e => e.hp > 0).length;
    if (aliveCount === 0 && Object.keys(enemies).length > 0) {
      // Avançar de fase após pequeno delay
      const t = setTimeout(() => {
        spawnWave(difficulty, currentLevel + 1, arenaSize);
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [enemies, phase, difficulty, currentLevel, arenaSize, spawnWave]);

  // ── Inteligência dos Bots (Loop Principal) ───────────────
  useEffect(() => {
    if (phase !== 'playing') return;

    const interval = setInterval(() => {
      const now = Date.now();
      
      setEnemies(prev => {
        let updated = { ...prev };
        let changed = false;
        
        Object.values(updated).forEach(enemy => {
          if (enemy.hp <= 0) return;
          
          let eCopy = { ...enemy };
          let didSomething = false;

          // 1. Atirar Bombas
          if (eCopy.type === 'boss' && now - eCopy.lastBombTime > eCopy.bombDelay - 2000 && !eCopy.isChargingBomb) {
            eCopy.isChargingBomb = true;
            didSomething = true;
          }

          if (now - eCopy.lastBombTime > eCopy.bombDelay) {
            eCopy.lastBombTime = now;
            eCopy.isChargingBomb = false;
            didSomething = true;
            
            // Gerar bombas direcionadas ou aleatórias
            for (let i = 0; i < eCopy.bombsToFire; i++) {
              setTimeout(() => {
                const targetCol = Math.floor(Math.random() * arenaSize) + 1;
                const targetRow = Math.floor(Math.random() * arenaSize) + 1;
                const bombId = `b-${Date.now()}-${Math.random()}`;
                setIncomingBombs(b => [...b, { 
                  id: bombId, col: targetCol, row: targetRow, spawnTime: Date.now(),
                  shooterPos: [eCopy.position[1], eCopy.position[0]],
                  shooterType: eCopy.type
                }]);
              }, i * 500); // Espaçar tiros múltiplos
            }
          }

          // 2. Teleporte
          if (now - eCopy.lastTeleTime > eCopy.teleDelay) {
            eCopy.lastTeleTime = now;
            eCopy.position = [
              Math.floor(Math.random() * (arenaSize - eCopy.size[1])) + 1,
              Math.floor(Math.random() * (arenaSize - eCopy.size[0])) + 1,
            ];
            didSomething = true;
          }

          if (didSomething) {
            updated[enemy.id] = eCopy;
            changed = true;
          }
        });
        
        return changed ? updated : prev;
      });
      
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [phase, arenaSize]);

  // ── Resolução de Bombas Inimigas ─────────────────────────
  // Bombas explodem após 3 segundos
  useEffect(() => {
    if (incomingBombs.length === 0 || phase !== 'playing') return;

    const interval = setInterval(() => {
      const now = Date.now();
      let hitPlayer = false;

      setIncomingBombs(prev => {
        const remaining = [];
        prev.forEach(b => {
          if (now - b.spawnTime > 3000) {
            // Explodiu!
            const pr = lastPlayerPos.current.row;
            const pc = lastPlayerPos.current.col;
            // Area 3x3
            if (Math.abs(pr - b.row) <= 1 && Math.abs(pc - b.col) <= 1) {
              hitPlayer = true;
            }
          } else {
            remaining.push(b);
          }
        });
        return remaining.length === prev.length ? prev : remaining;
      });

      if (hitPlayer) {
        setPlayerHp(hp => {
          const newHp = Math.max(0, hp - 1);
          if (newHp === 0) setPhase('gameover');
          return newHp;
        });
      }

    }, 500);

    return () => clearInterval(interval);
  }, [incomingBombs, phase]);

  // ── Ataques do Jogador ────────────────────────────────────
  const checkEnemyHit = useCallback((enemy, tr, tc) => {
    // Checa se tr, tc (linha, coluna) cai dentro da área do inimigo (baseado em enemy.size)
    const [er, ec] = enemy.position;
    const [ew, eh] = enemy.size;
    return (tr >= er && tr < er + eh && tc >= ec && tc < ec + ew);
  }, []);

  const fireBomb = useCallback((col, row) => {
    setEnemies(prev => {
      const updated = { ...prev };
      Object.values(updated).forEach(enemy => {
        if (enemy.hp <= 0) return;
        
        // Área 3x3 da bomba do jogador
        let isHit = false;
        for (let r = row - 1; r <= row + 1; r++) {
          for (let c = col - 1; c <= col + 1; c++) {
            if (checkEnemyHit(enemy, r, c)) isHit = true;
          }
        }
        
        if (isHit) updated[enemy.id] = { ...enemy, hp: Math.max(0, enemy.hp - 1) };
      });
      return updated;
    });
  }, [checkEnemyHit]);

  const fireSniper = useCallback((col, row) => {
    setEnemies(prev => {
      const updated = { ...prev };
      Object.values(updated).forEach(enemy => {
        if (enemy.hp <= 0) return;
        if (checkEnemyHit(enemy, row, col)) {
          updated[enemy.id] = { ...enemy, hp: Math.max(0, enemy.hp - 3) };
        }
      });
      return updated;
    });
  }, [checkEnemyHit]);

  return {
    phase, setPhase, startGame, arenaSize,
    difficulty, currentLevel,
    enemies, playerHp, setPlayerHp,
    lastPlayerPos, lastParsedPos, setLastParsedPos,
    fireBomb, fireSniper,
    incomingBombs
  };
}
