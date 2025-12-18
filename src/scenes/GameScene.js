import MapLoader from "../map/MapLoader.js";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    // MapLoader handles map images
    this.mapLoader = new MapLoader(this);
    this.mapLoader.preload();
  }

  create() {
    // Build the map
    this.mapLoader.build();

    // Player
    this.player = this.physics.add.sprite(64, 64, null);
    this.player.setSize(12, 12);
    this.player.setOffset(2, 2);
    this.player.body.setCollideWorldBounds(true);

    // Draw player placeholder
    this.playerGfx = this.add.rectangle(
      this.player.x,
      this.player.y,
      12,
      12,
      0x4aa3ff
    );
    this.playerGfx.setDepth(10);

    // Camera
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(2);

    // Movement input
    this.cursors = this.input.keyboard.createCursorKeys();

    // Collisions
    this.physics.add.collider(this.player, this.mapLoader.walls);
    this.physics.add.collider(this.player, this.mapLoader.furniture);

    // Overlaps
    this.physics.add.overlap(
      this.player,
      this.mapLoader.stations,
      this.onRecharge,
      null,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.mapLoader.powerStations,
      this.onPowerUp,
      null,
      this
    );

    // Enemies
    this.enemies = this.physics.add.group();
    this.spawnEnemy(200, 200);
    this.spawnEnemy(400, 300);
    this.spawnEnemy(600, 150);

    // Enemy collision
    this.physics.add.collider(this.enemies, this.mapLoader.walls);
    this.physics.add.collider(this.enemies, this.mapLoader.furniture);

    // Bullets
    this.bullets = this.physics.add.group();
    this.shootKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    // Bullet → Enemy collision (added once!)
    this.physics.add.overlap(
      this.bullets,
      this.enemies,
      (bullet, enemy) => {
        bullet.destroy();
        enemy.gfx.destroy();
        enemy.destroy();
      }
    );

    // Energy system
    this.maxEnergy = 100;
    this.energy = 100;
    this.recharging = false;
    this.rechargeKey = this.input.keyboard.addKey("E");

    // Simple UI
    this.energyBarBg = this.add.rectangle(20, 20, 52, 6, 0x222222).setScrollFactor(0);
    this.energyBar = this.add.rectangle(20, 20, 50, 4, 0x00ff88).setScrollFactor(0);

    // Player speed
    this.baseSpeed = 120;
    this.speedBoost = 0;
  }

  update() {
    // Player movement
    const speed = this.baseSpeed + this.speedBoost;
    this.player.setVelocity(0);

    if (this.cursors.left.isDown) this.player.setVelocityX(-speed);
    if (this.cursors.right.isDown) this.player.setVelocityX(speed);
    if (this.cursors.up.isDown) this.player.setVelocityY(-speed);
    if (this.cursors.down.isDown) this.player.setVelocityY(speed);

    // Recharge mechanic
    if (this.recharging && this.rechargeKey.isDown) {
      this.energy = Math.min(this.energy + 0.5, this.maxEnergy);
    }

    // Shooting
    if (Phaser.Input.Keyboard.JustDown(this.shootKey) && this.energy >= 10) {
      this.fireBullet();
      this.energy -= 10;
    }

    // Update energy UI
    const pct = this.energy / this.maxEnergy;
    this.energyBar.width = 50 * pct;

    // Sync player graphic
    this.playerGfx.setPosition(this.player.x, this.player.y);

    // Reset recharge flag each frame (overlap sets it)
    this.recharging = false;

    // Enemy AI (follow player)
    this.enemies.children.iterate(enemy => {
      if (!enemy) return;

      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 4) {
        enemy.body.setVelocity(
          (dx / dist) * enemy.speed,
          (dy / dist) * enemy.speed
        );
      } else {
        enemy.body.setVelocity(0);
      }

      enemy.gfx.setPosition(enemy.x, enemy.y);
    });
  }

  onRecharge() {
    this.recharging = true;
  }

  onPowerUp(player, station) {
    this.speedBoost = 80; // Increase speed
    station.destroy();
  }

  spawnEnemy(x, y) {
    const enemy = this.physics.add.sprite(x, y, null);
    enemy.setSize(12, 12);
    enemy.speed = 30;

    // Visual
    enemy.gfx = this.add.rectangle(x, y, 12, 12, 0xff5555);

    this.enemies.add(enemy);
  }

  fireBullet() {
    const bullet = this.physics.add.circle(
      this.player.x,
      this.player.y,
      2,
      0xffffff
    );

    const pointer = this.input.activePointer;
    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      pointer.worldX,
      pointer.worldY
    );

    const speed = 300;
    bullet.body.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );

    this.bullets.add(bullet);

    // Auto-destroy
    this.time.delayedCall(800, () => bullet.destroy());
  }
}
