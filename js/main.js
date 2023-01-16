const requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
  window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
const cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame;

class Block {
  x;
  y;
  width;
  height;
  type;
  score;
  sprite = {
  };
  animation = {
  };
  isAlive;
  lastLife = true;

  constructor(x, y, width, height, block_type, isAlive) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = block_type.type;
    this.score = block_type.score;
    Object.assign(this.sprite, block_type.sprite);
    Object.assign(this.animation, block_type.animation);
    this.isAlive = isAlive;
    if (this.type === game.block_types.SILVER.type)
      this.lastLife = false;
  }

  hit() {
    if (this.type === game.block_types.SILVER.type) {
      if (this.lastLife) {
        game.play_audio(game.sounds.standart_block);
        this.destroyBlock();
      }
      else {
        game.play_audio(game.sounds.strong_block);
        this.animateBlock(this.animation);
        this.lastLife = true;
      }
    }
    else {
      game.play_audio(game.sounds.standart_block);
      this.destroyBlock();
    }
  }

  destroyBlock() {
    this.isAlive = false;
    game.block_number--;
    game.addScore(this.score);
  }

  animateBlock(animation) {
    const step_duration = game.animation_duration_in_ms / animation.number_of_steps;
    let cur_step = 0;

    const animator = setInterval(() => {
      if (!this.isAlive) {
        clearInterval(animator);
        return;
      }

      const cur_animation_frame = (cur_step + 1) % animation.number_of_steps;
      this.sprite.x = animation.x_start + animation.x_step_size * cur_animation_frame;
      this.sprite.y = animation.y_start + animation.y_step_size * cur_animation_frame;

      if (++cur_step === animation.number_of_steps) {
        clearInterval(animator);
        return;
      }

    }, this.animation.step_duration_ms);
  }
}

const game = {
  ctx: undefined,
  font_size: 5,
  width: undefined,
  height: undefined,
  border_width: 8,
  info_height: undefined,
  block_types: undefined,
  platform_types: undefined,
  block_width: 16,
  block_height: 8,
  moveControl: undefined,
  startControl: undefined,
  blocks: undefined,
  game_velocity: 2.5,
  game_intended_fps: 60,
  ball: undefined,
  platform: undefined,
  score: 0,
  best_score: 0,
  block_number: 0,
  levels: undefined,
  level: undefined,
  levelStartAnim: undefined,
  running: undefined,
  inMenu: undefined,
  background: undefined,
  audio_current_playing: undefined,
  old_time: 0,
  sprites: {
    logo: undefined,
    background: undefined,
    platform: undefined,
    powerup: undefined,
    block: undefined,
  },
  sounds: {
    main_menu: undefined,
    level_start: undefined,
    standart_block: undefined,
    strong_block: undefined,
    platform: undefined,
  },

  init: function () {
    const canvas = document.getElementById("canvas");
    this.ctx = canvas.getContext("2d");
    this.info_height = Math.round(canvas.height / 13);
    this.width = canvas.width;
    this.height = canvas.height - this.info_height;
    this.font_size = Math.round(this.info_height / 4);
    this.ctx.font = this.font_size + "px pixelFont";
    this.ctx.textBaseline = "top";
    function loadSprites() {
      return new Promise((resolve) => {
        const keys = Object.keys(game.sprites);
        let i = 0;
        const loop = (key) => {
          game.sprites[key] = new Image();
          game.sprites[key].onload = () => {
            if (i == keys.length - 1)
              resolve();
            else
              loop(keys[++i]);
          }
          game.sprites[key].src = "img/" + key + ".png";
        }
        loop(keys[i]);
      })
    };
    function loadSounds() {
      return new Promise((resolve) => {
        const keys = Object.keys(game.sounds);
        let i = 0;
        const loop = (key) => {
          game.sounds[key] = new Audio("sounds/" + key + ".wav");
          game.sounds[key].onloadstart = () => {
            if (i == keys.length - 1)
              resolve();
            else
              loop(keys[++i]);
          }
        }
        loop(keys[i]);
      })
    };
    Promise.all([loadSprites(), loadSounds()])
      .then(() => { this.menu() });

  },
  menu: function () {
    this.play_audio(this.sounds.main_menu);
    this.level = 1;
    this.ctx.clearRect(0, 0, this.width, this.height + this.info_height);
    this.ctx.fillStyle = "#111111";
    this.ctx.fillRect(0, 0, this.width, this.height + this.info_height);
    this.ctx.drawImage(this.sprites.logo, Math.round(this.width / 2 - this.sprites.logo.width / 2), Math.round(this.height / 4), this.sprites.logo.width, this.sprites.logo.height);
    this.ctx.fillStyle = "#ff0000";
    this.ctx.fillText("Score", this.border_width, this.height + 2 + 0.8);
    this.ctx.fillText("High score", this.width / 2, this.height + 2 + 0.8);
    this.ctx.fillStyle = "#fff";
    this.ctx.fillText(addSpace(this.score), this.border_width, this.height + 10 + 0.8);
    this.ctx.fillText(addSpace(this.best_score), this.width / 2, this.height + 10 + 0.8);
    function addSpace(score) {
      return score.toString().split('').join(' ');
    }
    this.ctx.textAlign = "center";
    let timeout;
    const interval = setInterval(() => {
      this.ctx.fillStyle = "#fff";

      this.ctx.fillText("Press mouse to start", this.width / 2, this.height / 2 + 0.8);
      timeout = setTimeout(() => {
        this.ctx.fillStyle = "#111111";
        this.ctx.fillRect(0, this.height / 2, this.width, this.font_size * 2);
      }, 500);
    }, 700);

    window.addEventListener('click', function listener() {
      game.score = 0;
      clearTimeout(timeout);
      clearInterval(interval);
      game.start();
    }, { once: true });
  },
  start: function () {
    this.newLevel();
    this.run();
  },
  newLevel: function () {
    this.levelStartAnim = true;
    this.play_audio(this.sounds.level_start);
    this.removeControl();
    this.blocks = [];
    //this.ball.velocity = 0;
    this.create();
    this.running = true;

    setTimeout(() => {
      this.setControl();
      this.platform.init(this.platform_types.START);
      this.ball.init(this.platform);
      this.levelStartAnim = false;
    }, 1500);
  },
  setControl: function () {
    const ratio = (this.width) / canvas.getBoundingClientRect().width;
    this.moveControl = function (e) {
      let ev = e || event;
      let relativeX = (ev.clientX - canvas.offsetLeft) * ratio;
      let new_x = relativeX - game.platform.width / 2;
      if (new_x < game.border_width)
        new_x = game.border_width;
      else if (new_x + game.platform.width > canvas.width - game.border_width)
        new_x = canvas.width - game.platform.width - game.border_width;
      game.platform.move(new_x);
    };
    this.startControl = function () {
      if (game.inMenu) {
        game.start();
      }
      else if (game.running) {
        game.platform.releaseBall();
      }
    };

    window.addEventListener("mousemove", this.moveControl);
    window.addEventListener('click', this.startControl);
  },
  removeControl: function () {
    window.removeEventListener("mousemove", this.moveControl);
    window.removeEventListener('click', this.startControl);
  },
  create: async function () {
    const cur_level = game.levels["level_" + this.level];
    const start_y = cur_level.row_offset * this.block_height + this.border_width;
    const start_x = cur_level.column_offset * this.block_width + this.border_width;

    this.background = cur_level.background_sprite;
    this.block_number = 0;

    for (let row = 0; row < cur_level.structure.length; row++) {
      for (let col = 0; col < cur_level.structure[row].length; col++) {
        const cur_block_type_name = cur_level.structure[row][col];
        if (cur_block_type_name === this.block_types.NULL.type)
          continue;
        const cur_block = new Block(
          start_x + this.block_width * col,
          start_y + this.block_height * row,
          this.block_width,
          this.block_height,
          this.block_types[cur_block_type_name],
          true
        );
        this.blocks.push(cur_block);
        if (cur_block_type_name !== "GOLD")
          this.block_number++;
      }
    }
  },

  run: function () {
    if (!this.levelStartAnim)
      this.update();

    if (this.running) {
      this.render();
      requestAnimationFrame((time) => {
        this.ball.fpsAdjust(time - this.old_time)
        this.old_time = time;
        this.run();
      });
      //setTimeout(() => { game.run() }, 10);
    }
  },
  render: function () {
    this.ctx.clearRect(0, 0, this.width, this.height + this.info_height);
    this.ctx.drawImage(this.sprites.background, this.background.x, this.background.y, this.background.width, this.background.height, 0, 0, this.width, this.height);
    this.blocks.forEach(function (element) {
      if (element.isAlive) {
        this.ctx.drawImage(this.sprites.block, element.sprite.x, element.sprite.y, element.sprite.width, element.sprite.height, element.x, element.y, element.width, element.height);
      }
    }, this);
    this.ctx.textAlign = "start";
    this.ctx.fillStyle = "#111111";
    this.ctx.fillRect(0, this.height, this.width, this.info_height);
    this.ctx.fillStyle = "#ff0000";
    this.ctx.fillText("SCORE", this.border_width, this.height + 2 + 0.8);
    this.ctx.fillText("HIGH SCORE", this.width / 2, this.height + 2 + 0.8);
    this.ctx.fillStyle = "#fff";
    this.ctx.fillText(addSpace(this.score), this.border_width, this.height + 10 + 0.8);
    this.ctx.fillText(addSpace(this.best_score), this.width / 2, this.height + 10 + 0.8);

    if (this.levelStartAnim) {
      this.ctx.textAlign = "center";
      this.ctx.fillStyle = "#fff";
      this.ctx.fillText("ROUND " + this.level, this.width / 2, Math.round(2 * this.height / 3) + 0.8);
      this.ctx.fillText("READY", this.width / 2, Math.round(2 * this.height / 3) + 20 + 0.8);
    }
    else {
      this.ctx.drawImage(this.sprites.platform, this.platform.sprite.x, this.platform.sprite.y, this.platform.sprite.width, this.platform.sprite.height, Math.round(this.platform.x), Math.round(this.platform.y), this.platform.width, this.platform.height);
      this.ctx.drawImage(this.sprites.platform, this.ball.sprite.x, this.ball.sprite.y, this.ball.sprite.width, this.ball.sprite.height, Math.round(this.ball.x), Math.round(this.ball.y), this.ball.width, this.ball.height);
    }

    function addSpace(score) {
      return score.toString().split('').join(' ');
    }
  },
  update: function () {
    if (this.ball.collidePlatform(this.platform)) {
      this.ball.bumpPlatform(this.platform);
    }
    do {
      this.ball.closest_collision.far = -1;
      this.blocks.forEach(function (element) {
        if (element.isAlive) {
          this.ball.collideBlock(element);
        }
      }, this);

      let collision = this.ball.closest_collision;
      if (collision.far !== -1) {
        this.ball.bump(collision.el, collision.side);
      }
    } while (this.ball.closest_collision.far !== -1);

    if (this.ball.dirX || this.ball.dirY) {
      this.ball.move();
    }

    this.ball.checkBounds();
  },
  addScore: function (num) {
    this.score += num;
    if (this.score > this.best_score)
      this.best_score = this.score;
  },
  over: function (win) {
    this.running = false;
    if (win) {
      this.level++;
      this.newLevel();
    }
    else {

      setTimeout(() => { this.menu() }, 0);
    }
  },
  play_audio(audio) {
    if (this.audio_current_playing) {
      this.audio_current_playing.pause();
      this.audio_current_playing.currentTime = 0;
    }
    this.audio_current_playing = audio;
    audio.play();
  },
};

game.ball = {
  x: undefined,
  y: undefined,
  width: undefined,
  height: undefined,
  dirX: undefined,
  dirY: undefined,
  velocity: undefined,
  closest_collision: undefined,
  sprite: undefined,

  init: function (platform) {
    this.width = 5;
    this.height = 4;
    this.x = platform.x + platform.width / 2 - this.width / 2;
    this.y = platform.y - this.height;
    this.dirX = 0;
    this.dirY = 0;
    this.velocity = 2.5;
    this.closest_collision = {
      el: undefined,
      far: -1,
      side: undefined,
    };
    this.sprite = {
      x: 0,
      y: 40,
      width: 5,
      height: 4,
    }

  },
  jump: function () {
    this.dirY = -Math.sin(Math.PI / 3);
    this.dirX = Math.cos(Math.PI / 3);
  },
  move: function () {
    this.x += this.dirX * this.velocity;
    this.y += this.dirY * this.velocity;
  },
  collideBlock: function (element) {
    let start1 = { x: this.x + this.width / 2, y: this.y + this.height / 2 };
    let end1 = { x: start1.x + this.dirX * this.velocity, y: start1.y + this.dirY * this.velocity };
    let dir1 = { x: end1.x - start1.x, y: end1.y - start1.y };

    let start2, end2;


    if (this.dirY < 0) {
      start2 = { x: element.x - 2, y: element.y + element.height + 2 };
      end2 = { x: element.x + element.width + 2, y: element.y + element.height + 2 };
    }
    else {
      start2 = { x: element.x - 2, y: element.y - 2 };
      end2 = { x: element.x + element.width + 2, y: element.y - 2 };
    }

    let a1 = -dir1.y;
    let b1 = dir1.x;
    let d1 = -(a1 * start1.x + b1 * start1.y);

    for (let i = 0; i < 2; i++) {
      let dir2 = { x: end2.x - start2.x, y: end2.y - start2.y };

      let a2 = -dir2.y;
      let b2 = dir2.x;
      let d2 = -(a2 * start2.x + b2 * start2.y);

      let seg1_line2_start = a2 * start1.x + b2 * start1.y + d2;
      let seg1_line2_end = a2 * end1.x + b2 * end1.y + d2;

      let seg2_line1_start = a1 * start2.x + b1 * start2.y + d1;
      let seg2_line1_end = a1 * end2.x + b1 * end2.y + d1;

      if (seg1_line2_start * seg1_line2_end < 0 && seg2_line1_start * seg2_line1_end < 0) {
        let u = seg1_line2_start / (seg1_line2_start - seg1_line2_end);
        let out_intersection = u * this.velocity;

        if (this.closest_collision.far === -1 || out_intersection < this.closest_collision.far) {
          this.closest_collision.far = out_intersection;
          this.closest_collision.el = element;
          this.closest_collision.side = i;
        }
      }

      if (i === 1)
        return;

      if (this.dirX < 0) {
        start2 = { x: element.x + element.width + 2, y: element.y - 2 };
        end2 = { x: element.x + element.width + 2, y: element.y + element.height + 2 };
      }
      else {
        start2 = { x: element.x - 2, y: element.y - 2 };
        end2 = { x: element.x - 2, y: element.y + element.height + 2 };
      }
    }
  },
  collidePlatform: function (element) {
    let x = this.x + this.dirX * this.velocity;
    let y = this.y + this.dirY * this.velocity;

    if (x + this.width > element.x &&
      x < element.x + element.width &&
      y + this.height > element.y &&
      y < element.y + element.height) {

      return true;
    }

    return false;
  },
  bump: function (block, c_type) {
    if (c_type === 0)
      this.dirY *= -1;
    else
      this.dirX *= -1;

    block.hit();

    if (game.block_number === 0) {
      game.over(true);
    }
  },
  bumpPlatform: function (platform) {
    game.play_audio(game.sounds.platform);
    let ball_center = this.x + this.width / 2;
    let p_center = platform.x + platform.width / 2;
    let b_p_x = ball_center - p_center;
    let dir = b_p_x / (platform.width / 2) * 0.75;
    if (Math.abs(dir) >= 1) {
      this.dirX = this.dirX * -1;
      this.dirY = Math.sqrt(1 - this.dirX ** 2);
    }
    else {
      this.dirX = dir;
      this.dirY = -Math.sqrt(1 - this.dirX ** 2);
    }
  },
  checkBounds: function () {
    let x = this.x + this.dirX * this.velocity;
    let y = this.y + this.dirY * this.velocity;

    if (x < game.border_width) {
      this.x = game.border_width;
      this.dirX *= -1;
    }
    else if (x + this.width > game.width - game.border_width) {
      this.x = game.width - this.width - game.border_width;
      this.dirX *= -1;
    }
    else if (y < game.border_width) {
      this.y = game.border_width;
      this.dirY *= -1;
    }
    else if (y + this.height > game.height) {
      game.over(false);
    }
  },
  fpsAdjust: function (time) {
    console.log(time);
    const v = game.game_velocity * time / (1000 / game.game_intended_fps);
    console.log(v);
    this.velocity = v;
  }
}

game.platform = {
  type: undefined,
  x: undefined,
  y: undefined,
  width: undefined,
  height: undefined,
  ball: undefined,
  sprite: undefined,
  animator: undefined,
  animation: undefined,


  init: function (platform_type) {
    this.type = platform_type;
    this.width = platform_type.width;
    this.height = platform_type.height;
    if (platform_type.type === "START") {
      this.x = game.width / 2 - this.width / 2;
      this.y = game.height * 0.9;
      this.ball = game.ball;
    }
    this.sprite = platform_type.sprite;
    this.animation = platform_type.animation;
    this.animatePlatform();
  },
  move: function (new_x) {
    this.x = new_x;

    if (this.ball) {
      this.ball.x = this.x + this.width / 2 - this.ball.width / 2;
    }
  },

  releaseBall: function () {
    if (!this.ball)
      return;
    this.ball.jump();
    this.ball = false;
  },

  animatePlatform: function () {
    let cur_step = 0;
    const cur_type = this.type.type;
    if (this.animator)
      clearInterval(this.animator);
    this.animator = setInterval(() => {

      if (cur_type !== this.type.type) {
        clearInterval(animator);
        return;
      }

      cur_step = (cur_step + 1) % this.animation.number_of_steps;
      if (this.animation.once === true && cur_step === 0) {
        clearInterval(this.animator);
        this.init(game.platform_types[this.type.nextType]);
        return;
      }
      this.sprite.x = this.animation.x_start + this.animation.x_step_size * cur_step;
      this.sprite.y = this.animation.y_start + this.animation.y_step_size * cur_step;



    }, this.animation.step_duration_ms, cur_type);
  }
}

game.block_types = {
  NULL: {
    type: "NULL",
  },
  WHITE: {
    type: "WHITE",
    sprite: {
      x: 0,
      y: 0,
      width: 16,
      height: 8
    },
    score: 50
  },
  ORANGE: {
    type: "ORANGE",
    sprite: {
      x: 16,
      y: 0,
      width: 16,
      height: 8
    },
    score: 60
  },
  RED: {
    type: "RED",
    sprite: {
      x: 0,
      y: 8,
      width: 16,
      height: 8
    },
    score: 90
  },
  BLUE: {
    type: "BLUE",
    sprite: {
      x: 16,
      y: 8,
      width: 16,
      height: 8
    },
    score: 100
  },
  CYAN: {
    type: "CYAN",
    sprite: {
      x: 32,
      y: 0,
      width: 16,
      height: 8
    },
    score: 70
  },
  GREEN: {
    type: "GREEN",
    sprite: {
      x: 48,
      y: 0,
      width: 16,
      height: 8
    },
    score: 80
  },
  MAGENTA: {
    type: "MAGENTA",
    sprite: {
      x: 32,
      y: 8,
      width: 16,
      height: 8
    },
    score: 110
  },
  YELLOW: {
    type: "YELLOW",
    sprite: {
      x: 48,
      y: 8,
      width: 16,
      height: 8
    },
    score: 120
  },
  SILVER: {
    type: "SILVER",
    sprite: {
      x: 0,
      y: 16,
      width: 16,
      height: 8
    },
    animation: {
      x_start: 0,
      y_start: 16,
      x_step_size: 16,
      y_step_size: 0,
      number_of_steps: 6,
      step_duration_ms: 100
    },
    score: 50
  },
  GOLD: {
    type: "GOLD",
    sprite: {
      x: 0,
      y: 24,
      width: 16,
      height: 8
    },
    animation: {
      x_start: 0,
      y_start: 24,
      x_step_size: 16,
      y_step_size: 0,
      number_of_steps: 6,
      step_duration_ms: 100
    }
  }
};

game.platform_types = {
  START: {
    type: "START",
    width: 32,
    height: 8,
    sprite: {
      x: 0,
      y: 48,
      width: 32,
      height: 8
    },
    animation: {
      x_start: 0,
      y_start: 0,
      x_step_size: 0,
      y_step_size: 8,
      number_of_steps: 5,
      step_duration_ms: 200,
      once: true
    },
    nextType: "MID"
  },
  MID: {
    type: "MID",
    width: 32,
    height: 8,
    sprite: {
      x: 32,
      y: 40,
      width: 32,
      height: 8
    },
    animation: {
      x_start: 32,
      y_start: 40,
      x_step_size: 0,
      y_step_size: -8,
      number_of_steps: 6,
      step_duration_ms: 200,
      once: false
    }
  }
};

game.levels = {
  level_0: {
    row_offset: 4,
    column_offset: 12,
    structure: [
      [
        "RED"
      ]
    ],
    background_sprite: {
      x: 0,
      y: 0,
      width: 224,
      height: 240
    }
  },
  level_1: {
    row_offset: 4,
    column_offset: 0,
    structure: [
      [
        "SILVER",
        "SILVER",
        "SILVER",
        "SILVER",
        "SILVER",
        "SILVER",
        "SILVER",
        "SILVER",
        "SILVER",
        "SILVER",
        "SILVER",
        "SILVER",
        "SILVER"
      ],
      [
        "RED",
        "RED",
        "RED",
        "RED",
        "RED",
        "RED",
        "RED",
        "RED",
        "RED",
        "RED",
        "RED",
        "RED",
        "RED"
      ],
      [
        "YELLOW",
        "YELLOW",
        "YELLOW",
        "YELLOW",
        "YELLOW",
        "YELLOW",
        "YELLOW",
        "YELLOW",
        "YELLOW",
        "YELLOW",
        "YELLOW",
        "YELLOW",
        "YELLOW"
      ],
      [
        "BLUE",
        "BLUE",
        "BLUE",
        "BLUE",
        "BLUE",
        "BLUE",
        "BLUE",
        "BLUE",
        "BLUE",
        "BLUE",
        "BLUE",
        "BLUE",
        "BLUE"
      ],
      [
        "MAGENTA",
        "MAGENTA",
        "MAGENTA",
        "MAGENTA",
        "MAGENTA",
        "MAGENTA",
        "MAGENTA",
        "MAGENTA",
        "MAGENTA",
        "MAGENTA",
        "MAGENTA",
        "MAGENTA",
        "MAGENTA"
      ],
      [
        "GREEN",
        "GREEN",
        "GREEN",
        "GREEN",
        "GREEN",
        "GREEN",
        "GREEN",
        "GREEN",
        "GREEN",
        "GREEN",
        "GREEN",
        "GREEN",
        "GREEN"
      ]
    ],
    background_sprite: {
      x: 0,
      y: 0,
      width: 224,
      height: 240
    }
  },
  level_2: {
    row_offset: 2,
    column_offset: 0,
    structure: [
      [
        "WHITE"
      ],
      [
        "WHITE",
        "ORANGE"
      ],
      [
        "WHITE",
        "ORANGE",
        "CYAN"
      ],
      [
        "WHITE",
        "ORANGE",
        "CYAN",
        "GREEN"
      ],
      [
        "WHITE",
        "ORANGE",
        "CYAN",
        "GREEN",
        "RED"
      ],
      [
        "WHITE",
        "ORANGE",
        "CYAN",
        "GREEN",
        "RED",
        "BLUE"
      ],
      [
        "WHITE",
        "ORANGE",
        "CYAN",
        "GREEN",
        "RED",
        "BLUE",
        "MAGENTA"
      ],
      [
        "WHITE",
        "ORANGE",
        "CYAN",
        "GREEN",
        "RED",
        "BLUE",
        "MAGENTA",
        "YELLOW"
      ],
      [
        "WHITE",
        "ORANGE",
        "CYAN",
        "GREEN",
        "RED",
        "BLUE",
        "MAGENTA",
        "YELLOW",
        "WHITE"
      ],
      [
        "WHITE",
        "ORANGE",
        "CYAN",
        "GREEN",
        "RED",
        "BLUE",
        "MAGENTA",
        "YELLOW",
        "WHITE",
        "ORANGE"
      ],
      [
        "WHITE",
        "ORANGE",
        "CYAN",
        "GREEN",
        "RED",
        "BLUE",
        "MAGENTA",
        "YELLOW",
        "WHITE",
        "ORANGE",
        "CYAN"
      ],
      [
        "WHITE",
        "ORANGE",
        "CYAN",
        "GREEN",
        "RED",
        "BLUE",
        "MAGENTA",
        "YELLOW",
        "WHITE",
        "ORANGE",
        "CYAN",
        "GREEN"
      ],
      [
        "SILVER",
        "SILVER",
        "SILVER",
        "SILVER",
        "SILVER",
        "SILVER",
        "SILVER",
        "SILVER",
        "SILVER",
        "SILVER",
        "SILVER",
        "SILVER",
        "RED"
      ]
    ],
    background_sprite: {
      x: 232,
      y: 0,
      width: 224,
      height: 240
    }
  }
};

window.addEventListener("load", function () {
  game.init();
});