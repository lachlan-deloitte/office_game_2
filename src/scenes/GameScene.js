export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    // No map loader needed anymore!
  }

  create() {
    // Set world bounds
    this.physics.world.setBounds(0, 0, 800, 600);

    // Game state
    this.isGameOver = false;
    this.score = 0;
    this.wave = 1;
    this.enemiesKilled = 0;
    this.enemiesPerWave = 3;

    // Create simple placeholder map
    this.createMap();

    // Player
    this.player = this.physics.add.sprite(400, 300, null);
    this.player.setSize(12, 12);
    this.player.setOffset(2, 2);
    this.player.body.setCollideWorldBounds(true);
    this.playerHealth = 100;
    this.maxHealth = 100;
    this.isInvulnerable = false;
    
    // Player facing direction
    this.playerFacingAngle = 0;

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
    this.cameras.main.setBackgroundColor('#1a1a1a');

    // Movement input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard.addKey('W'),
      down: this.input.keyboard.addKey('S'),
      left: this.input.keyboard.addKey('A'),
      right: this.input.keyboard.addKey('D')
    };

    // Collisions with walls
    this.physics.add.collider(this.player, this.walls);

    // Recharge stations
    this.rechargeStations = this.physics.add.staticGroup();
    this.createRechargeStation(300, 200);
    this.createRechargeStation(500, 400);

    // Health pickups
    this.healthPickups = this.physics.add.group();

    // Overlaps with recharge stations
    this.physics.add.overlap(
      this.player,
      this.rechargeStations,
      this.onRecharge,
      null,
      this
    );

    // Health pickup overlap
    this.physics.add.overlap(
      this.player,
      this.healthPickups,
      this.collectHealth,
      null,
      this
    );

    // Enemies
    this.enemies = this.physics.add.group();
    this.spawnWave();

    // Enemy collision
    this.physics.add.collider(this.enemies, this.walls);

    // Enemy hits player
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.enemyHitPlayer,
      null,
      this
    );

    // Bullets
    this.bullets = this.physics.add.group({
      maxSize: 20,
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

    // UI Setup
    this.createUI();

    // Player speed
    this.baseSpeed = 120;
    this.speedBoost = 0;

    // Shooting cooldown
    this.lastShotTime = 0;
    this.shotCooldown = 150;
    
    // Wave spawning flag
    this.spawningWave = false;
  }

  createMap() {
    // Floor (visual only, no collision)
    const floor = this.add.rectangle(400, 300, 800, 600, 0x2a2a2a);
    floor.setDepth(0);

    // Walls group
    this.walls = this.physics.add.staticGroup();

    // Create border walls
    // Top wall
    this.createWall(400, 10, 800, 20);
    // Bottom wall
    this.createWall(400, 590, 800, 20);
    // Left wall
    this.createWall(10, 300, 20, 600);
    // Right wall
    this.createWall(790, 300, 20, 600);

    // Interior walls/obstacles
    this.createWall(200, 150, 100, 20);
    this.createWall(600, 150, 100, 20);
    this.createWall(400, 300, 20, 150);
    this.createWall(150, 450, 150, 20);
    this.createWall(650, 450, 150, 20);
  }

  createWall(x, y, width, height) {
    const wall = this.walls.create(x, y, null);
    wall.setDisplaySize(width, height);
    wall.setSize(width, height);
    wall.refreshBody();

    // Visual representation
    const wallGfx = this.add.rectangle(x, y, width, height, 0x555555);
    wallGfx.setDepth(2);
  }

  createUI() {
    const uiX = 10;
    const uiY = 10;

    // Energy bar
    this.energyBarBg = this.add.rectangle(uiX + 26, uiY + 10, 52, 6, 0x222222).setScrollFactor(0).setDepth(100).setOrigin(0, 0.5);
    this.energyBar = this.add.rectangle(uiX + 26, uiY + 10, 50, 4, 0x00ff88).setScrollFactor(0).setDepth(101).setOrigin(0, 0.5);
    this.add.text(uiX, uiY + 7, 'Energy:', { fontSize: '8px', fill: '#ffffff' }).setScrollFactor(0).setDepth(100);

    // Health bar
    this.healthBarBg = this.add.rectangle(uiX + 26, uiY + 20, 52, 6, 0x222222).setScrollFactor(0).setDepth(100).setOrigin(0, 0.5);
    this.healthBar = this.add.rectangle(uiX + 26, uiY + 20, 50, 4, 0xff0000).setScrollFactor(0).setDepth(101).setOrigin(0, 0.5);
    this.add.text(uiX, uiY + 17, 'Health:', { fontSize: '8px', fill: '#ffffff' }).setScrollFactor(0).setDepth(100);

    // Score and stats
    this.scoreText = this.add.text(uiX, uiY + 30, 'Kills: 0', {
      fontSize: '8px',
      fill: '#ffff00'
    }).setScrollFactor(0).setDepth(100);

    this.waveText = this.add.text(uiX, uiY + 40, 'Wave: 1', {
      fontSize: '8px',
      fill: '#00ffff'
    }).setScrollFactor(0).setDepth(100);

    // Instructions
    this.instructionText = this.add.text(uiX, uiY + 55, 'WASD/Arrows: Move\nSpace: Shoot\nE: Recharge', {
      fontSize: '7px',
      fill: '#ffffff',
      lineSpacing: 2
    }).setScrollFactor(0).setDepth(100).setAlpha(0.7);

    // Game over text (hidden initially)
    this.gameOverText = this.add.text(
      this.cameras.main.width / 4,
      this.cameras.main.height / 4,
      'GAME OVER\n\nPress R to Restart',
      {
        fontSize: '16px',
        fill: '#ff0000',
        align: 'center'
      }
    ).setScrollFactor(0).setDepth(200).setVisible(false);
  }

  update(time) {
    if (this.isGameOver) {
      if (this.input.keyboard.addKey('R').isDown) {
        this.scene.restart();
      }
      return;
    }

    // Player movement
    const speed = this.baseSpeed + this.speedBoost;
    let velocityX = 0;
    let velocityY = 0;

    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      velocityX = -speed;
      this.playerFacingAngle = Math.PI;
    }
    if (this.cursors.right.isDown || this.wasd.right.isDown) {
      velocityX = speed;
      this.playerFacingAngle = 0;
    }
    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      velocityY = -speed;
      this.playerFacingAngle = -Math.PI / 2;
    }
    if (this.cursors.down.isDown || this.wasd.down.isDown) {
      velocityY = speed;
      this.playerFacingAngle = Math.PI / 2;
    }

    // Handle diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      this.playerFacingAngle = Math.atan2(velocityY, velocityX);
    }

    this.player.setVelocity(velocityX, velocityY);

    // Recharge mechanic
    if (this.recharging && this.rechargeKey.isDown) {
      this.energy = Math.min(this.energy + 0.8, this.maxEnergy);
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
    const energyPct = this.energy / this.maxEnergy;
    this.energyBar.width = 50 * energyPct;
    
    if (energyPct < 0.3) {
      this.energyBar.fillColor = 0xff0000;
    } else if (energyPct < 0.6) {
      this.energyBar.fillColor = 0xffaa00;
    } else {
      this.energyBar.fillColor = 0x00ff88;
    }

    // Update health UI
    const healthPct = this.playerHealth / this.maxHealth;
    this.healthBar.width = 50 * healthPct;

    // Sync player graphic
    this.playerGfx.x = this.player.x;
    this.playerGfx.y = this.player.y;
    
    // Flash player when invulnerable
    if (this.isInvulnerable) {
      this.playerGfx.alpha = (time % 200 < 100) ? 0.5 : 1;
    } else {
      this.playerGfx.alpha = 1;
    }

    // Reset recharge flag
    this.recharging = false;

    // Enemy AI
    const enemies = this.enemies.getChildren();
    const px = this.player.x;
    const py = this.player.y;
    
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (!enemy.active) continue;

      const dx = px - enemy.x;
      const dy = py - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 4) {
        enemy.body.velocity.x = (dx / dist) * enemy.speed;
        enemy.body.velocity.y = (dy / dist) * enemy.speed;
      } else {
        enemy.body.velocity.x = 0;
        enemy.body.velocity.y = 0;
      }

      enemy.gfx.x = enemy.x;
      enemy.gfx.y = enemy.y;
    }

    // Pulse recharge stations
    if (time % 100 < 50) {
      const stations = this.rechargeStations.getChildren();
      for (let i = 0; i < stations.length; i++) {
        if (stations[i].gfx) stations[i].gfx.alpha = 0.6;
      }
    } else {
      const stations = this.rechargeStations.getChildren();
      for (let i = 0; i < stations.length; i++) {
        if (stations[i].gfx) stations[i].gfx.alpha = 0.8;
      }
    }

    // Check if wave is complete (but prevent immediate triggering)
    if (this.enemies.countActive(true) === 0 && !this.isGameOver && !this.spawningWave) {
      this.startNextWave();
    }
  }

  createRechargeStation(x, y) {
    const station = this.rechargeStations.create(x, y, null);
    station.setSize(16, 16);
    station.body.setSize(16, 16);
    
    station.gfx = this.add.rectangle(x, y, 16, 16, 0x00ff00);
    station.gfx.setDepth(3);
    station.gfx.alpha = 0.6;
    
    const indicator = this.add.circle(x, y, 4, 0xffffff);
    indicator.setDepth(4);
  }

  spawnHealthPickup(x, y) {
    const health = this.add.circle(x, y, 6, 0xff00ff);
    health.setDepth(4);
    this.physics.world.enable(health);
    health.body.setCircle(6);
    this.healthPickups.add(health);
  }

  collectHealth(player, healthPickup) {
    this.playerHealth = Math.min(this.playerHealth + 30, this.maxHealth);
    healthPickup.destroy();
  }

  onRecharge() {
    this.recharging = true;
  }

  spawnEnemy(x, y) {
    const enemy = this.physics.add.sprite(x, y, null);
    enemy.setSize(12, 12);
    enemy.speed = 30 + (this.wave * 2);
    enemy.body.setCollideWorldBounds(true);

    enemy.gfx = this.add.rectangle(x, y, 12, 12, 0xff5555);
    enemy.gfx.setDepth(5);

    this.enemies.add(enemy);
  }

  spawnWave() {
    this.spawningWave = true;
    const numEnemies = this.enemiesPerWave + Math.floor(this.wave / 2);
    
    for (let i = 0; i < numEnemies; i++) {
      let x, y;
      let attempts = 0;
      do {
        x = Phaser.Math.Between(100, 700);
        y = Phaser.Math.Between(100, 500);
        attempts++;
      } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 150 && attempts < 10);
      
      this.spawnEnemy(x, y);
    }
    
    // Reset flag after a short delay to ensure enemies are spawned
    this.time.delayedCall(100, () => {
      this.spawningWave = false;
    });
  }

  startNextWave() {
    if (this.spawningWave) return; // Prevent double-triggering
    
    this.wave++;
    this.waveText.setText(`Wave: ${this.wave}`);
    
    // Maybe spawn health pickup
    if (Math.random() < 0.4) {
      const x = Phaser.Math.Between(150, 650);
      const y = Phaser.Math.Between(150, 450);
      this.spawnHealthPickup(x, y);
    }
    
    this.spawningWave = true;
    this.time.delayedCall(1500, () => {
      this.spawnWave();
    });
  }

  fireBullet() {
    const bullet = this.add.circle(this.player.x, this.player.y, 3, 0xffffff);
    bullet.setDepth(8);
    
    this.physics.world.enable(bullet);
    this.bullets.add(bullet);

    const speed = 400;
    bullet.body.setVelocity(
      Math.cos(this.playerFacingAngle) * speed,
      Math.sin(this.playerFacingAngle) * speed
    );

    bullet.body.setCircle(3);

    this.time.delayedCall(1000, () => {
      if (bullet && bullet.active) {
        bullet.destroy();
      }
    });
  }

  bulletHitEnemy(bullet, enemy) {
    if (bullet) bullet.destroy();
    
    if (enemy) {
      // Simplified particle effect
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI * 2 * i) / 4;
        const particle = this.add.circle(enemy.x, enemy.y, 2, 0xff5555);
        particle.setDepth(9);
        
        this.tweens.add({
          targets: particle,
          x: enemy.x + Math.cos(angle) * 20,
          y: enemy.y + Math.sin(angle) * 20,
          alpha: 0,
          duration: 300,
          onComplete: () => particle.destroy()
        });
      }
      
      if (enemy.gfx) enemy.gfx.destroy();
      enemy.destroy();
      
      this.enemiesKilled++;
      this.score += 10;
      this.scoreText.setText(`Kills: ${this.enemiesKilled}`);
    }
  }

  enemyHitPlayer(player, enemy) {
    if (this.isInvulnerable) return;
    
    this.playerHealth -= 15;
    
    // Knockback
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
    player.setVelocity(
      Math.cos(angle) * 200,
      Math.sin(angle) * 200
    );
    
    // Invulnerability frames
    this.isInvulnerable = true;
    this.time.delayedCall(800, () => {
      this.isInvulnerable = false;
    });
    
    // Check for death
    if (this.playerHealth <= 0) {
      this.gameOver();
    }
  }

  gameOver() {
    this.isGameOver = true;
    this.playerGfx.setVisible(false);
    this.gameOverText.setVisible(true);
    this.gameOverText.setText(
      `GAME OVER\n\nWave: ${this.wave}\nKills: ${this.enemiesKilled}\nScore: ${this.score}\n\nPress R to Restart`
    );
    
    // Freeze enemies
    const enemies = this.enemies.getChildren();
    for (let i = 0; i < enemies.length; i++) {
      if (enemies[i].body) {
        enemies[i].body.setVelocity(0, 0);
      }
    }
  }
}