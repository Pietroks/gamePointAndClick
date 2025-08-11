/*
  game.js - Versão final com:
  - Menu inicial (MenuScene)
  - GameScene com pooling de magos (group pool)
  - PauseScene (overlay)
  - Painel de balance em tempo real (in-game UI)
  - Música de fundo, mute, mobile suporte (long-press)
  === IMPORTANT ===
  This package does NOT include your audio/image assets. Add them in /assets.
*/

const WIZARD_BASE = {
  comum: { texture: "maguinho", health: 1, points: 1, escapeTime: 5000, spawnWeight: 65, escapePenalty: 1, escapeSound: "somEscape" },
  rapido: { texture: "maguinho2", health: 2, points: 2, escapeTime: 6000, spawnWeight: 20, escapePenalty: 2, escapeSound: "somEscape2" },
  dourado: { texture: "magoDourado", health: 3, points: 5, escapeTime: 7000, spawnWeight: 10, escapePenalty: 1, escapeSound: "somEscape" },
  fantasma: {
    texture: "magoFantasma",
    health: 4,
    points: 3,
    escapeTime: 9000,
    spawnWeight: 15,
    escapePenalty: 1,
    escapeSound: "somEscape",
  },
};

class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }
  preload() {
    console.log("Carregando assets...");
    // Imagens
    this.load.image("maguinho", "assets/img/maguinho.webp");
    this.load.image("maguinho2", "assets/img/maguinho2.png");
    this.load.image("magoDourado", "assets/img/mago-nivel-3.png");
    this.load.image("magoFantasma", "assets/img/mago-1-2.png");

    // Audios
    this.load.audio("somTiro", "assets/audio/tiro.mp3");
    this.load.audio("somEscape", "assets/audio/hihi.mp3");
    this.load.audio("somTiroForte", "assets/audio/gun-shoot-ans-reload.mp3");

    // SONS DE MORTE
    const totalDeathSounds = 16;
    for (let i = 1; i <= totalDeathSounds; i++) {
      this.load.audio(`somMorte${i}`, `assets/audio/Maguinho/morte_comum_${i}.mp3`);
    }

    this.load.audio("somVitoria", "assets/audio/award-winners.mp3");
    this.load.audio("somDerrota", "assets/audio/heavy-thunder-sound-effect-no-copyright-338980.mp3");

    this.load.audio("somFantasmaTeleporte", "assets/audio/Maguinho/oh-shit-a-ghost-lightskinmonte-meme-1.mp3");
    this.load.audio("somTeleporte", "assets/audio/dbz-teleport.mp3");
    this.load.audio("somMorteFantasma", "assets/audio/maguinho/taric-oh.mp3");

    this.load.audio("somMorteDourado", "assets/audio/Maguinho/peppino-angry-scream-ear-rape.mp3");

    this.load.audio("somEscape2", "assets/audio/the-simpsons-nelsons-haha.mp3");
    this.load.audio("magoBaleado", "assets/audio/Maguinho/Zé-Wilker-Filho-da-puta (mp3cut.net).mp3");

    // MUSICA DE FUNDO
    this.load.audio("bgMusic", "assets/audio/background-music.mp3");
  }
  create() {
    this.scene.start("MenuScene");
  }
}

class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }
  create() {
    this.input.mouse.disableContextMenu();

    const { width, height } = this.cameras.main;
    this.add.text(width / 2, height * 0.28, "Minigame do Mago", { fontSize: "40px", fill: "#fff" }).setOrigin(0.5);
    const start = this.add
      .text(width / 2, height * 0.45, "Jogar", { fontSize: "28px", backgroundColor: "#8a2be2", padding: { x: 12, y: 8 }, fill: "#fff" })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const instr = this.add
      .text(width / 2, height * 0.58, "Instruções", { fontSize: "18px", fill: "#ddd" })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    start.on("pointerdown", () => this.scene.start("GameScene"));
    instr.on("pointerdown", () => {
      alert("Clique para atirar. Clique direito (ou long-press no mobile) para Tiro Forte.\nEvite que " + "magos escapem.");
    });
  }
}

class PauseScene extends Phaser.Scene {
  constructor() {
    super("PauseScene");
  }
  create() {
    const { width, height } = this.cameras.main;
    this.bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.5).setOrigin(0);
    this.add.text(width / 2, height / 2 - 30, "Pausado", { fontSize: "36px", fill: "#fff" }).setOrigin(0.5);
    const btn = this.add
      .text(width / 2, height / 2 + 30, "Continuar", { fontSize: "20px", backgroundColor: "#fff", padding: { x: 10, y: 6 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    btn.on("pointerdown", () => {
      this.scene.stop();
      this.scene.resume("GameScene");
    });
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.score = 0;
    this.escaped = 0;
    this.winTarget = 50;
    this.escapeLimit = 15;
    this.spawnInterval = 1500;
    this.poolSize = 30;
    this.gameOver = false;
    this.strongReady = true;
    this.strongCooldown = 3000;
    this.longPressThresh = 350;
  }

  create() {
    this.gameOver = false;
    // background
    this.cameras.main.setBackgroundColor("#111111");

    // HUD
    this.scoreText = this.add.text(16, 16, "Magos: 0", { fontSize: "20px", fill: "#fff" });
    this.escapeText = this.add.text(16, 44, `Escaparam: 0 / ${this.escapeLimit}`, { fontSize: "18px", fill: "#ff8a8a" });

    this.cooldownText = this.add
      .text(this.cameras.main.width - 16, 16, "Tiro Forte: PRONTO", { fontSize: "18px", fill: "#0f0" })
      .setOrigin(1, 0);
    this.muteText = this.add
      .text(this.cameras.main.width - 16, 44, "🔊", { fontSize: "18px", fill: "#fff" })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    // music
    try {
      this.bg = this.sound.add("bgMusic", { loop: true, volume: 0.45 });
      this.bg.play();
      this.isMuted = false;
    } catch (e) {
      console.warn("bg missing");
      this.isMuted = true;
      this.muteText.setText("🔈");
    }

    this.muteText.on("pointerdown", () => {
      if (!this.bg) return;
      this.isMuted = !this.isMuted;
      if (this.isMuted) this.bg.pause();
      else this.bg.resume ? this.bg.resume() : this.bg.play();
      this.muteText.setText(this.isMuted ? "🔈" : "🔊");
    });

    // Pause support (keyboard P)
    this.input.keyboard.on("keydown-P", () => this.togglePause());

    // Pool (Group) - create inactive sprites ahead of time
    this.pool = this.add.group({ classType: Phaser.GameObjects.Sprite, maxSize: this.poolSize, runChildUpdate: false });
    for (let i = 0; i < this.poolSize; i++) {
      const s = this.add.sprite(-100, -100, "maguinho").setActive(false).setVisible(false);
      s.setDataEnabled();
      this.pool.add(s);
    }

    // spawn timer
    this.spawnTimer = this.time.addEvent({ delay: this.spawnInterval, callback: this.spawn, callbackScope: this, loop: true });

    // balance panel (simple UI)
    this.createBalancePanel();

    // death sound picker
    this.deathSounds = [];
    for (let i = 1; i <= 8; i++) this.deathSounds.push("somMorte" + i);
  }

  createBalancePanel() {
    const x = this.cameras.main.width - 220;
    const y = this.cameras.main.height - 140;
    // background
    this.panelBg = this.add.rectangle(x, y, 200, 120, 0x222222, 0.7).setOrigin(0);
    this.add.text(x + 10, y + 8, "Balance", { fontSize: "14px", fill: "#fff" });
    // spawn rate slider (text + buttons)
    this.add.text(x + 10, y + 30, "Spawn(ms):", { fontSize: "12px", fill: "#ccc" });
    this.spawnValText = this.add.text(x + 110, y + 30, String(this.spawnInterval), { fontSize: "12px", fill: "#fff" }).setOrigin(1, 0);
    const dec = this.add
      .text(x + 10, y + 52, "-", { fontSize: "18px", backgroundColor: "#fff", padding: { x: 6, y: 2 } })
      .setInteractive({ useHandCursor: true });
    const inc = this.add
      .text(x + 170, y + 52, "+", { fontSize: "18px", backgroundColor: "#fff", padding: { x: 6, y: 2 } })
      .setInteractive({ useHandCursor: true });
    dec.on("pointerdown", () => {
      this.spawnInterval = Math.min(3000, this.spawnInterval + 100);
      this.updateSpawn();
    });
    inc.on("pointerdown", () => {
      this.spawnInterval = Math.max(300, this.spawnInterval - 100);
      this.updateSpawn();
    });

    // pool size adjust
    this.add.text(x + 10, y + 82, "Pool size:", { fontSize: "12px", fill: "#ccc" });
    this.poolText = this.add.text(x + 110, y + 82, String(this.poolSize), { fontSize: "12px", fill: "#fff" }).setOrigin(1, 0);
    const pdec = this.add
      .text(x + 10, y + 104, "-", { fontSize: "14px", backgroundColor: "#fff", padding: { x: 6, y: 2 } })
      .setInteractive({ useHandCursor: true });
    const pinc = this.add
      .text(x + 170, y + 104, "+", { fontSize: "14px", backgroundColor: "#fff", padding: { x: 6, y: 2 } })
      .setInteractive({ useHandCursor: true });
    pdec.on("pointerdown", () => {
      this.poolSize = Math.max(8, this.poolSize - 2);
      this.rebuildPool();
    });
    pinc.on("pointerdown", () => {
      this.poolSize = Math.min(100, this.poolSize + 2);
      this.rebuildPool();
    });
  }

  updateSpawn() {
    if (this.spawnTimer) this.spawnTimer.delay = this.spawnInterval;
    if (this.spawnValText) this.spawnValText.setText(String(this.spawnInterval));
  }

  rebuildPool() {
    // destroy existing inactive extras and add or remove to match poolSize
    const current = this.pool.getLength();
    if (this.poolSize > current) {
      for (let i = 0; i < this.poolSize - current; i++) {
        const s = this.add.sprite(-100, -100, "maguinho").setActive(false).setVisible(false);
        s.setDataEnabled();
        this.pool.add(s);
      }
    } else if (this.poolSize < current) {
      // remove extras (prefers inactive)
      let removed = 0;
      this.pool.getChildren().forEach((child) => {
        if (removed >= current - this.poolSize) return;
        if (!child.active) {
          child.destroy();
          removed++;
        }
      });
    }
    this.poolText.setText(String(this.poolSize));
  }

  spawn() {
    if (this.gameOver) return;
    // get an inactive sprite from pool
    const sprite = this.pool.getFirstDead(false);
    if (!sprite) return; // pool exhausted
    // choose type by weighted random
    const total = Object.values(WIZARD_BASE).reduce((s, w) => s + w.spawnWeight, 0);
    let r = Phaser.Math.Between(1, total);
    let chosen = "comum";
    for (const k of Object.keys(WIZARD_BASE)) {
      const w = WIZARD_BASE[k];
      if (r <= w.spawnWeight) {
        chosen = k;
        break;
      }
      r -= w.spawnWeight;
    }
    const cfg = WIZARD_BASE[chosen];
    // place and activate
    const x = Phaser.Math.Between(80, this.cameras.main.width - 80);
    const y = Phaser.Math.Between(100, this.cameras.main.height - 100);
    sprite.setTexture(cfg.texture);
    sprite.setPosition(x, y);
    const scale = 70 / (sprite.width || 70);
    sprite.setScale(0);
    sprite.setActive(true).setVisible(true).clearTint();
    sprite.setData("type", chosen);
    sprite.setData("health", cfg.health);
    sprite.setData("points", cfg.points);
    sprite.setData("escapeTimer", null);
    sprite.setData("moveTween", null);
    sprite.setData("moveTimer", null);
    sprite.setInteractive({ useHandCursor: true });

    // entry tween
    this.tweens.add({ targets: sprite, scale: scale, alpha: 1, duration: 250, ease: "Power2" });

    // movement depending on type
    if (chosen === "dourado") this.startGoldenMovement(sprite);
    else if (chosen === "fantasma") {
      const mt = this.tweens.add({ targets: sprite, y: sprite.y - 25, alpha: 0.5, duration: 2500, yoyo: true, repeat: -1 });
      sprite.setData("moveTween", mt);
    } else if (chosen === "rapido") this.startFastMovement(sprite);
    else {
      const mt = this.tweens.add({
        targets: sprite,
        x: sprite.x + Phaser.Math.Between(-40, 40),
        y: sprite.y + Phaser.Math.Between(-40, 40),
        duration: Phaser.Math.Between(2000, 4000),
        yoyo: true,
        repeat: -1,
      });
      sprite.setData("moveTween", mt);
    }

    // pointer handlers (long-press support)
    sprite.on("pointerdown", (pointer) => {
      sprite.setData("downAt", this.time.now);
      const isRight = typeof pointer.rightButtonDown === "function" && pointer.rightButtonDown();
      if (isRight) {
        this.attemptStrong(sprite);
        return;
      }
      sprite.setData("downAt", this.time.now);
    });
    sprite.on("pointerup", (pointer) => {
      const downAt = sprite.getData("downAt") || 0;
      const dt = this.time.now - downAt || 0;

      if (pointer.rightButtonDown && pointer.rightButtonDown()) {
        return;
      }

      if (dt >= this.longPressThresh) this.attemptStrong(sprite);
      else {
        this.sound.play("somTiro");
        this.damage(sprite, 1);
      }
      sprite.setData("downAt", 0);
    });

    // escape timer
    const esc = this.time.delayedCall(cfg.escapeTime, () => {
      if (!sprite.active) return;
      try {
        this.sound.play(cfg.escapeSound);
      } catch (e) {}
      this.escaped += cfg.escapePenalty;
      this.escapeText.setText(`Escaparam: ${this.escaped} / ${this.escapeLimit}`);
      this.tweens.add({
        targets: sprite,
        y: sprite.y - 50,
        alpha: 0,
        duration: 450,
        ease: "Power1",
        onComplete: () => this.killSprite(sprite),
      });
      if (this.escaped >= this.escapeLimit) this.endGame(false);
    });
    sprite.setData("escapeTimer", esc);

    // Remover efeitos antigos antes de aplicar novo
    sprite.resetPipeline();

    if (chosen === "dourado") {
      sprite.setTint(0xfff5b0); // tom inicial
      this.tweens.addCounter({
        from: 0,
        to: 100,
        duration: 800,
        yoyo: true,
        repeat: -1,
        onUpdate: (tween) => {
          const value = Math.floor(255 - tween.getValue());
          const color = Phaser.Display.Color.GetColor(255, value, 50);
          sprite.setTint(color);
        },
      });
    } else if (chosen === "fantasma") {
      sprite.setTint(0xb0d9ff); // azul suave
      this.tweens.add({
        targets: sprite,
        alpha: { from: 0.5, to: 1 },
        duration: 800,
        yoyo: true,
        repeat: -1,
      });
    } else if (chosen === "rapido") {
      sprite.setTint(0xffbbbb);
    }
  }

  attemptStrong(sprite) {
    if (!this.strongReady || this.gameOver || !sprite.active) return;
    this.strongReady = false;
    try {
      this.sound.play("somTiroForte");
    } catch (e) {}
    this.damage(sprite, 3);
    this.cooldownText.setText("Tiro Forte: RECARREGANDO...");
    this.cooldownText.setStyle({ color: "#ff0000" });
    this.time.delayedCall(this.strongCooldown, () => {
      this.strongReady = true;
      this.cooldownText.setText("Tiro Forte: PRONTO");
      this.cooldownText.setStyle({ color: "#00ff00" });
    });
  }

  damage(sprite, dmg) {
    if (!sprite.active) return;
    let hp = sprite.getData("health") - dmg;
    sprite.setData("health", hp);
    sprite.setTint(0xff0000);
    this.time.delayedCall(120, () => sprite.clearTint());

    if (hp <= 0) {
      // stop timers/tweens
      const esc = sprite.getData("escapeTimer");
      if (esc && esc.remove) esc.remove();
      const mt = sprite.getData("moveTween");
      if (mt && mt.stop) mt.stop();
      const mT = sprite.getData("moveTimer");
      if (mT && mT.remove) mT.remove();

      // score
      this.score += sprite.getData("points") || 1;
      this.scoreText.setText("Magos: " + this.score);
      // death animation
      const type = sprite.getData("type");
      if (type === "fantasma") {
        try {
          this.sound.play("somMorte1");
        } catch (e) {}
        this.tweens.add({ targets: sprite, alpha: 0, y: sprite.y - 80, duration: 700, onComplete: () => this.killSprite(sprite) });
      } else {
        try {
          this.sound.play(Phaser.Utils.Array.GetRandom(this.deathSounds));
        } catch (e) {}
        this.tweens.add({ targets: sprite, scale: 0, angle: 360, duration: 400, onComplete: () => this.killSprite(sprite) });
      }

      if (this.score >= this.winTarget) this.endGame(true);
    } else {
      // survived behaviour
      const type = sprite.getData("type");
      if (type === "fantasma") {
        sprite.disableInteractive();
        try {
          this.sound.play("somTeleporte");
        } catch (e) {}
        if (sprite.getData("moveTween")) sprite.getData("moveTween").stop();
        this.tweens.add({
          targets: sprite,
          scale: 0,
          alpha: 0,
          duration: 150,
          onComplete: () => {
            if (!sprite.active) return;
            sprite.setPosition(
              Phaser.Math.Between(80, this.cameras.main.width - 80),
              Phaser.Math.Between(100, this.cameras.main.height - 100)
            );
            this.tweens.add({
              targets: sprite,
              scale: 70 / (sprite.width || 70),
              alpha: 0.6,
              duration: 150,
              onComplete: () => {
                sprite.setInteractive({ useHandCursor: true });
                const mt = this.tweens.add({ targets: sprite, y: sprite.y - 25, alpha: 0.4, duration: 2500, yoyo: true, repeat: -1 });
                sprite.setData("moveTween", mt);
              },
            });
          },
        });
      } else if (type === "rapido") {
        sprite.disableInteractive();
        try {
          this.sound.play("magoBaleado");
        } catch (e) {}
        if (sprite.getData("moveTween")) sprite.getData("moveTween").stop();
        this.tweens.add({
          targets: sprite,
          scaleX: sprite.scaleX * 1.2,
          scaleY: sprite.scaleY * 0.8,
          alpha: 0.5,
          duration: 100,
          yoyo: true,
          onComplete: () => {
            this.tweens.add({
              targets: sprite,
              x: Phaser.Math.Between(80, this.cameras.main.width - 80),
              y: Phaser.Math.Between(100, this.cameras.main.height - 100),
              duration: 150,
              onComplete: () => {
                sprite.setInteractive({ useHandCursor: true });
                this.startFastMovement(sprite);
              },
            });
          },
        });
      } else {
        this.tweens.add({
          targets: sprite,
          x: sprite.x + Phaser.Math.Between(-10, 10),
          y: sprite.y + Phaser.Math.Between(-10, 10),
          duration: 50,
          yoyo: true,
        });
      }
    }
  }

  startGoldenMovement(sprite) {
    if (!sprite.active) return;
    const prev = sprite.getData("moveTimer");
    if (prev && prev.remove) prev.remove();
    const nx = Phaser.Math.Between(80, this.cameras.main.width - 80);
    const ny = Phaser.Math.Between(100, this.cameras.main.height - 100);
    const tween = this.tweens.add({
      targets: sprite,
      x: nx,
      y: ny,
      duration: Phaser.Math.Between(300, 600),
      ease: "Cubic.easeInOut",
      onComplete: () => {
        const d = Phaser.Math.Between(500, 1500);
        const t = this.time.delayedCall(d, () => this.startGoldenMovement(sprite));
        sprite.setData("moveTimer", t);
      },
    });
    sprite.setData("moveTween", tween);
  }

  startFastMovement(sprite) {
    if (!sprite.active) return;
    if (sprite.getData("moveTween") && sprite.getData("moveTween").stop) sprite.getData("moveTween").stop();
    const tween = this.tweens.add({
      targets: sprite,
      x: sprite.x + Phaser.Math.Between(-60, 60),
      y: sprite.y + Phaser.Math.Between(-60, 60),
      duration: Phaser.Math.Between(800, 1400),
      yoyo: true,
      repeat: -1,
    });
    sprite.setData("moveTween", tween);
  }

  killSprite(sprite) {
    // deactivate and hide for reuse in pool
    try {
      if (sprite.getData("escapeTimer") && sprite.getData("escapeTimer").remove) sprite.getData("escapeTimer").remove();
    } catch (e) {}
    try {
      if (sprite.getData("moveTween") && sprite.getData("moveTween").stop) sprite.getData("moveTween").stop();
    } catch (e) {}
    try {
      if (sprite.getData("moveTimer") && sprite.getData("moveTimer").remove) sprite.getData("moveTimer").remove();
    } catch (e) {}
    sprite.removeAllListeners();
    sprite.disableInteractive();
    sprite.setActive(false).setVisible(false);
    sprite.setPosition(-100, -100);
  }

  togglePause() {
    if (this.gameOver) return;
    this.scene.launch("PauseScene");
    this.scene.pause();
  }

  endGame(win) {
    if (this.gameOver) return;
    this.gameOver = true;
    // stop spawn
    if (this.spawnTimer) {
      try {
        this.spawnTimer.remove();
      } catch (e) {}
      this.spawnTimer = null;
    }
    // kill tweens and pending
    try {
      this.tweens.killAll();
      this.time.clearPendingEvents();
    } catch (e) {}
    // deactivate all sprites in pool
    this.pool.getChildren().forEach((s) => {
      try {
        this.killSprite(s);
      } catch (e) {}
    });
    // stop music
    if (this.bg)
      try {
        this.bg.stop();
      } catch (e) {}
    // show message
    const w = this.cameras.main.width,
      h = this.cameras.main.height;
    const msg = win ? `Você venceu!\nMagos: ${this.score}` : `Você perdeu\nEscaparam: ${this.escaped}`;
    this.add.rectangle(w / 2, h / 2, Math.min(w - 40, 600), 150, 0x000000, 0.7).setOrigin(0.5);
    this.add.text(w / 2, h / 2 - 18, msg, { fontSize: "28px", fill: "#fff", align: "center" }).setOrigin(0.5);
    const again = this.add
      .text(w / 2, h / 2 + 40, "Jogar novamente", { fontSize: "20px", backgroundColor: "#fff", padding: { x: 10, y: 6 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    again.on("pointerdown", () => {
      this.scene.restart();
      this.scene.stop();
    });
  }

  resize(width, height) {
    // optional: reposition HUD
    if (this.cooldownText) this.cooldownText.setPosition(width - 16, 16);
    if (this.muteText) this.muteText.setPosition(width - 16, 44);
  }
}

const cfg = {
  type: Phaser.WEBGL,
  parent: "game-container",
  width: window.innerWidth,
  height: window.innerHeight,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  backgroundColor: "#111111",
  scene: [BootScene, MenuScene, GameScene, PauseScene],
};

const game = new Phaser.Game(cfg);

// handle window resize
window.addEventListener("resize", () => {
  try {
    game.scale.resize(window.innerWidth, window.innerHeight);
    const s = game.scene.getScene("GameScene");
    if (s && s.resize) s.resize(window.innerWidth, window.innerHeight);
  } catch (e) {}
});
