// ============================================================
//  MainMenu.jsx — Menu Principal Profissional (Into the Breach + FNaF)
//  Lado Esquerdo: Título & Botões no estilo Into the Breach
//  Lado Direito: Cabeça 3D do Robô com iluminação FNaF e Mouse-Look
//  Canto Inferior Direito: Seletor de Idiomas (PT, EN, ES)
// ============================================================

import React, { useState, useEffect } from 'react';
import MenuRobotHead from './MenuRobotHead';
import DemoArena from './DemoArena';
import { t, SUPPORTED_LANGUAGES } from '../utils/i18n';
import { soundManager } from '../utils/SoundManager';

export default function MainMenu({
  onStart,
  onOpenDemo,
  shouldClearCode,
  setShouldClearCode,
  language = 'en',
  setLanguage,
  inputMode = 'radial',
  setInputMode,
  gridSize = 10,
  setGridSize,
}) {
  const [activeSubmenu, setActiveSubmenu] = useState(null); // null | 'difficulty' | 'options' | 'demos'
  const [activeDemo, setActiveDemo] = useState(null);
  const [selectedControlMode, setSelectedControlMode] = useState(inputMode || 'radial');

  useEffect(() => {
    soundManager.startMenuMusic();
  }, []);

  // Se uma demonstração/tutorial estiver ativa internamente (fallback sem onOpenDemo)
  if (!onOpenDemo && activeDemo) {
    return (
      <DemoArena
        type={activeDemo}
        onClose={() => setActiveDemo(null)}
        onSwitch={setActiveDemo}
      />
    );
  }

  const handleStartGame = (difficulty) => {
    onStart(difficulty, gridSize, selectedControlMode);
  };

  const handleSelectDemo = (type) => {
    if (onOpenDemo) {
      onOpenDemo(type);
    } else {
      setActiveDemo(type);
    }
  };

  const handleOpenCredits = () => {
    window.open('https://github.com/RodrigoJPSilva/grid-teaching-tests', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="itb-menu-root">
      {/* ── Efeitos Atmosféricos (Scanlines CRT + Vinheta FNaF) ── */}
      <div className="itb-crt-scanlines" />
      <div className="itb-vignette" />

      {/* ── Lado Direito: Close-up 3D do Robô Reativo ao Mouse ── */}
      <MenuRobotHead />

      {/* ── Lado Esquerdo: Interface de Menu estilo Into the Breach ── */}
      <div className="itb-menu-sidebar">
        {/* Título Principal */}
        <div className="itb-title-section">
          <h1 className="itb-logo-title">
            <span className="itb-logo-outline">GRID</span>
            <span className="itb-logo-fill">BATTLEGROUNDS</span>
          </h1>
          <div className="itb-subtitle">
            <span className="itb-badge">{t('tacticalSystem', language)}</span>
            <span className="itb-version">V.1.1.22</span>
          </div>
        </div>

        {/* ── Navegação / Botões Principais ── */}
        <div className="itb-nav-container">
          {activeSubmenu === null && (
            <div className="itb-button-stack">
              <button
                className="itb-menu-btn"
                onClick={() => setActiveSubmenu('difficulty')}
              >
                <span className="itb-btn-marker">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </span>
                <span className="itb-btn-text">{t('start', language)}</span>
                <span className="itb-btn-flare" />
              </button>

              <button
                className="itb-menu-btn"
                onClick={() => setActiveSubmenu('options')}
              >
                <span className="itb-btn-marker">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </span>
                <span className="itb-btn-text">{t('options', language)}</span>
                <span className="itb-btn-flare" />
              </button>

              <button
                className="itb-menu-btn itb-btn-credits"
                onClick={handleOpenCredits}
              >
                <span className="itb-btn-marker">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </span>
                <span className="itb-btn-text">{t('credits', language)}</span>
                <span className="itb-btn-flare" />
              </button>
            </div>
          )}

          {/* ── Submenu: Seleção de Dificuldade ── */}
          {activeSubmenu === 'difficulty' && (
            <div className="itb-submenu-panel">
              <div className="itb-panel-header">
                <span className="itb-panel-title">{t('selectDifficulty', language)}</span>
                <span className="itb-panel-tag">{t('combatMode', language)}</span>
              </div>

              {/* Seletor de Modo de Controle: Menu Radial vs Editor de Código */}
              <div className="itb-control-mode-block">
                <span className="itb-control-mode-title">{t('controlMode', language)}</span>
                <div className="itb-control-mode-pill-group">
                  <button
                    type="button"
                    className={`itb-mode-pill-btn ${selectedControlMode === 'radial' ? 'active' : ''}`}
                    onClick={() => {
                      soundManager.playUIClick();
                      setSelectedControlMode('radial');
                      if (setInputMode) setInputMode('radial');
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="2" x2="12" y2="22" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                    </svg>
                    {t('modeRadial', language)}
                  </button>
                  <button
                    type="button"
                    className={`itb-mode-pill-btn ${selectedControlMode === 'code' ? 'active' : ''}`}
                    onClick={() => {
                      soundManager.playUIClick();
                      setSelectedControlMode('code');
                      if (setInputMode) setInputMode('code');
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                    {t('modeCode', language)}
                  </button>
                </div>
              </div>

              <div className="itb-difficulty-list">
                <button
                  className="itb-sub-btn difficulty-easy"
                  onClick={() => handleStartGame('Facil')}
                >
                  <div className="itb-sub-btn-header">
                    <span className="itb-sub-bullet">◈</span>
                    <span className="itb-sub-title">{t('easy', language)}</span>
                  </div>
                  <span className="itb-sub-desc">{t('easyDesc', language)}</span>
                </button>

                <button
                  className="itb-sub-btn difficulty-normal"
                  onClick={() => handleStartGame('Normal')}
                >
                  <div className="itb-sub-btn-header">
                    <span className="itb-sub-bullet">◈◈</span>
                    <span className="itb-sub-title">{t('normal', language)}</span>
                  </div>
                  <span className="itb-sub-desc">{t('normalDesc', language)}</span>
                </button>

                <button
                  className="itb-sub-btn difficulty-matrix"
                  onClick={() => handleStartGame('Matrix')}
                >
                  <div className="itb-sub-btn-header">
                    <span className="itb-sub-bullet">◈◈◈</span>
                    <span className="itb-sub-title">{t('matrix', language)}</span>
                  </div>
                  <span className="itb-sub-desc">{t('matrixDesc', language)}</span>
                </button>
              </div>

              <div className="itb-submenu-actions">
                <button
                  className="itb-aux-btn"
                  onClick={() => setActiveSubmenu('demos')}
                >
                  {t('demosPreview', language)}
                </button>
                <button
                  className="itb-back-btn"
                  onClick={() => setActiveSubmenu(null)}
                >
                  {t('back', language)}
                </button>
              </div>
            </div>
          )}

          {/* ── Submenu: Demonstrações de Habilidades ── */}
          {activeSubmenu === 'demos' && (
            <div className="itb-submenu-panel">
              <div className="itb-panel-header">
                <span className="itb-panel-title">{t('arenaDemos', language)}</span>
                <span className="itb-panel-tag">{t('training', language)}</span>
              </div>

              <p className="itb-panel-instructions">
                {t('demosInstruction', language)}
              </p>

              <div className="itb-demos-list">
                <button
                  className="itb-sub-btn"
                  onClick={() => handleSelectDemo('teleport')}
                >
                  <span className="itb-sub-title">{t('demoTeleport', language)}</span>
                  <span className="itb-sub-desc">{t('demoTeleportDesc', language)}</span>
                </button>

                <button
                  className="itb-sub-btn"
                  onClick={() => handleSelectDemo('bomb')}
                >
                  <span className="itb-sub-title">{t('demoBomb', language)}</span>
                  <span className="itb-sub-desc">{t('demoBombDesc', language)}</span>
                </button>

                <button
                  className="itb-sub-btn"
                  onClick={() => handleSelectDemo('sniper')}
                >
                  <span className="itb-sub-title">{t('demoSniper', language)}</span>
                  <span className="itb-sub-desc">{t('demoSniperDesc', language)}</span>
                </button>
              </div>

              <button
                className="itb-back-btn"
                onClick={() => setActiveSubmenu('difficulty')}
              >
                {t('back', language)}
              </button>
            </div>
          )}
        </div>

        {/* ── Rodapé no estilo Into the Breach ── */}
        <div className="itb-footer-section">
          <div className="itb-profile-info">
            <span className="itb-profile-label">PROFILE:</span>
            <span className="itb-profile-name">cherwood_operator</span>
          </div>
          <div className="itb-credits-info">
            <a
              href="https://github.com/RodrigoJPSilva/grid-teaching-tests"
              target="_blank"
              rel="noopener noreferrer"
              className="itb-github-link"
            >
              github.com/RodrigoJPSilva/grid-teaching-tests
            </a>
          </div>
          <div className="itb-copy">
            © 2026 Grid Battlegrounds • Subset Retro Inspired
          </div>
        </div>
      </div>

      {/* ── SELETOR DE IDIOMAS NO CANTO INFERIOR DIREITO ── */}
      <div className="itb-language-selector-bottom-right">
        <span className="itb-lang-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </span>
        {SUPPORTED_LANGUAGES.map((l) => (
          <button
            key={l}
            type="button"
            className={`itb-lang-btn ${language === l ? 'active' : ''}`}
            onClick={() => setLanguage && setLanguage(l)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── Modal de Opções (Tamanho do Grid, Limpar Código, Idioma e Modo de Controle) ── */}
      {activeSubmenu === 'options' && (
        <div className="itb-modal-overlay">
          <div className="itb-modal-card">
            <div className="itb-modal-header">
              <h2>{t('systemSettings', language)}</h2>
              <button
                className="itb-modal-close-btn"
                onClick={() => setActiveSubmenu(null)}
              >
                ✕
              </button>
            </div>

            <div className="itb-modal-body">
              {/* Idioma do Sistema */}
              <div className="itb-opt-group">
                <div className="itb-opt-label-row">
                  <label>{t('languageSelect', language)}</label>
                  <span className="itb-opt-value">{language.toUpperCase()}</span>
                </div>
                <div className="itb-lang-modal-buttons">
                  <button
                    type="button"
                    className={`itb-opt-choice ${language === 'pt' ? 'active' : ''}`}
                    onClick={() => setLanguage && setLanguage('pt')}
                  >
                    PT (Português)
                  </button>
                  <button
                    type="button"
                    className={`itb-opt-choice ${language === 'en' ? 'active' : ''}`}
                    onClick={() => setLanguage && setLanguage('en')}
                  >
                    EN (English)
                  </button>
                  <button
                    type="button"
                    className={`itb-opt-choice ${language === 'es' ? 'active' : ''}`}
                    onClick={() => setLanguage && setLanguage('es')}
                  >
                    ES (Español)
                  </button>
                </div>
                <span className="itb-opt-hint">{t('languageHint', language)}</span>
              </div>

              {/* Modo de Controle: Editor CSS vs Menu Radial */}
              <div className="itb-opt-group">
                <div className="itb-opt-label-row">
                  <label>{t('inputModeLabel', language)}</label>
                  <span className="itb-opt-value">
                    {inputMode === 'code' ? t('inputModeCode', language) : t('inputModeRadial', language)}
                  </span>
                </div>
                <div className="itb-mode-modal-buttons">
                  <button
                    type="button"
                    className={`itb-opt-choice ${inputMode === 'code' ? 'active' : ''}`}
                    onClick={() => setInputMode && setInputMode('code')}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                    {t('inputModeCode', language)}
                  </button>
                  <button
                    type="button"
                    className={`itb-opt-choice ${inputMode === 'radial' ? 'active' : ''}`}
                    onClick={() => setInputMode && setInputMode('radial')}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    {t('inputModeRadial', language)}
                  </button>
                </div>
                <span className="itb-opt-hint">{t('inputModeHint', language)}</span>
              </div>

              {/* Tamanho do Grid */}
              <div className="itb-opt-group">
                <div className="itb-opt-label-row">
                  <label htmlFor="gridSizeRange">{t('gridSize', language)}</label>
                  <span className="itb-opt-value">{gridSize} × {gridSize}</span>
                </div>
                <input
                  id="gridSizeRange"
                  type="range"
                  min="10"
                  max="30"
                  value={gridSize}
                  onChange={(e) => setGridSize && setGridSize(Number(e.target.value))}
                  className="itb-range-slider"
                />
                <span className="itb-opt-hint">
                  {t('gridSizeHint', language)}
                </span>
              </div>

              {/* Limpar Código após Rodar */}
              <div className="itb-opt-group itb-checkbox-group">
                <label className="itb-checkbox-label" htmlFor="clearCodeOption">
                  <input
                    id="clearCodeOption"
                    type="checkbox"
                    checked={shouldClearCode}
                    onChange={(e) => setShouldClearCode(e.target.checked)}
                    className="itb-checkbox-input"
                  />
                  <span className="itb-custom-checkbox" />
                  <span className="itb-checkbox-text">{t('clearCodeOption', language)}</span>
                </label>
                <span className="itb-opt-hint">
                  {t('clearCodeHint', language)}
                </span>
              </div>
            </div>

            <div className="itb-modal-footer">
              <button
                className="itb-confirm-btn"
                onClick={() => setActiveSubmenu(null)}
              >
                {t('confirmSave', language)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
