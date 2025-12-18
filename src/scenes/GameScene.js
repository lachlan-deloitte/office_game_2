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

    // Bullets - use a proper group with recycling
    this.bullets = this.physics.add.group({
      defaultKey: null,
      maxSize: 30,
      runChildUpdate: false
    });

    this.shootKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    // Bullet → Enemy collision
    this.physics.add.overlap(
      this.bullets,
      this.enemies,
      this.bulletHitEnemy,
      null,
      this
    );

    // Energy system
    this.maxEnergy = 100;
    this.energy = 100;
    this.recharging = false;
    this.rechargeKey = this.input.keyboard.addKey("E");

    // Simple UI
    this.energyBarBg = this.add.rectangle(20, 20, 52, 6, 0x222222).setScrollFactor(0).setDepth(100);
    this.energyBar = this.add.rectangle(20, 20, 50, 4, 0x00ff88).setScrollFactor(0).setDepth(101);

    // Player speed
    this.baseSpeed = 120;
    this.speedBoost = 0;

    // Shooting cooldown
    this.lastShotTime = 0;
    this.shotCooldown = 150; // ms between shots
  }

  update(time) {
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

    // Shooting with cooldown
    if (
      Phaser.Input.Keyboard.JustDown(this.shootKey) && 
      this.energy >= 10 &&
      time > this.lastShotTime + this.shotCooldown
    ) {
      this.fireBullet();
      this.energy -= 10;
      this.lastShotTime = time;
    }

    // Update energy UI
    const pct = this.energy / this.maxEnergy;
    this.energyBar.width = 50 * pct;

    // Sync player graphic
    this.playerGfx.setPosition(this.player.x, this.player.y);

    // Reset recharge flag each frame
    this.recharging = false;

    // Enemy AI (follow player) - optimized
    this.enemies.children.entries.forEach(enemy => {
      if (!enemy || !enemy.active) return;

      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 4) {
        const vx = (dx / dist) * enemy.speed;
        const vy = (dy / dist) * enemy.speed;
        enemy.body.setVelocity(vx, vy);
      } else {
        enemy.body.setVelocity(0, 0);
      }

      // Sync graphics
      if (enemy.gfx) {
        enemy.gfx.setPosition(enemy.x, enemy.y);
      }
    });
  }

  onRecharge() {
    this.recharging = true;
  }

  onPowerUp(player, station) {
    this.speedBoost = 80;
    if (station.gfx) station.gfx.destroy();
    station.destroy();
  }

  spawnEnemy(x, y) {
    const enemy = this.physics.add.sprite(x, y, null);
    enemy.setSize(12, 12);
    enemy.speed = 30;
    enemy.body.setCollideWorldBounds(true);

    // Visual
    enemy.gfx = this.add.rectangle(x, y, 12, 12, 0xff5555);
    enemy.gfx.setDepth(5);

    this.enemies.add(enemy);
  }

  fireBullet() {
    // Create bullet sprite
    const bullet = this.add.circle(this.player.x, this.player.y, 3, 0xffff00);
    bullet.setDepth(8);
    
    // Add physics
    this.physics.world.enable(bullet);
    this.bullets.add(bullet);

    // Calculate direction to mouse
    const pointer = this.input.activePointer;
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;
    
    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      worldX,
      worldY
    );

    const speed = 400;
    bullet.body.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );

    // Set circle body size
    bullet.body.setCircle(3);

    // Auto-destroy after 1 second
    this.time.delayedCall(1000, () => {
      if (bullet && bullet.active) {
        bullet.destroy();
      }
    });
  }

  bulletHitEnemy(bullet, enemy) {
    // Destroy bullet
    if (bullet) bullet.destroy();
    
    // Destroy enemy and its graphics
    if (enemy) {
      if (enemy.gfx) enemy.gfx.destroy();
      enemy.destroy();
    }
  }
}