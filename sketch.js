let pg; // off-screen canvas
let grid;
let $grid;
var ui_select_brush_type;
var ui_brush_size;
var previous_pen_size = 100;
var previous_brush_density = 1;


var ui_scale = 1;

const directions = [0, 1, 2, 3];

let keep_log = true;
let raw_log = [];

let render_cache = [];

settings = {
  brush: {
    size: 20,
    speed: 10,
    density: 20,
  },
  life: {
    rate: 60, //range 0.0-1000.0
    max_children: 4,
  },
  sponge: {
    cooldown: 10,
    max_empties: 4,
  },
  wasp: {
    speed: 100, //1-1000
  },
  gas: {
    speed: 100,
    bubble_size: 5,
  },
  virus: {
    spread_rate: 80, //0-1000
    max_age: 20,
    food_value: 50,
  },
};

events = {
  rain: {
    enabled: false,
    rate: 50,
    density: 100,
  },
};

function setup() {
  createCanvas(windowWidth, windowWidth);
  frameRate(60);

  pg = createGraphics(width, height); // NEW: off-screen canvas

  setup_grid();
  fit_window();
  resize_pg();

  setup_ui();

  // draw the initial grid
  render_grid_to_pg();
}

function draw() {
  background(250);

  // draw cached grid
  let grid_w = $grid.cols * $grid.size;
  let grid_h = $grid.rows * $grid.size;

  let offset_x = (width - grid_w) / 2;
  let offset_y = (height - grid_h) / 2;

  image(pg, offset_x, offset_y);

  move_tiles();
  run_events();
  detect_pen_size_change();
  detect_brush_density_change();
  if (frameCount == 5) {
    //
    //new_terrain(0.05,10,50)
  }
}

function setup_grid() {
  grid = [];
  $grid = {
    cols: 200,
    rows: 200,
    size: 0,
  };

  for (let x = 0; x < $grid.cols; x++) {
    grid.push([]);
    for (let y = 0; y < $grid.rows; y++) {
      grid[x].push({
        type: "air",
        timer: 0,
        minDelay: 1,
        sponge_cooldown: 0,
      });
    }
  }
}

function render_grid_to_pg() {
  pg.noStroke();
  for (let x = 0; x < $grid.cols; x++) {
    for (let y = 0; y < $grid.rows; y++) {
      let c = debug_color(x, y);
      pg.fill(c);
      pg.square(x * $grid.size, y * $grid.size, $grid.size);
    }
  }
}

function redraw_tile(x, y) {
  let c = debug_color(x, y);
  pg.noStroke();
  pg.fill(c);
  pg.square(x * $grid.size, y * $grid.size, $grid.size);
}

function fit_window() {
  let a = width / $grid.cols;
  let b = height / $grid.rows;
  $grid.size = floor(min(a, b));
}

function predicate_in_canvas(x, y) {
  return x > 0 && x < width && y > 0 && y < height;
}

function predicate_in_bounds(x, y) {
  return !(x < 0 || y < 0 || x >= $grid.cols || y >= $grid.rows);
}

function resize_pg() {
  pg = createGraphics($grid.cols * $grid.size, $grid.rows * $grid.size);
  pg.noSmooth();
}

function debug_color(x, y) {
  let type = grid[x][y].type;
  if (type === "air") return color(170, 170, 170);
  if (type === "water") return color(0, 0, 200);
  if (type === "sand") return color(250, 200, 0);
  if (type === "mud") return color(150, 90, 0);
  if (type === "stone") return color(50, 50, 50);
  if (type === "sponge") return color(150, 120, 0);
  if (type === "life") return color(20, 200, 40);
  if (type === "poison") return color(100, 0, 0);
  if (type === "wasp") return color(100, 20, 20);
  if (type === "snow") return color(230, 230, 230);
  if (type === "lava") return color(200, 120, 20);
  if (type === "gas") return color(170, 200, 30);
  if (type === "virus") return color(50, 0, 0);
  return color(255, 0, 0);
}

function mousePressed() {
  let grid_w = $grid.cols * $grid.size;
  let grid_h = $grid.rows * $grid.size;

  let offset_x = (width - grid_w) / 2;
  let offset_y = (height - grid_h) / 2;

  let mx = mouseX - offset_x;
  let my = mouseY - offset_y;

  if (mx >= 0 && mx < grid_w && my >= 0 && my < grid_h) {
    paste_shape(mx, my, "blob", settings.brush.size);
  }
}


function paste_shape(x, y, type, size) {
  let data = {
    type: type,
    size: size,
    density: settings.brush.density,
  };

  add_log("pasted shape", data);

  let x1 = floor(x / $grid.size);
  let y1 = floor(y / $grid.size);


  if (type === "blob") {
    for (let i = 0; i < settings.brush.density; i++) {
      let angle = random(0, TWO_PI);
      let u = random(0, 1);
      let r = sqrt(u);

      // convert polar → cartesian
      let dx = r * cos(angle) * size;
      let dy = r * sin(angle) * size;

      // convert to tile coordinates
      let x2 = x1 + round(dx);
      let y2 = y1 + round(dy);

      if (predicate_in_bounds(x2, y2)) {
        grid[x2][y2].type = ui_select_brush_type.selected();
        redraw_tile(x2, y2); // NEW
        if (ui_select_brush_type.selected() == "sponge") {
          grid[x2][y2].sponge_cooldown = int(
            random(1, settings.sponge.cooldown)
          );
        }
        if (ui_select_brush_type.selected() == "virus") {
          grid[x2][y2].virus_age = 0;
        }
      }
    }
  }
}

function move_tiles() {
  for (let x = $grid.cols - 1; x > 0; x--) {
    for (let y = $grid.rows - 1; y > 0; y--) {
      let tile = grid[x][y];
      tile.timer++;

      if (tile.timer < tile.minDelay) continue;

      let up = predicate_in_bounds(x, y - 1) && grid[x][y - 1].type === "air";
      let down = predicate_in_bounds(x, y + 1) && grid[x][y + 1].type === "air";
      let left = predicate_in_bounds(x - 1, y) && grid[x - 1][y].type === "air";
      let right =
        predicate_in_bounds(x + 1, y) && grid[x + 1][y].type === "air";
      let dl =
        predicate_in_bounds(x - 1, y + 1) && grid[x - 1][y + 1].type === "air";
      let dr =
        predicate_in_bounds(x + 1, y + 1) && grid[x + 1][y + 1].type === "air";

      let down_type;
      let up_type;
      let right_type;
      let left_type;

      if (predicate_in_bounds(x, y + 1)) {
        down_type = grid[x][y + 1].type;
      }
      if (predicate_in_bounds(x, y - 1)) {
        up_type = grid[x][y - 1].type;
      }
      if (predicate_in_bounds(x + 1, y)) {
        right_type = grid[x + 1][y].type;
      }
      if (predicate_in_bounds(x - 1, y)) {
        left_type = grid[x - 1][y].type;
      }

      // SAND
      if (tile.type === "sand") {
        if (down) {
          swap_tiles(x, y, x, y + 1);
        } else if (dl && dr) {
          swap_tiles(x, y, x + (random() < 0.5 ? -1 : 1), y + 1);
        } else if (dl) {
          swap_tiles(x, y, x - 1, y + 1);
        } else if (dr) {
          swap_tiles(x, y, x + 1, y + 1);
        }
      }

      // WATER
      if (tile.type === "water") {
        if (down) {
          swap_tiles(x, y, x, y + 1);
        } else if (left && right) {
          swap_tiles(x, y, x + (random(0, 1) < 0.5 ? -1 : 1), y);
        } else if (left) {
          swap_tiles(x, y, x - 1, y);
        } else if (right) {
          swap_tiles(x, y, x + 1, y);
        }
      }

      // SNOW
      if (tile.type === "snow") {
        if (down && floor(random(0, 3)) == 0) {
          swap_tiles(x, y, x, y + 1);
        } else if (left && right) {
          swap_tiles(x, y, x + (random(0, 1) < 0.5 ? -1 : 1), y);
        } else if (left) {
          swap_tiles(x, y, x - 1, y);
        } else if (right) {
          swap_tiles(x, y, x + 1, y);
        }
      }

      // SPONGE
      if (tile.type === "sponge") {
        if (grid[x][y].sponge_cooldown <= 0) {
          if (down_type == "water") {
            grid[x][y + 1].type = "air";
            redraw_tile(x, y + 1);
            grid[x][y].sponge_cooldown = settings.sponge.cooldown;
          }
          if (up_type == "water") {
            grid[x][y - 1].type = "air";
            redraw_tile(x, y - 1);
            grid[x][y].sponge_cooldown = settings.sponge.cooldown;
          }
          if (right_type == "water") {
            grid[x + 1][y].type = "air";
            redraw_tile(x + 1, y);
            grid[x][y].sponge_cooldown = settings.sponge.cooldown;
          }
          if (left_type == "water") {
            grid[x - 1][y].type = "air";
            redraw_tile(x - 1, y);
            grid[x][y].sponge_cooldown = settings.sponge.cooldown;
          }
        }
        grid[x][y].sponge_cooldown -= 1;
      }

      // LIFE
      if (tile.type === "life") {
        let children = 0;
        if (down && children < settings.life.max_children) {
          if (random(0, 1000) <= settings.life.rate) {
            copy_tile(x, y, x, y + 1);
          }
        }

        if (right && children < settings.life.max_children) {
          if (random(0, 1000) <= settings.life.rate) {
            copy_tile(x, y, x + 1, y);
          }
        }

        if (up && children < settings.life.max_children) {
          if (random(0, 1000) <= settings.life.rate) {
            copy_tile(x, y, x, y - 1);
          }
        }

        if (left && children < settings.life.max_children) {
          if (random(0, 1000) <= settings.life.rate) {
            copy_tile(x, y, x - 1, y);
          }
        }
      }

      // WASP
      if (tile.type === "wasp") {
        if (random(0, 1000) < settings.wasp.speed) {
          if (floor(random(0, 4)) == 0 && up) {
            swap_tiles(x, y, x, y - 1);
          } else if (floor(random(0, 3)) == 0 && right) {
            swap_tiles(x, y, x + 1, y);
          } else if (floor(random(0, 2)) == 0 && down) {
            swap_tiles(x, y, x, y + 1);
          } else if (left) {
            swap_tiles(x, y, x - 1, y);
          }
        }
      }

      // LAVA
      if (tile.type === "lava") {
        if (floor(random(0, 20)) == 0 && up) {
          swap_tiles(x, y, x, y - 1);
        } else if (floor(random(0, 12)) == 0 && right) {
          swap_tiles(x, y, x + 1, y);
        } else if (floor(random(0, 12)) == 0 && left) {
          swap_tiles(x, y, x - 1, y);
        } else if (floor(random(0, 2)) == 0 && down) {
          swap_tiles(x, y, x, y + 1);
        }

        if (up_type == "water") {
          grid[x][y].type = "stone";
          redraw_tile(x, y);
        }
        if (right_type == "water") {
          grid[x][y].type = "stone";
          redraw_tile(x, y);
        }
        if (down_type == "water") {
          grid[x][y].type = "stone";
          redraw_tile(x, y);
        }
        if (left_type == "water") {
          grid[x][y].type = "stone";
          redraw_tile(x, y);
        }

        //interact with life, lava kills life

        if (up_type == "life") {
          grid[x][y - 1].type = "air";
          redraw_tile(x, y - 1);
        }
        if (right_type == "life") {
          grid[x + 1][y].type = "air";
          redraw_tile(x, y);
        }
        if (down_type == "life") {
          grid[x][y + 1].type = "air";
          redraw_tile(x, y + 1);
        }
        if (left_type == "life") {
          grid[x - 1][y].type = "air";
          redraw_tile(x - 1, y);
        }

        // interact with snow

        if (up_type == "snow") {
          grid[x][y - 1].type = "water";
          redraw_tile(x, y - 1);
        }
        if (right_type == "snow") {
          grid[x + 1][y].type = "water";
          redraw_tile(x, y);
        }
        if (down_type == "snow") {
          grid[x][y + 1].type = "water";
          redraw_tile(x, y + 1);
        }
        if (left_type == "snow") {
          grid[x - 1][y].type = "water";
          redraw_tile(x - 1, y);
        }
      }

      //GAS
      if (tile.type === "gas") {
        let energy = 41;
        if (up_type == "gas") {
          energy -= 10;
        }
        if (right_type == "gas") {
          energy -= 10;
        }
        if (down_type == "gas") {
          energy -= 10;
        }
        if (left_type == "gas") {
          energy -= 10;
        }
        let dir = random(directions);
        if (random(0, 41) < energy) {
          if (dir == 0 && up) {
            swap_tiles(x, y, x, y - 1);
          }
          if (dir == 1 && right) {
            swap_tiles(x, y, x + 1, y);
          }
          if (dir == 2 && down) {
            swap_tiles(x, y, x, y + 1);
          }
          if (dir == 3 && left) {
            swap_tiles(x, y, x - 1, y);
          }
        }
      }

      // MUD
      if (tile.type === "mud") {
        if (down) {
          swap_tiles(x, y, x, y + 1);
        }
      }

      // VIRUS
      if (tile.type === "virus") {
        if (up_type === "life") {
          if (random(0, 1000) < settings.virus.spread_rate) {
            grid[x][y].virus_age -= settings.virus.food_value;
            grid[x][y - 1].type = "virus";
            grid[x][y - 1].virus_age = 0;
            redraw_tile(x, y - 1);
          }
        }
        if (right_type === "life") {
          if (random(0, 1000) < settings.virus.spread_rate) {
            grid[x][y].virus_age -= settings.virus.food_value;
            grid[x + 1][y].type = "virus";
            grid[x + 1][y].virus_age = 0;
            redraw_tile(x + 1, y);
          }
        }
        if (down_type === "life") {
          if (random(0, 1000) < settings.virus.spread_rate) {
            grid[x][y].virus_age -= settings.virus.food_value;
            grid[x][y + 1].type = "virus";
            grid[x][y + 1].virus_age = 0;
            redraw_tile(x, y + 1);
          }
        }
        if (left_type === "life") {
          if (random(0, 1000) < settings.virus.spread_rate) {
            grid[x][y].virus_age -= settings.virus.food_value;
            grid[x - 1][y].type = "virus";
            grid[x - 1][y].virus_age = 0;
            redraw_tile(x - 1, y);
          }
        }

        grid[x][y].virus_age += 1;
        if (grid[x][y].virus_age >= settings.virus.max_age) {
          grid[x][y].type = "air";
          redraw_tile(x, y);
        }
      }
    }
  }
}

function swap_tiles(x1, y1, x2, y2) {
  let t1 = grid[x1][y1].type;
  let t2 = grid[x2][y2].type;

  grid[x1][y1].type = t2;
  grid[x2][y2].type = t1;

  grid[x1][y1].timer = 0;
  grid[x2][y2].timer = 0;

  redraw_tile(x1, y1);
  redraw_tile(x2, y2);
}

function copy_tile(x1, y1, x2, y2) {
  let t1 = grid[x1][y1].type;
  let t2 = grid[x2][y2].type;

  // grid[x1][y1].type = t2;
  grid[x2][y2].type = grid[x1][y1].type;

  grid[x1][y1].timer = 0;
  grid[x2][y2].timer = 0;

  //redraw_tile(x1, y1);
  redraw_tile(x2, y2);
}

function detect_pen_size_change() {
  if (previous_pen_size !== ui_brush_size.value() && !mouseIsPressed) {
    let size1 = ui_brush_size.value();
    previous_pen_size = size1;
    let size2 = size1 * (size1 * 0.01 * pow(size1, size1 * 0.0001));
    settings.brush.size = size2;

    console.log(`Pen size updated to ${size2}.`);
  }
}

function detect_brush_density_change() {
  if (previous_brush_density !== ui_brush_density.value() && !mouseIsPressed) {
    let size1 = ui_brush_density.value();
    previous_brush_density = size1;
    let size2 = size1 * (size1 * 0.05 * pow(size1, size1 * 0.01));
    settings.brush.density = size2;

    console.log(`Brush density updated to ${size2}.`);
  }
}

function add_log(description, data) {}

function run_events() {
  if (events.rain.enabled == true) {
    for (let i = 0; i < events.rain.rate; i++) {
      if (random(0, 1000) < events.rain.density) {
        grid[floor(random(0, $grid.cols))][1].type = "water";
      }
    }
  }
}

class createToggle {
  constructor(x, y, w, h, initial_state = false) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.state = initial_state;
  }

  toggle() {
    this.state = !this.state;
  }

  contains(px, py) {
    return (
      px > this.x && px < this.x + this.w && py > this.y && py < this.y + this.h
    );
  }
}

function getTime() {
  return;
}

function new_terrain(smoothing, amplitude, level) {
  for (let x = 0; x < $grid.cols; x++) {
    let y = floor(noise(x * smoothing) * amplitude) + level;

    for (let y2 = y; y2 < $grid.rows; y2++) {
      grid[x][y2].type = "stone";
      redraw_tile(x, y2);
    }
  }
}
