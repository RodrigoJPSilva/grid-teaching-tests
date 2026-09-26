// ============================================================
//  ArenaGrid.jsx — O campo de batalha CSS Grid 6x6
//
//  CSS Conceitos implementados:
//   - display: grid
//   - grid-template-columns / rows
//   - grid-area (mira da Sniper)
//   - grid-column / grid-row (span do Laser)
//   - Animações de tiro via CSS transitions
// ============================================================

import { useEffect } from 'react';
import { ARENA_SIZE, WEAPONS } from '../constants/gameData';
import styles from './ArenaGrid.module.css';

/**
 * ArenaGrid — Renderiza a grade de combate 6x6.
 *
 * @param {object} enemies - Mapa de inimigos com HP e posição
 * @param {[number,number]} aimPosition - Posição atual da mira [row, col]
 * @param {function} setAimPosition - Altera a posição de mira
 * @param {string} selectedWeapon - ID da arma ativa
 * @param {string} selectedAxis - Eixo do laser ('row' | 'col')
 * @param {Array} shotEffects - Efeitos visuais de tiro ativos
 * @param {function} fireWeapon - Dispara a arma na mira
 */
export default function ArenaGrid({
  enemies,
  aimPosition,
  setAimPosition,
  selectedWeapon,
  selectedAxis,
  shotEffects,
  fireWeapon,
}) {
  const [aimRow, aimCol] = aimPosition;
  const weapon = WEAPONS[selectedWeapon];

  // ── Gera as células do grid ─────────────────────────────────
  const cells = [];
  for (let row = 1; row <= ARENA_SIZE; row++) {
    for (let col = 1; col <= ARENA_SIZE; col++) {
      cells.push({ row, col });
    }
  }

  /**
   * Verifica se uma célula está na área de efeito da mira.
   * Usada para o highlight de pré-visualização do tiro.
   * @param {number} row
   * @param {number} col
   * @returns {boolean}
   */
  const isCellInAimArea = (row, col) => {
    if (selectedWeapon === 'sniper') {
      return row === aimRow && col === aimCol;
    }
    if (selectedWeapon === 'bombs') {
      // Área 2x2 ao redor da mira
      return Math.abs(row - aimRow) <= 1 && Math.abs(col - aimCol) <= 1;
    }
    if (selectedWeapon === 'laser') {
      // Linha ou coluna inteira
      return selectedAxis === 'row' ? row === aimRow : col === aimCol;
    }
    return false;
  };

  /**
   * Verifica se uma célula está sendo atingida por algum shotEffect ativo.
   * @param {number} row
   * @param {number} col
   * @returns {string|null} Tipo do efeito ativo ou null
   */
  const getActiveEffect = (row, col) => {
    for (const effect of shotEffects) {
      if (effect.cells.some(([r, c]) => r === row && c === col)) {
        return effect.type;
      }
    }
    return null;
  };

  /**
   * Retorna o inimigo (se houver) posicionado na célula dada.
   * @param {number} row
   * @param {number} col
   * @returns {object|null} Dados do inimigo ou null
   */
  const getEnemyAt = (row, col) => {
    return Object.values(enemies).find(
      e => e.position[0] === row && e.position[1] === col && e.hp > 0
    ) || null;
  };

  // ── Atalhos de Teclado para movimentar a mira ───────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Evita mover mira se estiver digitando no terminal
      if (e.target.tagName === 'INPUT') return;

      let [r, c] = aimPosition;
      if (e.key === 'ArrowUp')    r = Math.max(1, r - 1);
      if (e.key === 'ArrowDown')  r = Math.min(ARENA_SIZE, r + 1);
      if (e.key === 'ArrowLeft')  c = Math.max(1, c - 1);
      if (e.key === 'ArrowRight') c = Math.min(ARENA_SIZE, c + 1);
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fireWeapon();
        return;
      }
      setAimPosition([r, c]);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aimPosition, setAimPosition, fireWeapon]);

  return (
    <div className={styles.arenaWrapper}>
      {/* Cabeçalho da Arena com coordenadas das colunas */}
      <div className={styles.arenaHeader}>
        <span className={styles.cornerLabel}>CSS</span>
        {Array.from({ length: ARENA_SIZE }, (_, i) => (
          <span key={i} className={styles.colLabel}>
            col-{i + 1}
          </span>
        ))}
      </div>

      <div className={styles.arenaBody}>
        {/* Rótulos das linhas */}
        <div className={styles.rowLabels}>
          {Array.from({ length: ARENA_SIZE }, (_, i) => (
            <span key={i} className={styles.rowLabel}>
              row-{i + 1}
            </span>
          ))}
        </div>

        {/* Grid principal de combate — display: grid */}
        <div
          className={styles.grid}
          style={{
            // CSS Grid definido inline para que os alunos possam visualizar
            display: 'grid',
            gridTemplateColumns: `repeat(${ARENA_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${ARENA_SIZE}, 1fr)`,
          }}
        >
          {cells.map(({ row, col }) => {
            const enemy = getEnemyAt(row, col);
            const inAimArea = isCellInAimArea(row, col);
            const activeEffect = getActiveEffect(row, col);
            const isExactAim = row === aimRow && col === aimCol;

            // Monta as classes dinamicamente com base no estado
            const cellClasses = [
              styles.cell,
              inAimArea && !activeEffect ? styles[`aim_${selectedWeapon}`] : '',
              isExactAim ? styles.aimCenter : '',
              activeEffect ? styles[`effect_${activeEffect}`] : '',
              enemy ? styles.hasEnemy : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div
                key={`${row}-${col}`}
                id={`cell-r${row}-c${col}`}
                className={cellClasses}
                // Propriedade grid-area explícita para a Sniper
                style={{
                  gridArea: `${row} / ${col} / ${row + 1} / ${col + 1}`,
                }}
                onClick={() => {
                  // Clique move a mira para a célula clicada
                  setAimPosition([row, col]);
                }}
                title={`grid-area: ${row} / ${col} / ${row + 1} / ${col + 1}`}
              >
                {/* Coordenada da célula — visível em hover */}
                <span className={styles.cellCoord}>
                  [{row},{col}]
                </span>

                {/* Inimigo na célula (se revelado) */}
                {enemy && enemy.revealed && (
                  <div className={styles.enemyContainer}>
                    <span className={styles.enemySkin}>{enemy.skin}</span>
                    {/* Barra de HP do inimigo */}
                    <div className={styles.enemyHpBar}>
                      <div
                        className={styles.enemyHpFill}
                        style={{
                          // flex-grow simulado pela proporção de HP
                          width: `${(enemy.hp / enemy.maxHp) * 100}%`,
                        }}
                      />
                    </div>
                    <span className={styles.enemyHp}>{enemy.hp}</span>
                  </div>
                )}

                {/* Inimigo não revelado (ponto de interrogação) */}
                {enemy && !enemy.revealed && (
                  <span className={styles.hiddenEnemy}>?</span>
                )}

                {/* Indicador de mira central */}
                {isExactAim && !activeEffect && (
                  <div
                    className={styles.crosshair}
                    style={{ borderColor: weapon.color }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CSS Info Box — Mostra o código CSS da mira ao vivo */}
      <div className={styles.cssInfoBox}>
        <span className={styles.cssInfoLabel}>/* CSS ao vivo */</span>
        <code className={styles.cssCode}>
          {selectedWeapon === 'sniper' && (
            <>
              <span className={styles.cssProp}>grid-area</span>
              <span className={styles.cssColon}>: </span>
              <span className={styles.cssVal}>
                {aimRow} / {aimCol} / {aimRow + 1} / {aimCol + 1}
              </span>;
            </>
          )}
          {selectedWeapon === 'bombs' && (
            <>
              <span className={styles.cssProp}>display</span>
              <span className={styles.cssColon}>: </span>
              <span className={styles.cssVal}>flex</span>;{' '}
              <span className={styles.cssProp}>flex-grow</span>
              <span className={styles.cssColon}>: </span>
              <span className={styles.cssVal}>3</span>;
            </>
          )}
          {selectedWeapon === 'laser' && (
            <>
              <span className={styles.cssProp}>
                {selectedAxis === 'row' ? 'grid-row' : 'grid-column'}
              </span>
              <span className={styles.cssColon}>: </span>
              <span className={styles.cssVal}>
                {selectedAxis === 'row' ? aimRow : aimCol} / span {ARENA_SIZE}
              </span>;
            </>
          )}
        </code>
      </div>
    </div>
  );
}
