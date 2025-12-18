export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    // Load player sprites
    this.load.image('player-up', 'assets/sprites/player-up.png');
    this.load.image('player-down', 'assets/sprites/player-down.png');
    this.load.image('player-left', 'assets/sprites/player-left.png');
    this.load.image('player-right', 'assets/sprites/player-right.png');
    
    // Load enemy sprites
    this.load.image('enemy-up', 'assets/sprites/enemy-up.png');
    this.load.image('enemy-down', 'assets/sprites/enemy-down.png');
    this.load.image('enemy-left', 'assets/sprites/enemy-left.png');
    this.load.image('enemy-right', 'assets/sprites/enemy-right.png');

    // Load corporate slop salad enemy
    this.load.image('slop_salad', 'assets/sprites/slop_salad.png');
    
    // Load desk collision sprite
    this.load.image('desk', 'assets/sprites/desk-collision.png');

    // Load powerpoint logo for bullets
    this.load.image('bullet', 'assets/sprites/powerpoint.png')

    // Load coffee sprite
    this.load.image('coffee', 'assets/sprites/coffee.png')

    // Load recharge station 
    this.load.image('rechargeStation', 'assets/sprites/recharge_station.png');

    //Load the teams call desk
    this.load.image('specialDesk', 'assets/sprites/teams_call.png');

    // Load the music
    this.load.audio('bgMusic', 'assets/audio/metallica_ripoff.wav');
    this.load.audio('shootSFX', 'assets/audio/shoot.wav');
    this.load.audio('hurtSFX', 'assets/audio/hurt.mp3');
    this.load.audio('rechargeSFX', 'assets/audio/recharge.mp3');
    this.load.audio('healthSFX', 'assets/audio/health.mp3');
    this.load.audio('teamsSFX', 'assets/audio/teams_call.mp3');
    
  }

create() {
    // Play background music
    this.bgMusic = this.sound.add('bgMusic', {volume: 0.35, loop: true});
    if (!this.bgMusic.isPlaying) {
        this.bgMusic.play();
    }
    
    // Sound effects
    this.shootSound = this.sound.add('shootSFX', { volume: 0.7 });
    this.hurtSound = this.sound.add('hurtSFX', { volume: 0.7 });
    this.rechargeSound = this.sound.add('rechargeSFX', { volume: 0.7 });
    this.healthSound = this.sound.add('healthSFX', { volume: 0.7 });

    // Set world bounds
    this.physics.world.setBounds(0, 0, 800, 600);

    // Track game dimensions for expansion
    this.gameWidth = 800;
    this.gameHeight = 600;
    this.deskRows = 3; // Starting number of desk rows
    this.deskCols = 4; // Starting number of desk columns
    this.deskSpacing = 200;

    // Track recharge station positions to avoid desk overlap
    this.rechargePositions = [];

    // Game state
    this.isGameOver = false;
    this.score = 0;
    this.wave = 1;
    this.enemiesKilled = 0;
    this.enemiesPerWave = 3;

    // Create simple placeholder map
    this.createMap();

    // Player
    this.player = this.physics.add.sprite(400, 300, 'player-down');
    // Suppose the PNG is 62x90
    const spriteWidth = this.player.width;   // 62
    const spriteHeight = this.player.height; // 90

    // Set physics body to match sprite exactly
    this.player.body.setSize(spriteWidth, spriteHeight/4);
    this.player.body.setOffset(0, 0);
    this.player.body.setCollideWorldBounds(true);
    this.playerHealth = 100;
    this.maxHealth = 100;
    this.isInvulnerable = false;
    
    // Player facing direction
    this.playerFacingAngle = 0;
    this.playerFacingDir = 'down'; // Track direction for sprite

    // Camera - centered with letterboxing
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(1);
    this.cameras.main.setBackgroundColor('#000000');
    
    // Center the game view
    const gameWidth = 800;
    const gameHeight = 600;
    this.cameras.main.setViewport(
      (this.scale.width - gameWidth) / 2,
      (this.scale.height - gameHeight) / 2,
      gameWidth,
      gameHeight
    );

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
    this.createRechargeStation(350, 300);
    this.createRechargeStation(550, 480);

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

    // Flying enemies (lunch break)
    this.flyingEnemies = this.physics.add.group();
    this.lunchBreakActive = false;
    this.lunchBreakTimer = null;

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

    // Flying enemy hits player
    this.physics.add.overlap(
      this.player,
      this.flyingEnemies,
      this.flyingEnemyHitPlayer,
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

    // Bullet → Flying Enemy collision
    this.physics.add.overlap(
      this.bullets,
      this.flyingEnemies,
      this.bulletHitFlyingEnemy,
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

    // Teams call 
    this.specialEventActive = false;   // Is the timed event happening?
    this.specialEventDesk = null;      // The replaced desk
    this.specialEventTimer = null;     // Countdown for player
    this.specialEventDuration = 30000; // 30 seconds to reach desk
    this.specialEventMusic = this.sound.add('teamsSFX', { volume: 0.6, loop: true });
    // Arrow pointing to desk where the call is coming from
    this.specialEventArrow = this.add.triangle(
        0, 0, 
        0, 20,  // left
        40, 10, // tip
        0, 0,   // right
        0xff0000
    );
    this.specialEventArrow.setDepth(200);
    this.specialEventArrow.setVisible(false); // hidden by default

  }

  createRechargeStation(x, y) {
    // Track this position
    this.rechargePositions.push({x, y});
    
    const station = this.rechargeStations.create(x, y, 'rechargeStation');

    const width = station.width;
    const height = station.height;

    station.body.setSize(width, height);
    station.body.setOffset(0, 0);
    station.refreshBody();

    station.setDepth(3);

    station.rechargeBarBg = this.add.rectangle(x, y - height/2 - 5, width, 4, 0x222222);
    station.rechargeBarBg.setDepth(4);
    station.rechargeBarBg.setVisible(false);

    station.rechargeBar = this.add.rectangle(x - width/2, y - height/2 - 5, 0, 4, 0x00ff88);
    station.rechargeBar.setOrigin(0, 0.5);
    station.rechargeBar.setDepth(5);
    station.rechargeBar.setVisible(false);
  }

  createMap() {
    // Floor (visual only, no collision)
    this.floor = this.add.rectangle(this.gameWidth/2, this.gameHeight/2, this.gameWidth, this.gameHeight, 0x2a2a2a);
    this.floor.setDepth(0);

    // Walls group
    this.walls = this.physics.add.staticGroup();

    // Create border walls
    this.createBorderWalls();
    
    // Create recharge stations FIRST
    this.createRechargeStation(350, 300);
    this.createRechargeStation(550, 480);
    
    // THEN create desks (will skip recharge positions)
    this.createDesks();
  }
  createBorderWalls() {
    // Clear existing walls if any
    if (this.borderWalls) {
        this.borderWalls.forEach(wall => wall.destroy());
    }
    this.borderWalls = [];

    // Top wall
    const topWall = this.createWall(this.gameWidth/2, 10, this.gameWidth, 20);
    this.borderWalls.push(topWall);
    
    // Bottom wall
    const bottomWall = this.createWall(this.gameWidth/2, this.gameHeight - 10, this.gameWidth, 20);
    this.borderWalls.push(bottomWall);
    
    // Left wall
    const leftWall = this.createWall(10, this.gameHeight/2, 20, this.gameHeight);
    this.borderWalls.push(leftWall);
    
    // Right wall
    const rightWall = this.createWall(this.gameWidth - 10, this.gameHeight/2, 20, this.gameHeight);
    this.borderWalls.push(rightWall);
}

  createDesks() {
    // Create desks in a grid pattern
    const startX = 150;
    const startY = 120;
    
    for (let row = 0; row < this.deskRows; row++) {
        for (let col = 0; col < this.deskCols; col++) {
            const x = startX + (col * this.deskSpacing);
            const y = startY + (row * this.deskSpacing);
            
            // Skip center area for player starting position
            if (row === 1 && col === 1) continue;
            
            // Skip if there's a recharge station nearby
            let tooClose = false;
            for (let pos of this.rechargePositions) {
                const dist = Phaser.Math.Distance.Between(x, y, pos.x, pos.y);
                if (dist < 100) {
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) {
                this.createDesk(x, y);
            }
        }
    }
  }

  createWall(x, y, width, height) {
    const wall = this.walls.create(x, y, null);
    wall.setDisplaySize(width, height);
    wall.setSize(width, height);
    wall.refreshBody();

    // Visual representation
    const wallGfx = this.add.rectangle(x, y, width, height, 0x555555);
    wallGfx.setDepth(2);
    
    // Store reference to visual for cleanup
    wall.gfx = wallGfx;
    
    return wall;
}

  createDesk(x, y) {
      const desk = this.walls.create(x, y, 'desk');
      // Desk sprite size
      const width = desk.width;  
      const height = desk.height;
      desk.body.setSize(width, height);
      desk.body.setOffset(0, 0); // centered
      desk.refreshBody();
  }

  createUI() {
    const gameWidth = 800;
    const gameHeight = 600;
    
    // TOP BAR - Dark background
    const topBarHeight = 50;
    this.topBar = this.add.rectangle(400, topBarHeight/2, gameWidth, topBarHeight, 0x1a1a1a, 0.95);
    this.topBar.setScrollFactor(0);
    this.topBar.setDepth(100);
    
    // TOP BAR DIVIDER
    this.add.rectangle(400, topBarHeight, gameWidth, 2, 0x444444).setScrollFactor(0).setDepth(101);

    const topY = 15;
    const spacing = 200;
    
    // HEALTH SECTION
    this.add.text(30, topY, '❤ HEALTH', { 
      fontSize: '14px', 
      fill: '#ff6b6b',
      fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(102);
    
    this.healthBarBg = this.add.rectangle(30, topY + 18, 150, 12, 0x3a3a3a)
      .setScrollFactor(0).setDepth(102).setOrigin(0, 0);
    this.healthBar = this.add.rectangle(30, topY + 18, 150, 12, 0xff4444)
      .setScrollFactor(0).setDepth(103).setOrigin(0, 0);
    this.healthText = this.add.text(105, topY + 20, '100/100', {
      fontSize: '10px',
      fill: '#ffffff',
      fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(104).setOrigin(0.5);

    // ENERGY SECTION
    this.add.text(230, topY, '⚡ ENERGY', { 
      fontSize: '14px', 
      fill: '#4ecdc4',
      fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(102);
    
    this.energyBarBg = this.add.rectangle(230, topY + 18, 150, 12, 0x3a3a3a)
      .setScrollFactor(0).setDepth(102).setOrigin(0, 0);
    this.energyBar = this.add.rectangle(230, topY + 18, 150, 12, 0x00ff88)
      .setScrollFactor(0).setDepth(103).setOrigin(0, 0);
    this.energyText = this.add.text(305, topY + 20, '100/100', {
      fontSize: '10px',
      fill: '#ffffff',
      fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(104).setOrigin(0.5);

    // WAVE SECTION
    this.add.text(430, topY, '🌊 WAVE', { 
      fontSize: '14px', 
      fill: '#95e1d3',
      fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(102);
    
    this.waveText = this.add.text(430, topY + 18, '1', {
      fontSize: '16px',
      fill: '#ffffff',
      fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(102);

    // SCORE SECTION
    this.add.text(580, topY, '💀 KILLS', { 
      fontSize: '14px', 
      fill: '#f9ca24',
      fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(102);
    
    this.scoreText = this.add.text(580, topY + 18, '0', {
      fontSize: '16px',
      fill: '#ffffff',
      fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(102);

    // BOTTOM BAR - Controls
    const bottomBarHeight = 60;
    const bottomY = gameHeight - bottomBarHeight/2;
    
    this.bottomBar = this.add.rectangle(400, bottomY, gameWidth, bottomBarHeight, 0x1a1a1a, 0.95);
    this.bottomBar.setScrollFactor(0);
    this.bottomBar.setDepth(100);
    
    // BOTTOM BAR DIVIDER
    this.add.rectangle(400, gameHeight - bottomBarHeight, gameWidth, 2, 0x444444)
      .setScrollFactor(0).setDepth(101);

    const controlY = gameHeight - 35;
    
    // Movement controls
    this.createControlDisplay(100, controlY, 'WASD / ↑←↓→', 'Move');
    
    // Shoot control
    this.createControlDisplay(300, controlY, 'SPACE', 'Shoot');
    
    // Recharge control
    this.createControlDisplay(480, controlY, 'E', 'Recharge');
    
    // Special event control (initially hidden)
    this.teamsControlBg = this.add.rectangle(680, controlY, 140, 35, 0xff4444, 0.3)
      .setScrollFactor(0).setDepth(101).setVisible(false);
    this.teamsControlKey = this.add.text(680, controlY - 8, 'Q', {
      fontSize: '14px',
      fill: '#ff4444',
      fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(102).setOrigin(0.5).setVisible(false);
    this.teamsControlLabel = this.add.text(680, controlY + 8, 'Answer Call!', {
      fontSize: '11px',
      fill: '#ffffff'
    }).setScrollFactor(0).setDepth(102).setOrigin(0.5).setVisible(false);

    // Game over screen
    this.gameOverText = this.add.text(
      400,
      300,
      '',
      {
        fontSize: '20px',
        fill: '#ff4444',
        align: 'center',
        backgroundColor: '#000000',
        padding: { x: 30, y: 20 },
        wordWrap: { width: 700 }
      }
    ).setScrollFactor(0).setDepth(200).setVisible(false).setOrigin(0.5);

    // Lunch break announcement
    this.lunchBreakText = this.add.text(
      400,
      300,
      'LUNCH BREAK!\n\nDodge the $23 slop salads!!',
      {
        fontSize: '32px',
        fill: '#ff9500',
        align: 'center',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6
      }
    ).setScrollFactor(0).setDepth(250).setVisible(false).setOrigin(0.5);
  }

  createControlDisplay(x, y, key, label) {
    const bg = this.add.rectangle(x, y, 140, 35, 0x2a2a2a, 0.8);
    bg.setScrollFactor(0);
    bg.setDepth(101);
    
    const keyText = this.add.text(x, y - 8, key, {
      fontSize: '14px',
      fill: '#4ecdc4',
      fontStyle: 'bold'
    });
    keyText.setScrollFactor(0);
    keyText.setDepth(102);
    keyText.setOrigin(0.5);
    
    const labelText = this.add.text(x, y + 8, label, {
      fontSize: '11px',
      fill: '#cccccc'
    });
    labelText.setScrollFactor(0);
    labelText.setDepth(102);
    labelText.setOrigin(0.5);
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
  let newFacingDir = this.playerFacingDir;

  if (this.cursors.left.isDown || this.wasd.left.isDown) {
      velocityX = -speed;
      this.playerFacingAngle = Math.PI;
      newFacingDir = 'left';
  }
  if (this.cursors.right.isDown || this.wasd.right.isDown) {
      velocityX = speed;
      this.playerFacingAngle = 0;
      newFacingDir = 'right';
  }
  if (this.cursors.up.isDown || this.wasd.up.isDown) {
      velocityY = -speed;
      this.playerFacingAngle = -Math.PI / 2;
      newFacingDir = 'up';
  }
  if (this.cursors.down.isDown || this.wasd.down.isDown) {
      velocityY = speed;
      this.playerFacingAngle = Math.PI / 2;
      newFacingDir = 'down';
  }

  if (velocityX !== 0 && velocityY !== 0) {
      this.playerFacingAngle = Math.atan2(velocityY, velocityX);
  }

  if (newFacingDir !== this.playerFacingDir) {
      this.playerFacingDir = newFacingDir;
      this.player.setTexture(`player-${newFacingDir}`);
  }

  this.player.setVelocity(velocityX, velocityY);

  // Recharge mechanic
  if (this.recharging && this.rechargeKey.isDown) {
      this.energy = Math.min(this.energy + 0.8, this.maxEnergy);
      if (!this.rechargeSound.isPlaying) {
            this.rechargeSound.play();
        }
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
    this.energyBar.width = 150 * energyPct;
    this.energyText.setText(`${Math.floor(this.energy)}/${this.maxEnergy}`);
    
    if (energyPct < 0.3) {
      this.energyBar.fillColor = 0xff0000;
    } else if (energyPct < 0.6) {
      this.energyBar.fillColor = 0xffaa00;
    } else {
      this.energyBar.fillColor = 0x00ff88;
    }

    // Update health UI
    const healthPct = this.playerHealth / this.maxHealth;
    this.healthBar.width = 150 * healthPct;
    this.healthText.setText(`${Math.floor(this.playerHealth)}/${this.maxHealth}`);
    
    if (healthPct < 0.3) {
      this.healthBar.fillColor = 0xff0000;
    } else if (healthPct < 0.6) {
      this.healthBar.fillColor = 0xff6600;
    } else {
      this.healthBar.fillColor = 0xff4444;
    }

    // Flash player when invulnerable
    if (this.isInvulnerable) {
      this.player.alpha = (time % 200 < 100) ? 0.5 : 1;
    } else {
      this.player.alpha = 1;
    }

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
        
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        
        if (absDx > absDy) {
          enemy.setTexture(dx > 0 ? 'enemy-right' : 'enemy-left');
        } else {
          enemy.setTexture(dy > 0 ? 'enemy-down' : 'enemy-up');
        }
      } else {
        enemy.body.velocity.x = 0;
        enemy.body.velocity.y = 0;
      }
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

    if (this.enemies.countActive(true) === 0 && !this.isGameOver && !this.spawningWave && !this.lunchBreakActive) {
      this.startNextWave();
    }

    // Update recharge bar progress
    this.rechargeStations.getChildren().forEach(station => {
      if (this.recharging && Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), station.getBounds())) {
        const pct = this.energy / this.maxEnergy;
        station.rechargeBar.width = station.width * pct;
      } else {
        station.rechargeBarBg.setVisible(false);
        station.rechargeBar.setVisible(false);
      }
    });

    // Teams call 
    if (this.specialEventActive && this.specialEventDesk) {
        // Show Q control
        this.teamsControlBg.setVisible(true);
        this.teamsControlKey.setVisible(true);
        this.teamsControlLabel.setVisible(true);
        
        if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey('Q'))) {
            const px = this.player.x;
            const py = this.player.y;
            const deskBounds = this.specialEventDesk.getBounds();

            if (Phaser.Geom.Rectangle.Contains(deskBounds, px, py)) {
                this.completeSpecialEvent();
            }
        }
    } else {
        // Hide Q control
        this.teamsControlBg.setVisible(false);
        this.teamsControlKey.setVisible(false);
        this.teamsControlLabel.setVisible(false);
    }
    
    if (this.specialEventActive && this.specialEventDesk) {
        this.specialEventArrow.setVisible(true);

        const px = this.player.x;
        const py = this.player.y;
        this.specialEventArrow.setPosition(px, py - 30);

        const angle = Phaser.Math.Angle.Between(px, py, this.specialEventDesk.x, this.specialEventDesk.y);
        this.specialEventArrow.setRotation(angle);
    } else {
        this.specialEventArrow.setVisible(false);
    }

    // Flying enemy cleanup (remove when off screen)
    const flyingEnemies = this.flyingEnemies.getChildren();
    for (let i = 0; i < flyingEnemies.length; i++) {
      const fe = flyingEnemies[i];
      if (!fe.active) continue;
      
      // Remove if far off screen
      if (fe.x < -100 || fe.x > 900 || fe.y < -100 || fe.y > 700) {
        fe.destroy();
      }
    }
}

createRechargeStation(x, y) {
  const station = this.rechargeStations.create(x, y, 'rechargeStation');

  const width = station.width;   // e.g., 112
  const height = station.height; // e.g., 72

  station.body.setSize(width, height);
  station.body.setOffset(0, 0); // centered
  station.refreshBody();

  station.setDepth(3);

  // Optional: add indicator for interactivity (like glowing circle)
  // Create a progress bar above the station (hidden by default)
  station.rechargeBarBg = this.add.rectangle(x, y - height/2 - 5, width, 4, 0x222222);
  station.rechargeBarBg.setDepth(4);
  station.rechargeBarBg.setVisible(false);

  station.rechargeBar = this.add.rectangle(x - width/2, y - height/2 - 5, 0, 4, 0x00ff88);
  station.rechargeBar.setOrigin(0, 0.5);
  station.rechargeBar.setDepth(5);
  station.rechargeBar.setVisible(false);
}


  spawnHealthPickup(x, y) {
      const health = this.add.sprite(x, y, 'coffee');
      health.setDepth(4);
      this.physics.world.enable(health);
      health.body.setCircle(6);
      this.healthPickups.add(health);
  }

  collectHealth(player, healthPickup) {
      this.playerHealth = Math.min(this.playerHealth + 30, this.maxHealth);

      // Play health  sound
      this.healthSound.play();

      healthPickup.destroy();
  }

  onRecharge(player, station) {
    this.recharging = true;

    // Show the recharge bar
    station.rechargeBarBg.setVisible(true);
    station.rechargeBar.setVisible(true);

    // Update bar width based on energy
    const pct = this.energy / this.maxEnergy;
    station.rechargeBar.width = station.width * pct;
  }

  spawnEnemy(x, y) {
      const enemy = this.physics.add.sprite(x, y, 'enemy-down');
      const width = enemy.width;   // 62
      const height = enemy.height; // 90
      enemy.body.setSize(width, height);
      enemy.body.setOffset(0, 0); // centered
      enemy.speed = 30 + (this.wave * 2);
      enemy.body.setCollideWorldBounds(true);
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
    if (this.spawningWave) return;
    
    this.wave++;
    this.waveText.setText(`${this.wave}`);
    
    // Expand world after wave 10
    if (this.wave > 10) {
        this.expandWorld();
    }
    
    // Check if it's time for lunch break (every 5 waves starting at wave 5)
    if (this.wave >= 5 && this.wave % 5 === 0) {
      this.startLunchBreak();
      return;
    }
    
    if (Math.random() < 0.4) {
      const x = Phaser.Math.Between(150, this.gameWidth - 150);
      const y = Phaser.Math.Between(150, this.gameHeight - 150);
      this.spawnHealthPickup(x, y);
    }
    
    this.spawningWave = true;
    this.time.delayedCall(1500, () => {
      this.spawnWave();
      this.startSpecialEventTimer();
    });
}

  fireBullet() {
    // Create a bullet sprite
    const bullet = this.physics.add.sprite(this.player.x, this.player.y, 'bullet');
    bullet.setDepth(8);

    // Set size if your sprite is larger than desired hitbox
    bullet.body.setSize(8, 8); // optional, depends on your sprite
    bullet.body.setOffset(0, 0);

    // Add to bullets group
    this.bullets.add(bullet);

    // Calculate velocity
    const speed = 400;
    bullet.body.setVelocity(
      Math.cos(this.playerFacingAngle) * speed,
      Math.sin(this.playerFacingAngle) * speed
    );

    // Play shooting sound
    this.shootSound.play();

    // Destroy after 1 second to prevent memory leaks
    this.time.delayedCall(1000, () => {
      if (bullet && bullet.active) bullet.destroy();
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
      this.hurtSound.play();
      
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
      this.player.setVisible(false);
      this.gameOverMessages = ["With your free and large payout time you travelled to France and hiked in the Pyrenees, it was lovely.",
                            "After being made redundant you went back to tafe, took a baking apprenticeship and opened the bakery you dreamed of as a child.",
                            "Now that you have some spare time, you spent it with your loving family.",
                            "Because you don't need to be at work, you can go to the beach.",
                            "Now you can sleep in.",
                            "After being made redundant, you got your old paints from the back of the cupboard and painted a beautiful picture.",
                            "After being made redundant, you sat outside an immersed yourself in the beauty of nature.",
                            "Now that you're no longer a consultant, you've found that you're able to make meaningful human connections.",
                            "Without a job, now you can have 12 beers for lunch.",
                            "Thanks to your payout, you can afford that nice pair of shoes you wanted."];
      const randomMessage = Phaser.Utils.Array.GetRandom(this.gameOverMessages);
      this.gameOverText.setVisible(true);
      this.gameOverText.setText(
          `REDUNDANT

          "${randomMessage}"

          Wave: ${this.wave}
          Kills: ${this.enemiesKilled}
          Score: ${this.score}

          Press R to Restart`
        );
      
      // Freeze enemies
      const enemies = this.enemies.getChildren();
      for (let i = 0; i < enemies.length; i++) {
        if (enemies[i].body) {
          enemies[i].body.setVelocity(0, 0);
        }
      }

      // Stop special event music if playing
      if (this.specialEventMusic && this.specialEventMusic.isPlaying) {
          this.specialEventMusic.stop();
      }

      // stop normal background music as well
      if (this.bgMusic && this.bgMusic.isPlaying) {
          this.bgMusic.stop();
      }
  }

  startSpecialEventTimer() {
      if (this.wave < 3 || this.specialEventActive) return;

      this.time.delayedCall(Phaser.Math.Between(25000, 35000), () => {
          this.startSpecialEvent();
      });
  }

  startSpecialEvent() {
    if (this.specialEventActive) return;

    this.specialEventActive = true;

    // Stop normal BGM
    if (this.bgMusic && this.bgMusic.isPlaying) this.bgMusic.stop();

    // Play special music
    if (!this.specialEventMusic) {
        this.specialEventMusic = this.sound.add('specialMusic', { loop: true });
    }
    this.specialEventMusic.play();

    // Pick a random desk
    const desks = this.walls.getChildren().filter(d => !d.isRecharge);
    const randomDesk = Phaser.Utils.Array.GetRandom(desks);

    // Remove old desk
    randomDesk.destroy();

    // Spawn special desk
    this.specialEventDesk = this.physics.add.sprite(randomDesk.x, randomDesk.y, 'specialDesk');
    this.specialEventDesk.setSize(113, 68);
    this.specialEventDesk.setOffset(-113/2, -68/2);
    this.specialEventDesk.body.setImmovable(true);
    this.specialEventDesk.setDepth(5);

    // Start countdown
    this.specialEventTimer = this.time.delayedCall(this.specialEventDuration, () => {
        this.gameOver();
    }, [], this);
}

  completeSpecialEvent() {
    // Stop special music
    if (this.specialEventMusic && this.specialEventMusic.isPlaying) {
        this.specialEventMusic.stop();
    }

    // Resume normal BGM
    if (this.bgMusic && !this.bgMusic.isPlaying) {
        this.bgMusic.play();
    }

    // Remove special desk
    if (this.specialEventDesk) {
        this.specialEventDesk.destroy();
        this.specialEventDesk = null;
    }

    // Cancel the timer if it exists
    if (this.specialEventTimer) {
        this.specialEventTimer.remove();
        this.specialEventTimer = null;
    }

    // Reset flags
    this.specialEventActive = false;
}


  bulletHitFlyingEnemy(bullet, flyingEnemy) {
    if (bullet) bullet.destroy();
    
    if (flyingEnemy) {
      // Particle effect
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        const particle = this.add.sprite(flyingEnemy.x, flyingEnemy.y, 'slop_salad');
        particle.setDepth(9);
        
        this.tweens.add({
          targets: particle,
          x: flyingEnemy.x + Math.cos(angle) * 30,
          y: flyingEnemy.y + Math.sin(angle) * 30,
          alpha: 0,
          duration: 400,
          onComplete: () => particle.destroy()
        });
      }
      
      flyingEnemy.destroy();
      
      this.enemiesKilled++;
      this.score += 20; // Worth more points
      this.scoreText.setText(`${this.enemiesKilled}`);
    }
}

flyingEnemyHitPlayer(player, flyingEnemy) {
    if (this.isInvulnerable) return;
    
    this.playerHealth -= 25; // More damage
    this.hurtSound.play();
    
    // Knockback
    const angle = Phaser.Math.Angle.Between(flyingEnemy.x, flyingEnemy.y, player.x, player.y);
    player.setVelocity(
      Math.cos(angle) * 300,
      Math.sin(angle) * 300
    );
    
    // Destroy the flying enemy on contact
    flyingEnemy.destroy();
    
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

// New function - start lunch break
startLunchBreak() {
  this.lunchBreakActive = true;
  
  // Show announcement
  this.lunchBreakText.setVisible(true);
  this.lunchBreakText.setAlpha(0);
  
  this.tweens.add({
    targets: this.lunchBreakText,
    alpha: 1,
    duration: 500,
    ease: 'Power2'
  });
  
  // Hide announcement after 3 seconds
  this.time.delayedCall(3000, () => {
    this.tweens.add({
      targets: this.lunchBreakText,
      alpha: 0,
      duration: 500,
      onComplete: () => this.lunchBreakText.setVisible(false)
    });
  });
  
  // Spawn flying enemies over 15 seconds
  const spawnCount = 20 + (this.wave - 10) * 2; // More enemies as waves progress
  const spawnDuration = 15000;
  const spawnInterval = spawnDuration / spawnCount;
  
  for (let i = 0; i < spawnCount; i++) {
    this.time.delayedCall(i * spawnInterval, () => {
      this.spawnFlyingEnemy();
    });
  }
  
  // End lunch break after duration
  this.time.delayedCall(spawnDuration + 5000, () => {
    this.endLunchBreak();
  });
}

spawnFlyingEnemy() {
  // Random side (0 = top, 1 = right, 2 = bottom, 3 = left)
  const side = Phaser.Math.Between(0, 3);
  let x, y, vx, vy;
  
  const speed = 500 + (this.wave * 5);
  
  switch(side) {
    case 0: // Top
      x = Phaser.Math.Between(50, 750);
      y = -50;
      vx = Phaser.Math.Between(-100, 100);
      vy = speed;
      break;
    case 1: // Right
      x = 850;
      y = Phaser.Math.Between(50, 550);
      vx = -speed;
      vy = Phaser.Math.Between(-100, 100);
      break;
    case 2: // Bottom
      x = Phaser.Math.Between(50, 750);
      y = 650;
      vx = Phaser.Math.Between(-100, 100);
      vy = -speed;
      break;
    case 3: // Left
      x = -50;
      y = Phaser.Math.Between(50, 550);
      vx = speed;
      vy = Phaser.Math.Between(-100, 100);
      break;
  }
  
  // Create flying enemy
  const flyingEnemy = this.physics.add.sprite(x, y, 'slop_salad');
  flyingEnemy.setTint(0xff9500);
  flyingEnemy.setDepth(50);
  flyingEnemy.setScale(1.5);
  
  // Add to group FIRST
  this.flyingEnemies.add(flyingEnemy);
  
  // THEN set physics properties
  flyingEnemy.body.setCircle(8);
  flyingEnemy.body.setCollideWorldBounds(false);
  flyingEnemy.body.setVelocity(vx, vy); // Set velocity AFTER adding to group
  
  // Add pulsing effect
  this.tweens.add({
    targets: flyingEnemy,
    scale: 2,
    duration: 500,
    yoyo: true,
    repeat: -1
  });
}

// New function - end lunch break
endLunchBreak() {
  this.lunchBreakActive = false;
  
  // Clean up any remaining flying enemies
  this.flyingEnemies.clear(true, true);
  
  // Continue with normal waves
  if (Math.random() < 0.6) {
    const x = Phaser.Math.Between(150, 650);
    const y = Phaser.Math.Between(150, 450);
    this.spawnHealthPickup(x, y);
  }
  
  this.spawningWave = true;
  this.time.delayedCall(2000, () => {
    this.spawnWave();
    this.startSpecialEventTimer();
  });
}

  expandWorld() {
    // Alternate between adding columns and rows
    const expandHorizontal = (this.wave - 10) % 2 === 0;
    
    if (expandHorizontal) {
        // Add a new column of desks
        this.deskCols++;
        this.gameWidth += this.deskSpacing;
        
        const newCol = this.deskCols - 1;
        const startX = 150 + (newCol * this.deskSpacing);
        const startY = 120;
        
        for (let row = 0; row < this.deskRows; row++) {
            const x = startX;
            const y = startY + (row * this.deskSpacing);
            
            // Check if recharge station nearby
            let tooClose = false;
            for (let pos of this.rechargePositions) {
                const dist = Phaser.Math.Distance.Between(x, y, pos.x, pos.y);
                if (dist < 100) {
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) {
                this.createDesk(x, y);
            }
        }
    } else {
        // Add a new row of desks
        this.deskRows++;
        this.gameHeight += this.deskSpacing;
        
        const newRow = this.deskRows - 1;
        const startX = 150;
        const startY = 120 + (newRow * this.deskSpacing);
        
        for (let col = 0; col < this.deskCols; col++) {
            const x = startX + (col * this.deskSpacing);
            const y = startY;
            
            // Check if recharge station nearby
            let tooClose = false;
            for (let pos of this.rechargePositions) {
                const dist = Phaser.Math.Distance.Between(x, y, pos.x, pos.y);
                if (dist < 100) {
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) {
                this.createDesk(x, y);
            }
        }
    }
    
    // Update world bounds
    this.physics.world.setBounds(0, 0, this.gameWidth, this.gameHeight);
    
    // Destroy old floor
    if (this.floor) {
        this.floor.destroy();
    }
    
    // Create new floor at depth 0 (behind everything)
    this.floor = this.add.rectangle(this.gameWidth/2, this.gameHeight/2, this.gameWidth, this.gameHeight, 0x2a2a2a);
    this.floor.setDepth(0);
    
    // Destroy old border walls (both physics and graphics)
    if (this.borderWalls) {
        this.borderWalls.forEach(wall => {
            if (wall.gfx) wall.gfx.destroy();
            wall.destroy();
        });
    }
    
    // Recreate border walls
    this.createBorderWalls();
    
    // Update camera viewport (keep centered)
    const viewportX = (this.scale.width - this.gameWidth) / 2;
    const viewportY = (this.scale.height - this.gameHeight) / 2;
    this.cameras.main.setViewport(viewportX, viewportY, this.gameWidth, this.gameHeight);
  }

};
