const WIZARD_CONFIG = {
  comum: {
    texture: "maguinho",
    health: 1,
    points: 1,
    escapeTime: 5000,
    spawnChance: 0.65,
    escapePenalty: 1,
    escapeSound: "somEscape",
  },
  rapido: {
    texture: "maguinho2",
    health: 2,
    points: 2,
    escapeTime: 6000,
    spawnChance: 0.2,
    escapePenalty: 2, // Penalidade de 2 escapes
    escapeSound: "somEscapeRapido",
  },
  dourado: {
    texture: "magoDourado",
    health: 3,
    points: 5,
    escapeTime: 7000,
    spawnChance: 0.1,
    escapePenalty: 1,
    escapeSound: "somEscape",
  },
  fantasma: {
    texture: "magoFantasma",
    health: 4,
    points: 3,
    escapeTime: 9000,
    spawnChance: 0.15,
    escapePenalty: 1,
    escapeSound: "somEscape",
  },
};

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
    this.score = 0;
    this.escapedWizards = 0;
    this.metaDeMagos = 50;
    this.limiteDeEscapes = 15;
  }

  preload() {
    console.log("Carregando assets...");
    // Carrega as imagens
    this.load.image("maguinho", "assets/img/maguinho.webp");
    this.load.image("maguinho2", "assets/img/maguinho2.png");
    this.load.image("magoDourado", "assets/img/mago-nivel-3.png");
    this.load.image("magoFantasma", "assets/img/mago-1-2.png");

    // Carrega os audios
    this.load.audio("somTiro", "assets/audio/tiro.mp3");
    this.load.audio("somEscape", "assets/audio/hihi.mp3");

    // SONS DE MORTE MAGUINHO COMUM
    const totalDeathSounds = 16;
    for (let i = 1; i <= totalDeathSounds; i++) {
      this.load.audio(`somMorte${i}`, `assets/audio/Maguinho/morte_comum_${i}.mp3`);
    }

    // SONS DE VITORIA E DERROTA
    this.load.audio("somVitoria", "assets/audio/award-winners.mp3");
    this.load.audio("somDerrota", "assets/audio/heavy-thunder-sound-effect-no-copyright-338980.mp3");

    // SONS DE FANTASMA E TELEPORTE
    this.load.audio("somFantasmaTeleporte", "assets/audio/Maguinho/oh-shit-a-ghost-lightskinmonte-meme-1.mp3");
    this.load.audio("somTeleporte", "assets/audio/dbz-teleport.mp3");
    this.load.audio("somMorteFantasma", "assets/audio/maguinho/taric-oh.mp3");

    // SONS MAGUINHO DOURADO
    this.load.audio("somMorteDourado", "assets/audio/Maguinho/peppino-angry-scream-ear-rape.mp3");

    // SONS MAGUINHO2
    this.load.audio("somEscape2", "assets/audio/the-simpsons-nelsons-haha.mp3");
    this.load.audio("magoBaleado", "assets/audio/Maguinho/Zé-Wilker-Filho-da-puta (mp3cut.net).mp3");
  }

  create() {
    // ... (seu código do create continua o mesmo, está ótimo)
    console.log("Cena criada com sucesso!");
    // CRIACAO DE TEXTOS
    this.scoreText = this.add.text(20, 20, "Magos expurgados: 0", {
      fontSize: "32px",
      fill: "#fff",
      fontFamily: "Georgia, Arial, sans-serif",
    });
    this.escapesText = this.add.text(20, 50, `Escaparam: 0 / ${this.limiteDeEscapes}`, {
      fontSize: "30px",
      fill: "#ff8a8a",
      fontFamily: "Georgia, Arial, sans-serif",
    });
    this.metaText = this.add.text(20, 80, `Meta: ${this.metaDeMagos}`, {
      fontSize: "30px",
      fill: "#ddd",
      fontFamily: "Georgia, Arial, sans-serif",
    });

    // TIMER DE CRIACAO DE MAGOS
    this.spawnTimer = this.time.addEvent({
      delay: 1500,
      callback: this.spawnWizard,
      callbackScope: this,
      loop: true,
    });

    // ARRAY DE SONS DE MORTE
    this.sonsDeMorteComum = [
      "somMorte1",
      "somMorte2",
      "somMorte3",
      "somMorte4",
      "somMorte5",
      "somMorte6",
      "somMorte7",
      "somMorte8",
      "somMorte9",
      "somMorte10",
      "somMorte11",
      "somMorte12",
      "somMorte13",
      "somMorte14",
      "somMorte15",
      "somMorte16",
    ];
  }

  spawnWizard() {
    const x = Phaser.Math.Between(100, this.game.config.width - 100);
    const y = Phaser.Math.Between(100, this.game.config.height - 100);

    const chance = Math.random();
    let wizardTypeKey;

    if (chance < WIZARD_CONFIG.dourado.spawnChance) {
      wizardTypeKey = "dourado";
    } else if (chance < WIZARD_CONFIG.dourado.spawnChance + WIZARD_CONFIG.fantasma.spawnChance) {
      wizardTypeKey = "fantasma";
    } else if (chance < WIZARD_CONFIG.dourado.spawnChance + WIZARD_CONFIG.fantasma.spawnChance + WIZARD_CONFIG.rapido.spawnChance) {
      wizardTypeKey = "rapido";
    } else {
      wizardTypeKey = "comum";
    }

    const config = WIZARD_CONFIG[wizardTypeKey];
    const wizard = this.add.sprite(x, y, config.texture);
    const larguraPadrao = 70;

    wizard.displayWidth = larguraPadrao;
    wizard.scaleY = wizard.scaleX;
    wizard.setInteractive({ useHandCursor: true });

    wizard.setData({
      health: config.health,
      points: config.points,
      type: wizardTypeKey,
      foiAtingido: false,
      isDying: false,
    });

    wizard.setAlpha(0);
    wizard.displayWidth = 0;

    this.tweens.add({
      targets: wizard,
      alpha: wizardTypeKey === "fantasma" ? 0.6 : 1,
      displayWidth: larguraPadrao,
      duration: 300,
      ease: "Power2",

      onComplete: () => {
        if (!wizard.active || wizard.getData("isDying")) {
          return;
        }

        if (wizardTypeKey === "dourado") {
          if (wizard.postFX) {
            wizard.postFX.addGlow(0xffd700, 2, 0);
          }

          this.iniciarMovimentoDourado(wizard);
        } else if (wizardTypeKey === "fantasma") {
          if (wizard.postFX) {
            wizard.postFX.addGlow(0x88ffff, 2, 0);
          }
          const moveTween = this.tweens.add({
            targets: wizard,
            y: wizard.y - 25,
            alpha: 0.4,
            duration: 2500,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
          wizard.setData("moveTween", moveTween);
        } else if (wizardTypeKey === "rapido") {
          this.iniciarMovimentoRapido(wizard);
        } else {
          const moveTween = this.tweens.add({
            targets: wizard,
            x: wizard.x + Phaser.Math.Between(-40, 40),
            y: wizard.y + Phaser.Math.Between(-40, 40),
            duration: Phaser.Math.Between(2000, 4000),
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
          wizard.setData("moveTween", moveTween);
        }
      },
    });

    // LOGICA DE CLIQUE NO MAGO
    wizard.on("pointerdown", () => {
      if (!wizard.active || wizard.getData("isDying")) {
        return;
      }

      this.sound.play("somTiro");

      let currentHealth = wizard.getData("health") - 1;
      wizard.setData("health", currentHealth);

      // --- VERIFICAÇÃO DE MORTE PRIMEIRO ---
      if (currentHealth > 0) {
        wizard.setTint(0xff0000);
        this.time.delayedCall(100, () => {
          wizard.clearTint();
        });
      }

      if (currentHealth <= 0) {
        wizard.setData("isDying", true);
        wizard.disableInteractive();

        if (wizard.escapeTimer) {
          wizard.escapeTimer.remove();
        }

        if (wizard.getData("moveTween")) wizard.getData("moveTween").stop();
        if (wizard.getData("moveTimer")) wizard.getData("moveTimer").remove();

        this.score += wizard.getData("points");
        this.scoreText.setText(`Magos expurgados: ${this.score}`);

        if (this.score > 0 && this.score % 10 === 0) {
          const newDelay = Math.max(700, this.spawnTimer.delay - 100);
          this.spawnTimer.delay = newDelay;
          console.log("Dificuldade aumentada! Novo delay de spawn:", newDelay);
        }

        if (wizard.getData("type") === "fantasma") {
          this.sound.play("somMorteFantasma", { volume: 0.5 });
          this.tweens.add({
            targets: wizard,
            alpha: 0,
            y: wizard.y - 80,
            duration: 800,
            ease: "Cubic.easeOut",
            onComplete: () => {
              wizard.destroy();
            },
          });
        } else if (wizard.getData("type") === "dourado") {
          this.sound.play("somMorteDourado", { volume: 0.7 });

          this.tweens.add({
            targets: wizard,
            scale: wizard.scale * 1.5,
            alpha: 0,
            angle: 720,
            duration: 500,
            ease: "Cubic.easeOut",
            onComplete: () => {
              wizard.destroy();
            },
          });
        } else {
          const somAleatorio = Phaser.Math.RND.pick(this.sonsDeMorteComum);
          this.sound.play(somAleatorio, { volume: 0.7 });

          this.tweens.add({
            targets: wizard,
            scale: 0,
            angle: 360,
            duration: 400,
            ease: "Power2",
            onComplete: () => {
              wizard.destroy();
            },
          });
        }

        if (this.score >= this.metaDeMagos) {
          this.endGame(true);
        }
      } else if (wizard.getData("type") === "fantasma") {
        wizard.disableInteractive();

        if (!wizard.getData("foiAtingido")) {
          this.sound.play("somFantasmaTeleporte", { volume: 0.5 });
          wizard.setData("foiAtingido", true);
        }
        this.sound.play("somTeleporte", { volume: 0.5 });
        if (wizard.getData("moveTween")) {
          wizard.getData("moveTween").stop();
        }
        const originalScale = wizard.scale;
        this.tweens.add({
          targets: wizard,
          scale: 0,
          alpha: 0,
          angle: -360,
          duration: 150,
          ease: "Cubic.easeIn",
          onComplete: () => {
            const newX = Phaser.Math.Between(100, this.game.config.width - 100);
            const newY = Phaser.Math.Between(100, this.game.config.height - 100);
            wizard.setPosition(newX, newY);
            this.tweens.add({
              targets: wizard,
              scale: originalScale,
              alpha: 0.6,
              angle: 0,
              duration: 150,
              ease: "Cubic.easeOut",
              onComplete: () => {
                wizard.setInteractive({ useHandCursor: true });
                const moveTween = this.tweens.add({
                  targets: wizard,
                  y: wizard.y - 25,
                  alpha: 0.4,
                  duration: 2500,
                  ease: "sine.inOut",
                  yoyo: true,
                  repeat: -1,
                });
                wizard.setData("moveTween", moveTween);
              },
            });
          },
        });
      } else if (wizard.getData("type") === "rapido" && !wizard.getData("foiAtingido")) {
        if (wizard.getData("moveTween")) wizard.getData("moveTween").stop();

        this.sound.play("magoBaleado", { volume: 0.8 });
        wizard.setData("foiAtingido", true);
        wizard.disableInteractive();
        this.tweens.add({
          targets: wizard,
          scaleX: wizard.scaleX * 1.2, // Efeito de "esticar"
          scaleY: wizard.scaleY * 0.8,
          alpha: 0.5,
          duration: 100,
          yoyo: true, // Volta ao normal
          onComplete: () => {
            const newX = Phaser.Math.Between(100, this.game.config.width - 100);
            const newY = Phaser.Math.Between(100, this.game.config.height - 100);

            // Mova para a nova posição MUITO rápido
            this.tweens.add({
              targets: wizard,
              x: newX,
              y: newY,
              duration: 150, // Duração da esquiva
              ease: "Quad.easeOut",
              onComplete: () => {
                // Ao terminar a esquiva, reative e continue o movimento
                wizard.setInteractive({ useHandCursor: true });
                this.iniciarMovimentoRapido(wizard); // Reinicia o padrão de movimento
              },
            });
          },
        });
      } else {
        this.tweens.add({
          targets: wizard,
          x: wizard.x + Phaser.Math.Between(-10, 10),
          y: wizard.y + Phaser.Math.Between(-10, 10),
          duration: 50,
          yoyo: true,
          ease: "Power1",
        });
      }
    });

    // TIMER DE ESCAPE
    wizard.escapeTimer = this.time.delayedCall(config.escapeTime, () => {
      if (wizard.active) {
        this.sound.play(config.escapeSound, { volume: 0.9 });

        this.escapedWizards += config.escapePenalty;

        this.escapesText.setText(`Escaparam: ${this.escapedWizards} / ${this.limiteDeEscapes}`);

        this.tweens.add({
          targets: wizard,
          y: y - 50,
          alpha: 0,
          duration: 500,
          ease: "Power1",
          onComplete: () => {
            wizard.destroy();
          },
        });
        if (this.escapedWizards >= this.limiteDeEscapes) {
          this.endGame(false);
        }
      }
    });
  }

  iniciarMovimentoDourado(wizard) {
    if (!wizard.active || wizard.getData("isDying")) {
      return;
    }

    const newX = Phaser.Math.Between(100, this.game.config.width - 100);
    const newY = Phaser.Math.Between(100, this.game.config.height - 100);
    const duration = Phaser.Math.Between(300, 600);

    const moveTween = this.tweens.add({
      targets: wizard,
      x: newX,
      y: newY,
      duration: duration,
      ease: "Cubic.easeInOut",
      onComplete: () => {
        const delay = Phaser.Math.Between(500, 1500);
        const timer = this.time.delayedCall(delay, () => {
          this.iniciarMovimentoDourado(wizard);
        });
        wizard.setData("moveTimer", timer);
      },
    });

    wizard.setData("moveTimer", moveTween);
  }

  iniciarMovimentoRapido(wizard) {
    if (!wizard.active || wizard.getData("isDying")) {
      return;
    }

    const moveTween = this.tweens.add({
      targets: wizard,
      x: wizard.x + Phaser.Math.Between(-60, 60),
      y: wizard.y + Phaser.Math.Between(-60, 60),
      duration: Phaser.Math.Between(1000, 2000),
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
    wizard.setData("moveTween", moveTween);
  }

  endGame(playerWon) {
    this.spawnTimer.remove(); // Para de criar magos

    // Itera sobre todos os objetos da cena
    this.children.each((child) => {
      // Garante que estamos lidando com um sprite que tenha o timer
      if (child.type === "Sprite" && child.escapeTimer) {
        // --- A CORREÇÃO ESTÁ AQUI ---
        // Remove o timer de escape pendente antes de destruir o sprite.
        child.escapeTimer.remove();

        child.destroy(); // Destrói o mago restante
      }
    });

    let message = "";
    if (playerWon) {
      this.sound.play("somVitoria", { volume: 0.7 });
      message = `Você venceu! Magos expurgados: ${this.score}`;
    } else {
      this.sound.play("somDerrota", { volume: 0.7 });
      message = `Você perdeu! Magos escaparam: ${this.escapedWizards}`;
    }

    // Exibe mensagem final
    const endText = this.add
      .text(this.game.config.width / 2, this.game.config.height / 2, message, {
        fontSize: "64px",
        fill: "#fff",
        fontFamily: "Georgia, Arial, sans-serif",
        align: "center",
      })
      .setOrigin(0.5);

    // ADICIONA UM BOTAO PARA REINICIAR O JOGO
    const restartButton = this.add
      .text(
        this.game.config.width / 2,
        this.game.config.height / 2 + 100,
        // CORREÇÃO de digitação no botão
        "Jogar novamente",
        {
          fontSize: "32px",
          fill: "#8a2be2",
          fontFamily: "Georgia, Arial, sans-serif",
          backgroundColor: "#fff",
          padding: { x: 10, y: 5 },
        }
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.score = 0;
        this.escapedWizards = 0;
        this.scene.restart();
      });
  }
}

// CONFIGURACOES GERAIS DO JOGO
const config = {
  type: Phaser.WEBGL,
  width: window.innerWidth,
  height: window.innerHeight,
  scale: {
    mode: Phaser.Scale.FIT, // Ajusta o jogo para caber na tela mantendo a proporção
    autoCenter: Phaser.Scale.CENTER_BOTH, // Centraliza o jogo na tela
  },
  backgroundColor: "#111111",
  scene: [GameScene],
};

// CRIA A ESTANCIA DO JOGO
const game = new Phaser.Game(config);
