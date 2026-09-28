// ============================================================
//  SoundManager.js — Gerenciador de Áudio Procedural Futurista
//  Sintetizador Web Audio API: latência zero, 100% royalty-free
// ============================================================

class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.musicGain = null;
    this.warningInterval = null;
    this.currentMusic = null;
    this.musicInterval = null;
    this.musicStep = 0;
    this.loadingInterval = null;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        this.musicGain.connect(this.masterGain);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx && !this.isMuted;
  }

  // ── 1. Teletransporte / Movimento do Jogador ───────────────────
  playMove() {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.12);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // ── 2. Lançamento de Bomba Futurista ──────────────────────────
  playBombLaunch() {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;

    // Tom descendente plasma
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(550, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.35);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.4);

    // Sopro de ar / ejeção
    this.playNoiseBurst(0.18, 1200, 300, 0.15);
  }

  // ── 3. Bip de Contagem da Bomba ──────────────────────────────
  playBombBeep() {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  // ── 3.1. Último Bip Diferenciado da Bomba (Alvo Fixado) ───────
  playBombLastBeep() {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;
    
    // Tom agudo duplo ressonante metálico
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1760, now);
    osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.18);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2640, now);
    osc2.frequency.exponentialRampToValueAtTime(880, now + 0.22);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.26);
    osc2.stop(now + 0.26);

    // Pequeno chiado sutil de mira travada
    this.playNoiseBurst(0.08, 3000, 1000, 0.12);
  }

  // ── 3.2. Som de Mergulho / Preparar para Impacto (Linha Reta) ──
  playBombDive() {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    // Silvo descendente acelerado tipo míssil em mergulho
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.95);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.95);
    filter.Q.value = 3.5;

    gain.gain.setValueAtTime(0.02, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.35);
    gain.gain.linearRampToValueAtTime(0.55, now + 0.85);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 1.02);

    this.playNoiseBurst(0.95, 800, 200, 0.25);
  }

  // ── 3.3. Disparo Individual de Bomba do Boss (Mãos Alternadas) ─
  playBossBombLaunch(index = 0) {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;

    // Frequência alterna entre as mãos direita e esquerda
    const isRight = (index % 2 === 0);
    const startFreq = isRight ? 480 : 640;
    const endFreq = isRight ? 180 : 220;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.28);

    gain.gain.setValueAtTime(0.38, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.35);

    this.playNoiseBurst(0.14, 1500, 350, 0.2);
  }

  // ── 4. Impacto / Explosão Sub-grave com Cauda de Ruído ────────
  playExplosion() {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;

    // Sub-bass thump
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(110, now);
    subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.5);

    subGain.gain.setValueAtTime(0.45, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    subOsc.start(now);
    subOsc.stop(now + 0.6);

    // Ruído filtrado
    this.playNoiseBurst(0.65, 600, 80, 0.35);
  }

  // ── 5. Disparo Sniper (Railgun / Laser Beam) ─────────────────
  playSniperShot() {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.22);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.22);
    filter.Q.value = 4.0;

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  // ── 6. Dano Recebido / Glitch Mecânico ────────────────────────
  playDamage() {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.setValueAtTime(120, now + 0.05);
    osc.frequency.setValueAtTime(75, now + 0.1);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // ── 7. Sirene de PERIGO (Alarme pulsante Megaman ZX Advent) ───
  playDangerBeep() {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.16);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.19);
  }

  // Iniciar loop de alarme de perigo a cada 0.2s (sincronizado com a TV)
  startDangerSiren(durationMs = 2600) {
    this.stopDangerSiren();
    this.playDangerBeep();
    this.warningInterval = setInterval(() => {
      this.playDangerBeep();
    }, 200);

    setTimeout(() => {
      this.stopDangerSiren();
    }, durationMs);
  }

  stopDangerSiren() {
    if (this.warningInterval) {
      clearInterval(this.warningInterval);
      this.warningInterval = null;
    }
  }

  // ── 8. Pouso Pesado / Impacto do Boss ─────────────────────────
  playBossLand() {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.45);

    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.55);

    this.playNoiseBurst(0.5, 450, 60, 0.4);
  }

  // ── 9. Chime de Conclusão de Dicas ("AGORA ESTÁ VALENDO!") ────
  playTutorialSuccess() {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + i * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.38);
    });
  }

  // ── 10. Clique de Botão / Interface ──────────────────────────
  playUIClick() {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.04);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // ── Auxiliar: Gerador de Ruído Filtrado ───────────────────────
  playNoiseBurst(duration, filterStart, filterEnd, volume = 0.2) {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterStart, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, filterEnd), now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + duration);
  }

  // ── 15. Som de 'POWER UP' estilo Super Mario World (Sem Direitos Autorais) ─
  playPowerUp() {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;
    // Sequência rápida de 6 notas ascendentes estilo retro arcade
    const notes = [261.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.065;
      const isLast = idx === notes.length - 1;
      const dur = isLast ? 0.35 : 0.08;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, startTime);
      if (isLast) {
        osc.frequency.linearRampToValueAtTime(freq * 1.025, startTime + 0.15);
        osc.frequency.linearRampToValueAtTime(freq, startTime + 0.32);
      }

      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.linearRampToValueAtTime(0.22, startTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + dur);
    });
  }

  // ── 16. Sons da Tela de Carregamento (Progresso e Conclusão) ─────
  startLoadingLoop() {
    if (!this.ensureContext()) return;
    this.stopLoadingLoop();
    let tickCount = 0;
    this.loadingInterval = setInterval(() => {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const baseFreq = 780 + (tickCount % 6) * 110;
      tickCount++;
      osc.frequency.setValueAtTime(baseFreq, now);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.04);
    }, 115);
  }

  stopLoadingLoop() {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
    }
  }

  playLoadingComplete() {
    if (!this.ensureContext()) return;
    this.stopLoadingLoop();
    const now = this.ctx.currentTime;
    // Chime triunfante de conclusão futurista 8-bit
    const chords = [
      { freq: 739.99, delay: 0.00, dur: 0.14, vol: 0.18 },
      { freq: 1108.73, delay: 0.07, dur: 0.35, vol: 0.22 },
      { freq: 1479.98, delay: 0.15, dur: 0.45, vol: 0.24 },
    ];
    chords.forEach(({ freq, delay, dur, vol }) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.01, now + delay);
      gain.gain.linearRampToValueAtTime(vol, now + delay + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + delay);
      osc.stop(now + delay + dur);
    });
  }

  // ── 17. Sintetizador de Música 8-Bit Retrô Chiptune Procedural ──
  playChiptuneNote(freq, type, duration, vol = 0.12) {
    if (!this.ctx || this.isMuted || !freq) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      const targetGain = this.musicGain || this.masterGain;
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(targetGain);

      osc.start(now);
      osc.stop(now + duration);
    } catch(e) {}
  }

  playChiptuneDrum(type) {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const targetGain = this.musicGain || this.masterGain;

      if (type === 'kick') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + 0.08);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(targetGain);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'snare') {
        const dur = 0.055;
        const bufferSize = Math.floor(this.ctx.sampleRate * dur);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1000, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(targetGain);

        noise.start(now);
        noise.stop(now + dur);
      } else if (type === 'hat') {
        const dur = 0.025;
        const bufferSize = Math.floor(this.ctx.sampleRate * dur);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(7000, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(targetGain);

        noise.start(now);
        noise.stop(now + dur);
      }
    } catch(e) {}
  }

  playMusic(trackName) {
    if (!this.ensureContext()) return;
    if (this.currentMusic === trackName && this.musicInterval) return;

    this.stopMusic();
    this.currentMusic = trackName;
    this.musicStep = 0;

    const N = {
      C2: 65.41, D2: 73.42, Eb2: 77.78, E2: 82.41, F2: 87.31, Fs2: 92.50, G2: 98.00, Ab2: 103.83, A2: 110.00, Bb2: 116.54, B2: 123.47,
      C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, Fs3: 185.00, G3: 196.00, Ab3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
      C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
      C5: 523.25, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, Fs5: 739.99, G5: 783.99, Ab5: 830.61, A5: 880.00, Bb5: 932.33, B5: 987.77,
      C6: 1046.50, D6: 1174.66
    };

    // Padrões musicais 8-bit (32 passos de semicolcheia por loop)
    const TRACKS = {
      menu: {
        stepMs: 125, // 120 BPM
        lead: [
          N.A4, 0, N.C5, 0, N.E5, 0, N.D5, 0, N.C5, 0, N.B4, 0, N.G4, 0, N.A4, 0,
          N.A4, 0, N.C5, 0, N.E5, 0, N.G5, 0, N.F5, 0, N.E5, 0, N.D5, 0, N.B4, 0
        ],
        bass: [
          N.A2, 0, N.A2, N.E2, N.G2, 0, N.G2, N.D2, N.F2, 0, N.F2, N.C2, N.E2, 0, N.G2, N.E2,
          N.A2, 0, N.A2, N.E2, N.C3, 0, N.C3, N.G2, N.D3, 0, N.D3, N.A2, N.E2, 0, N.E2, N.B2
        ],
        drums: [
          'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'hat',
          'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'hat',
          'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'hat',
          'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'snare'
        ]
      },
      battle: {
        stepMs: 110, // 136 BPM
        lead: [
          N.D4, N.D4, N.F4, N.A4, N.D5, 0, N.C5, N.A4, N.F4, 0, N.G4, N.A4, N.F4, 0, N.D4, 0,
          N.D4, N.D4, N.F4, N.A4, N.D5, 0, N.F5, N.E5, N.D5, 0, N.C5, N.A4, N.C5, 0, N.D5, 0
        ],
        bass: [
          N.D2, N.D2, 0, N.D2, N.F2, N.F2, 0, N.F2, N.G2, N.G2, 0, N.G2, N.A2, N.A2, 0, N.A2,
          N.Bb2, N.Bb2, 0, N.Bb2, N.C3, N.C3, 0, N.C3, N.A2, N.A2, 0, N.A2, N.D2, N.D2, 0, N.D2
        ],
        drums: [
          'kick', 'hat', 'kick', 'snare', 'kick', 'hat', 'kick', 'snare',
          'kick', 'hat', 'kick', 'snare', 'kick', 'hat', 'kick', 'snare',
          'kick', 'hat', 'kick', 'snare', 'kick', 'hat', 'kick', 'snare',
          'kick', 'hat', 'kick', 'snare', 'kick', 'kick', 'snare', 'snare'
        ]
      },
      boss: {
        stepMs: 98, // 153 BPM
        lead: [
          N.C5, N.Eb5, N.G5, N.C6, N.B5, N.Ab5, N.G5, N.F5, N.Eb5, N.D5, N.C5, N.Eb5, N.Fs5, N.G5, N.Eb5, N.D5,
          N.C5, N.Eb5, N.G5, N.C6, N.D6, N.C6, N.B5, N.Ab5, N.G5, N.Fs5, N.F5, N.Eb5, N.D5, N.Eb5, N.D5, N.B4
        ],
        bass: [
          N.C2, N.C3, N.C2, N.C3, N.Eb2, N.Eb3, N.Eb2, N.Eb3, N.Fs2, N.Fs3, N.Fs2, N.Fs3, N.G2, N.G3, N.G2, N.G3,
          N.C2, N.C3, N.C2, N.C3, N.Ab2, N.Ab3, N.Ab2, N.Ab3, N.G2, N.G3, N.G2, N.G3, N.B2, N.B3, N.B2, N.B3
        ],
        drums: [
          'kick', 'kick', 'snare', 'hat', 'kick', 'kick', 'snare', 'hat',
          'kick', 'kick', 'snare', 'hat', 'kick', 'kick', 'snare', 'snare',
          'kick', 'kick', 'snare', 'hat', 'kick', 'kick', 'snare', 'hat',
          'kick', 'kick', 'snare', 'snare', 'kick', 'snare', 'kick', 'snare'
        ]
      }
    };

    const track = TRACKS[trackName] || TRACKS.menu;
    this.musicInterval = setInterval(() => {
      const step = this.musicStep;
      this.musicStep = (this.musicStep + 1) % 32;

      // Canal Lead (Square wave retro)
      const leadNote = track.lead[step];
      if (leadNote) {
        this.playChiptuneNote(leadNote, 'square', track.stepMs / 1000 * 0.9, 0.09);
      }

      // Canal Bass (Triangle wave retro)
      const bassNote = track.bass[step];
      if (bassNote) {
        this.playChiptuneNote(bassNote, 'triangle', track.stepMs / 1000 * 0.85, 0.13);
      }

      // Canal Percussão 8-bit
      const drum = track.drums[step];
      if (drum) {
        this.playChiptuneDrum(drum);
      }
    }, track.stepMs);
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.currentMusic = null;
  }

  // ── 9. Som de Surgimento / Materialização na Arena (Jogador e NPCs) ──
  playSpawnSound() {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;

    // Tom futurista de materialização quântica com sweep ascendente e impacto suave
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.18);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.35);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(1800, now + 0.15);
    filter.frequency.exponentialRampToValueAtTime(600, now + 0.35);
    filter.Q.value = 3.5;

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.38);

    // Ressonância harmônica brilhante (sine subindo)
    const sparkle = this.ctx.createOscillator();
    const sparkGain = this.ctx.createGain();
    sparkle.type = 'sine';
    sparkle.frequency.setValueAtTime(520, now);
    sparkle.frequency.exponentialRampToValueAtTime(1240, now + 0.22);

    sparkGain.gain.setValueAtTime(0.12, now);
    sparkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    sparkle.connect(sparkGain);
    sparkGain.connect(this.masterGain);

    sparkle.start(now);
    sparkle.stop(now + 0.3);
  }

  startMenuMusic() {
    this.playMusic('menu');
  }

  startBattleMusic() {
    this.playMusic('battle');
  }

  startBossMusic() {
    this.playMusic('boss');
  }

  setVolume(vol) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopMusic();
    }
    return this.isMuted;
  }
}

export const soundManager = new SoundManager();
