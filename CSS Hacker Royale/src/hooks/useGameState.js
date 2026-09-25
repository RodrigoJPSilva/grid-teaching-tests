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

function checkBoxesOverlap(r1, c1, w1, h1, r2, c2, w2, h2) {
  return !(r1 + h1 <= r2 || r1 >= r2 + h2 || c1 + w1 <= c2 || c1 >= c2 + w2);
}

function findFreePosition(arenaSize, size, playerPos, existingEnemies, currentEnemyId = null) {
  const [ew, eh] = size;
  const maxRow = arenaSize - eh + 1;
  const maxCol = arenaSize - ew + 1;

  // Tentar posições aleatórias
  for (let attempt = 0; attempt < 50; attempt++) {
    const r = Math.floor(Math.random() * maxRow) + 1;
    const c = Math.floor(Math.random() * maxCol) + 1;

    // Colisão com o jogador (1x1)
    if (checkBoxesOverlap(r, c, ew, eh, playerPos.row, playerPos.col, 1, 1)) {
      continue;
    }

    // Colisão com outros inimigos vivos
    let collision = false;
    for (const other of Object.values(existingEnemies)) {
      if (other.id === currentEnemyId || other.hp <= 0) continue;
      const [or, oc] = other.position;
      const [ow, oh] = other.size;
      if (checkBoxesOverlap(r, c, ew, eh, or, oc, ow, oh)) {
        collision = true;
        break;
      }
    }

    if (!collision) {
      return [r, c];
    }
  }

  // Fallback: varredura sequencial
  for (let r = 1; r <= maxRow; r++) {
    for (let c = 1; c <= maxCol; c++) {
      if (checkBoxesOverlap(r, c, ew, eh, playerPos.row, playerPos.col, 1, 1)) continue;
      let collision = false;
      for (const other of Object.values(existingEnemies)) {
        if (other.id === currentEnemyId || other.hp <= 0) continue;
        const [or, oc] = other.position;
        const [ow, oh] = other.size;
        if (checkBoxesOverlap(r, c, ew, eh, or, oc, ow, oh)) {
          collision = true;
          break;
        }
      }
      if (!collision) return [r, c];
    }
  }

  return [1, 1]; // Fallback seguro
}

export function useGameState() {
  const [phase, setPhase] = useState('menu'); // menu, playing, gameover, victory
  const [difficulty, setDifficulty] = useState('Facil');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [arenaSize, setArenaSize] = useState(10);
  
  const [enemies, setEnemies] = useState({});
  const [playerHp, setPlayerHp] = useState(3);
  
  const lastPlayerPos = useRef({ col: 1, row: 1 });
  const [lastParsedPos, setLastParsedPos] = useState({ col: 1, row: 1 });

  // Invulnerabilidade do Jogador (2 segundos)
  const lastPlayerDamageTime = useRef(0);

  // Bombas atiradas pelos NPCs contra o jogador
  const [incomingBombs, setIncomingBombs] = useState([]);

  // Dano ao jogador com respeito aos 2s de invulnerabilidade
  const applyPlayerDamage = useCallback((amount = 1) => {
    const now = Date.now();
    if (now - lastPlayerDamageTime.current < 2000) return false;
    lastPlayerDamageTime.current = now;
    setPlayerHp(hp => {
      const newHp = Math.max(0, hp - amount);
      if (newHp === 0) setPhase('gameover');
      return newHp;
    });
    return true;
  }, []);

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
        tDelay = Math.random() * (wave.teleDelay[1] - wave.teleDelay[0]) + wave.teleDelay[0];
      }

      const safePos = findFreePosition(customSize, wave.size, lastPlayerPos.current, newEnemies);

      newEnemies[id] = {
        id,
        name: wave.type === 'boss' ? 'FINAL BOSS' : `Agente-${String.fromCharCode(65 + i)}`,
        type: wave.type,
        hp: wave.hp,
        maxHp: wave.hp,
        size: wave.size,
        position: safePos,
        revealed: true,
        bombDelay: bDelay,
        teleDelay: tDelay,
        lastBombTime: Date.now(),
        lastTeleTime: Date.now(),
        lastDamageTime: 0,
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
    lastPlayerDamageTime.current = 0;
    setPhase('playing');
    setIncomingBombs([]);
    spawnWave(diff, 1, customSize);
  }, [spawnWave]);

  // Checar mudança de fase quando inimigos morrem
  useEffect(() => {
    if (phase !== 'playing') return;
    const aliveCount = Object.values(enemies).filter(e => e.hp > 0).length;
    if (aliveCount === 0 && Object.keys(enemies).length > 0) {
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
              }, i * 500);
            }
          }

          // 2. Teleporte sem sobreposição
          if (now - eCopy.lastTeleTime > eCopy.teleDelay) {
            eCopy.lastTeleTime = now;
            eCopy.position = findFreePosition(arenaSize, eCopy.size, lastPlayerPos.current, updated, eCopy.id);
            didSomething = true;
          }

          if (didSomething) {
            updated[enemy.id] = eCopy;
            changed = true;
          }
        });
        
        return changed ? updated : prev;
      });
      
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, arenaSize]);

  // ── Resolução de Bombas Inimigas ─────────────────────────
  useEffect(() => {
    if (incomingBombs.length === 0 || phase !== 'playing') return;

    const interval = setInterval(() => {
      const now = Date.now();
      let hitPlayer = false;

      setIncomingBombs(prev => {
        const remaining = [];
        prev.forEach(b => {
          if (now - b.spawnTime > 3000) {
            const pr = lastPlayerPos.current.row;
            const pc = lastPlayerPos.current.col;
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
        applyPlayerDamage(1);
      }

    }, 500);

    return () => clearInterval(interval);
  }, [incomingBombs, phase, applyPlayerDamage]);

  // ── Ataques do Jogador ────────────────────────────────────
  const checkEnemyHit = useCallback((enemy, tr, tc) => {
    const [er, ec] = enemy.position;
    const [ew, eh] = enemy.size;
    return (tr >= er && tr < er + eh && tc >= ec && tc < ec + ew);
  }, []);

  const fireBomb = useCallback((col, row) => {
    const now = Date.now();
    setEnemies(prev => {
      const updated = { ...prev };
      Object.values(updated).forEach(enemy => {
        if (enemy.hp <= 0) return;
        // Invulnerabilidade de 2 segundos durante piscamento de dano
        if (enemy.lastDamageTime && now - enemy.lastDamageTime < 2000) return;
        
        let isHit = false;
        for (let r = row - 1; r <= row + 1; r++) {
          for (let c = col - 1; c <= col + 1; c++) {
            if (checkEnemyHit(enemy, r, c)) isHit = true;
          }
        }
        
        if (isHit) {
          updated[enemy.id] = { ...enemy, hp: Math.max(0, enemy.hp - 1), lastDamageTime: now };
        }
      });
      return updated;
    });
  }, [checkEnemyHit]);

  const fireSniper = useCallback((col, row) => {
    const now = Date.now();
    setEnemies(prev => {
      const updated = { ...prev };
      Object.values(updated).forEach(enemy => {
        if (enemy.hp <= 0) return;
        // Invulnerabilidade de 2 segundos durante piscamento de dano
        if (enemy.lastDamageTime && now - enemy.lastDamageTime < 2000) return;

        if (checkEnemyHit(enemy, row, col)) {
          updated[enemy.id] = { ...enemy, hp: Math.max(0, enemy.hp - 3), lastDamageTime: now };
        }
      });
      return updated;
    });
  }, [checkEnemyHit]);

  return {
    phase, setPhase, startGame, arenaSize,
    difficulty, currentLevel,
    enemies, playerHp, setPlayerHp,
    applyPlayerDamage,
    lastPlayerPos, lastParsedPos, setLastParsedPos,
    fireBomb, fireSniper,
    incomingBombs
  };
}
