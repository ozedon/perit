// グローバル変数
let peritImg;   // メインキャラクター
let backImg;    // 動かない背景
let woodsImg;   // 動く背景
let debugOnImg;  // デバッグON ボタン画像
let debugOffImg; // デバッグOFF ボタン画像
let bgm;
let starSound;  // ⭐️を取った時の音
let characterY;
let characterVelocity;  // キャラクターの移動速度
let gravity = 0.2;      // 重力(下に引っ張る力)
let flapPower = 0.2;    // 羽ばたき力(上に引っ張る力)
let gameActive = false;
let gameOver = false;
let score = 0;
let debugKeyPressed = false;
let pointerDown = false; // タッチ/マウスで押下中かどうか

// スペースキー or タッチ/タップで「上昇中」かどうかを判定
function isFlapping() {
  return (keyIsPressed && key === ' ') || pointerDown;
}

// Background parallax effect
let backGroundOffset = 0;
const backGroundSpeed = 0.5; // ゆっくり動かすための速度

// キャラクターアニメーション
let frameIndex = 0;
let frameCounter = 0;
const frameWidth = 40;
const frameHeight = 42;
const animationFrames = [0, 1, 0, 2]; // 左＞中＞左＞右＞
const totalFrames = 4;  // アニメーションフレームの数


// 壁
let walls = [];
let wallSpeed = 4;
const wallFrameInterval = 84.55; // frames (170BPM * 4 beats at 60fps - fine tuned)
let wallNumber = 0; // 壁番号
let lastAudioTime = 0; // 

// ⭐️
let stars = [];             // ⭐️の配列
const starSize = 20;        // ⭐️のサイズ(px)
const starSpawnChance = 1;  // 壁で⭐️が作られる確率
const starPoints = 4;       // ⭐️の得点


// Game constants
const characterX = 130;
const GAME_WIDTH = 800;   // 内部解像度(横)
const GAME_HEIGHT = 600;  // 内部解像度(縦)
let cnv; // キャンバス要素への参照(CSS拡大に使用)

// デバッグ切り替えボタン(スタート画面・ゲームオーバー画面の右下に表示)
const debugBtnSize = 56;
const debugBtnMargin = 24;
function debugButtonBounds() {
  return {
    x: width - debugBtnMargin - debugBtnSize,
    y: height - debugBtnMargin - debugBtnSize,
    w: debugBtnSize,
    h: debugBtnSize
  };
}

// Debug mode
let showDebugInfo = false;

function preload() {  // 一番最初に実行される関数。主にゲームに使われる画像や音を予めロードしておくのに使う。
  peritImg = loadImage('assets/perit.png');
  backImg = loadImage('assets/back.png');
  woodsImg = loadImage('assets/woods.png');
  bgm = loadSound('assets/bgm.mp3');
  starSound = loadSound('assets/star.mp3');
  debugOnImg = loadImage('assets/debugon.svg');
  debugOffImg = loadImage('assets/debugoff.svg');
}

function setup() {
  let container = select('#p5-container');
  cnv = createCanvas(GAME_WIDTH, GAME_HEIGHT);
  cnv.parent(container);
  frameRate(60);

  characterY = height / 2;
  characterVelocity = 0;

  bgm.setVolume(0.1);

  // スマホ・タブレットでは画面いっぱいに拡大表示する
  fitCanvasToScreen();
}

// スマホ・タブレットかどうかを判定
function isMobileOrTablet() {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0 && !window.matchMedia('(pointer: fine)').matches);
}

// 内部解像度(800x600)は保ったまま、CSSでキャンバスを画面に合わせて拡大する。
// アスペクト比を維持してはみ出さない最大サイズ(contain)にフィットさせる。
function fitCanvasToScreen() {
  if (!cnv) return;

  // PC(マウス操作)では元の解像度のまま表示する
  if (!isMobileOrTablet()) {
    cnv.style('width', GAME_WIDTH + 'px');
    cnv.style('height', GAME_HEIGHT + 'px');
    return;
  }

  const scale = Math.min(windowWidth / GAME_WIDTH, windowHeight / GAME_HEIGHT);
  cnv.style('width', (GAME_WIDTH * scale) + 'px');
  cnv.style('height', (GAME_HEIGHT * scale) + 'px');
}

// 画面リサイズ・端末回転に追従
function windowResized() {
  fitCanvasToScreen();
}

function draw() {
  // 背景を遠近法で描く
  drawBackground();
  
  // デバッグ機能のOn/OffをDキーでトグル
  if (keyIsPressed && (key === 'd' || key === 'D')) {
    if (!debugKeyPressed) {           // debugKeyPressed が false ならば
      showDebugInfo = !showDebugInfo; // showDebugInfo を off
      debugKeyPressed = true;         // debugKeyPressed を true
    }
  } else {                            // debugKeyPressed が true ならば
    debugKeyPressed = false;          // debugKeyPressed を false
  }

  // gameActive状態でなく、gameOver状態でもなければ
  if (!gameActive && !gameOver) {
    drawStartScreen();                // スタート画面を描画
  } else if (gameActive) {            // gameActive状態であれば
    update();                        // アップデート処理をして
    checkCollisions();               // 衝突判定をして
    drawGame();                      // 
    
    if (gameOver) {                  // gameOver が true ならば
      drawGameOver();                // ゲームオーバーを描画
    }
  } else if (gameOver) {              // gameOver が true ならば
    drawGame();                      // ゲームを描画
    drawGameOver();                  // ゲームオーバーを描画
  }
}

function drawStartScreen() {
  fill(180, 255, 200);
  textAlign(CENTER, CENTER);
  textSize(32);
  text('Perit\'s Little Adventure', width / 2, height / 2 - 100);
  
  textSize(24);
  text('スペース / タップでスタート', width / 2, height / 2);
  
  textSize(16);
  text('上下の壁を避けてゴールを目指そう!', width / 2, height / 2 + 80);
  
  // Draw perit preview
  image(peritImg, width / 2 - frameWidth / 2, height / 2 + 150, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);

  // デバッグ切り替えボタン
  drawDebugButton();
}

// デバッグON/OFFボタンを右下に描画(スタート・ゲームオーバー画面でのみ呼ばれる)
function drawDebugButton() {
  const b = debugButtonBounds();
  const img = showDebugInfo ? debugOnImg : debugOffImg;
  push();
  imageMode(CORNER);
  // 半透明の丸い下地で押せることを分かりやすくする
  noStroke();
  fill(0, 0, 0, showDebugInfo ? 150 : 90);
  ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w + 12);
  if (img) image(img, b.x, b.y, b.w, b.h);
  pop();
}

// 右下のデバッグボタンがタップされたか判定し、押されていればトグルする
// 戻り値: ボタンを押した場合は true(ゲーム開始処理をスキップするため)
function handleDebugButtonTap(px, py) {
  // プレイ中は非表示なので反応させない
  if (gameActive) return false;
  const b = debugButtonBounds();
  if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) {
    showDebugInfo = !showDebugInfo;
    return true;
  }
  return false;
}

function update() {
  // Update background parallax effect
  if (gameActive) {
    backGroundOffset -= backGroundSpeed;
  }
  
  // Check if BGM ended
  if (gameActive && bgm && !bgm.isPlaying()) {
    gameOver = true;
  }
  
  // Gravity and velocity
  if (isFlapping()) {
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
  const animationInterval = isFlapping() ? 4 : 8; // 上昇中は倍速
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
  text('スペース / タップでリスタート', width / 2, height / 2 + 80);

  // デバッグ切り替えボタン
  drawDebugButton();
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

// ゲームの開始 / リスタート処理(タイトル画面・ゲームオーバー画面の両方から呼ばれる)
function startGame() {
  gameActive = true;
  gameOver = false;
  score = 0;
  characterY = height / 2;
  characterVelocity = 0;
  walls = [];
  stars = [];
  wallNumber = 0;
  lastAudioTime = -1;
  backGroundOffset = 0;
  if (bgm) {
    bgm.stop();
    bgm.play();
  }
}

// スペースキー / タッチ / マウスで「開始または上昇」を行う共通処理
// 戻り値: ゲームを開始/リスタートした場合は true
function handleInputStart() {
  if (!gameActive && !gameOver) {
    // タイトル画面からスタート
    startGame();
    return true;
  } else if (gameOver) {
    // ゲームオーバーからリスタート
    startGame();
    return true;
  }
  return false;
}

function keyPressed() {
  if (key === ' ') {
    handleInputStart();
    return false; // Prevent default (ページのスクロール防止)
  }
}

// マウス(PC)での操作
function mousePressed() {
  // 右下のデバッグボタンが押されたら、ゲーム開始せずトグルだけする
  if (handleDebugButtonTap(mouseX, mouseY)) return false;
  pointerDown = true;
  handleInputStart();
  return false; // Prevent default
}

function mouseReleased() {
  pointerDown = false;
  return false;
}

// タッチ(スマホ・タブレット)での操作
function touchStarted() {
  // 右下のデバッグボタンが押されたら、ゲーム開始せずトグルだけする
  if (handleDebugButtonTap(mouseX, mouseY)) return false;
  pointerDown = true;
  handleInputStart();
  return false; // Prevent default (スクロール・ズーム防止)
}

function touchEnded() {
  pointerDown = false;
  return false; // Prevent default
}

function drawBackground() {
  // Always clear the background first
  background(40);
  
  // Draw fixed background
  if (backImg && backImg.width && backImg.height) {
    const scaledHeight = height;
    const scaledWidth = (backImg.width / backImg.height) * scaledHeight;
    push();
    imageMode(CORNER);
    image(backImg, 0, 0, scaledWidth, scaledHeight);
    pop();
  }
  
  // Draw scrolling woods background
  if (!woodsImg || !woodsImg.width || !woodsImg.height) {
    return;
  }
  
  // Scale image to fit canvas height, maintaining aspect ratio
  const scaledHeight = height;
  const scaledWidth = (woodsImg.width / woodsImg.height) * scaledHeight;
  
  // For seamless tiling, use scaled width for offset calculation
  let offset = (backGroundOffset % scaledWidth);
  if (offset > 0) offset -= scaledWidth;  // Adjust for negative offset
  
  push();
  imageMode(CORNER);
  // Draw scrolling background tiles
  let x = offset;
  while (x < width) {
    image(woodsImg, x, 0, scaledWidth, scaledHeight);
    x += scaledWidth;
  }
  pop();
}

