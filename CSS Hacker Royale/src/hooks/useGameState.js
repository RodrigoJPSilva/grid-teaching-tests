// ============================================================
//  useGameState.js — Lógica de Fases e IA dos Inimigos
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { soundManager } from '../utils/SoundManager';

const WAVES = {
  Facil: {
    1: { bots: 1, type: 'normal', hp: 3, bombDelay: [10000], teleDelay: [20000], size: [1,1], bombs: 1 },
    2: { bots: 2, type: 'normal', hp: 3, bombDelay: [5000, 10000], teleDelay: [20000, 20000], size: [1,1], bombs: 2 },
    3: { bots: 1, type: 'boss', hp: 30, bombDelay: [5000], teleDelay: [20000], size: [2,2], bombs: 5 }
  },
  Normal: {
    1: { bots: 3, type: 'normal', hp: 3, bombDelay: [5000, 10000, 15000], teleDelay: [15000, 25000], size: [1,1], bombs: 1 },
    2: { bots: 3, type: 'normal', hp: 3, bombDelay: [6000, 9000, 12000], teleDelay: [15000, 25000], size: [1,1], bombs: 2 },
    3: { bots: 1, type: 'boss', hp: 30, bombDelay: [5000], teleDelay: [10000, 40000], size: [2,2], bombs: 5 }
  },
  Matrix: {
    1: { bots: 1, type: 'boss', hp: 30, bombDelay: [1000], teleDelay: [20000], size: [2,2], bombs: 5 },
    2: { bots: 2, type: 'boss', hp: 30, bombDelay: [1000, 1000], teleDelay: [20000, 20000], size: [2,1], bombs: 4 },
  }
};

function checkBoxesOverlap(r1, c1, w1, h1, r2, c2, w2, h2) {
  return !(r1 + h1 <= r2 || r1 >= r2 + h2 || c1 + w1 <= c2 || c1 >= c2 + w2);
}

function findFreePosition(arenaSize, size, playerPos, existingEnemies, currentEnemyId = null, isBoss = false) {
  const [ew, eh] = size;
  // Para o Boss (2x2 com onda de 4x4), manter margem mínima de 1 piso de todas as bordas se a arena tiver espaço (>= 6)
  const minRow = (isBoss && arenaSize >= 6) ? 2 : 1;
  const maxRow = (isBoss && arenaSize >= 6) ? arenaSize - eh : arenaSize - eh + 1;
  const minCol = (isBoss && arenaSize >= 6) ? 2 : 1;
  const maxCol = (isBoss && arenaSize >= 6) ? arenaSize - ew : arenaSize - ew + 1;

  for (let attempt = 0; attempt < 50; attempt++) {
    const r = Math.floor(Math.random() * (maxRow - minRow + 1)) + minRow;
    const c = Math.floor(Math.random() * (maxCol - minCol + 1)) + minCol;

    if (checkBoxesOverlap(r, c, ew, eh, playerPos.row, playerPos.col, 1, 1)) {
      continue;
    }

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

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
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
  return [minRow, minCol];
}

export function useGameState() {
  const [phase, setPhase] = useState('menu'); // menu, playing, gameover, victory
  const [difficulty, setDifficulty] = useState('Facil');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [arenaSize, setArenaSize] = useState(10);
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  
  const [enemies, setEnemies] = useState({});
  const [playerHp, setPlayerHp] = useState(3);
  
  const lastPlayerPos = useRef({ col: 1, row: 1 });
  const [lastParsedPos, setLastParsedPos] = useState({ col: 1, row: 1 });

  const lastPlayerDamageTime = useRef(0);
  const [incomingBombs, setIncomingBombs] = useState([]);

  const applyPlayerDamage = useCallback((amount = 1) => {
    const now = Date.now();
    if (now - lastPlayerDamageTime.current < 2000) return false;
    lastPlayerDamageTime.current = now;
    soundManager.playDamage();
    setPlayerHp(hp => {
      const newHp = Math.max(0, hp - amount);
      if (newHp === 0) setPhase('gameover');
      return newHp;
    });
    return true;
  }, []);

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

      const safePos = findFreePosition(customSize, wave.size, lastPlayerPos.current, newEnemies, null, wave.type === 'boss');

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
        bombsToFire: wave.bombs,
        spawnTime: (level === 1 || wave.type === 'boss') ? 0 : Date.now(),
        isIntroActive: wave.type === 'boss',
      };
    }
    setEnemies(newEnemies);
    setCurrentLevel(level);
  }, []);

  const resetSpawnTimes = useCallback((timestamp = Date.now()) => {
    setEnemies(prev => {
      const updated = {};
      Object.entries(prev).forEach(([id, enemy]) => {
        updated[id] = { ...enemy, spawnTime: enemy.type === 'boss' ? enemy.spawnTime : timestamp };
      });
      return updated;
    });
  }, []);

  const triggerBossDescent = useCallback((bossId, timestamp = Date.now()) => {
    setEnemies(prev => {
      if (!prev[bossId]) return prev;
      return {
        ...prev,
        [bossId]: {
          ...prev[bossId],
          spawnTime: timestamp,
        }
      };
    });
  }, []);

  const completeBossIntro = useCallback((bossId) => {
    setEnemies(prev => {
      if (!prev[bossId]) return prev;
      return {
        ...prev,
        [bossId]: {
          ...prev[bossId],
          isIntroActive: false,
          lastBombTime: Date.now(),
          lastTeleTime: Date.now(),
        }
      };
    });
  }, []);

  const triggerBossJump = useCallback((bossId, targetPos) => {
    setEnemies(prev => {
      const bId = bossId || Object.keys(prev).find(id => prev[id].type === 'boss');
      if (!bId || !prev[bId]) return prev;
      const now = Date.now();
      const tPos = targetPos || findFreePosition(arenaSize, prev[bId].size, lastPlayerPos.current, prev, bId, true);
      return {
        ...prev,
        [bId]: {
          ...prev[bId],
          jumpState: {
            startTime: now,
            startPos: [...prev[bId].position],
            targetPos: tPos,
            duration: 5000,
          },
          landingState: null,
          skyBombAttack: null,
        }
      };
    });
  }, [arenaSize]);

  const startGame = useCallback((diff, customSize = 10) => {
    setDifficulty(diff);
    setArenaSize(customSize);
    setPlayerHp(3);
    lastPlayerDamageTime.current = 0;
    setPhase('playing');
    setIncomingBombs([]);
    setIsTutorialActive(diff === 'Facil');
    spawnWave(diff, 1, customSize);
  }, [spawnWave]);

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

  // ── Inteligência dos Bots ─────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;

    const interval = setInterval(() => {
      const now = Date.now();
      
      setEnemies(prev => {
        let updated = { ...prev };
        let changed = false;
        
        Object.values(updated).forEach(enemy => {
          if (enemy.hp <= 0 || enemy.isIntroActive) return;
          
          let eCopy = { ...enemy };
          let didSomething = false;

          // 1. Ataque de Bombas
          if (eCopy.type === 'boss') {
            if (eCopy.skyBombAttack) {
              if (now >= eCopy.skyBombAttack.skyDropTime) {
                // Disparo real das bombas caindo do céu (1 segundo após as mini-bombas subirem)
                const shootPos = eCopy.position ? [eCopy.position[1], eCopy.position[0]] : [1, 1];
                for (let i = 0; i < eCopy.skyBombAttack.bombsCount; i++) {
                  setTimeout(() => {
                    const targetCol = Math.floor(Math.random() * arenaSize) + 1;
                    const targetRow = Math.floor(Math.random() * arenaSize) + 1;
                    const bombId = `b-${Date.now()}-${Math.random()}`;
                    setIncomingBombs(b => [...b, { 
                      id: bombId, col: targetCol, row: targetRow, spawnTime: Date.now(),
                      shooterPos: shootPos,
                      shooterType: eCopy.type
                    }]);
                  }, i * 400);
                }
                eCopy.skyBombAttack = null;
                eCopy.lastBombTime = now;
                didSomething = true;
              }
            } else if (!eCopy.jumpState && !eCopy.landingState && now - eCopy.lastBombTime > eCopy.bombDelay) {
              // Inicia nova animação de lançamento para o céu (0.2s por mão alternada + 0.5s voo + 1.0s de antecedência)
              const bombsCount = eCopy.bombsToFire || 5;
              const lastBombAscendEndMs = Math.round((bombsCount * 0.2 + 0.5) * 1000);
              const skyDropDelayMs = lastBombAscendEndMs + 1000; // 1 segundo após a última bomba subir
              eCopy.skyBombAttack = {
                startTime: now,
                bombsCount: bombsCount,
                duration: lastBombAscendEndMs,
                skyDropTime: now + skyDropDelayMs,
              };
              didSomething = true;
            }
          } else {
            // NPCs normais atiram bombas padrão com animação sincronizada e mãos alternadas (pausados se tutorial estiver ativo)
            if (!isTutorialActive && now - eCopy.lastBombTime > eCopy.bombDelay) {
              eCopy.lastBombTime = now;
              const bombsCount = eCopy.bombsToFire || 1;
              const totalDurationMs = Math.round(((bombsCount - 1) * 0.4 + 0.7) * 1000);
              eCopy.bombAttack = {
                startTime: now,
                bombsCount: bombsCount,
                duration: totalDurationMs,
              };
              didSomething = true;

              for (let i = 0; i < bombsCount; i++) {
                const launchDelayMs = i * 400 + 200;
                setTimeout(() => {
                  const targetCol = Math.floor(Math.random() * arenaSize) + 1;
                  const targetRow = Math.floor(Math.random() * arenaSize) + 1;
                  const bombId = `b-${Date.now()}-${Math.random()}`;
                  setIncomingBombs(b => [...b, { 
                    id: bombId,
                    col: targetCol,
                    row: targetRow,
                    spawnTime: Date.now(),
                    shooterPos: [eCopy.position[1], eCopy.position[0]],
                    shooterType: eCopy.type,
                    hand: i % 2 === 0 ? 'right' : 'left',
                  }]);
                }, launchDelayMs);
              }

              setTimeout(() => {
                setEnemies(prev => {
                  if (!prev[enemy.id] || !prev[enemy.id].bombAttack) return prev;
                  return {
                    ...prev,
                    [enemy.id]: {
                      ...prev[enemy.id],
                      bombAttack: null
                    }
                  };
                });
              }, totalDurationMs);
            }
          }

          // 2. Movimentação: Pulo Parabólico de 5s para o Boss vs Teleporte para NPCs
          if (eCopy.type === 'boss') {
            if (eCopy.jumpState) {
              if (now - eCopy.jumpState.startTime >= 5000) {
                // Aterrissagem concluída -> Entra imediatamente na animação de pouso (1.5 segundos)
                const [targetRow, targetCol] = eCopy.jumpState.targetPos;
                eCopy.position = [targetRow, targetCol];
                eCopy.lastTeleTime = now;
                eCopy.jumpState = null;
                eCopy.landingState = {
                  startTime: now,
                  duration: 1500, // 1.5s configurado pelo usuário
                };
                didSomething = true;

                // Dano ao jogador se estiver na área de impacto de 4x4
                const pr = lastPlayerPos.current.row;
                const pc = lastPlayerPos.current.col;
                if (pr >= targetRow - 1 && pr <= targetRow + 2 && pc >= targetCol - 1 && pc <= targetCol + 2) {
                  applyPlayerDamage(1);
                }
              }
            } else if (eCopy.landingState) {
              // Boss bloqueado durante o pouso (1.5s) antes de poder iniciar outros ataques
              if (now - eCopy.landingState.startTime >= eCopy.landingState.duration) {
                eCopy.landingState = null;
                didSomething = true;
              }
            } else if (now - eCopy.lastTeleTime > eCopy.teleDelay && !eCopy.skyBombAttack) {
              const targetPos = findFreePosition(arenaSize, eCopy.size, lastPlayerPos.current, updated, eCopy.id, true);
              eCopy.jumpState = {
                startTime: now,
                startPos: [...eCopy.position],
                targetPos: targetPos,
                duration: 5000,
              };
              didSomething = true;
            }
          } else {
            // NPCs normais usam teleporte instantâneo
            if (now - eCopy.lastTeleTime > eCopy.teleDelay) {
              eCopy.lastTeleTime = now;
              eCopy.position = findFreePosition(arenaSize, eCopy.size, lastPlayerPos.current, updated, eCopy.id);
              didSomething = true;
            }
          }

          if (didSomething) {
            updated[enemy.id] = eCopy;
            changed = true;
          }
        });
        
        return changed ? updated : prev;
      });
      
    }, 100);

    return () => clearInterval(interval);
  }, [phase, arenaSize, applyPlayerDamage]);

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
    incomingBombs,
    resetSpawnTimes,
    triggerBossDescent,
    completeBossIntro,
    triggerBossJump,
    isTutorialActive, setIsTutorialActive,
  };
}
