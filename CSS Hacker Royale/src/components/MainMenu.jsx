// ============================================================
//  MainMenu.jsx — Menu Principal Profissional (Into the Breach + FNaF)
//  Lado Esquerdo: Título & Botões no estilo Into the Breach
//  Lado Direito: Cabeça 3D do Robô com iluminação FNaF e Mouse-Look
// ============================================================

import React, { useState } from 'react';
import MenuRobotHead from './MenuRobotHead';
import DemoArena from './DemoArena';

export default function MainMenu({ onStart, shouldClearCode, setShouldClearCode }) {
  const [gridSize, setGridSize] = useState(10);
  const [activeSubmenu, setActiveSubmenu] = useState(null); // null | 'difficulty' | 'options' | 'demos'
  const [activeDemo, setActiveDemo] = useState(null);

  // Se uma demonstração/tutorial estiver ativa, renderiza o DemoArena
  if (activeDemo) {
    return (
      <DemoArena
        type={activeDemo}
        onClose={() => setActiveDemo(null)}
        onSwitch={setActiveDemo}
      />
    );
  }

  const handleStartGame = (difficulty) => {
    onStart(difficulty, gridSize);
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
            <span className="itb-badge">TACTICAL SYSTEM</span>
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
                <span className="itb-btn-marker">▶</span>
                <span className="itb-btn-text">COMEÇAR</span>
                <span className="itb-btn-flare" />
              </button>

              <button
                className="itb-menu-btn"
                onClick={() => setActiveSubmenu('options')}
              >
                <span className="itb-btn-marker">⚙</span>
                <span className="itb-btn-text">OPÇÕES</span>
                <span className="itb-btn-flare" />
              </button>

              <button
                className="itb-menu-btn itb-btn-credits"
                onClick={handleOpenCredits}
              >
                <span className="itb-btn-marker">↗</span>
                <span className="itb-btn-text">CRÉDITOS</span>
                <span className="itb-btn-flare" />
              </button>
            </div>
          )}

          {/* ── Submenu: Seleção de Dificuldade ── */}
          {activeSubmenu === 'difficulty' && (
            <div className="itb-submenu-panel">
              <div className="itb-panel-header">
                <span className="itb-panel-title">SELECIONE A DIFICULDADE</span>
                <span className="itb-panel-tag">MODO COMBATE</span>
              </div>

              <div className="itb-difficulty-list">
                <button
                  className="itb-sub-btn difficulty-easy"
                  onClick={() => handleStartGame('Facil')}
                >
                  <div className="itb-sub-btn-header">
                    <span className="itb-sub-bullet">◈</span>
                    <span className="itb-sub-title">FÁCIL</span>
                  </div>
                  <span className="itb-sub-desc">Velocidade moderada. Ideal para aprender os comandos CSS.</span>
                </button>

                <button
                  className="itb-sub-btn difficulty-normal"
                  onClick={() => handleStartGame('Normal')}
                >
                  <div className="itb-sub-btn-header">
                    <span className="itb-sub-bullet">◈◈</span>
                    <span className="itb-sub-title">NORMAL</span>
                  </div>
                  <span className="itb-sub-desc">Desafio tático padrão da arena com bots equilibrados.</span>
                </button>

                <button
                  className="itb-sub-btn difficulty-matrix"
                  onClick={() => handleStartGame('Matrix')}
                >
                  <div className="itb-sub-btn-header">
                    <span className="itb-sub-bullet">◈◈◈</span>
                    <span className="itb-sub-title">MATRIX</span>
                  </div>
                  <span className="itb-sub-desc">Reações instantâneas e agressividade máxima. Apenas veteranos.</span>
                </button>
              </div>

              <div className="itb-submenu-actions">
                <button
                  className="itb-aux-btn"
                  onClick={() => setActiveSubmenu('demos')}
                >
                  🎓 DEMONSTRAÇÕES (PREVIEW)
                </button>
                <button
                  className="itb-back-btn"
                  onClick={() => setActiveSubmenu(null)}
                >
                  ← VOLTAR
                </button>
              </div>
            </div>
          )}

          {/* ── Submenu: Demonstrações de Habilidades ── */}
          {activeSubmenu === 'demos' && (
            <div className="itb-submenu-panel">
              <div className="itb-panel-header">
                <span className="itb-panel-title">DEMONSTRAÇÕES DA ARENA</span>
                <span className="itb-panel-tag">TREINAMENTO</span>
              </div>

              <p className="itb-panel-instructions">
                Experimente o funcionamento das armas e movimentações em um ambiente controlado:
              </p>

              <div className="itb-demos-list">
                <button
                  className="itb-sub-btn"
                  onClick={() => setActiveDemo('teleport')}
                >
                  <span className="itb-sub-title">⚡ TELETRANSPORTE</span>
                  <span className="itb-sub-desc">Movimentação instantânea por grid-column e grid-row.</span>
                </button>

                <button
                  className="itb-sub-btn"
                  onClick={() => setActiveDemo('bomb')}
                >
                  <span className="itb-sub-title">💣 LANÇAMENTO DE BOMBA</span>
                  <span className="itb-sub-desc">Ataque em área 3x3 com onda expansiva de choque.</span>
                </button>

                <button
                  className="itb-sub-btn"
                  onClick={() => setActiveDemo('sniper')}
                >
                  <span className="itb-sub-title">🎯 DISPARO DE SNIPER</span>
                  <span className="itb-sub-desc">Tiro de precisão cirúrgica de longa distância.</span>
                </button>
              </div>

              <button
                className="itb-back-btn"
                onClick={() => setActiveSubmenu('difficulty')}
              >
                ← VOLTAR
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

      {/* ── Modal de Opções (Tamanho do Grid & Limpar Código) ── */}
      {activeSubmenu === 'options' && (
        <div className="itb-modal-overlay">
          <div className="itb-modal-card">
            <div className="itb-modal-header">
              <h2>⚙ CONFIGURAÇÕES DO SISTEMA</h2>
              <button
                className="itb-modal-close-btn"
                onClick={() => setActiveSubmenu(null)}
              >
                ✕
              </button>
            </div>

            <div className="itb-modal-body">
              {/* Tamanho do Grid */}
              <div className="itb-opt-group">
                <div className="itb-opt-label-row">
                  <label htmlFor="gridSizeRange">TAMANHO DO GRID:</label>
                  <span className="itb-opt-value">{gridSize} × {gridSize}</span>
                </div>
                <input
                  id="gridSizeRange"
                  type="range"
                  min="10"
                  max="30"
                  value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  className="itb-range-slider"
                />
                <span className="itb-opt-hint">
                  Define a escala da arena de batalha de 10x10 até 30x30 blocos.
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
                  <span className="itb-checkbox-text">LIMPAR CÓDIGO APÓS RODAR</span>
                </label>
                <span className="itb-opt-hint">
                  Quando ativado, esvazia o editor CSS após cada comando executado na arena.
                </span>
              </div>
            </div>

            <div className="itb-modal-footer">
              <button
                className="itb-confirm-btn"
                onClick={() => setActiveSubmenu(null)}
              >
                ✔ CONFIRMAR E SALVAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
