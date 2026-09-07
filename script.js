const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreVal = document.getElementById('scoreVal');
const hpVal = document.getElementById('hpVal');
const difficultyDisplay = document.getElementById('difficultyDisplay');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const mobileFireBtn = document.getElementById('mobileFireBtn');
const mobileLeftBtn = document.getElementById('mobileLeftBtn');
const mobileRightBtn = document.getElementById('mobileRightBtn');


let score = 0, health = 100, isGameOver = false, gameStarted = false, gameTimer = 0, dangerLevel = 1.0;
let bossActive = false, bossSpawnScoreThreshold = 100, bossProjectiles = [], lasers = [], aliens = [], stars = [], powerups = [], spawnTimeoutId = null;

const boss = { x: 0, y: -100, width: 120, height: 60, hp: 100, maxHp: 100, speed: 3, direction: 1, lastShotTime: 0, fireRate: 800 };
const player = { x: canvas.width / 2 - 25, y: canvas.height - 90, width: 50, height: 50, baseSpeed: 7, speed: 7 };
const keys = { ArrowLeft: false, ArrowRight: false, Space: false };
let isMobileFiring = false, lastLaserTime = 0, baseFireRate = 160, currentFireRate = 160, speedBoostTimer = 0, spreadShotTimer = 0;
let audioCtx = null;

function initAudioEngine() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playSoundEffect(type) {
    if (!audioCtx) return; if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain(); osc.connect(gain); gain.connect(audioCtx.destination); const now = audioCtx.currentTime;
    if (type === 'laser') { osc.type = 'triangle'; osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(300, now + 0.08); gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08); osc.start(now); osc.stop(now + 0.08); }
    else if (type === 'boost_laser') { osc.type = 'square'; osc.frequency.setValueAtTime(1200, now); osc.frequency.exponentialRampToValueAtTime(600, now + 0.05); gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05); osc.start(now); osc.stop(now + 0.05); }
    else if (type === 'spread_laser') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.07); gain.gain.setValueAtTime(0.07, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07); osc.start(now); osc.stop(now+0.07); }
    else if (type === 'boss_laser') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.15); gain.gain.setValueAtTime(0.12, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15); osc.start(now); osc.stop(now + 0.15); }
    else if (type === 'explosion') { osc.type = 'sine'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(20, now + 0.2); gain.gain.setValueAtTime(0.18, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2); osc.start(now); osc.stop(now + 0.2); }
    else if (type === 'hit') { osc.type = 'square'; osc.frequency.setValueAtTime(70, now); gain.gain.setValueAtTime(0.12, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1); osc.start(now); osc.stop(now + 0.1); }
    else if (type === 'powerup') { osc.type = 'sine'; osc.frequency.setValueAtTime(440, now); osc.frequency.setValueAtTime(554, now + 0.06); osc.frequency.setValueAtTime(659, now + 0.12); osc.frequency.setValueAtTime(880, now + 0.18); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25); osc.start(now); osc.stop(now + 0.25); }
}
for (let i = 0; i < 45; i++) stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 2 + 1, speed: Math.random() * 1.5 + 0.5 });

window.addEventListener('keydown', e => { if (e.code === 'ArrowLeft') keys.ArrowLeft = true; if (e.code === 'ArrowRight') keys.ArrowRight = true; if (e.code === 'Space') keys.Space = true; });
window.addEventListener('keyup', e => { if (e.code === 'ArrowLeft') keys.ArrowLeft = false; if (e.code === 'ArrowRight') keys.ArrowRight = false; if (e.code === 'Space') keys.Space = false; });

mobileFireBtn.addEventListener('mousedown', () => isMobileFiring = true);
mobileFireBtn.addEventListener('mouseup', () => isMobileFiring = false);
mobileFireBtn.addEventListener('mouseleave', () => isMobileFiring = false);
mobileFireBtn.addEventListener('touchstart', e => { e.preventDefault(); isMobileFiring = true; });
mobileFireBtn.addEventListener('touchend', () => isMobileFiring = false);
mobileLeftBtn.addEventListener('mousedown', () => { keys.Left = true; });
mobileLeftBtn.addEventListener('mouseup', () => { keys.Left = false; });
mobileLeftBtn.addEventListener('mouseleave', () => { keys.Left = false; });
mobileLeftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); keys.Left = true; });
mobileLeftBtn.addEventListener('touchend', () => { keys.Left = false; });
mobileRightBtn.addEventListener('mousedown', () => { keys.Right = true; });
mobileRightBtn.addEventListener('mouseup', () => { keys.Right = false; });
mobileRightBtn.addEventListener('mouseleave', () => { keys.Right = false; });
mobileRightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); keys.Right = true; });
mobileRightBtn.addEventListener('touchend', () => { keys.Right = false; });


function fireLaser() {
    const b = speedBoostTimer > 0, s = spreadShotTimer > 0, lx = player.x + player.width / 2 - 3, ly = player.y;
    if (s) {
        lasers.push({ x: lx, y: ly, width: 6, height: 18, speedY: -10, speedX: -4, color: '#ff33cc' }, { x: lx, y: ly, width: 6, height: 18, speedY: -10, speedX: -2, color: '#ff33cc' }, { x: lx, y: ly, width: 6, height: 18, speedY: -10, speedX: 0, color: '#ffffff' }, { x: lx, y: ly, width: 6, height: 18, speedY: -10, speedX: 2, color: '#ff33cc' }, { x: lx, y: ly, width: 6, height: 18, speedY: -10, speedX: 4, color: '#ff33cc' });
        playSoundEffect('spread_laser');
    } else {
        lasers.push({ x: lx, y: ly, width: b ? 8 : 6, height: 18, speedY: b ? -14 : -10, speedX: 0, color: b ? '#00ffff' : '#ffff00' });
        playSoundEffect(b ? 'boost_laser' : 'laser');
    }
}

startBtn.addEventListener('click', () => { initAudioEngine(); startScreen.classList.add('hidden'); gameStarted = true; spawnAlienLoop(); });

function spawnAlienLoop() {
    if (isGameOver || !gameStarted) return;
    if (!bossActive) {
        gameTimer++; if (gameTimer % 5 === 0) { dangerLevel += 0.15; difficultyDisplay.innerText = `DANGER: ${dangerLevel.toFixed(1)}x`; }
        const mn = 1.5 * dangerLevel, mx = 3.0 * dangerLevel;
        aliens.push({ x: Math.random() * (canvas.width - 35) + 5, y: -40, width: 35, height: 35, speed: Math.random() * (mx - mn) + mn });
    }
    spawnTimeoutId = setTimeout(spawnAlienLoop, Math.max(300, 1200 - (dangerLevel * 120)));
}

function triggerBossWarpIn() {
    bossActive = true; aliens = []; boss.maxHp = 100 + (score * 0.5); boss.hp = boss.maxHp; boss.x = canvas.width / 2 - boss.width / 2; boss.y = -100; boss.speed = 2.5 + (dangerLevel * 0.4);
    difficultyDisplay.innerText = "🚨 BOSS INBOUND 🚨"; difficultyDisplay.style.color = '#ff3366';
}
function update() {
    stars.forEach(s => { s.y += s.speed; if (s.y > canvas.height) s.y = 0; });
    if (!gameStarted || isGameOver) return;
    if (!bossActive && score >= bossSpawnScoreThreshold) triggerBossWarpIn();

    if (speedBoostTimer > 0) { speedBoostTimer--; player.speed = player.baseSpeed * 1.6; currentFireRate = baseFireRate * 0.55; if (speedBoostTimer <= 0 && spreadShotTimer <= 0) { player.speed = player.baseSpeed; currentFireRate = baseFireRate; if (!bossActive) difficultyDisplay.style.color = '#ffeb3b'; } }
    if (spreadShotTimer > 0) { spreadShotTimer--; if (spreadShotTimer <= 0) { if (speedBoostTimer <= 0) { player.speed = player.baseSpeed; currentFireRate = baseFireRate; if (!bossActive) difficultyDisplay.style.color = '#ffeb3b'; } if (!bossActive) difficultyDisplay.innerText = `DANGER: ${dangerLevel.toFixed(1)}x`; } }

    if (keys.ArrowLeft && player.x > 0) player.x -= player.speed;
    if (keys.ArrowRight && player.x < canvas.width - player.width) player.x += player.speed;

    const now = Date.now();
    if ((keys.Space || isMobileFiring) && (now - lastLaserTime >= currentFireRate)) { fireLaser(); lastLaserTime = now; }

    lasers.forEach((l, idx) => { l.y += l.speedY; l.x += l.speedX; if (l.y < 0 || l.x < 0 || l.x > canvas.width) lasers.splice(idx, 1); });

    if (bossActive) {
        if (boss.y < 60) boss.y += 2; boss.x += boss.speed * boss.direction; if (boss.x <= 10 || boss.x >= canvas.width - boss.width - 10) boss.direction *= -1;
        if (now - boss.lastShotTime >= boss.fireRate) {
            const bx = boss.x + boss.width / 2, by = boss.y + boss.height;
            bossProjectiles.push({ x: bx - 25, y: by, width: 6, height: 16, speedY: 5, speedX: -1 }, { x: bx, y: by, width: 6, height: 16, speedY: 5.5, speedX: 0 }, { x: bx + 25, y: by, width: 6, height: 16, speedY: 5, speedX: 1 });
            playSoundEffect('boss_laser'); boss.lastShotTime = now;
        }
        lasers.forEach((l, lIdx) => {
            if (checkCollision(l, boss)) {
                lasers.splice(lIdx, 1); boss.hp -= 4; playSoundEffect('hit');
                if (boss.hp <= 0) { bossActive = false; score += 100; scoreVal.innerText = score; bossSpawnScoreThreshold = score + 100; playSoundEffect('explosion'); difficultyDisplay.innerText = "⭐ SECTOR SECURED ⭐"; difficultyDisplay.style.color = '#4caf50'; bossProjectiles = []; }
            }
        });
    }

    bossProjectiles.forEach((p, idx) => { p.y += p.speedY; p.x += p.speedX; if (checkCollision(p, player)) { bossProjectiles.splice(idx, 1); damagePlayer(15); } else if (p.y > canvas.height) bossProjectiles.splice(idx, 1); });

    powerups.forEach((pu, idx) => {
        pu.y += 3;
        if (checkCollision(player, pu)) {
            powerups.splice(idx, 1); playSoundEffect('powerup');
            if (pu.type === 'speed') { speedBoostTimer = 420; difficultyDisplay.innerText = "⚡ SPEED CHARGED ⚡"; difficultyDisplay.style.color = '#00ffff'; }
            else if (pu.type === 'spread') { spreadShotTimer = 360; difficultyDisplay.innerText = "💎 5-WAY SPREAD GUN 💎"; difficultyDisplay.style.color = '#ff33cc'; }
            else if (pu.type === 'heal') { health = Math.min(100, health + 25); hpVal.innerText = health; difficultyDisplay.innerText = "➕ RECOVERED +25 HP ➕"; difficultyDisplay.style.color = '#4caf50'; setTimeout(() => { if (!bossActive && speedBoostTimer <= 0 && spreadShotTimer <= 0) { difficultyDisplay.innerText = `DANGER: ${dangerLevel.toFixed(1)}x`; difficultyDisplay.style.color = '#ffeb3b'; } }, 1500); }
        } else if (pu.y > canvas.height) powerups.splice(idx, 1);
    });

    aliens.forEach((a, idx) => {
        a.y += a.speed; if (a.y > canvas.height) { aliens.splice(idx, 1); damagePlayer(10); }
        if (checkCollision(player, a)) { aliens.splice(idx, 1); damagePlayer(20); }
        lasers.forEach((l, lIdx) => {
            if (checkCollision(l, a)) {
                const roll = Math.random();
                if (roll < 0.08) powerups.push({ x: a.x, y: a.y, width: 22, height: 22, type: 'spread' });
                else if (roll < 0.23) powerups.push({ x: a.x, y: a.y, width: 20, height: 20, type: 'speed' });
                else if (roll < 0.36) powerups.push({ x: a.x, y: a.y, width: 20, height: 20, type: 'heal' });
                aliens.splice(idx, 1); lasers.splice(lIdx, 1); score += 10; scoreVal.innerText = score; playSoundEffect('explosion');
            }
        });
    });
}

function checkCollision(r1, r2) { return r1.x < r2.x + r2.width && r1.x + r1.width > r2.x && r1.y < r2.y + r2.height && r1.y + r1.height > r2.y; }
function damagePlayer(amt) { health -= amt; playSoundEffect('hit'); if (health <= 0) { health = 0; isGameOver = true; clearTimeout(spawnTimeoutId); gameOverScreen.classList.remove('hidden'); } hpVal.innerText = health; }

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#ffffff'; stars.forEach(s => ctx.fillRect(s.x, s.y, s.size, s.size));
    powerups.forEach(pu => { ctx.fillStyle = pu.type === 'speed' ? '#00ffff' : (pu.type === 'spread' ? '#ff33cc' : '#4caf50'); ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10; ctx.fillRect(pu.x, pu.y, pu.width, pu.height); ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px Arial'; ctx.fillText(pu.type === 'speed' ? '⚡' : (pu.type === 'spread' ? '💎' : '➕'), pu.x + 3, pu.y + 15); ctx.shadowBlur = 0; });
    if (gameStarted) {
        let px = player.x, py = player.y, w = player.width, h = player.height; const b = speedBoostTimer > 0, s = spreadShotTimer > 0;
        ctx.fillStyle = s ? '#ff33cc' : (b ? '#00ffff' : '#ff6600'); ctx.beginPath(); ctx.moveTo(px + w / 2 - 5, py + h); ctx.lineTo(px + w / 2, py + h + (b || s ? 24 : 15) + Math.random() * 8); ctx.lineTo(px + w / 2 + 5, py + h); ctx.fill();
        ctx.fillStyle = s ? '#880066' : (b ? '#007799' : '#00a3cc'); ctx.beginPath(); ctx.moveTo(px, py + h); ctx.lineTo(px + w / 2, py + h - 15); ctx.lineTo(px + w, py + h); ctx.fill();
        ctx.fillStyle = s ? '#ff99e6' : (b ? '#b3ffff' : '#00ffff'); ctx.beginPath(); ctx.moveTo(px + w / 2, py); ctx.lineTo(px + w / 2 - 14, py + h - 10); ctx.lineTo(px + w / 2 + 14, py + h - 10); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(px + w / 2, py + 12); ctx.lineTo(px + w / 2 - 5, py + h - 25); ctx.lineTo(px + w / 2 + 5, py + h - 25); ctx.fill();
    }
    lasers.forEach(l => { ctx.fillStyle = l.color; ctx.fillRect(l.x, l.y, l.width, l.height); });
    if (bossActive) {
        let bx = boss.x, by = boss.y, bw = boss.width, bh = boss.height;
        ctx.fillStyle = '#7a001e'; ctx.fillRect(bx, by + 15, bw, bh - 20); ctx.fillRect(bx + 20, by, bw - 40, bh); ctx.fillStyle = '#ff1a53'; ctx.fillRect(bx + 40, by + 10, bw - 80, bh - 20); ctx.fillStyle = '#ffffff'; ctx.fillRect(bx + 15, by + bh - 5, 8, 8); ctx.fillRect(bx + bw / 2 - 4, by + bh, 8, 8); ctx.fillRect(bx + bw - 23, by + bh - 5, 8, 8);
        let bW = 200, bH = 12, bX = canvas.width / 2 - bW / 2, bY = 55; ctx.fillStyle = '#333333'; ctx.fillRect(bX, bY, bW, bH); ctx.fillStyle = '#ff1a53'; ctx.fillRect(bX, bY, (boss.hp / boss.maxHp) * bW, bH); ctx.strokeStyle = '#ffffff'; ctx.strokeRect(bX, bY, bW, bH);
    }
    ctx.fillStyle = '#ff3333'; bossProjectiles.forEach(p => ctx.fillRect(p.x, p.y, p.width, p.height));
    if (!bossActive) { aliens.forEach(a => { let ax = a.x, ay = a.y, aw = a.width, ah = a.height; ctx.fillStyle = '#a3e844'; ctx.fillRect(ax + 5, ay + 5, aw - 10, ah - 10); ctx.fillRect(ax + 12, ay, aw - 24, ah); ctx.fillRect(ax, ay + 12, aw, ah - 24); ctx.fillStyle = '#ff0055'; ctx.fillRect(ax + 8, ay + 10, 4, 4); ctx.fillRect(ax + aw - 12, ay + 10, 4, 4); }); }
}

function gameTick() { update(); draw(); requestAnimationFrame(gameTick); }

restartBtn.addEventListener('click', () => {
    score = 0; health = 100; gameTimer = 0; dangerLevel = 1.0; speedBoostTimer = 0; spreadShotTimer = 0; bossActive = false; bossSpawnScoreThreshold = 100; currentFireRate = baseFireRate; player.speed = player.baseSpeed; isGameOver = false; gameStarted = false; lasers = []; aliens = []; powerups = []; bossProjectiles = []; scoreVal.innerText = score; hpVal.innerText = health; difficultyDisplay.innerText = "DANGER: 1.0x"; difficultyDisplay.style.color = '#ffeb3b'; player.x = canvas.width / 2 - player.width / 2; gameOverScreen.className = 'overlay hidden'; startScreen.className = 'overlay';
});

gameTick();
