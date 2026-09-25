// ============================================================
//  Arsenal.jsx — Painel de Armas do CSS Hacker Royale
//  Turma 3DM SENAI — Seleção e status das 3 armas CSS
//
//  Armas:
//   🎯 Sniper de Grid  → grid-area exato
//   💣 Bomba Flex      → display:flex + flex-grow (área 2x2)
//   ⚡ Laser de Span   → grid-column/row span linha/coluna
// ============================================================

import styles from './Arsenal.module.css';
import { WEAPONS, ARENA_SIZE } from '../constants/gameData';

/**
 * Arsenal — Painel lateral de controle das armas.
 *
 * @param {string} selectedWeapon - Arma atualmente selecionada
 * @param {function} setSelectedWeapon - Troca a arma ativa
 * @param {object} weaponCooldowns - { sniper, bombs, laser } em ms
 * @param {[number,number]} aimPosition - [row, col] da mira
 * @param {function} setAimPosition - Altera a mira
 * @param {string} selectedAxis - Eixo do laser ('row' | 'col')
 * @param {function} setSelectedAxis - Altera eixo do laser
 * @param {function} fireWeapon - Executa o disparo
 * @param {number} playerHp - HP atual do jogador
 * @param {number} score - Pontuação atual
 * @param {object} enemies - Mapa de inimigos
 */
export default function Arsenal({
  selectedWeapon,
  setSelectedWeapon,
  weaponCooldowns,
  aimPosition,
  setAimPosition,
  selectedAxis,
  setSelectedAxis,
  fireWeapon,
  playerHp,
  score,
  enemies,
}) {
  const [aimRow, aimCol] = aimPosition;

  // ── Stats dos inimigos ──────────────────────────────────────
  const enemyList = Object.values(enemies);
  const aliveEnemies = enemyList.filter(e => e.hp > 0);
  const deadEnemies = enemyList.filter(e => e.hp <= 0);

  /**
   * Formata o tempo de cooldown para exibição (ms → segundos).
   */
  const formatCooldown = (ms) => {
    if (ms <= 0) return null;
    return (ms / 1000).toFixed(1) + 's';
  };

  return (
    <div className={styles.arsenal}>

      {/* ── HUD do Jogador ──────────────────────────────────── */}
      <div className={styles.playerHud}>
        <div className={styles.hudRow}>
          <span className={styles.hudLabel}>HACKER</span>
          <span className={styles.hudScore}>{score.toString().padStart(6, '0')} pts</span>
        </div>
        <div className={styles.hpBarContainer}>
          <span className={styles.hpLabel}>HP</span>
          <div className={styles.hpTrack}>
            <div
              className={styles.hpFill}
              style={{ width: `${(playerHp / 150) * 100}%` }}
            />
          </div>
          <span className={styles.hpValue}>{playerHp}</span>
        </div>
      </div>

      {/* ── Mapa de Ameaças ─────────────────────────────────── */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>⚠ AMEAÇAS</h3>
        <div className={styles.enemyTracker}>
          {enemyList.map(enemy => (
            <div
              key={enemy.id}
              className={`${styles.enemyRow} ${enemy.hp <= 0 ? styles.enemyDead : ''}`}
            >
              <span className={styles.enemyRowSkin}>{enemy.skin}</span>
              <div className={styles.enemyRowInfo}>
                <span className={styles.enemyRowName}>{enemy.name}</span>
                <div className={styles.enemyRowHpTrack}>
                  <div
                    className={styles.enemyRowHpFill}
                    style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
                  />
                </div>
              </div>
              <span className={styles.enemyRowHp}>
                {enemy.hp <= 0 ? '☠' : `${enemy.hp}/${enemy.maxHp}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Seleção de Armas ─────────────────────────────────── */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>⚙ ARSENAL</h3>
        <div className={styles.weaponList}>
          {Object.values(WEAPONS).map(weapon => {
            const isSelected = selectedWeapon === weapon.id;
            const cooldown = weaponCooldowns[weapon.id] || 0;
            const cdText = formatCooldown(cooldown);

            return (
              <button
                key={weapon.id}
                id={`weapon-btn-${weapon.id}`}
                className={`${styles.weaponCard} ${isSelected ? styles.weaponSelected : ''}`}
                style={isSelected ? { '--weapon-color': weapon.color } : {}}
                onClick={() => setSelectedWeapon(weapon.id)}
                disabled={cooldown > 0}
                title={weapon.description}
              >
                <div className={styles.weaponTop}>
                  <span className={styles.weaponEmoji}>{weapon.emoji}</span>
                  <div className={styles.weaponInfo}>
                    <span className={styles.weaponName}>{weapon.name}</span>
                    <code className={styles.weaponCss}>
                      {weapon.cssProperty}
                    </code>
                  </div>
                  <span className={styles.weaponDmg}>-{weapon.damage}HP</span>
                </div>

                {/* Barra de cooldown */}
                {cooldown > 0 && (
                  <div className={styles.cooldownBar}>
                    <div
                      className={styles.cooldownFill}
                      style={{
                        width: `${(cooldown / weapon.cooldown) * 100}%`,
                        background: weapon.color,
                      }}
                    />
                    <span className={styles.cooldownText}>{cdText}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Controles de Mira ────────────────────────────────── */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>🎯 MIRA</h3>

        {/* Coordenadas numéricas da mira */}
        <div className={styles.aimCoords}>
          <div className={styles.aimControl}>
            <label className={styles.aimLabel} htmlFor="aim-row">Linha (row)</label>
            <div className={styles.aimInputRow}>
              <button
                className={styles.aimBtn}
                onClick={() => setAimPosition([Math.max(1, aimRow - 1), aimCol])}
              >−</button>
              <span id="aim-row" className={styles.aimValue}>{aimRow}</span>
              <button
                className={styles.aimBtn}
                onClick={() => setAimPosition([Math.min(ARENA_SIZE, aimRow + 1), aimCol])}
              >+</button>
            </div>
          </div>
          <div className={styles.aimControl}>
            <label className={styles.aimLabel} htmlFor="aim-col">Coluna (col)</label>
            <div className={styles.aimInputRow}>
              <button
                className={styles.aimBtn}
                onClick={() => setAimPosition([aimRow, Math.max(1, aimCol - 1)])}
              >−</button>
              <span id="aim-col" className={styles.aimValue}>{aimCol}</span>
              <button
                className={styles.aimBtn}
                onClick={() => setAimPosition([aimRow, Math.min(ARENA_SIZE, aimCol + 1)])}
              >+</button>
            </div>
          </div>
        </div>

        {/* Seleção de eixo do Laser (só aparece quando Laser está ativo) */}
        {selectedWeapon === 'laser' && (
          <div className={styles.axisSelector}>
            <span className={styles.aimLabel}>Eixo do Laser:</span>
            <div className={styles.axisButtons}>
              <button
                id="axis-row"
                className={`${styles.axisBtn} ${selectedAxis === 'row' ? styles.axisBtnActive : ''}`}
                onClick={() => setSelectedAxis('row')}
              >
                ↔ Linha
              </button>
              <button
                id="axis-col"
                className={`${styles.axisBtn} ${selectedAxis === 'col' ? styles.axisBtnActive : ''}`}
                onClick={() => setSelectedAxis('col')}
              >
                ↕ Coluna
              </button>
            </div>
          </div>
        )}

        {/* Dica da propriedade CSS ativa */}
        <div className={styles.cssHint}>
          <span className={styles.cssHintLabel}>CSS:</span>
          <code className={styles.cssHintCode}>
            {selectedWeapon === 'sniper'
              ? `grid-area: ${aimRow}/${aimCol}/${aimRow + 1}/${aimCol + 1}`
              : selectedWeapon === 'bombs'
              ? `flex-grow: 3 /* expansão 2x2 */`
              : `${selectedAxis === 'row' ? 'grid-row' : 'grid-column'}: ${selectedAxis === 'row' ? aimRow : aimCol} / span ${ARENA_SIZE}`}
          </code>
        </div>
      </div>

      {/* ── Botão de Disparo ─────────────────────────────────── */}
      <button
        id="fire-button"
        className={styles.fireButton}
        onClick={fireWeapon}
        disabled={(weaponCooldowns[selectedWeapon] || 0) > 0}
        style={{ '--weapon-color': WEAPONS[selectedWeapon].color }}
      >
        <span className={styles.fireBtnEmoji}>{WEAPONS[selectedWeapon].emoji}</span>
        <span className={styles.fireBtnText}>DISPARAR</span>
        <span className={styles.fireBtnShortcut}>[Enter]</span>
      </button>

      {/* Dica de uso das teclas de direção */}
      <div className={styles.keyHint}>
        Mova a mira: ↑ ↓ ← → | Dispare: Enter ou Espaço
      </div>
    </div>
  );
}
