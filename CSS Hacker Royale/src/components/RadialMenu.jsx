// ============================================================
//  RadialMenu.jsx — Menu Radial Tático Circular (Imagem 2)
//  Estilo Donut / Pie Menu com 3 setores angulares + botão central 'X'
//  Auto-fecha se o mouse se afastar > 180px do centro
// ============================================================

import React, { useMemo, useEffect, useRef } from 'react';
import styles from './RadialMenu.module.css';

// Gera o path SVG para uma fatia donut de angleStart a angleEnd (em radianos)
function getSectorPath(rInner, rOuter, startAngle, endAngle) {
  const x1 = rOuter * Math.cos(startAngle);
  const y1 = rOuter * Math.sin(startAngle);
  const x2 = rOuter * Math.cos(endAngle);
  const y2 = rOuter * Math.sin(endAngle);

  const x3 = rInner * Math.cos(endAngle);
  const y3 = rInner * Math.sin(endAngle);
  const x4 = rInner * Math.cos(startAngle);
  const y4 = rInner * Math.sin(startAngle);

  const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;

  return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;
}

export default function RadialMenu({
  col,
  row,
  screenX,
  screenY,
  onSelect,
  onClose,
}) {
  const containerRef = useRef(null);

  // Clamping para manter o menu dentro dos limites da tela
  const clampedPos = useMemo(() => {
    const pad = 130;
    const x = Math.max(pad, Math.min(window.innerWidth - pad, screenX || window.innerWidth / 2));
    const y = Math.max(pad, Math.min(window.innerHeight - pad, screenY || window.innerHeight / 2));
    return { x, y };
  }, [screenX, screenY]);

  // Fechamento automático quando o cursor afasta mais de 180px do centro
  useEffect(() => {
    const handleMouseMove = (e) => {
      const dist = Math.hypot(e.clientX - clampedPos.x, e.clientY - clampedPos.y);
      if (dist > 180) {
        if (onClose) onClose();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [clampedPos, onClose]);

  const handleAction = (type, e) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(type, col, row);
    }
  };

  const R_OUTER = 98;
  const R_INNER = 38;

  // 3 fatias iguais de 120 graus cada preenchendo os 360° sem sobreposição
  const GAP = 0.035; // radianos
  const sectors = useMemo(() => [
    {
      id: 'teleport',
      label: 'TELEPORTE',
      // Topo: -150° a -30° (centro em -90°)
      startAngle: -Math.PI / 2 - Math.PI / 3 + GAP,
      endAngle: -Math.PI / 2 + Math.PI / 3 - GAP,
      midAngle: -Math.PI / 2,
      icon: (
        // Ícone de flecha / teletransporte em linhas finas (Imagem 2)
        <path
          d="M0 -14 L9 9 L0 4 L-9 9 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      ),
      colorClass: styles.sectorTeleport
    },
    {
      id: 'bomba',
      label: 'BOMBA',
      // Inferior-Direito: -30° a +90° (centro em +30°)
      startAngle: -Math.PI / 6 + GAP,
      endAngle: Math.PI / 2 - GAP,
      midAngle: Math.PI / 6,
      icon: (
        // Ícone de grade / área de impacto em linhas finas
        <g stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round">
          <line x1="-9" y1="-3" x2="9" y2="-3" />
          <line x1="-9" y1="5" x2="9" y2="5" />
          <line x1="-3" y1="-9" x2="-3" y2="9" />
          <line x1="5" y1="-9" x2="5" y2="9" />
        </g>
      ),
      colorClass: styles.sectorBomb
    },
    {
      id: 'sniper',
      label: 'SNIPER',
      // Inferior-Esquerdo: +90° a +210° (centro em +150°)
      startAngle: Math.PI / 2 + GAP,
      endAngle: 7 * Math.PI / 6 - GAP,
      midAngle: 5 * Math.PI / 6,
      icon: (
        // Ícone de mira / alvo direto em linhas finas
        <g stroke="currentColor" strokeWidth="1.8" fill="none">
          <circle cx="0" cy="0" r="7.5" />
          <circle cx="0" cy="0" r="2" fill="currentColor" />
          <line x1="-11" y1="0" x2="-7.5" y2="0" strokeLinecap="round" />
          <line x1="7.5" y1="0" x2="11" y2="0" strokeLinecap="round" />
          <line x1="0" y1="-11" x2="0" y2="-7.5" strokeLinecap="round" />
          <line x1="0" y1="7.5" x2="0" y2="11" strokeLinecap="round" />
        </g>
      ),
      colorClass: styles.sectorSniper
    }
  ], []);

  return (
    <div className={styles.radialBackdrop} onClick={onClose}>
      <div
        ref={containerRef}
        className={styles.radialContainer}
        style={{ left: `${clampedPos.x}px`, top: `${clampedPos.y}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <svg
          viewBox="-110 -110 220 220"
          className={styles.radialSvg}
        >
          {/* Anel de fundo com borda fina */}
          <circle cx="0" cy="0" r={R_OUTER + 1} className={styles.outerRingGlow} />

          {/* Fatias do Donut */}
          {sectors.map((sec) => {
            const pathD = getSectorPath(R_INNER, R_OUTER, sec.startAngle, sec.endAngle);
            const iconR = (R_OUTER + R_INNER) / 2 + 1;
            const iconX = iconR * Math.cos(sec.midAngle);
            const iconY = iconR * Math.sin(sec.midAngle);

            return (
              <g
                key={sec.id}
                className={`${styles.sectorGroup} ${sec.colorClass}`}
                onClick={(e) => handleAction(sec.id, e)}
              >
                <path d={pathD} className={styles.sectorPath} />
                <g transform={`translate(${iconX}, ${iconY - 4})`} className={styles.sectorIconGroup}>
                  {sec.icon}
                </g>
                <text
                  x={iconX}
                  y={iconY + 11}
                  className={styles.sectorLabel}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {sec.label}
                </text>
              </g>
            );
          })}

          {/* Divisórias centrais */}
          <circle cx="0" cy="0" r={R_INNER} className={styles.innerRingBorder} />
        </svg>

        {/* ── Botão Central com 'X' (Imagem 2) ── */}
        <button
          type="button"
          className={styles.centerCloseBtn}
          onClick={onClose}
        >
          <span className={styles.coordHeader}>[{col},{row}]</span>
          <span className={styles.closeIcon}>✕</span>
        </button>
      </div>
    </div>
  );
}
