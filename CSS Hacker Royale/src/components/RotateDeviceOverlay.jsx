// ============================================================
//  RotateDeviceOverlay.jsx — Aviso de Rotação para Mobile
//  Detecta orientação vertical em dispositivos móveis e touch
//  e exibe uma animação instruindo a rotacionar para a horizontal
// ============================================================

import React, { useState, useEffect } from 'react';
import { t } from '../utils/i18n';
import './RotateDeviceOverlay.css';

export default function RotateDeviceOverlay({ language = 'pt' }) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isTouch = 
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

      const isPortrait = window.innerHeight > window.innerWidth;
      setShouldShow(Boolean(isTouch && isPortrait));
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!shouldShow) return null;

  return (
    <aside aria-label="Rotate Device" className="rotate-overlay-backdrop">
      <div className="rotate-overlay-card">
        {/* Holographic scanner top light */}
        <div className="rotate-card-glow" />

        {/* Animated Phone Container */}
        <div className="rotate-anim-wrapper">
          <div className="rotate-circular-arrow">
            <svg viewBox="0 0 100 100" className="rotate-arrow-svg">
              <path
                d="M 25,50 A 25,25 0 0,1 75,50"
                fill="none"
                stroke="rgba(0, 240, 255, 0.4)"
                strokeWidth="2.5"
                strokeDasharray="4 3"
              />
              <path
                d="M 75,50 A 25,25 0 0,1 25,50"
                fill="none"
                stroke="rgba(0, 255, 136, 0.6)"
                strokeWidth="2.5"
              />
              <polygon points="25,45 19,53 27,55" fill="#00ff88" />
            </svg>
          </div>

          <div className="rotate-phone-body">
            <div className="rotate-phone-notch" />
            <div className="rotate-phone-screen">
              <div className="rotate-screen-grid" />
              <div className="rotate-screen-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
            </div>
            <div className="rotate-phone-btn" />
          </div>
        </div>

        {/* Text information */}
        <h2 className="rotate-title">{t('rotateTitle', language)}</h2>
        <p className="rotate-desc">{t('rotateDesc', language)}</p>
        <span className="rotate-hint">{t('rotateHint', language)}</span>
      </div>
    </aside>
  );
}
