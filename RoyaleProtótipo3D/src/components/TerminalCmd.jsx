// ============================================================
//  TerminalCmd.jsx — Terminal de Navegação (fase de looting)
//  Projeto de aprendizado — CMD Simulator com filesystem virtual
//
//  Comandos suportados:
//   - dir      → lista conteúdo da pasta atual
//   - cd ./X   → entra na pasta X
//   - cd ..    → sobe um nível
//   - code .   → ATIVA A ARENA (transição de fase)
//   - sonar    → detecta adversários
//   - status   → exibe HP e pontuação
//   - clear    → limpa o terminal
//   - help     → lista comandos
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './TerminalCmd.module.css';

/**
 * TerminalCmd — Simula um CMD/Bash para navegação no filesystem do jogo.
 *
 * @param {string} currentPath - Caminho atual no filesystem
 * @param {Array} history - Histórico de linhas do terminal
 * @param {function} processCommand - Processa um comando digitado
 * @param {function} activateSonar - Ativa o Sonar Hacker diretamente
 * @param {boolean} sonarActive - Estado do sonar
 * @param {Array} sonarRevealedPaths - Pastas reveladas pelo sonar
 */
export default function TerminalCmd({
  currentPath,
  history,
  processCommand,
  activateSonar,
  sonarActive,
  sonarRevealedPaths,
}) {
  const [inputValue, setInputValue] = useState('');
  // Histórico de comandos para navegação com seta ↑/↓ (como um terminal real!)
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  // ── Auto-scroll para o fim do terminal ─────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  // ── Foco automático no input ────────────────────────────────
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Atalho Alt+F para o Sonar Hacker ───────────────────────
  useEffect(() => {
    const handleSonarKey = (e) => {
      // Alt + F = Sonar Hacker
      if (e.altKey && e.key === 'f') {
        e.preventDefault();
        if (!sonarActive) {
          activateSonar();
        }
      }
    };
    window.addEventListener('keydown', handleSonarKey);
    return () => window.removeEventListener('keydown', handleSonarKey);
  }, [activateSonar, sonarActive]);

  /**
   * Trata o submit do formulário do terminal.
   */
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed) return;

      // Adiciona ao histórico de comandos do terminal
      setCommandHistory(prev => [trimmed, ...prev]);
      setHistoryIndex(-1);
      setInputValue('');

      processCommand(trimmed);
    },
    [inputValue, processCommand]
  );

  /**
   * Navegação no histórico de comandos com seta ↑/↓.
   */
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHistoryIndex(prev => {
          const next = Math.min(prev + 1, commandHistory.length - 1);
          setInputValue(commandHistory[next] || '');
          return next;
        });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHistoryIndex(prev => {
          const next = Math.max(prev - 1, -1);
          setInputValue(next === -1 ? '' : commandHistory[next] || '');
          return next;
        });
      }

      // Tab autocomplete básico — completa "code ." se digitar "co"
      if (e.key === 'Tab') {
        e.preventDefault();
        const suggestions = ['dir', 'cd ..', 'code .', 'sonar', 'help', 'status', 'clear'];
        const match = suggestions.find(s => s.startsWith(inputValue) && s !== inputValue);
        if (match) setInputValue(match);
      }
    },
    [commandHistory, inputValue]
  );

  /**
   * Determina a cor de uma linha do histórico baseado em seu tipo.
   */
  const getLineClass = (type) => {
    switch (type) {
      case 'command': return styles.lineCommand;
      case 'error':   return styles.lineError;
      case 'success': return styles.lineSuccess;
      case 'system':  return styles.lineSystem;
      default:        return styles.lineOutput;
    }
  };

  return (
    <div
      className={styles.terminalWrapper}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Barra de título do terminal */}
      <div className={styles.terminalTitleBar}>
        <div className={styles.terminalDots}>
          <span className={`${styles.dot} ${styles.dotRed}`} />
          <span className={`${styles.dot} ${styles.dotYellow}`} />
          <span className={`${styles.dot} ${styles.dotGreen}`} />
        </div>
        <span className={styles.terminalTitle}>
          CSS_HACKER_ROYALE — TERMINAL v3.0
        </span>
        {/* Indicador do Sonar */}
        <div className={`${styles.sonarIndicator} ${sonarActive ? styles.sonarOn : ''}`}>
          <span className={styles.sonarDot} />
          SONAR {sonarActive ? 'ATIVO' : 'OFF'} [Alt+F]
        </div>
      </div>

      {/* Área de output do terminal */}
      <div className={styles.terminalOutput} ref={scrollRef}>
        {history.map(line => (
          <div key={line.id} className={`${styles.line} ${getLineClass(line.type)}`}>
            {line.text}
          </div>
        ))}
      </div>

      {/* Linha de input do terminal */}
      <form onSubmit={handleSubmit} className={styles.terminalInputRow}>
        {/* Prompt com o path atual */}
        <span className={styles.prompt}>
          <span className={styles.promptUser}>hacker</span>
          <span className={styles.promptAt}>@</span>
          <span className={styles.promptHost}>arena</span>
          <span className={styles.promptColon}>:</span>
          <span className={styles.promptPath}>{currentPath}</span>
          <span className={styles.promptDollar}>$</span>
        </span>
        <input
          ref={inputRef}
          id="terminal-input"
          type="text"
          className={styles.terminalInput}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck="false"
          autoCapitalize="none"
          placeholder="Digite um comando..."
          aria-label="Terminal de comando"
        />
      </form>

      {/* Dica rápida de comandos */}
      <div className={styles.quickTips}>
        <span>↑↓ histórico</span>
        <span>Tab autocomplete</span>
        <span className={sonarActive ? styles.tipActive : ''}>Alt+F sonar</span>
        <span>"code ." → arena</span>
      </div>
    </div>
  );
}
