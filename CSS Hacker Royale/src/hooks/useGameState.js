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

export function useGameState(inputMode = 'radial') {
  const [phase, setPhase] = useState('menu'); // menu, playing, gameover, victory
  const [difficulty, setDifficulty] = useState('Facil');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [arenaSize, setArenaSize] = useState(10);
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  
  const [enemies, setEnemies] = useState({});
  const [playerHp, setPlayerHp] = useState(3);
  
  const lastPlayerPos = useRef({ col: 1, row: 1 });
  const [lastParsedPos, setLastParsedPos] = useState({ col: 1, row: 1 });

  // Histórico de movimentos do jogador para a mira preditiva dos NPCs
  const playerHistory = useRef([{ col: 1, row: 1, time: Date.now() }]);
  const playerTileFrequency = useRef({ '1,1': 1 });

  const recordPlayerMove = useCallback((col, row) => {
    const key = `${col},${row}`;
    playerTileFrequency.current[key] = (playerTileFrequency.current[key] || 0) + 1;
    playerHistory.current.push({ col, row, time: Date.now() });
    if (playerHistory.current.length > 30) {
      playerHistory.current.shift();
    }
  }, []);

  // Checkpoints de invocação de reforços por Boss
  const bossSummonsTriggered = useRef(new Map());

  const lastPlayerDamageTime = useRef(0);
  const playerSpawnTimeRef = useRef(0);
  const [incomingBombs, setIncomingBombs] = useState([]);

  const applyPlayerDamage = useCallback((amount = 1) => {
    const now = Date.now();
    if (now - lastPlayerDamageTime.current < 2000) return false;
    if (playerSpawnTimeRef.current > 0 && now < playerSpawnTimeRef.current + 2000) return false;
    lastPlayerDamageTime.current = now;
    soundManager.playDamage();
    setPlayerHp(hp => {
      const newHp = Math.max(0, hp - amount);
      if (newHp === 0) {
        setTimeout(() => {
          setPhase('gameover');
        }, 2600);
      }
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
        spawnTime: wave.type === 'boss' ? 0 : Date.now(),
        isIntroActive: wave.type === 'boss',
      };
    }
    setEnemies(newEnemies);
    setCurrentLevel(level);
  }, []);

  const resetSpawnTimes = useCallback((timestamp = Date.now()) => {
    playerSpawnTimeRef.current = timestamp;
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
      let updated = { ...prev };
      if (bossId && updated[bossId]) {
        updated[bossId] = {
          ...updated[bossId],
          spawnTime: timestamp,
        };
      } else {
        Object.keys(updated).forEach(id => {
          if (updated[id].type === 'boss') {
            updated[id] = { ...updated[id], spawnTime: timestamp };
          }
        });
      }
      return updated;
    });
  }, []);

  const completeBossIntro = useCallback((bossId) => {
    setEnemies(prev => {
      let updated = { ...prev };
      const now = Date.now();
      if (bossId && updated[bossId]) {
        updated[bossId] = {
          ...updated[bossId],
          isIntroActive: false,
          lastBombTime: now,
          lastTeleTime: now,
        };
      } else {
        Object.keys(updated).forEach(id => {
          if (updated[id].type === 'boss') {
            updated[id] = {
              ...updated[id],
              isIntroActive: false,
              lastBombTime: now,
              lastTeleTime: now,
            };
          }
        });
      }
      return updated;
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
    bossSummonsTriggered.current.clear();
    playerHistory.current = [{ col: 1, row: 1, time: Date.now() }];
    playerTileFrequency.current = { '1,1': 1 };
    const isEasy = diff === 'Facil';
    setIsTutorialActive(isEasy);
    if (!isEasy) {
      spawnWave(diff, 1, customSize);
    } else {
      setEnemies({});
    }
  }, [spawnWave]);

  const spawnTutorialBombTargets = useCallback(() => {
    const now = Date.now();
    setEnemies({
      'tut-bot-1': {
        id: 'tut-bot-1',
        name: 'Target-Alpha',
        type: 'normal',
        hp: 1,
        maxHp: 1,
        size: [1, 1],
        position: [2, 7],
        revealed: true,
        bombDelay: 999999,
        teleDelay: 999999,
        lastBombTime: now,
        lastTeleTime: now,
        lastDamageTime: 0,
        bombsToFire: 0,
        spawnTime: now,
        isIntroActive: false,
      },
      'tut-bot-2': {
        id: 'tut-bot-2',
        name: 'Target-Bravo',
        type: 'normal',
        hp: 1,
        maxHp: 1,
        size: [1, 1],
        position: [3, 8],
        revealed: true,
        bombDelay: 999999,
        teleDelay: 999999,
        lastBombTime: now,
        lastTeleTime: now,
        lastDamageTime: 0,
        bombsToFire: 0,
        spawnTime: now,
        isIntroActive: false,
      },
      'tut-bot-3': {
        id: 'tut-bot-3',
        name: 'Target-Charlie',
        type: 'normal',
        hp: 1,
        maxHp: 1,
        size: [1, 1],
        position: [4, 7],
        revealed: true,
        bombDelay: 999999,
        teleDelay: 999999,
        lastBombTime: now,
        lastTeleTime: now,
        lastDamageTime: 0,
        bombsToFire: 0,
        spawnTime: now,
        isIntroActive: false,
      },
    });
  }, []);

  const spawnTutorialSniperTarget = useCallback((targetCol = 8, targetRow = 8) => {
    const now = Date.now();
    setEnemies({
      'tut-sniper-bot': {
        id: 'tut-sniper-bot',
        name: 'Infiltrator',
        type: 'normal',
        hp: 3,
        maxHp: 3,
        size: [1, 1],
        position: [targetRow, targetCol],
        revealed: true,
        bombDelay: 999999,
        teleDelay: 999999,
        lastBombTime: now,
        lastTeleTime: now,
        lastDamageTime: 0,
        bombsToFire: 0,
        spawnTime: now,
        isIntroActive: false,
      }
    });
  }, []);

  const completeTutorialAndStartGame = useCallback(() => {
    setIsTutorialActive(false);
    setEnemies({});
    // Pausa de 2 segundos de preparação antes do robô da Fase 1 descer
    setTimeout(() => {
      spawnWave('Facil', 1, arenaSize);
    }, 2000);
  }, [spawnWave, arenaSize]);

  useEffect(() => {
    if (phase !== 'playing' || isTutorialActive) return;
    const aliveCount = Object.values(enemies).filter(e => e.hp > 0).length;
    if (aliveCount === 0 && Object.keys(enemies).length > 0) {
      const t = setTimeout(() => {
        spawnWave(difficulty, currentLevel + 1, arenaSize);
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [enemies, phase, difficulty, currentLevel, arenaSize, isTutorialActive, spawnWave]);

  // ── Invocação de Reforços pelo Boss ─────────────────────────
  const checkBossSummons = useCallback((boss, nextHp, currentEnemies) => {
    if (boss.type !== 'boss' || nextHp <= 0) return currentEnemies;
    const maxHp = boss.maxHp || 30;
    let triggeredSet = bossSummonsTriggered.current.get(boss.id);
    if (!triggeredSet) {
      triggeredSet = new Set();
      bossSummonsTriggered.current.set(boss.id, triggeredSet);
    }

    let npcsToSummon = 0;

    if (inputMode === 'radial') {
      // Sempre que perde 1/4 da vida (75%, 50%, 25%), invocando 2 + FraçãoDeVidaPerdida
      // 1/4 perdido (<= 75% HP): fração = 1 -> invoca 2 + 1 = 3 NPCs
      // 2/4 perdido (<= 50% HP): fração = 2 -> invoca 2 + 2 = 4 NPCs (ex: metade da vida)
      // 3/4 perdido (<= 25% HP): fração = 3 -> invoca 2 + 3 = 5 NPCs
      if (nextHp <= maxHp * 0.75 && !triggeredSet.has('q1')) {
        triggeredSet.add('q1');
        npcsToSummon += 3;
      }
      if (nextHp <= maxHp * 0.50 && !triggeredSet.has('q2')) {
        triggeredSet.add('q2');
        npcsToSummon += 4;
      }
      if (nextHp <= maxHp * 0.25 && !triggeredSet.has('q3')) {
        triggeredSet.add('q3');
        npcsToSummon += 5;
      }
    } else {
      // Modo Padrão: Quando chega na metade da vida (<= 50%), invoca 2 NPCs
      if (nextHp <= maxHp * 0.50 && !triggeredSet.has('half')) {
        triggeredSet.add('half');
        npcsToSummon += 2;
      }
    }

    if (npcsToSummon > 0) {
      const now = Date.now();
      soundManager.playPowerUp();
      const updated = { ...currentEnemies };
      for (let i = 0; i < npcsToSummon; i++) {
        const id = `reinforce-${boss.id}-${Date.now()}-${i}`;
        const safePos = findFreePosition(arenaSize, [1, 1], lastPlayerPos.current, updated, null, false);
        updated[id] = {
          id,
          name: `Reforço-${String.fromCharCode(65 + (Object.keys(updated).length % 26))}`,
          type: 'normal',
          hp: 3,
          maxHp: 3,
          size: [1, 1],
          position: safePos,
          revealed: true,
          bombDelay: inputMode === 'radial' ? 3000 : 6000,
          teleDelay: inputMode === 'radial' ? 10000 : 20000,
          lastBombTime: now,
          lastTeleTime: now,
          lastDamageTime: 0,
          bombsToFire: 1,
          spawnTime: now + 300 + i * 250,
          isIntroActive: false
        };
      }
      return updated;
    }
    return currentEnemies;
  }, [inputMode, arenaSize]);

  // ── Inteligência dos Bots ─────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;

    // No modo Menu Radial, os inimigos são 2x mais rápidos em todas as ações
    const speedMultiplier = inputMode === 'radial' ? 2 : 1;

    const interval = setInterval(() => {
      const now = Date.now();
      
      setEnemies(prev => {
        let updated = { ...prev };
        let changed = false;
        
        Object.values(updated).forEach(enemy => {
          if (enemy.hp <= 0 || enemy.isIntroActive || isTutorialActive) return;
          
          let eCopy = { ...enemy };
          let didSomething = false;

          // 1. Ataque de Bombas
          if (eCopy.type === 'boss') {
            if (eCopy.skyBombAttack) {
              if (now >= eCopy.skyBombAttack.skyDropTime) {
                // Disparo real das bombas caindo do céu (delays divididos pelo speedMultiplier)
                const shootPos = eCopy.position ? [eCopy.position[1], eCopy.position[0]] : [1, 1];
                const dropIntervalMs = Math.round(400 / speedMultiplier);
                for (let i = 0; i < eCopy.skyBombAttack.bombsCount; i++) {
                  setTimeout(() => {
                    const targetCol = Math.floor(Math.random() * arenaSize) + 1;
                    const targetRow = Math.floor(Math.random() * arenaSize) + 1;
                    const bombId = `b-${Date.now()}-${Math.random()}`;
                    soundManager.playBombLaunch();
                    setIncomingBombs(b => [...b, { 
                      id: bombId, col: targetCol, row: targetRow, spawnTime: Date.now(),
                      shooterPos: shootPos,
                      shooterType: eCopy.type
                    }]);
                  }, i * dropIntervalMs);
                }
                eCopy.skyBombAttack = null;
                eCopy.lastBombTime = now;
                didSomething = true;
              }
            } else if (!eCopy.jumpState && !eCopy.landingState && now - eCopy.lastBombTime > (eCopy.bombDelay / speedMultiplier)) {
              // Inicia animação de lançamento para o céu (2x mais rápida no modo radial)
              const bombsCount = eCopy.bombsToFire || 5;
              const lastBombAscendEndMs = Math.round(((bombsCount * 0.2 + 0.5) * 1000) / speedMultiplier);
              const skyDropDelayMs = Math.round((lastBombAscendEndMs + 1000) / speedMultiplier);
              eCopy.skyBombAttack = {
                startTime: now,
                bombsCount: bombsCount,
                duration: lastBombAscendEndMs,
                skyDropTime: now + skyDropDelayMs,
              };
              didSomething = true;
            }
          } else {
            // NPCs normais atiram bombas padrão (pausados se tutorial estiver ativo)
            if (!isTutorialActive && now - eCopy.lastBombTime > (eCopy.bombDelay / speedMultiplier)) {
              eCopy.lastBombTime = now;
              const bombsCount = eCopy.bombsToFire || 1;
              const totalDurationMs = Math.round((((bombsCount - 1) * 0.4 + 0.7) * 1000) / speedMultiplier);
              eCopy.bombAttack = {
                startTime: now,
                bombsCount: bombsCount,
                duration: totalDurationMs,
              };
              didSomething = true;

              for (let i = 0; i < bombsCount; i++) {
                const launchDelayMs = Math.round((i * 400 + 200) / speedMultiplier);
                setTimeout(() => {
                  let targetCol;
                  let targetRow;

                  if (inputMode === 'radial') {
                    // Padrão de mira dos NPCs no Modo Menu Radial
                    const aliveNpcs = Object.values(updated)
                      .filter(e => e.type === 'normal' && e.hp > 0)
                      .sort((a, b) => a.id.localeCompare(b.id));
                    const npcIdx = aliveNpcs.findIndex(e => e.id === eCopy.id);

                    if (npcIdx === 0) {
                      // O primeiro NPC sempre foca no jogador
                      // Se ele lança 2 bombas: 1 é no alcance da área do jogador e a outra é em piso aleatório
                      if (i === 0) {
                        const dc = Math.floor(Math.random() * 3) - 1; // -1, 0, +1
                        const dr = Math.floor(Math.random() * 3) - 1; // -1, 0, +1
                        targetCol = Math.max(1, Math.min(arenaSize, lastPlayerPos.current.col + dc));
                        targetRow = Math.max(1, Math.min(arenaSize, lastPlayerPos.current.row + dr));
                      } else {
                        targetCol = Math.floor(Math.random() * arenaSize) + 1;
                        targetRow = Math.floor(Math.random() * arenaSize) + 1;
                      }
                    } else if (npcIdx === 1) {
                      // O segundo NPC foca em possíveis locais que o jogador irá, pensando em locais que costuma ir
                      // Se não souber ainda, lança em áreas aleatórias
                      let predicted = null;
                      const hist = playerHistory.current;
                      if (hist.length >= 2) {
                        const last1 = hist[hist.length - 1];
                        const last2 = hist[hist.length - 2];
                        const dCol = last1.col - last2.col;
                        const dRow = last1.row - last2.row;
                        const candCol = last1.col + dCol;
                        const candRow = last1.row + dRow;
                        if (candCol >= 1 && candCol <= arenaSize && candRow >= 1 && candRow <= arenaSize && (dCol !== 0 || dRow !== 0)) {
                          predicted = { col: candCol, row: candRow };
                        }
                      }

                      if (!predicted) {
                        const freqs = Object.entries(playerTileFrequency.current)
                          .filter(([k]) => k !== `${lastPlayerPos.current.col},${lastPlayerPos.current.row}`)
                          .sort((a, b) => b[1] - a[1]);
                        if (freqs.length > 0) {
                          const [fCol, fRow] = freqs[0][0].split(',').map(Number);
                          predicted = { col: fCol, row: fRow };
                        }
                      }

                      if (predicted && (i === 0 || Math.random() < 0.5)) {
                        targetCol = predicted.col;
                        targetRow = predicted.row;
                      } else {
                        targetCol = Math.floor(Math.random() * arenaSize) + 1;
                        targetRow = Math.floor(Math.random() * arenaSize) + 1;
                      }
                    } else {
                      // O terceiro NPC segue disparando aleatoriamente
                      targetCol = Math.floor(Math.random() * arenaSize) + 1;
                      targetRow = Math.floor(Math.random() * arenaSize) + 1;
                    }
                  } else {
                    targetCol = Math.floor(Math.random() * arenaSize) + 1;
                    targetRow = Math.floor(Math.random() * arenaSize) + 1;
                  }

                  const bombId = `b-${Date.now()}-${Math.random()}`;
                  soundManager.playBombLaunch();
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

          // 2. Movimentação: Pulo Parabólico do Boss vs Teleporte para NPCs (2x mais rápidos no modo radial)
          if (eCopy.type === 'boss') {
            const jumpDurationMs = Math.round(5000 / speedMultiplier);
            const landingDurationMs = Math.round(1500 / speedMultiplier);

            if (eCopy.jumpState) {
              if (now - eCopy.jumpState.startTime >= jumpDurationMs) {
                // Aterrissagem concluída -> Entra imediatamente na animação de pouso
                const [targetRow, targetCol] = eCopy.jumpState.targetPos;
                eCopy.position = [targetRow, targetCol];
                eCopy.lastTeleTime = now;
                eCopy.jumpState = null;
                eCopy.landingState = {
                  startTime: now,
                  duration: landingDurationMs,
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
              // Boss bloqueado durante o pouso antes de poder iniciar outros ataques
              if (now - eCopy.landingState.startTime >= eCopy.landingState.duration) {
                eCopy.landingState = null;
                didSomething = true;
              }
            } else if (now - eCopy.lastTeleTime > (eCopy.teleDelay / speedMultiplier) && !eCopy.skyBombAttack) {
              const targetPos = findFreePosition(arenaSize, eCopy.size, lastPlayerPos.current, updated, eCopy.id, true);
              eCopy.jumpState = {
                startTime: now,
                startPos: [...eCopy.position],
                targetPos: targetPos,
                duration: jumpDurationMs,
              };
              didSomething = true;
            }
          } else {
            // NPCs normais usam teleporte instantâneo
            if (now - eCopy.lastTeleTime > (eCopy.teleDelay / speedMultiplier)) {
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
  }, [phase, arenaSize, applyPlayerDamage, inputMode, isTutorialActive]);

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
      let updated = { ...prev };
      let anyHit = false;
      Object.values(updated).forEach(enemy => {
        if (enemy.hp <= 0) return;
        // Imune a dano se ainda estiver na animação de surgimento descendo dos céus
        const isSpawning = enemy.spawnTime > 0 && now < enemy.spawnTime + (enemy.type === 'boss' ? 3000 : 2500);
        if (isSpawning) return;
        if (enemy.lastDamageTime && now - enemy.lastDamageTime < 2000) return;
        
        let isHit = false;
        for (let r = row - 1; r <= row + 1; r++) {
          for (let c = col - 1; c <= col + 1; c++) {
            if (checkEnemyHit(enemy, r, c)) isHit = true;
          }
        }
        
        if (isHit) {
          anyHit = true;
          const newHp = Math.max(0, enemy.hp - 1);
          updated[enemy.id] = {
            ...enemy,
            hp: newHp,
            isDead: newHp <= 0,
            deathTime: newHp <= 0 ? (enemy.deathTime || now) : 0,
            lastDamageTime: now
          };
          if (enemy.type === 'boss') {
            updated = checkBossSummons(enemy, newHp, updated);
          }
        }
      });
      return anyHit ? updated : prev;
    });
  }, [checkEnemyHit, checkBossSummons]);

  const fireSniper = useCallback((col, row) => {
    const now = Date.now();
    setEnemies(prev => {
      let updated = { ...prev };
      let anyHit = false;
      Object.values(updated).forEach(enemy => {
        if (enemy.hp <= 0) return;
        // Imune a dano se ainda estiver na animação de surgimento descendo dos céus
        const isSpawning = enemy.spawnTime > 0 && now < enemy.spawnTime + (enemy.type === 'boss' ? 3000 : 2500);
        if (isSpawning) return;
        if (enemy.lastDamageTime && now - enemy.lastDamageTime < 2000) return;

        if (checkEnemyHit(enemy, row, col)) {
          anyHit = true;
          const newHp = Math.max(0, enemy.hp - 3);
          updated[enemy.id] = {
            ...enemy,
            hp: newHp,
            isDead: newHp <= 0,
            deathTime: newHp <= 0 ? (enemy.deathTime || now) : 0,
            lastDamageTime: now
          };
          if (enemy.type === 'boss') {
            updated = checkBossSummons(enemy, newHp, updated);
          }
        }
      });
      return anyHit ? updated : prev;
    });
  }, [checkEnemyHit, checkBossSummons]);

  return {
    phase, setPhase, startGame, arenaSize,
    difficulty, currentLevel,
    enemies, playerHp, setPlayerHp,
    applyPlayerDamage,
    lastPlayerPos, lastParsedPos, setLastParsedPos,
    recordPlayerMove,
    fireBomb, fireSniper,
    incomingBombs,
    resetSpawnTimes,
    triggerBossDescent,
    completeBossIntro,
    triggerBossJump,
    isTutorialActive, setIsTutorialActive,
    spawnTutorialBombTargets,
    spawnTutorialSniperTarget,
    completeTutorialAndStartGame,
  };
}
