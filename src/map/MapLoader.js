export default class MapLoader {
  constructor(scene) {
    this.scene = scene;
    this.TILE_SIZE = 16;

    // Physics groups live on the scene
    this.walls = scene.physics.add.staticGroup();
    this.furniture = scene.physics.add.staticGroup();
    this.stations = scene.physics.add.staticGroup();
    this.powerStations = scene.physics.add.staticGroup();
  }

  preload() {
    const load = this.scene.load;
    // Map layers
    load.image("floorMap", "assets/map/floor.png");
    load.image("furnitureMap", "assets/map/furniture.png");
    load.image("wallMap", "assets/map/walls.png");
    load.image("stationMap", "assets/map/stations.png");
    load.image("station2Map", "assets/map/stations2.png");
  }

  build() {
    // Draw order matters
    this.buildLayer("floorMap", "floor");
    this.buildLayer("furnitureMap", "furniture");
    this.buildLayer("wallMap", "walls");
    this.buildLayer("stationMap", "stations");
    this.buildLayer("station2Map", "stations2");
  }

  buildLayer(mapKey, type) {
    const img = this.scene.textures.get(mapKey).getSourceImage();

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const data = ctx.getImageData(0, 0, img.width, img.height).data;

    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const i = (y * img.width + x) * 4;
        const a = data[i + 3];

        if (a === 0) continue;

        this.spawn(type, x, y);
      }
    }
  }

  spawn(type, x, y) {
    const wx = x * this.TILE_SIZE;
    const wy = y * this.TILE_SIZE;
    const s = this.scene;

    switch (type) {
      case "floor":
        s.add.image(wx, wy, "floorTile").setOrigin(0);
        break;

      case "furniture":
        this.furniture.create(wx, wy, "furnitureTile").setOrigin(0);
        break;

      case "walls":
        this.walls.create(wx, wy, "wallTile").setOrigin(0);
        break;

      case "stations":
        this.stations.create(wx, wy, "stationTile").setOrigin(0);
        break;

      case "stations2":
        this.powerStations.create(wx, wy, "station2Tile").setOrigin(0);
        break;
    }
  }
}
