// ============================================================
//  i18n.js — Sistema de Internacionalização (PT, EN, ES)
// ============================================================

export const SUPPORTED_LANGUAGES = ['pt', 'en', 'es'];

export function detectUserLanguage() {
  try {
    const navLangs = navigator.languages || [navigator.language];
    for (const lang of navLangs) {
      if (!lang) continue;
      const lower = lang.toLowerCase();
      if (lower.startsWith('pt')) return 'pt';
      if (lower.startsWith('es')) return 'es';
      if (lower.startsWith('en')) return 'en';
    }
  } catch (e) {
    // fallback
  }
  return 'en';
}

export const TRANSLATIONS = {
  pt: {
    // Menu Principal
    tacticalSystem: 'SISTEMA TÁTICO',
    start: 'COMEÇAR',
    options: 'OPÇÕES',
    credits: 'CRÉDITOS',
    selectDifficulty: 'SELECIONE A DIFICULDADE',
    combatMode: 'MODO COMBATE',
    controlMode: 'MODO DE CONTROLE',
    modeRadial: 'MENU RADIAL',
    modeCode: 'EDITOR DE CÓDIGO',
    easy: 'FÁCIL',
    easyDesc: 'Velocidade moderada. Ideal para aprender os comandos CSS.',
    normal: 'NORMAL',
    normalDesc: 'Desafio tático padrão da arena com bots equilibrados.',
    matrix: 'MATRIX',
    matrixDesc: 'Reações instantâneas e agressividade máxima. Apenas veteranos.',
    demosPreview: 'DEMONSTRAÇÕES (PREVIEW)',
    arenaDemos: 'DEMONSTRAÇÕES DA ARENA',
    training: 'TREINAMENTO',
    demosInstruction: 'Experimente o funcionamento das armas e movimentações em um ambiente controlado:',
    demoTeleport: 'TELETRANSPORTE',
    demoTeleportDesc: 'Movimentação instantânea por grid-column e grid-row.',
    demoBomb: 'LANÇAMENTO DE BOMBA',
    demoBombDesc: 'Ataque em área 3x3 com onda expansiva de choque.',
    demoSniper: 'DISPARO DE SNIPER',
    demoSniperDesc: 'Tiro de precisão cirúrgica de longa distância.',
    back: 'VOLTAR',
    confirmSave: 'CONFIRMAR E SALVAR',

    // Configurações
    systemSettings: 'CONFIGURAÇÕES DO SISTEMA',
    gridSize: 'TAMANHO DO GRID:',
    gridSizeHint: 'Define a escala da arena de batalha de 10x10 até 30x30 blocos.',
    clearCodeOption: 'LIMPAR CÓDIGO APÓS RODAR',
    clearCodeHint: 'Quando ativado, esvazia o editor CSS após cada comando executado na arena.',
    languageSelect: 'IDIOMA / LANGUAGE / IDIOMA:',
    languageHint: 'Selecione o idioma da interface e dos diálogos.',
    inputModeLabel: 'MODO DE CONTROLE:',
    inputModeCode: 'Editor de Código CSS',
    inputModeRadial: 'Menu Radial no Piso',
    inputModeHint: 'Escolha entre controlar através da sintaxe CSS ou clicando nos pisos para abrir o menu radial.',

    // HUD & Jogo
    playerHp: 'HP JOGADOR:',
    enemiesAlive: 'INIMIGOS VIVOS:',
    level: 'Fase',
    alertOutOfBounds: 'FORA DA ARENA! -1 Vida',
    alertCollision: 'COLISÃO COM INIMIGO! -1 Vida',
    gameOver: 'GAME OVER',
    restartSystem: 'REINICIAR SISTEMA',
    victoryTitle: 'SISTEMA HACKEADO COM SUCESSO!',
    victoryDesc: 'Você concluiu a dificuldade',
    returnMenu: 'VOLTAR AO MENU',
    editorTitle: 'EDITOR CSS',
    runCode: 'RODAR CÓDIGO (Ctrl+Enter)',
    camera3D: '3D',
    camera2D: '2D',
    cameraFree: 'LIVRE',
    showEditorBtn: 'MOSTRAR EDITOR CSS',
    hideEditorBtn: 'OCULTAR EDITOR',

    // Radial Menu
    radialTeleport: 'Teleportar',
    radialBomb: 'Bomba',
    radialSniper: 'Sniper',
    radialCancel: 'Cancelar',

    // Cheatsheet
    hackerGuide: 'Guia Hacker',
    toMoveUse: 'Para se mover, use:',
    bombInfo: 'A .bomba atinge área 3x3 (-1 Vida).',
    sniperInfo: 'A .sniper atinge apenas o alvo final (-3 Vidas).',
    secretTip: 'Dica secreta: clique em um bloco e volte aqui...',
    clickedTile: '> Bloco clicado:',

    // Boss & TV
    dangerWarning: 'PERIGO',
    bossDetected: '// BOSS DETECTADO //',

    // Tutorial Dialogues
    tutWelcome: 'Saudações, Operador! Eu sou seu núcleo de IA tática. Bem-vindo ao Grid Battlegrounds. Prepare-se para dominar a arena através de comandos precisos.',
    tutTeleport: 'Fase 1: Teletransporte. Localize o bloco demarcado em AMARELO na arena e mova seu robô até ele para calibrar seus propulsores.',
    tutTeleportSuccess: 'Excelente! Posição sincronizada. O bloco tornou-se VERDE confirmando o salto quântico.',
    tutBomb: 'Fase 2: Ataque em Área. Três robôs de reconhecimento surgiram agrupados! Lance a Bomba no bloco demarcado em AMARELO para eliminar os três de uma só vez.',
    tutBombSuccess: 'Impacto cirúrgico! A onda de expansão destruiu todos os alvos agrupados. Análise de detonação concluída.',
    tutSniper: 'Fase 3: Tiro Sniper. Um robô hostil apareceu em posição remota. Mire a Sniper no bloco AMARELO onde ele está para efetuar o disparo fatal.',
    tutSniperSuccess: 'Alvo neutralizado com precisão absoluta! Tutorial concluído. Você agora tem autorização total de combate na arena.',
    nextBtn: 'AVANÇAR',
    continueBtn: 'CONTINUAR',
    finishBtn: 'CONCLUIR',

    // Mobile Orientation
    rotateTitle: 'GIRE SEU DISPOSITIVO',
    rotateDesc: 'Por favor, gire seu celular para a horizontal (paisagem) para jogar.',
    rotateHint: 'O sistema tático foi calibrado exclusivamente para telas panorâmicas.',
  },

  en: {
    // Main Menu
    tacticalSystem: 'TACTICAL SYSTEM',
    start: 'START',
    options: 'OPTIONS',
    credits: 'CREDITS',
    selectDifficulty: 'SELECT DIFFICULTY',
    combatMode: 'COMBAT MODE',
    controlMode: 'CONTROL MODE',
    modeRadial: 'RADIAL MENU',
    modeCode: 'CODE EDITOR',
    easy: 'EASY',
    easyDesc: 'Moderate speed. Ideal for learning CSS grid commands.',
    normal: 'NORMAL',
    normalDesc: 'Standard tactical arena challenge with balanced bots.',
    matrix: 'MATRIX',
    matrixDesc: 'Instant reactions and maximum aggression. Veterans only.',
    demosPreview: 'DEMOS (PREVIEW)',
    arenaDemos: 'ARENA DEMONSTRATIONS',
    training: 'TRAINING',
    demosInstruction: 'Experience weapons and movement mechanics in a controlled environment:',
    demoTeleport: 'TELEPORT',
    demoTeleportDesc: 'Instant positioning via grid-column and grid-row.',
    demoBomb: 'BOMB LAUNCH',
    demoBombDesc: '3x3 area of effect attack with a seismic shockwave.',
    demoSniper: 'SNIPER SHOT',
    demoSniperDesc: 'Long-range pinpoint precision strike.',
    back: 'BACK',
    confirmSave: 'CONFIRM & SAVE',

    // Settings
    systemSettings: 'SYSTEM SETTINGS',
    gridSize: 'GRID SIZE:',
    gridSizeHint: 'Sets the battlefield grid scale from 10x10 up to 30x30 tiles.',
    clearCodeOption: 'CLEAR CODE AFTER RUNNING',
    clearCodeHint: 'When enabled, clears the CSS editor after each executed command in the arena.',
    languageSelect: 'LANGUAGE / IDIOMA / IDIOMA:',
    languageHint: 'Select the interface and dialogue language.',
    inputModeLabel: 'CONTROL MODE:',
    inputModeCode: 'CSS Code Editor',
    inputModeRadial: 'Floor Radial Menu',
    inputModeHint: 'Choose between controlling via CSS code syntax or clicking on arena tiles to open the radial action menu.',

    // HUD & Game
    playerHp: 'PLAYER HP:',
    enemiesAlive: 'ENEMIES ALIVE:',
    level: 'Stage',
    alertOutOfBounds: 'OUT OF ARENA! -1 HP',
    alertCollision: 'ENEMY COLLISION! -1 HP',
    gameOver: 'GAME OVER',
    restartSystem: 'REBOOT SYSTEM',
    victoryTitle: 'SYSTEM SUCCESSFULLY HACKED!',
    victoryDesc: 'You conquered the difficulty level',
    returnMenu: 'RETURN TO MENU',
    editorTitle: 'CSS EDITOR',
    runCode: 'RUN CODE (Ctrl+Enter)',
    camera3D: '3D',
    camera2D: '2D',
    cameraFree: 'FREE',
    showEditorBtn: 'SHOW CSS EDITOR',
    hideEditorBtn: 'HIDE EDITOR',

    // Radial Menu
    radialTeleport: 'Teleport',
    radialBomb: 'Bomb',
    radialSniper: 'Sniper',
    radialCancel: 'Cancel',

    // Cheatsheet
    hackerGuide: 'Hacker Guide',
    toMoveUse: 'To move, use:',
    bombInfo: 'The .bomba hits a 3x3 area (-1 HP).',
    sniperInfo: 'The .sniper hits only the targeted tile (-3 HP).',
    secretTip: 'Secret hint: click on any tile and check back here...',
    clickedTile: '> Clicked tile:',

    // Boss & TV
    dangerWarning: 'DANGER',
    bossDetected: '// BOSS DETECTED //',

    // Tutorial Dialogues
    tutWelcome: 'Greetings, Operator! I am your tactical AI core. Welcome to Grid Battlegrounds. Prepare to master the arena through precise commands.',
    tutTeleport: 'Step 1: Teleportation. Locate the tile highlighted in YELLOW on the arena floor and move your robot there to calibrate your thrusters.',
    tutTeleportSuccess: 'Outstanding! Coordinates synchronized. The tile turned GREEN confirming the quantum jump.',
    tutBomb: 'Step 2: Area Attack. Three scout bots have spawned closely grouped! Launch the Bomb at the indicated YELLOW tile to eliminate all three at once.',
    tutBombSuccess: 'Surgical impact! The shockwave wiped out all grouped targets. Detonation telemetry confirmed.',
    tutSniper: 'Step 3: Sniper Strike. A hostile robot has appeared at a distant tile. Aim the Sniper directly at the YELLOW tile where it stands to execute a lethal shot.',
    tutSniperSuccess: 'Direct headshot! Tutorial completed with distinction. You are now fully authorized for real arena combat.',
    nextBtn: 'NEXT',
    continueBtn: 'CONTINUE',
    finishBtn: 'COMPLETE',

    // Mobile Orientation
    rotateTitle: 'ROTATE YOUR DEVICE',
    rotateDesc: 'Please rotate your phone to landscape mode to play.',
    rotateHint: 'Tactical system is calibrated exclusively for widescreen view.',
  },

  es: {
    // Menú Principal
    tacticalSystem: 'SISTEMA TÁCTICO',
    start: 'COMENZAR',
    options: 'OPCIONES',
    credits: 'CRÉDITOS',
    selectDifficulty: 'SELECCIONE LA DIFICULTAD',
    combatMode: 'MODO COMBATE',
    controlMode: 'MODO DE CONTROL',
    modeRadial: 'MENÚ RADIAL',
    modeCode: 'EDITOR DE CÓDIGO',
    easy: 'FÁCIL',
    easyDesc: 'Velocidad moderada. Ideal para aprender los comandos CSS.',
    normal: 'NORMAL',
    normalDesc: 'Desafío táctico estándar de la arena con bots equilibrados.',
    matrix: 'MATRIX',
    matrixDesc: 'Reacciones instantáneas y máxima agresividad. Solo veteranos.',
    demosPreview: 'DEMOSTRACIONES (PREVIEW)',
    arenaDemos: 'DEMOSTRACIONES DE LA ARENA',
    training: 'ENTRENAMIENTO',
    demosInstruction: 'Experimente con las armas y el movimiento en un entorno controlado:',
    demoTeleport: 'TELETRANSPORTE',
    demoTeleportDesc: 'Movimiento instantáneo por grid-column y grid-row.',
    demoBomb: 'LANZAMIENTO DE BOMBA',
    demoBombDesc: 'Ataque en área 3x3 con onda expansiva de choque.',
    demoSniper: 'DISPARO DE FRANCOTIRADOR',
    demoSniperDesc: 'Disparo de precisión quirúrgica a larga distancia.',
    back: 'VOLVER',
    confirmSave: 'CONFIRMAR Y GUARDAR',

    // Configuración
    systemSettings: 'CONFIGURACIÓN DEL SISTEMA',
    gridSize: 'TAMAÑO DE LA CUADRÍCULA:',
    gridSizeHint: 'Define la escala de la arena de batalla de 10x10 hasta 30x30 casillas.',
    clearCodeOption: 'LIMPIAR CÓDIGO TRAS EJECUTAR',
    clearCodeHint: 'Si está activado, vacía el editor CSS después de cada comando ejecutado en la arena.',
    languageSelect: 'IDIOMA / LANGUAGE / IDIOMA:',
    languageHint: 'Seleccione el idioma de la interfaz y de los diálogos.',
    inputModeLabel: 'MODO DE CONTROL:',
    inputModeCode: 'Editor de Código CSS',
    inputModeRadial: 'Menú Radial en el Suelo',
    inputModeHint: 'Elija entre controlar mediante sintaxis CSS o haciendo clic en las casillas para abrir el menú radial de acciones.',

    // HUD & Juego
    playerHp: 'HP JUGADOR:',
    enemiesAlive: 'ENEMIGOS VIVOS:',
    level: 'Fase',
    alertOutOfBounds: '¡FUERA DE LA ARENA! -1 Vida',
    alertCollision: '¡COLISIÓN CON ENEMIGO! -1 Vida',
    gameOver: 'GAME OVER',
    restartSystem: 'REINICIAR SISTEMA',
    victoryTitle: '¡SISTEMA HACKEADO CON ÉXITO!',
    victoryDesc: 'Has completado la dificultad',
    returnMenu: 'VOLVER AL MENÚ',
    editorTitle: 'EDITOR CSS',
    runCode: 'EJECUTAR CÓDIGO (Ctrl+Enter)',
    camera3D: '3D',
    camera2D: '2D',
    cameraFree: 'LIBRE',
    showEditorBtn: 'MOSTRAR EDITOR CSS',
    hideEditorBtn: 'OCULTAR EDITOR',

    // Radial Menu
    radialTeleport: 'Teletransportar',
    radialBomb: 'Bomba',
    radialSniper: 'Francotirador',
    radialCancel: 'Cancelar',

    // Cheatsheet
    hackerGuide: 'Guía Hacker',
    toMoveUse: 'Para moverte, usa:',
    bombInfo: 'La .bomba golpea un área de 3x3 (-1 Vida).',
    sniperInfo: 'La .sniper solo alcanza la casilla objetivo (-3 Vidas).',
    secretTip: 'Consejo secreto: haz clic en una casilla y vuelve aquí...',
    clickedTile: '> Casilla clicada:',

    // Boss & TV
    dangerWarning: 'PELIGRO',
    bossDetected: '// JEFE DETECTADO //',

    // Tutorial Dialogues
    tutWelcome: '¡Saludos, Operador! Soy tu núcleo de IA táctica. Bienvenido a Grid Battlegrounds. Prepárate para dominar la arena con comandos precisos.',
    tutTeleport: 'Paso 1: Teletransporte. Localiza la casilla marcada en AMARILLO en la arena y mueve tu robot hasta ella para calibrar tus propulsores.',
    tutTeleportSuccess: '¡Excelente! Posición sincronizada. La casilla se ha vuelto VERDE confirmando el salto cuántico.',
    tutBomb: 'Paso 2: Ataque en Área. ¡Han aparecido tres robots exploradores agrupados! Lanza la Bomba a la casilla AMARILLA para destruirlos a los tres de una vez.',
    tutBombSuccess: '¡Impacto quirúrgico! La onda de choque eliminó todos los objetivos agrupados. Análisis balístico completado.',
    tutSniper: 'Paso 3: Disparo Francotirador. Un robot hostil ha aparecido a distancia. Apunta con la Sniper a la casilla AMARILLA para eliminarlo con un tiro certero.',
    tutSniperSuccess: '¡Tiro certero directo al blanco! Tutorial completado con éxito. Ahora tienes autorización total para combatir en la arena.',
    nextBtn: 'SIGUIENTE',
    continueBtn: 'CONTINUAR',
    finishBtn: 'FINALIZAR',

    // Mobile Orientation
    rotateTitle: 'GIRA TU DISPOSITIVO',
    rotateDesc: 'Por favor, gira tu teléfono al modo horizontal (paisaje) para jugar.',
    rotateHint: 'El sistema táctico está calibrado exclusivamente para pantalla panorámica.',
  }
};

export function t(key, lang = 'en') {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS['en'];
  return dict[key] || TRANSLATIONS['en'][key] || key;
}
