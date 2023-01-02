const requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
  window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
const cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame;

//const PIXEL_RATIO = (function () {
//  let ctx = document.createElement("canvas").getContext("2d"),
//    dpr = window.devicePixelRatio || 1,
//    bsr = ctx.webkitBackingStorePixelRatio ||
//      ctx.mozBackingStorePixelRatio ||
//      ctx.msBackingStorePixelRatio ||
//      ctx.oBackingStorePixelRatio ||
//      ctx.backingStorePixelRatio || 1;

//  return dpr / bsr;
//})();


//createHiDPICanvas = function (w, h, ratio) {
//  if (!ratio) { ratio = PIXEL_RATIO; }
//  let can = document.createElement("canvas");
//  can.width = w * ratio;
//  can.height = h * ratio;
//  can.style.width = w + "px";
//  can.style.height = h + "px";
//  can.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
//  return can;
//}

class Block {
  x;
  y;
  width;
  height;
  type;
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
    game.score += 80;
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
  font_size: undefined,
  width: undefined,
  height: undefined,
  border_width: undefined,
  info_height: undefined,
  block_types: undefined,
  block_width: undefined,
  block_height: undefined,
  blocks: undefined,
  ball: undefined,
  platform: undefined,
  score: 0,
  block_number: 0,
  levels: undefined,
  level: 1,
  running: undefined,
  inMenu: undefined,
  nextLevel: undefined,
  background: undefined,
  audio_current_playing: undefined,
  sprites: {
    logo: undefined,
    background: undefined,
    platform: undefined,
    powerup: undefined,
    block: undefined,
  },
  sounds: {
    standart_block: undefined,
    strong_block: undefined,
    platform: undefined,
  },

  init: function () {
    //const canvas = createHiDPICanvas(244, 260);
    const canvas = document.getElementById("canvas");
    this.ctx = canvas.getContext("2d");

    this.info_height = Math.round(canvas.height / 13);
    this.width = canvas.width;
    this.height = canvas.height - this.info_height;
    this.border_width = 8;
    this.block_width = 16;
    this.block_height = 8;
    this.font_size = Math.round(this.info_height / 4);
    this.font_size = 5;
    this.ctx.font = this.font_size + "px pixelFont";
    this.ctx.textBaseline = "top";

    Promise.all([this.load(), this.loadLevel(), this.loadBlocks()])
      .then(() => { this.menu() });

  },
  loadBlocks: function () {
    return new Promise((resolve) => {
      fetch("../block_types.json")
        .then((data) => data.json())
        .then((json) => {
          this.block_types = json;
          resolve();
        });
    })
  },
  loadLevel: function () {
    return new Promise((resolve) => {
      fetch("../levels.json")
        .then((data) => data.json())
        .then((json) => {
          this.levels = json;
          resolve();
        });
    })
  },
  load: function () {
    return new Promise((resolve) => {
      for (let key in this.sprites) {
        this.sprites[key] = new Image();
        this.sprites[key].src = "img/" + key + ".png";
      }
      for (let key in this.sounds) {
        //this.sounds[key] = new Audio("sounds/" + key + ".wav");
        this.sounds[key] = new Audio();
        const src1 = document.createElement("source");
        src1.type = "audio/mpeg";
        src1.src = "sounds/" + key + ".wav";
        this.sounds[key].appendChild(src1);
      }
      resolve();
    })
  },
  menu: function () {
    this.ctx.clearRect(0, 0, this.width, this.height + this.info_height);
    this.ctx.fillStyle = "#111111";
    this.ctx.fillRect(0, 0, this.width, this.height + this.info_height);
    this.ctx.drawImage(this.sprites.logo, Math.round(this.width / 2 - this.sprites.logo.width / 2), Math.round(this.height / 4), this.sprites.logo.width, this.sprites.logo.height);
    this.ctx.fillStyle = "#ff0000";
    this.ctx.fillText("Score", this.border_width, this.height + 2);
    this.ctx.fillText("High score", this.width / 2, this.height + 2);
    this.ctx.fillStyle = "#fff";
    this.ctx.fillText(this.score.toString(), this.border_width, this.height + 10);
    this.ctx.fillText(this.score.toString(), this.width / 2, this.height + 10);

    this.ctx.textAlign = "center";
    let timeout;
    const interval = setInterval(() => {
      this.ctx.fillStyle = "#fff";
      this.ctx.fillText("Press mouse to start", this.width / 2, this.height / 2);
      timeout = setTimeout(() => {
        this.ctx.fillStyle = "#111111";
        this.ctx.fillRect(0, this.height / 2, this.width, this.font_size * 2);
      }, 500);
    }, 700);

    window.addEventListener('click', function listener() {
      clearTimeout(timeout);
      clearInterval(interval);
      game.start();
    }, { once: true });
  },
  start: function () {
    this.setControl();
    this.newLevel();
  },
  setControl: function () {
    const ratio = (this.width) / canvas.getBoundingClientRect().width;
    window.addEventListener("mousemove", function (e) {
      let ev = e || event;
      let relativeX = (ev.clientX - canvas.offsetLeft) * ratio;
      let new_x = relativeX - game.platform.width / 2;
      if (new_x < game.border_width)
        new_x = game.border_width;
      else if (new_x + game.platform.width > canvas.width - game.border_width)
        new_x = canvas.width - game.platform.width - game.border_width;
      game.platform.move(new_x);
    });

    window.addEventListener('click', function () {
      if (game.inMenu) {
        game.start();
      }
      else if (game.running) {
        game.platform.releaseBall();
      }
    });
  },
  newLevel: function () {
    this.blocks = [];
    this.platform.init(this.platform.MEDIUM);
    this.ball.init(this.platform);
    this.create();
    this.running = true;
    this.nextLevel = false;
    this.run();
    if (this.nextLevel) {
      this.newLevel();
    }
    else {
      // this.menu();
    }
  },

  create: async function () {
    const cur_level = this.levels["level_" + this.level];
    const start_y = cur_level.row_offset * this.block_height + this.border_width;
    const start_x = cur_level.column_offset * this.block_width + this.border_width;

    this.background = cur_level.background_sprite;

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
        this.block_number++;
      }
    }
  },
  run: function () {
    this.update();
    this.render();

    if (this.running) {
      // requestAnimationFrame(function () {
      //   game.run();
      // });
      setTimeout(() => { game.run() }, 10);
    }
  },
  render: function () {
    this.ctx.clearRect(0, 0, this.width, this.height + this.info_height);
    this.ctx.drawImage(this.sprites.background, this.background.x, this.background.y, this.background.width, this.background.height, 0, 0, this.width, this.height);
    this.ctx.drawImage(this.sprites.platform, this.platform.sprite.x, this.platform.sprite.y, this.platform.sprite.width, this.platform.sprite.height, Math.round(this.platform.x), Math.round(this.platform.y), this.platform.width, this.platform.height);
    this.ctx.drawImage(this.sprites.platform, this.ball.sprite.x, this.ball.sprite.y, this.ball.sprite.width, this.ball.sprite.height, Math.round(this.ball.x), Math.round(this.ball.y), this.ball.width, this.ball.height);
    this.blocks.forEach(function (element) {
      if (element.isAlive) {
        this.ctx.drawImage(this.sprites.block, element.sprite.x, element.sprite.y, element.sprite.width, element.sprite.height, element.x, element.y, element.width, element.height);
      }
    }, this);
    this.ctx.textAlign = "start";
    this.ctx.fillStyle = "#111111";
    this.ctx.fillRect(0, this.height, this.width, this.info_height);
    this.ctx.fillStyle = "#ff0000";
    this.ctx.fillText("SCORE", this.border_width, this.height + 2);
    this.ctx.fillText("HIGH SCORE", this.width / 2, this.height + 2);
    this.ctx.fillStyle = "#fff";
    this.ctx.fillText(this.score.toString(), this.border_width, this.height + 10);
    this.ctx.fillText(this.score.toString(), this.width / 2, this.height + 10);
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
  over: function (win) {
    this.running = false;
    if (win) {
      //console.log("Win");
      this.level++;
      this.nextLevel = true;
    }
    else {
      //console.log("Game over");
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
}

game.platform = {
  SMALL: "small",
  MEDIUM: "mid",
  BIG: "big",
  type: undefined,
  x: undefined,
  y: undefined,
  width: undefined,
  hight: undefined,
  ball: undefined,
  sprite: undefined,
  animation: undefined,


  init: function (type) {
    if (type === this.MEDIUM) {
      this.type = type;
      this.width = 32;
      this.height = 8;
      this.x = game.width / 2 - this.width / 2;
      this.y = game.height * 0.9;
      this.ball = game.ball;
      this.sprite = {
        x: 32,
        y: 40,
        width: 32,
        height: 8,
      };
      this.animation = {
        x_start: 32,
        y_start: 40,
        x_step_size: 0,
        y_step_size: -8,
        number_of_steps: 6,
        step_duration_ms: 200,
      };
      this.animatePlatform();
    }
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
    const cur_type = this.type;

    const animator = setInterval(() => {

      if (cur_type !== this.type) {
        clearInterval(animator);
        return;
      }

      cur_step = (cur_step + 1) % this.animation.number_of_steps;
      this.sprite.x = this.animation.x_start + this.animation.x_step_size * cur_step;
      this.sprite.y = this.animation.y_start + this.animation.y_step_size * cur_step;

    }, this.animation.step_duration_ms, cur_type);
  }

}

//Object.defineProperty(
//  game.platform,
//  {
//    SMALL: {
//      enumerable: true,
//      value: 'small',
//    },
//    MEDIUM: {
//      enumerable: true,
//      value: 'mid',
//    },
//    MEDIUM: {
//      enumerable: true,
//      value: 'big',
//    }
//  }
//);

window.addEventListener("load", function () {
  game.init();
});