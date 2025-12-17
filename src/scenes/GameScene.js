export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image("player", "assets/sprites/player.png");
    this.load.image("station", "assets/sprites/station.png");
  }

  create() {
    // Player
    this.player = this.physics.add.sprite(400, 300, "player");
    this.player.setCollideWorldBounds(true);

    // Camera
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(2);

    // Recharge station
    this.station = this.physics.add.staticSprite(500, 300, "station");

    // Stats
    this.energy = 100;
    this.maxEnergy = 100;
    this.recharging = false;

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.rechargeKey = this.input.keyboard.addKey("E");

    // Overlap detection
    this.physics.add.overlap(
      this.player,
      this.station,
      () => {
        this.recharging = true;
      }
    );
  }

  update() {
    const speed = 120;
    this.player.setVelocity(0);

    if (this.cursors.left.isDown) this.player.setVelocityX(-speed);
    if (this.cursors.right.isDown) this.player.setVelocityX(speed);
    if (this.cursors.up.isDown) this.player.setVelocityY(-speed);
    if (this.cursors.down.isDown) this.player.setVelocityY(speed);

    // Recharge mechanic
    if (this.recharging && this.rechargeKey.isDown) {
      this.energy = Math.min(this.energy + 0.5, this.maxEnergy);
    }

    if (!this.physics.overlap(this.player, this.station)) {
      this.recharging = false;
    }
  }
}
