/**
 * Nokia Sound Synthesizer using Web Audio API
 * Generates authentic 8-bit square wave buzzer sounds.
 */

class NokiaSound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.loadSettings();
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  loadSettings() {
    const saved = localStorage.getItem('nokia_snake_muted');
    if (saved !== null) {
      this.muted = saved === 'true';
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('nokia_snake_muted', this.muted);
    return this.muted;
  }

  playTone(frequency, duration, type = 'square', gainValue = 0.15) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainValue, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  // Keypad press click
  playClick() {
    this.playTone(1800, 0.03, 'triangle', 0.08);
  }

  // Eating regular food
  playEat() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.setValueAtTime(880.00, now + 0.05); // A5

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Bonus insect eating
  playBonus() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.08);
    });
  }

  // Game over crash tone
  playGameOver() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [440, 370, 311, 220, 146];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.1;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.12);
    });
  }

  // Classic iconic Nokia Ringtone (Grande Valse excerpt)
  playNokiaRingtone() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const melody = [
      { f: 1318.51, d: 0.14 }, // E6
      { f: 1174.66, d: 0.14 }, // D6
      { f: 739.99,  d: 0.28 }, // F#5
      { f: 830.61,  d: 0.28 }, // G#5
      { f: 1108.73, d: 0.14 }, // C#6
      { f: 987.77,  d: 0.14 }, // B5
      { f: 587.33,  d: 0.28 }, // D5
      { f: 659.25,  d: 0.28 }, // E5
      { f: 987.77,  d: 0.14 }, // B5
      { f: 880.00,  d: 0.14 }, // A5
      { f: 554.37,  d: 0.28 }, // C#5
      { f: 659.25,  d: 0.28 }, // E5
      { f: 880.00,  d: 0.50 }  // A5
    ];

    let current = this.ctx.currentTime + 0.05;

    melody.forEach((note) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(note.f, current);

      gain.gain.setValueAtTime(0.12, current);
      gain.gain.exponentialRampToValueAtTime(0.001, current + note.d * 0.9);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(current);
      osc.stop(current + note.d);

      current += note.d * 1.05;
    });
  }
}

window.nokiaAudio = new NokiaSound();
