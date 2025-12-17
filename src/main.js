import GameScene from "./scenes/GameScene.js";

const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  backgroundColor: "#2d2d2d",
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: {
      debug: false
    }
  },
  scene: [GameScene]
};

new Phaser.Game(config);
