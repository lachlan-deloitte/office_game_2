export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image("player", "assets/sprites/player.png");
    this.load.image("station", "assets/sprites/station.png");
    this.load.image("projectile", "assets/sprites/slide.png");
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

    // Weapon stats
    this.maxEnergy = 100;
    this.energy = this.maxEnergy;
    this.energyCost = 10;
    this.fireCooldown = 300;
    this.lastFired = 0;

    // Projectiles
    this.projectiles = this.physics.add.group({
      defaultKey: "projectile",
      maxSize: 20
    });

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.rechargeKey = this.input.keyboard.addKey("E");

    // Energy bar UI
    this.energyBarBg = this.add.rectangle(20, 20, 104, 10, 0x000000).setScrollFactor(0);
    this.energyBar = this.add.rectangle(22, 20, 100, 6, 0x00ff00).setOrigin(0, 0.5).setScrollFactor(0);

    // Overlap for recharge
    this.physics.add.overlap(this.player, this.station, () => {
      if (this.rechargeKey.isDown) {
        this.energy = Math.min(this.energy + 0.7, this.maxEnergy);
      }
    });
  }

  update(time) {
    const speed = 120;
    this.player.setVelocity(0);

    if (this.cursors.left.isDown) this.player.setVelocityX(-speed);
    if (this.cursors.right.isDown) this.player.setVelocityX(speed);
    if (this.cursors.up.isDown) this.player.setVelocityY(-speed);
    if (this.cursors.down.isDown) this.player.setVelocityY(speed);

    // Fire weapon
    if (
      this.fireKey.isDown &&
      time > this.lastFired &&
      this.energy >= this.energyCost
    ) {
      this.fireProjectile();
      this.energy -= this.energyCost;
      this.lastFired = time + this.fireCooldown;
    }

    // Update energy bar
    this.energyBar.width = (this.energy / this.maxEnergy) * 100;
    this.energyBar.fillColor = this.energy < 30 ? 0xff0000 : 0x00ff00;
  }

  fireProjectile() {
    const projectile = this.projectiles.get(
      this.player.x,
      this.player.y
    );

    if (!projectile) return;

    projectile.setActive(true);
    projectile.setVisible(true);

    projectile.body.reset(this.player.x, this.player.y);
    projectile.setVelocityY(-300);

    this.cameras.main.shake(60, 0.005);

    this.time.delayedCall(1000, () => {
      projectile.setActive(false);
      projectile.setVisible(false);
    });
  }
}
