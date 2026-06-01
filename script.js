// Game variables
let peritImg;
let bgm;
let starSound;
let characterY;
let characterVelocity;
let gravity = 0.2;
let flapPower = 0.2;
let gameActive = false;
let gameOver = false;
let score = 0;
let debugKeyPressed = false;

// Character animation
let frameIndex = 0;
let frameCounter = 0;
const frameWidth = 40;
const frameHeight = 42;
const animationFrames = [0, 1, 0, 2]; // Right, Middle, Right, Left
const totalFrames = 4;


// Walls
let walls = [];
let wallSpeed = 4;
const wallFrameInterval = 84.55; // frames (170BPM * 4 beats at 60fps - fine tuned)
let wallNumber = 0; // Track wall count
let lastAudioTime = 0; // For audio sync

// Stars
let stars = [];
const starSize = 20;
const starSpawnChance = 1;
const starPoints = 4;

// Game constants
const characterX = 130;

// Debug mode
let showDebugInfo = false;

function preload() {
  peritImg = loadImage('assets/perit.png');
  bgm = loadSound('assets/bgm.mp3');
  starSound = loadSound('assets/star.mp3');
}

function setup() {
  let container = select('#p5-container');
  let canvas = createCanvas(800, 600);
  canvas.parent(container);
  frameRate(60);
  
  characterY = height / 2;
  characterVelocity = 0;

  bgm.setVolume(0.1);
}

function draw() {
  background(40);
  
  // Check for debug toggle
  if (keyIsPressed && (key === 'd' || key === 'D')) {
    if (!debugKeyPressed) {
      showDebugInfo = !showDebugInfo;
      debugKeyPressed = true;
    }
  } else {
    debugKeyPressed = false;
  }

  if (!gameActive && !gameOver) {
    drawStartScreen();
  } else if (gameActive) {
    update();
    checkCollisions();
    drawGame();
    
    if (gameOver) {
      drawGameOver();
    }
  } else if (gameOver) {
    drawGame();
    drawGameOver();
  }
}

function drawStartScreen() {
  fill(180, 255, 200);
  textAlign(CENTER, CENTER);
  textSize(32);
  text('Perit\'s Little Adventure', width / 2, height / 2 - 100);
  
  textSize(24);
  text('スペースキーを押してスタート', width / 2, height / 2);
  
  textSize(16);
  text('上下の壁を避けてゴールを目指そう!', width / 2, height / 2 + 80);
  
  // Draw perit preview
  image(peritImg, width / 2 - frameWidth / 2, height / 2 + 150, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
}

function update() {
  // Check if BGM ended
  if (gameActive && bgm && !bgm.isPlaying()) {
    gameOver = true;
  }
  
  // Gravity and velocity
  if (keyIsPressed && key === ' ') {
    characterVelocity -= flapPower;
  } else {
    characterVelocity += gravity;
  }
  
  characterY += characterVelocity;
  
  // Boundary check
  if (characterY + frameHeight / 2 > height) {
    gameOver = true;
  }
  if (characterY - frameHeight / 2 < 0) {
    gameOver = true;
  }
  
  // Stop BGM and pause logic when game over
  if (gameOver && gameActive) {
    if (bgm) bgm.stop();
    gameActive = false;
    return;
  }
  
  // Update walls
  for (let i = walls.length - 1; i >= 0; i--) {
    walls[i].x -= wallSpeed;
    
    // Remove wall if off screen  
    if (walls[i].x + walls[i].width < 0) {
      walls.splice(i, 1);
    }
  }
  
  // Update stars
  for (let i = stars.length - 1; i >= 0; i--) {
    stars[i].x -= wallSpeed;
    
    // Remove star if off screen
    if (stars[i].x + starSize < 0) {
      stars.splice(i, 1);
    }
  }
  
  // Spawn new walls based on audio time (音声再生時間に同期)
  const beatDuration = 60 / 170; // 1拍の秒数 (170 BPM)
  const wallSpawnInterval = beatDuration * 4; // wallの生成間隔 (4拍)
  const currentAudioTime = bgm ? bgm.currentTime() : 0;
  
  // 次のwallをスポーンすべき時間
  const nextWallSpawnTime = wallNumber * wallSpawnInterval;
  
  // 前フレームとこのフレームの間でスポーン時刻を通過したかチェック
  if (lastAudioTime < nextWallSpawnTime && currentAudioTime >= nextWallSpawnTime) {
    spawnWall();
  }
  
  lastAudioTime = currentAudioTime;
  
  // Update animation frame
  frameCounter++;
  const animationInterval = (keyIsPressed && key === ' ') ? 4 : 8; // スペース押下時は倍速
  if (frameCounter > animationInterval) {
    frameIndex = (frameIndex + 1) % totalFrames;
    frameCounter = 0;
  }
}

function checkCollisions() {
  const charLeft = characterX - frameWidth / 2 + 5;
  const charRight = characterX + frameWidth / 2 - 5;
  const charTop = characterY - frameHeight / 2 + 5;
  const charBottom = characterY + frameHeight / 2;
  
  for (let wall of walls) {
    // Check if perit passed through the wall
    if (!wall.scored && charRight > wall.x + wall.width) {
      const wallPoints = wall.points || 1;
      score += wallPoints;
      wall.scored = true;
    }
    
    // Check top wall
    if (charLeft < wall.x + wall.width &&
        charRight > wall.x &&
        charTop < wall.topWallHeight) {
      gameOver = true;
    }
    
    // Check bottom wall
    if (charLeft < wall.x + wall.width &&
        charRight > wall.x &&
        charBottom > wall.bottomWallY) {
      gameOver = true;
    }
  }
  
  // Check star collisions
  for (let i = stars.length - 1; i >= 0; i--) {
    const star = stars[i];
    const starLeft = star.x - starSize / 2;
    const starRight = star.x + starSize / 2;
    const starTop = star.y - starSize / 2;
    const starBottom = star.y + starSize / 2;
    
    if (charLeft < starRight &&
        charRight > starLeft &&
        charTop < starBottom &&
        charBottom > starTop) {
      score += starPoints;
      if (starSound) starSound.play();
      stars.splice(i, 1);
    }
  }
}

function drawGame() {
  // Draw walls
  fill(34, 139, 34); // Forest green
  for (let wall of walls) {
    // Top wall
    rect(wall.x, 0, wall.width, wall.topWallHeight);
    
    // Bottom wall
    rect(wall.x, wall.bottomWallY, wall.width, height - wall.bottomWallY);
    
    // Display debug info if enabled
    if (showDebugInfo) {
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(12);
      text('Gap: ' + int(wall.gapHeight), wall.x + wall.width / 2, wall.topWallHeight - 15);
      text('#' + wall.number, wall.x + wall.width / 2, wall.bottomWallY + 15);
      fill(34, 139, 34);
    }
  }
  
  // Draw stars
  for (let star of stars) {
    drawStar(star.x, star.y, starSize / 2, starSize, 5);
  }
  
  // Draw character
  push();
  translate(characterX, characterY);
  let srcX = animationFrames[frameIndex] * frameWidth;
  image(peritImg, -frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight, srcX, 0, frameWidth, frameHeight);
  pop();
  
  // Draw score
  fill(250);
  textAlign(LEFT);
  textSize(24);
  text('Score: ' + score, 20, 30);
}

function drawGameOver() {
  fill(0, 0, 0, 200);
  rect(0, 0, width, height);
  
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(48);
  text('GAME OVER', width / 2, height / 2 - 60);
  
  textSize(24);
  text('Score: ' + score, width / 2, height / 2 + 20);
  
  textSize(18);
  text('スペースキーでリスタート', width / 2, height / 2 + 80);
}

function spawnWall() {
  // Gap starts at 400px, decreases by 1px per point, minimum 100px
  const baseGap = 400;
  const gapDecrease = 0.5;
  const minGap = 100;
  const gapHeight = max(baseGap - (score * gapDecrease), minGap);
  const topWallHeight = random(50, height - gapHeight - 50);
  const bottomWallY = topWallHeight + gapHeight;
  
  // Calculate points based on gap size
  const points = int((baseGap - gapHeight) / 10) + 1;
  
  wallNumber++;
  walls.push({
    x: width,
    width: 60,
    topWallHeight: topWallHeight,
    bottomWallY: bottomWallY,
    gapHeight: gapHeight,
    number: wallNumber,
    points: points,
    scored: false
  });
  
  // Spawn star in the gap with probability
  if (random() < starSpawnChance) {
    const starY = topWallHeight + (gapHeight / 2) + random(-gapHeight / 3, gapHeight / 3);
    const starY_constrained = constrain(starY, topWallHeight + starSize, bottomWallY - starSize);
    stars.push({
      x: width + 30,
      y: starY_constrained
    });
  }
}

function drawStar(x, y, radius1, radius2, npoints) {
  let angle = TWO_PI / npoints;
  let halfAngle = angle / 2;
  fill(255, 215, 0); // Gold color
  stroke(200, 170, 0); // Darker gold outline
  strokeWeight(2);
  beginShape();
  for (let a = -PI / 2; a < TWO_PI - PI / 2; a += angle) {
    let sx = x + cos(a) * radius2;
    let sy = y + sin(a) * radius2;
    vertex(sx, sy);
    sx = x + cos(a + halfAngle) * radius1;
    sy = y + sin(a + halfAngle) * radius1;
    vertex(sx, sy);
  }
  endShape(CLOSE);
  noStroke();
}

function keyPressed() {
  if (key === ' ') {
    if (!gameActive && !gameOver) {
      gameActive = true;
      gameOver = false;
      score = 0;
      characterY = height / 2;
      characterVelocity = 0;
      walls = [];
      stars = [];
      wallNumber = 0;
      lastAudioTime = 0;
      spawnWall();
      if (bgm) {
        bgm.stop();
        bgm.play();
      }
      return false; // Prevent default
    } else if (gameOver) {
      gameActive = false;
      gameOver = false;
      score = 0;
      characterY = height / 2;
      characterVelocity = 0;
      walls = [];
      stars = [];
      wallNumber = 0;
      spawnWall();
    }
  }
}
