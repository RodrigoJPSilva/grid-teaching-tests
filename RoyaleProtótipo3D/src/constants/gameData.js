// ============================================================
//  CSS HACKER ROYALE — Game Constants & Data
//  Projeto de aprendizado
// ============================================================

/**
 * Estrutura do Sistema de Arquivos simulado do terminal.
 * Cada "pasta" é uma zona do mapa. Adversários ficam escondidos
 * dentro delas até o Sonar Hacker ser ativado.
 */
export const FILESYSTEM = {
  '/': {
    type: 'dir',
    children: ['arena', 'weapons', 'intel'],
  },
  '/arena': {
    type: 'dir',
    children: ['grid-zone', 'flex-zone'],
    hasEnemy: false,
  },
  '/arena/grid-zone': {
    type: 'dir',
    children: [],
    hasEnemy: true,
    enemyId: 'enemy-grid-alpha',
  },
  '/arena/flex-zone': {
    type: 'dir',
    children: [],
    hasEnemy: true,
    enemyId: 'enemy-flex-bravo',
  },
  '/weapons': {
    type: 'dir',
    children: ['sniper', 'bombs', 'laser'],
    hasEnemy: false,
  },
  '/intel': {
    type: 'dir',
    children: ['recon'],
    hasEnemy: false,
  },
  '/intel/recon': {
    type: 'dir',
    children: [],
    hasEnemy: true,
    enemyId: 'enemy-recon-charlie',
  },
};

/**
 * Definição das células da arena.
 * grid-area: "row-start / col-start / row-end / col-end"
 * A arena é 6x6.
 */
export const ARENA_SIZE = 6;

/**
 * Dados dos Inimigos.
 * position: [row, col] (1-indexed) na grade da arena.
 */
export const ENEMIES_DATA = {
  'enemy-grid-alpha': {
    id: 'enemy-grid-alpha',
    name: 'Grid Alpha',
    hp: 100,
    maxHp: 100,
    position: [2, 4],
    skin: '👾',
    revealed: false,
  },
  'enemy-flex-bravo': {
    id: 'enemy-flex-bravo',
    name: 'Flex Bravo',
    hp: 80,
    maxHp: 80,
    position: [4, 2],
    skin: '🤖',
    revealed: false,
  },
  'enemy-recon-charlie': {
    id: 'enemy-recon-charlie',
    name: 'Recon Charlie',
    hp: 120,
    maxHp: 120,
    position: [5, 5],
    skin: '💀',
    revealed: false,
  },
};

/**
 * TABELA DE ARMAS
 * ┌─────────────────┬──────────────┬──────────────────────────────┬──────────┬─────────────┐
 * │ Arma            │ CSS Conceito │ Mecânica                     │ Dano     │ Cooldown(s) │
 * ├─────────────────┼──────────────┼──────────────────────────────┼──────────┼─────────────┤
 * │ Sniper de Grid  │ grid-area    │ Mira exata em [row, col]     │ 60 HP    │ 3s          │
 * │ Bomba Flex      │ flex-grow    │ Explosão em área (2x2)       │ 30 HP    │ 5s          │
 * │ Laser de Span   │ grid-column  │ Varre linha/coluna inteira   │ 20 HP    │ 2s          │
 * └─────────────────┴──────────────┴──────────────────────────────┴──────────┴─────────────┘
 */
export const WEAPONS = {
  sniper: {
    id: 'sniper',
    name: 'Sniper de Grid',
    emoji: '🎯',
    cssProperty: 'grid-area',
    description: 'Mira exata numa célula. Alto dano, requer precisão.',
    damage: 60,
    cooldown: 3000,
    color: '#00ff88',
    aoeRadius: 0, // célula única
  },
  bombs: {
    id: 'bombs',
    name: 'Bomba Flex',
    emoji: '💣',
    cssProperty: 'flex-grow',
    description: 'Expande por flex-grow. Dano em área 2x2.',
    damage: 30,
    cooldown: 5000,
    color: '#ff6b35',
    aoeRadius: 1, // raio de 1 célula
  },
  laser: {
    id: 'laser',
    name: 'Laser de Span',
    emoji: '⚡',
    cssProperty: 'grid-column / grid-row span',
    description: 'Atravessa toda a linha ou coluna selecionada.',
    damage: 20,
    cooldown: 2000,
    color: '#a855f7',
    aoeRadius: -1, // span toda linha/coluna
  },
};

/**
 * Comandos válidos do terminal.
 */
export const VALID_COMMANDS = ['dir', 'cd', '..', 'code .', 'sonar', 'help', 'clear', 'status'];

/**
 * Mensagens de boot do terminal.
 */
export const BOOT_MESSAGES = [
  { text: '> Inicializando CSS HACKER ROYALE v3.0...', delay: 0 },
  { text: '> Carregando módulos de combate...', delay: 300 },
  { text: '> Arena Grid [6x6] — ONLINE ✓', delay: 600 },
  { text: '> Sistemas de armas — ONLINE ✓', delay: 900 },
  { text: '> Sonar Hacker [Alt+F] — STANDBY ⚡', delay: 1200 },
  { text: '> 3 adversários detectados no filesystem...', delay: 1500 },
  { text: '> ██████████████████████ 100%', delay: 1800 },
  { text: '> SISTEMA PRONTO. Bom combate, Hacker.', delay: 2100 },
  { text: '> Digite "help" para ver os comandos disponíveis.', delay: 2400 },
];
