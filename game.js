/**
 * Nokia 3310 Snake Game Engine
 * Faithful recreation of the classic Nokia monochrome snake game.
 */

(function () {
  'use strict';

  // Constants & Grid
  const COLS = 28;
  const ROWS = 18;
  const CELL_SIZE = 10; // Scaled up onto canvas (Canvas size: 280 x 180)

  // Speeds in ms per step for levels 1 to 9
  const SPEEDS = {
    1: 220,
    2: 190,
    3: 160,
    4: 135,
    5: 110,
    6: 90,
    7: 75,
    8: 60,
    9: 45
  };

  // Mazes for Snake II mode
  const MAZES = {
    none: [],
    box: [
      // Corner brackets
      {x: 4, y: 3}, {x: 5, y: 3}, {x: 6, y: 3}, {x: 4, y: 4}, {x: 4, y: 5},
      {x: 23, y: 3}, {x: 22, y: 3}, {x: 21, y: 3}, {x: 23, y: 4}, {x: 23, y: 5},
      {x: 4, y: 14}, {x: 5, y: 14}, {x: 6, y: 14}, {x: 4, y: 13}, {x: 4, y: 12},
      {x: 23, y: 14}, {x: 22, y: 14}, {x: 21, y: 14}, {x: 23, y: 13}, {x: 23, y: 12}
    ],
    tunnel: [
      // Horizontal barriers with center opening
      {x: 6, y: 5}, {x: 7, y: 5}, {x: 8, y: 5}, {x: 9, y: 5}, {x: 10, y: 5},
      {x: 17, y: 5}, {x: 18, y: 5}, {x: 19, y: 5}, {x: 20, y: 5}, {x: 21, y: 5},
      {x: 6, y: 12}, {x: 7, y: 12}, {x: 8, y: 12}, {x: 9, y: 12}, {x: 10, y: 12},
      {x: 17, y: 12}, {x: 18, y: 12}, {x: 19, y: 12}, {x: 20, y: 12}, {x: 21, y: 12}
    ],
    cross: [
      // Central pillars
      {x: 13, y: 4}, {x: 14, y: 4}, {x: 13, y: 5}, {x: 14, y: 5},
      {x: 13, y: 12}, {x: 14, y: 12}, {x: 13, y: 13}, {x: 14, y: 13},
      {x: 7, y: 8}, {x: 7, y: 9}, {x: 8, y: 8}, {x: 8, y: 9},
      {x: 19, y: 8}, {x: 19, y: 9}, {x: 20, y: 8}, {x: 20, y: 9}
    ]
  };

  class SnakeGame {
    constructor() {
      this.canvas = document.getElementById('game-screen');
      this.ctx = this.canvas.getContext('2d');

      // State
      this.state = 'START'; // 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'
      this.level = parseInt(localStorage.getItem('nokia_snake_level') || '4', 10);
      this.gameMode = localStorage.getItem('nokia_snake_mode') || 'classic'; // 'classic' | 'wrap' | 'maze'
      this.mazeType = localStorage.getItem('nokia_snake_maze') || 'tunnel';
      this.score = 0;
      this.highScore = parseInt(localStorage.getItem('nokia_snake_highscore') || '0', 10);
      this.foodsEaten = 0;

      // Snake coordinates
      this.snake = [];
      this.dir = { x: 1, y: 0 };
      this.nextDir = { x: 1, y: 0 };

      // Food & Bonus
      this.food = { x: 15, y: 9 };
      this.bonus = null; // { x, y, timeLeft, maxTime }
      this.bonusTimer = null;

      // Game Loop
      this.lastTick = 0;
      this.animationFrameId = null;
      this.blinkCounter = 0;
      this.isNewHighScore = false;

      // Color themes
      this.themes = {
        'classic': { bg: '#8b956d', dark: '#1c260f', light: '#9ca77d' },
        'backlit': { bg: '#608f86', dark: '#0a1d1a', light: '#7bb0a5' },
        'amber': { bg: '#ba894a', dark: '#241403', light: '#cfa265' },
        'bw': { bg: '#c4cbba', dark: '#000000', light: '#d8decb' }
      };
      this.currentTheme = localStorage.getItem('nokia_snake_theme') || 'classic';

      this.initUI();
      this.bindInputs();
      this.applyTheme(this.currentTheme);
      this.resetGame();

      // Start main animation loop for rendering & updates
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }

    initUI() {
      // Elements
      this.scoreDisplay = document.getElementById('lcd-score');
      this.levelDisplay = document.getElementById('lcd-level');
      this.modeDisplay = document.getElementById('lcd-mode');
      this.highScoreDisplay = document.getElementById('stat-highscore');
      this.soundBtn = document.getElementById('toggle-sound');
      this.themeSelect = document.getElementById('theme-select');
      this.levelSelect = document.getElementById('level-select');
      this.modeSelect = document.getElementById('mode-select');
      this.mazeSelect = document.getElementById('maze-select');
      this.soundIcon = document.getElementById('sound-indicator');

      if (this.highScoreDisplay) this.highScoreDisplay.textContent = this.highScore;
      if (this.levelDisplay) this.levelDisplay.textContent = `LV ${this.level}`;
      if (this.modeDisplay) this.modeDisplay.textContent = this.gameMode.toUpperCase();

      if (this.levelSelect) this.levelSelect.value = this.level;
      if (this.modeSelect) this.modeSelect.value = this.gameMode;
      if (this.mazeSelect) {
        this.mazeSelect.value = this.mazeType;
        this.mazeSelect.parentElement.style.display = this.gameMode === 'maze' ? 'flex' : 'none';
      }
      if (this.themeSelect) this.themeSelect.value = this.currentTheme;

      this.updateSoundUI();
    }

    updateSoundUI() {
      const isMuted = window.nokiaAudio.muted;
      if (this.soundIcon) {
        this.soundIcon.textContent = isMuted ? 'MUTE' : '♫ ON';
        this.soundIcon.classList.toggle('is-muted', isMuted);
      }
      if (this.soundBtn) {
        this.soundBtn.textContent = isMuted ? 'Sound: OFF' : 'Sound: ON';
      }
    }

    applyTheme(themeKey) {
      this.currentTheme = themeKey;
      localStorage.setItem('nokia_snake_theme', themeKey);
      const root = document.documentElement;
      const theme = this.themes[themeKey] || this.themes.classic;

      root.style.setProperty('--lcd-bg', theme.bg);
      root.style.setProperty('--lcd-dark', theme.dark);
      root.style.setProperty('--lcd-light', theme.light);
    }

    resetGame() {
      // Initial snake in center heading right
      const startX = 10;
      const startY = 8;
      this.snake = [
        { x: startX, y: startY },
        { x: startX - 1, y: startY },
        { x: startX - 2, y: startY },
        { x: startX - 3, y: startY }
      ];
      this.dir = { x: 1, y: 0 };
      this.nextDir = { x: 1, y: 0 };
      this.score = 0;
      this.foodsEaten = 0;
      this.bonus = null;
      this.isNewHighScore = false;
      this.updateScoreUI();
      this.spawnFood();
    }

    startGame() {
      window.nokiaAudio.init();
      window.nokiaAudio.playClick();
      this.resetGame();
      this.state = 'PLAYING';
      this.lastTick = performance.now();
    }

    pauseGame() {
      if (this.state === 'PLAYING') {
        this.state = 'PAUSED';
        window.nokiaAudio.playClick();
      } else if (this.state === 'PAUSED') {
        this.state = 'PLAYING';
        this.lastTick = performance.now();
        window.nokiaAudio.playClick();
      }
    }

    spawnFood() {
      const forbidden = new Set();

      // Avoid snake body
      this.snake.forEach(seg => forbidden.add(`${seg.x},${seg.y}`));

      // Avoid walls if maze mode
      if (this.gameMode === 'maze') {
        const walls = MAZES[this.mazeType] || [];
        walls.forEach(w => forbidden.add(`${w.x},${w.y}`));
      }

      // Avoid borders if classic mode
      const minX = this.gameMode === 'classic' ? 1 : 0;
      const maxX = this.gameMode === 'classic' ? COLS - 2 : COLS - 1;
      const minY = this.gameMode === 'classic' ? 1 : 0;
      const maxY = this.gameMode === 'classic' ? ROWS - 2 : ROWS - 1;

      const available = [];
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          if (!forbidden.has(`${x},${y}`)) {
            available.push({ x, y });
          }
        }
      }

      if (available.length > 0) {
        const picked = available[Math.floor(Math.random() * available.length)];
        this.food = picked;
      }
    }

    spawnBonus() {
      // Occasional bonus insect (e.g. every 5 regular foods)
      const forbidden = new Set();
      this.snake.forEach(seg => forbidden.add(`${seg.x},${seg.y}`));
      forbidden.add(`${this.food.x},${this.food.y}`);

      if (this.gameMode === 'maze') {
        const walls = MAZES[this.mazeType] || [];
        walls.forEach(w => forbidden.add(`${w.x},${w.y}`));
      }

      const minX = this.gameMode === 'classic' ? 2 : 1;
      const maxX = this.gameMode === 'classic' ? COLS - 3 : COLS - 2;
      const minY = this.gameMode === 'classic' ? 2 : 1;
      const maxY = this.gameMode === 'classic' ? ROWS - 3 : ROWS - 2;

      const available = [];
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          if (!forbidden.has(`${x},${y}`)) {
            available.push({ x, y });
          }
        }
      }

      if (available.length > 0) {
        const picked = available[Math.floor(Math.random() * available.length)];
        const maxTime = 100; // timer ticks
        this.bonus = {
          x: picked.x,
          y: picked.y,
          timeLeft: maxTime,
          maxTime: maxTime
        };
      }
    }

    setDirection(dx, dy) {
      if (this.state === 'START' || this.state === 'GAMEOVER') {
        this.startGame();
        return;
      }
      if (this.state === 'PAUSED') {
        this.state = 'PLAYING';
        this.lastTick = performance.now();
      }

      // Prevent reversing into self
      if (dx !== 0 && this.dir.x !== 0) return;
      if (dy !== 0 && this.dir.y !== 0) return;

      this.nextDir = { x: dx, y: dy };
      window.nokiaAudio.playClick();
    }

    update() {
      if (this.state !== 'PLAYING') return;

      this.dir = { ...this.nextDir };
      const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };

      // Handle Wall Collisions based on Mode
      if (this.gameMode === 'classic') {
        if (head.x < 1 || head.x >= COLS - 1 || head.y < 1 || head.y >= ROWS - 1) {
          this.gameOver();
          return;
        }
      } else {
        // Wrap around borders
        if (head.x < 0) head.x = COLS - 1;
        if (head.x >= COLS) head.x = 0;
        if (head.y < 0) head.y = ROWS - 1;
        if (head.y >= ROWS) head.y = 0;

        // Maze wall collision
        if (this.gameMode === 'maze') {
          const walls = MAZES[this.mazeType] || [];
          if (walls.some(w => w.x === head.x && w.y === head.y)) {
            this.gameOver();
            return;
          }
        }
      }

      // Self Collision
      for (let i = 0; i < this.snake.length; i++) {
        if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
          this.gameOver();
          return;
        }
      }

      // Advance snake
      this.snake.unshift(head);

      // Check Food Collision
      if (head.x === this.food.x && head.y === this.food.y) {
        this.score += 10 * this.level;
        this.foodsEaten++;
        window.nokiaAudio.playEat();

        // Spawn bonus insect occasionally
        if (this.foodsEaten % 5 === 0 && !this.bonus) {
          this.spawnBonus();
        }

        this.spawnFood();
        this.updateScoreUI();
      } else if (this.bonus && head.x === this.bonus.x && head.y === this.bonus.y) {
        // Bonus insect eaten!
        const bonusPts = Math.round((this.bonus.timeLeft / this.bonus.maxTime) * 100) + 50;
        this.score += bonusPts;
        this.bonus = null;
        window.nokiaAudio.playBonus();
        this.updateScoreUI();
      } else {
        // Normal move without eating
        this.snake.pop();
      }

      // Bonus countdown
      if (this.bonus) {
        this.bonus.timeLeft--;
        if (this.bonus.timeLeft <= 0) {
          this.bonus = null;
        }
      }
    }

    gameOver() {
      this.state = 'GAMEOVER';
      window.nokiaAudio.playGameOver();

      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.isNewHighScore = true;
        localStorage.setItem('nokia_snake_highscore', this.highScore);
        if (this.highScoreDisplay) this.highScoreDisplay.textContent = this.highScore;
      }
    }

    updateScoreUI() {
      if (this.scoreDisplay) this.scoreDisplay.textContent = this.score;
      if (this.score > this.highScore) {
        if (this.highScoreDisplay) this.highScoreDisplay.textContent = this.score;
      }
    }

    loop(timestamp) {
      const speed = SPEEDS[this.level] || 110;
      if (timestamp - this.lastTick >= speed) {
        this.update();
        this.lastTick = timestamp;
      }

      this.blinkCounter++;
      this.render();
      this.animationFrameId = requestAnimationFrame(this.loop);
    }

    // Canvas LCD Rendering
    render() {
      const ctx = this.ctx;
      const theme = this.themes[this.currentTheme] || this.themes.classic;

      // Background
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Status Bar at the top of LCD
      this.renderStatusBar(ctx, theme);

      // Borders / Walls
      if (this.gameMode === 'classic') {
        this.renderClassicBorder(ctx, theme.dark);
      } else if (this.gameMode === 'maze') {
        this.renderMazeWalls(ctx, theme.dark);
      }

      // Food
      this.renderFood(ctx, theme.dark);

      // Bonus creature (if active)
      if (this.bonus) {
        this.renderBonus(ctx, theme.dark);
      }

      // Snake
      this.renderSnake(ctx, theme.dark);

      // Overlays according to game state
      if (this.state === 'START') {
        this.renderStartScreen(ctx, theme);
      } else if (this.state === 'PAUSED') {
        this.renderPausedScreen(ctx, theme);
      } else if (this.state === 'GAMEOVER') {
        this.renderGameOverScreen(ctx, theme);
      }
    }

    renderStatusBar(ctx, theme) {
      // Draw a subtle line between status bar and play area if desired
      // We also display bonus progress bar if bonus is active
      if (this.bonus) {
        const barWidth = Math.floor((this.bonus.timeLeft / this.bonus.maxTime) * 60);
        ctx.fillStyle = theme.dark;
        ctx.fillRect(110, 3, barWidth, 3);
        // Little bug icon
        ctx.fillRect(104, 3, 4, 3);
      }
    }

    renderClassicBorder(ctx, color) {
      ctx.fillStyle = color;
      // Top wall (under status area)
      for (let x = 0; x < COLS; x++) {
        this.drawDot(ctx, x, 0, color);
        this.drawDot(ctx, x, ROWS - 1, color);
      }
      for (let y = 0; y < ROWS; y++) {
        this.drawDot(ctx, 0, y, color);
        this.drawDot(ctx, COLS - 1, y, color);
      }
    }

    renderMazeWalls(ctx, color) {
      const walls = MAZES[this.mazeType] || [];
      walls.forEach(w => {
        this.drawDot(ctx, w.x, w.y, color);
      });
    }

    drawDot(ctx, gridX, gridY, color) {
      const x = gridX * CELL_SIZE;
      const y = gridY * CELL_SIZE;
      ctx.fillStyle = color;
      // Authentic Nokia block: 9x9 pixels with 1px margin
      ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    }

    renderFood(ctx, color) {
      const x = this.food.x * CELL_SIZE;
      const y = this.food.y * CELL_SIZE;
      ctx.fillStyle = color;

      // Authentic Nokia egg/apple: cross-pattern dot
      ctx.fillRect(x + 3, y + 1, 4, 8);
      ctx.fillRect(x + 1, y + 3, 8, 4);
    }

    renderBonus(ctx, color) {
      const x = this.bonus.x * CELL_SIZE;
      const y = this.bonus.y * CELL_SIZE;
      ctx.fillStyle = color;

      // Insect sprite (blinking as time runs out)
      if (this.bonus.timeLeft < 30 && Math.floor(this.blinkCounter / 4) % 2 === 0) {
        return; // Blink
      }

      // Bug body & legs
      ctx.fillRect(x + 2, y + 2, 6, 6);
      // Legs / antennae
      ctx.fillRect(x + 1, y + 1, 2, 2);
      ctx.fillRect(x + 7, y + 1, 2, 2);
      ctx.fillRect(x + 1, y + 7, 2, 2);
      ctx.fillRect(x + 7, y + 7, 2, 2);
    }

    renderSnake(ctx, color) {
      for (let i = 0; i < this.snake.length; i++) {
        const seg = this.snake[i];
        const x = seg.x * CELL_SIZE;
        const y = seg.y * CELL_SIZE;

        ctx.fillStyle = color;

        if (i === 0) {
          // Head with eyes
          ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);

          // Invert eyes with background color
          const theme = this.themes[this.currentTheme] || this.themes.classic;
          ctx.fillStyle = theme.bg;

          if (this.dir.x === 1) { // Right
            ctx.fillRect(x + 6, y + 2, 2, 2);
            ctx.fillRect(x + 6, y + 6, 2, 2);
          } else if (this.dir.x === -1) { // Left
            ctx.fillRect(x + 2, y + 2, 2, 2);
            ctx.fillRect(x + 2, y + 6, 2, 2);
          } else if (this.dir.y === 1) { // Down
            ctx.fillRect(x + 2, y + 6, 2, 2);
            ctx.fillRect(x + 6, y + 6, 2, 2);
          } else if (this.dir.y === -1) { // Up
            ctx.fillRect(x + 2, y + 2, 2, 2);
            ctx.fillRect(x + 6, y + 2, 2, 2);
          }
        } else {
          // Body segments
          ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
      }
    }

    renderStartScreen(ctx, theme) {
      // Semi-translucent banner
      ctx.fillStyle = theme.bg;
      ctx.fillRect(20, 30, 240, 120);

      // Border box
      ctx.strokeStyle = theme.dark;
      ctx.lineWidth = 2;
      ctx.strokeRect(22, 32, 236, 116);

      ctx.fillStyle = theme.dark;
      ctx.font = 'bold 20px "VT323", monospace, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NOKIA SNAKE', 140, 64);

      ctx.font = '14px "VT323", monospace, sans-serif';
      ctx.fillText(`HI-SCORE: ${this.highScore}`, 140, 88);

      if (Math.floor(this.blinkCounter / 18) % 2 === 0) {
        ctx.font = 'bold 15px "VT323", monospace, sans-serif';
        ctx.fillText('PRESS [5] OR OK TO PLAY', 140, 118);
      }

      ctx.font = '12px "VT323", monospace, sans-serif';
      ctx.fillText('2=▲ 4=◄ 6=► 8=▼', 140, 138);
    }

    renderPausedScreen(ctx, theme) {
      if (Math.floor(this.blinkCounter / 15) % 2 === 0) {
        ctx.fillStyle = theme.bg;
        ctx.fillRect(60, 70, 160, 40);

        ctx.strokeStyle = theme.dark;
        ctx.lineWidth = 2;
        ctx.strokeRect(62, 72, 156, 36);

        ctx.fillStyle = theme.dark;
        ctx.font = 'bold 18px "VT323", monospace, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', 140, 96);
      }
    }

    renderGameOverScreen(ctx, theme) {
      ctx.fillStyle = theme.bg;
      ctx.fillRect(25, 25, 230, 130);

      ctx.strokeStyle = theme.dark;
      ctx.lineWidth = 2;
      ctx.strokeRect(27, 27, 226, 126);

      ctx.fillStyle = theme.dark;
      ctx.font = 'bold 22px "VT323", monospace, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', 140, 56);

      ctx.font = '16px "VT323", monospace, sans-serif';
      ctx.fillText(`SCORE: ${this.score}`, 140, 82);

      if (this.isNewHighScore) {
        ctx.font = 'bold 14px "VT323", monospace, sans-serif';
        if (Math.floor(this.blinkCounter / 10) % 2 === 0) {
          ctx.fillText('★ NEW HIGH SCORE! ★', 140, 104);
        }
      } else {
        ctx.font = '14px "VT323", monospace, sans-serif';
        ctx.fillText(`HIGH: ${this.highScore}`, 140, 104);
      }

      if (Math.floor(this.blinkCounter / 16) % 2 === 0) {
        ctx.font = 'bold 14px "VT323", monospace, sans-serif';
        ctx.fillText('PRESS [5] TO RETRY', 140, 136);
      }
    }

    bindInputs() {
      // Keyboard handler
      window.addEventListener('keydown', (e) => {
        // Prevent page scroll for arrow keys and space
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
          e.preventDefault();
        }

        switch (e.key) {
          // Direction: UP
          case 'ArrowUp':
          case 'w':
          case 'W':
          case '8': // Nokia keypad 8 can also be mapped
          case '2': // Classic Nokia 2 is UP
            if (e.key === '8' && !e.code.includes('Numpad') && !e.code.includes('Digit')) return;
            this.setDirection(0, -1);
            break;

          // Direction: DOWN
          case 'ArrowDown':
          case 's':
          case 'S':
          case '8':
            this.setDirection(0, 1);
            break;

          // Direction: LEFT
          case 'ArrowLeft':
          case 'a':
          case 'A':
          case '4':
            this.setDirection(-1, 0);
            break;

          // Direction: RIGHT
          case 'ArrowRight':
          case 'd':
          case 'D':
          case '6':
            this.setDirection(1, 0);
            break;

          // Select / Start / Action
          case 'Enter':
          case '5':
          case ' ':
            if (this.state === 'START' || this.state === 'GAMEOVER') {
              this.startGame();
            } else {
              this.pauseGame();
            }
            break;

          // Mute toggle
          case 'm':
          case 'M':
            window.nokiaAudio.toggleMute();
            this.updateSoundUI();
            break;

          // Escape / Pause
          case 'Escape':
            this.pauseGame();
            break;
        }
      });

      // Phone Keypad Buttons Click & Touch
      const bindBtn = (id, action) => {
        const btn = document.getElementById(id);
        if (btn) {
          const handler = (e) => {
            e.preventDefault();
            btn.classList.add('pressed');
            setTimeout(() => btn.classList.remove('pressed'), 120);
            action();
          };
          btn.addEventListener('click', handler);
          btn.addEventListener('touchstart', handler, { passive: false });
        }
      };

      // Nokia numeric buttons
      bindBtn('btn-2', () => this.setDirection(0, -1)); // 2 = UP
      bindBtn('btn-4', () => this.setDirection(-1, 0)); // 4 = LEFT
      bindBtn('btn-6', () => this.setDirection(1, 0));  // 6 = RIGHT
      bindBtn('btn-8', () => this.setDirection(0, 1));  // 8 = DOWN
      bindBtn('btn-5', () => {
        if (this.state === 'START' || this.state === 'GAMEOVER') {
          this.startGame();
        } else {
          this.pauseGame();
        }
      });

      // Navigation & Function Buttons
      bindBtn('nav-up', () => this.setDirection(0, -1));
      bindBtn('nav-down', () => this.setDirection(0, 1));
      bindBtn('nav-left', () => this.setDirection(-1, 0));
      bindBtn('nav-right', () => this.setDirection(1, 0));
      bindBtn('btn-navi', () => { // Big central Navi button
        if (this.state === 'START' || this.state === 'GAMEOVER') {
          this.startGame();
        } else {
          this.pauseGame();
        }
      });

      bindBtn('btn-c', () => { // 'C' clear/cancel button
        window.nokiaAudio.playClick();
        if (this.state === 'PLAYING') {
          this.pauseGame();
        } else if (this.state === 'PAUSED' || this.state === 'GAMEOVER') {
          this.state = 'START';
        }
      });

      // Generic buttons for other keypad digits (authentic click sound)
      ['btn-1', 'btn-3', 'btn-7', 'btn-9', 'btn-star', 'btn-0', 'btn-hash'].forEach(id => {
        bindBtn(id, () => window.nokiaAudio.playClick());
      });

      // Nokia Ringtone play button easter egg
      bindBtn('btn-ringtone', () => {
        window.nokiaAudio.playNokiaRingtone();
      });

      // Sound toggle
      if (this.soundBtn) {
        this.soundBtn.addEventListener('click', () => {
          window.nokiaAudio.toggleMute();
          this.updateSoundUI();
        });
      }

      // Settings dropdowns
      if (this.themeSelect) {
        this.themeSelect.addEventListener('change', (e) => {
          this.applyTheme(e.target.value);
        });
      }

      if (this.levelSelect) {
        this.levelSelect.addEventListener('change', (e) => {
          this.level = parseInt(e.target.value, 10);
          localStorage.setItem('nokia_snake_level', this.level);
          if (this.levelDisplay) this.levelDisplay.textContent = `LV ${this.level}`;
        });
      }

      if (this.modeSelect) {
        this.modeSelect.addEventListener('change', (e) => {
          this.gameMode = e.target.value;
          localStorage.setItem('nokia_snake_mode', this.gameMode);
          if (this.modeDisplay) this.modeDisplay.textContent = this.gameMode.toUpperCase();
          if (this.mazeSelect) {
            this.mazeSelect.parentElement.style.display = this.gameMode === 'maze' ? 'flex' : 'none';
          }
          if (this.state === 'PLAYING') this.resetGame();
        });
      }

      if (this.mazeSelect) {
        this.mazeSelect.addEventListener('change', (e) => {
          this.mazeType = e.target.value;
          localStorage.setItem('nokia_snake_maze', this.mazeType);
          if (this.state === 'PLAYING') this.resetGame();
        });
      }

      // Touch screen swipe support on the LCD screen
      let touchStartX = 0;
      let touchStartY = 0;

      this.canvas.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
      }, { passive: true });

      this.canvas.addEventListener('touchend', (e) => {
        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (Math.max(absX, absY) > 20) {
          if (absX > absY) {
            this.setDirection(dx > 0 ? 1 : -1, 0);
          } else {
            this.setDirection(0, dy > 0 ? 1 : -1);
          }
        } else {
          // Tap to start or pause
          if (this.state === 'START' || this.state === 'GAMEOVER') {
            this.startGame();
          } else {
            this.pauseGame();
          }
        }
      }, { passive: true });
    }
  }

  // Initialize on DOM ready
  window.addEventListener('DOMContentLoaded', () => {
    window.game = new SnakeGame();
  });
})();
