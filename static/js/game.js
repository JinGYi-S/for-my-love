// --- 全局配置 ---
const START_DATE = new Date("2022-01-11");
const LOVE_TEXT = "亲爱的老婆：\n生活中或许会有\n烦恼和小怪兽，\n但我会永远做你的\n专属防御塔，\n守护你的开心与快乐！\n\n准备好一起打败烦恼了吗？";
let romanceStarted = false;

// --- 浪漫环节逻辑 ---
function startRomance() {
    if (romanceStarted) return;
    romanceStarted = true;
    document.querySelector('.start-btn').style.display = 'none';
    document.getElementById('romance-layer').style.display = 'flex';
    
    const audio = document.getElementById('bgm');
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Audio play failed", e));

    startTimer();
    typeWriter(LOVE_TEXT, 0);
    startFallingHearts();
}

// 计时器
function startTimer() {
    function update() {
        const now = new Date();
        const diff = now - START_DATE;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        document.getElementById('time-count').innerHTML = `<b>${days}</b>天 <b>${hours}</b>时 <b>${minutes}</b>分 <b>${seconds}</b>秒`;
    }
    setInterval(update, 1000);
    update();
}

// 打字机
function typeWriter(text, i) {
    if (i < text.length) {
        const char = text.charAt(i);
        document.getElementById('typewriter').innerHTML += char === '\n' ? '<br>' : char;
        setTimeout(() => typeWriter(text, i + 1), 100);
    } else {
        // 打字结束，显示游戏按钮
        setTimeout(() => {
            document.getElementById('enter-game-btn').style.display = 'block';
        }, 1000);
    }
}

// 背景特效 (简化版)
const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');
let width, height;

function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function drawStars() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#fff';
    for(let i=0; i<100; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const r = Math.random() * 1.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI*2);
        ctx.fill();
    }
}
drawStars();

// 飘落爱心
function startFallingHearts() {
    setInterval(() => {
        const h = document.createElement('div');
        h.style.position = 'fixed';
        h.style.left = Math.random() * 100 + 'vw';
        h.style.top = '-10px';
        h.style.color = '#ff6b8b';
        h.innerHTML = '❤️';
        h.style.opacity = 0.5;
        h.style.pointerEvents = 'none';
        h.style.zIndex = 5;
        h.style.transition = `top ${Math.random()*3+2}s linear, opacity 1s`;
        document.body.appendChild(h);
        setTimeout(() => { h.style.top = '105vh'; h.style.opacity = 0; }, 50);
        setTimeout(() => h.remove(), 5000);
    }, 500);
}

// 点击爱心
function clickHeart(e) {
     createParticle(e.clientX, e.clientY, '❤️');
}

// --- 游戏逻辑 (竖屏塔防) ---
let ROWS = 9;
const COLS = 5;
let gameActive = false;
let points = 520;
let selectedPlantType = null;
let grid = []; // 存储格子状态
let enemies = [];
let bullets = [];
let gameLoopId;
let enemySpawnTimer;
let resourceTimer;
let wave = 1;
const TOTAL_WAVES = 3;
let isSpawning = false;
let unlockedPlants = [];
let bossEnemy = null;
let bossMinionTimer = null;
let helpShown = false;
let infiniteHearts = false;
let allowedRows = [];

function showPrompt(text) {
    const board = document.getElementById('game-board');
    const tip = document.createElement('div');
    tip.style.position = 'absolute';
    tip.style.left = '50%';
    tip.style.top = '35%';
    tip.style.transform = 'translate(-50%, -50%)';
    tip.style.padding = '12px 20px';
    tip.style.borderRadius = '12px';
    tip.style.background = 'rgba(0,0,0,0.6)';
    tip.style.color = '#ff6b8b';
    tip.style.fontSize = '22px';
    tip.style.zIndex = 180;
    tip.style.boxShadow = '0 0 20px rgba(255, 107, 139, 0.6)';
    tip.innerText = text;
    board.appendChild(tip);
    setTimeout(() => { if (tip.parentNode) tip.remove(); }, 1800);
}

function setProgressionForWave(w) {
    unlockedPlants = ['shooter', 'ice', 'wall', 'bomb'];
    updateUnlockedCards();
}

function startGame() {
    document.getElementById('romance-layer').style.display = 'none';
    document.getElementById('game-layer').style.display = 'flex';
    setProgressionForWave(1);
    initGrid();
    gameActive = true;
    updatePoints(0);
    showGuideOverlay();
    
    // 游戏循环
    gameLoopId = requestAnimationFrame(gameLoop);
    
    // 敌人生成
    startWave(1);

    // 资源自动生成
    resourceTimer = setInterval(() => {
        if(!gameActive) return;
        createSun();
    }, 5000);
}

function showGuideOverlay() {
    const layer = document.getElementById('game-layer');
    if (!layer) return;
    const ov = document.createElement('div');
    ov.className = 'guide-overlay';
    ov.innerHTML = `
        <div style="max-width: 520px; color: #fff;">
            <h3 style="margin-bottom:8px;color:#ff6b8b;">新手指引</h3>
            <p>1）点击下方卡片选择武器（全部已解锁）</p>
            <p>2）点击任意格子放置，建议从最后一行开始铺防线</p>
            <p>3）收集飘落的💖提升心能量（+25）</p>
        </div>
    `;
    layer.appendChild(ov);
    setTimeout(() => { if (ov.parentNode) ov.remove(); }, 6000);
}
function updateGridInteractivity() {
    for(let r=0; r<ROWS; r++) {
        for(let c=0; c<COLS; c++) {
            const cell = grid[r][c].el;
            cell.onclick = () => placePlant(r, c);
            cell.style.opacity = '1';
            cell.style.cursor = 'pointer';
        }
    }
}

function initGrid() {
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    grid = [];
    
    for(let r=0; r<ROWS; r++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'grid-row';
        rowDiv.style.height = (100/ROWS) + '%';
        let rowData = [];
        for(let c=0; c<COLS; c++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.r = r;
            cell.dataset.c = c;
            cell.onclick = () => placePlant(r, c);
            rowDiv.appendChild(cell);
            rowData.push({ hasPlant: false, el: cell });
        }
        board.appendChild(rowDiv);
        grid.push(rowData);
    }
    updateGridInteractivity();
}

function selectPlant(type, cost) {
    if (!unlockedPlants.includes(type)) return;
    if(!infiniteHearts && points < cost) return;
    
    // 移除旧选择
    document.querySelectorAll('.plant-card').forEach(c => c.classList.remove('active'));
    
    if (selectedPlantType && selectedPlantType.type === type) {
        selectedPlantType = null;
    } else {
        selectedPlantType = { type, cost };
        const idMap = { 'shooter': 'card-shooter', 'ice': 'card-ice', 'wall': 'card-wall', 'bomb': 'card-bomb' };
        document.getElementById(idMap[type]).classList.add('active');
    }
}

function placePlant(r, c) {
    if (!selectedPlantType || !gameActive) return;
    if (grid[r][c].hasPlant) return;

    // 扣费
    if (!infiniteHearts) updatePoints(-selectedPlantType.cost);
    
    // 放置视觉元素
    const cell = grid[r][c].el;
    const plant = document.createElement('div');
    plant.className = 'tower';
    
    if (selectedPlantType.type === 'shooter') {
        plant.innerHTML = '🏹';
        grid[r][c].plantObj = { type: 'shooter', hp: 100, lastShot: 0, el: plant };
    } else if (selectedPlantType.type === 'ice') {
        plant.innerHTML = '🍦';
        grid[r][c].plantObj = { type: 'ice', hp: 100, lastShot: 0, el: plant };
    } else if (selectedPlantType.type === 'wall') {
        plant.innerHTML = '🛡️';
        grid[r][c].plantObj = { type: 'wall', hp: 300, el: plant };
    } else if (selectedPlantType.type === 'bomb') {
        plant.innerHTML = '💣';
        cell.appendChild(plant);
        
        // 炸弹特殊逻辑：放置后延迟爆炸
        setTimeout(() => {
            explode(r, c);
            cell.innerHTML = '';
            grid[r][c].hasPlant = false;
        }, 1000);
        
        // 取消选中
        selectedPlantType = null;
        document.querySelectorAll('.plant-card').forEach(c => c.classList.remove('active'));
        return;
    }
    
    cell.appendChild(plant);
    grid[r][c].hasPlant = true;
    
    // 放置后取消选中，方便连续操作可以注释掉下面这行
    selectedPlantType = null;
    document.querySelectorAll('.plant-card').forEach(c => c.classList.remove('active'));
}

function explode(r, c) {
    const cell = grid[r][c].el;
    const boom = document.createElement('div');
    boom.style.position = 'absolute';
    boom.style.fontSize = '50px';
    boom.innerHTML = '💥';
    boom.style.zIndex = 200;
    
    const board = document.getElementById('game-board');
    board.style.animation = 'shake 0.5s';
    setTimeout(() => board.style.animation = '', 500);

    const rect = cell.getBoundingClientRect();
    const boardRect = document.getElementById('game-board').getBoundingClientRect();
    boom.style.left = (rect.left - boardRect.left - 10) + 'px';
    boom.style.top = (rect.top - boardRect.top - 10) + 'px';
    document.getElementById('game-board').appendChild(boom);
    
    setTimeout(() => boom.remove(), 500);

    const colWidth = document.getElementById('game-board').offsetWidth / COLS;
    const rowHeight = document.getElementById('game-board').offsetHeight / ROWS;
    const centerX = c * colWidth + colWidth/2;
    const centerY = r * rowHeight + rowHeight/2;
    for (let k = enemies.length - 1; k >= 0; k--) {
        const e = enemies[k];
        const dx = Math.abs((e.x + 25) - centerX);
        const dy = Math.abs((e.y + 25) - centerY);
        if (dx < colWidth && dy < rowHeight) {
            e.hp -= 200;
            createParticle(e.x + 25, e.y + 25, '💥');
        }
    }
}

function updatePoints(delta) {
    if (infiniteHearts) {
        document.getElementById('love-points').innerText = '∞';
        checkCardAffordability();
        return;
    }
    points += delta;
    document.getElementById('love-points').innerText = points;
    checkCardAffordability();
}

function checkCardAffordability() {
    const costs = { 'card-shooter': 50, 'card-ice': 75, 'card-wall': 50, 'card-bomb': 100 };
    for(let id in costs) {
        const el = document.getElementById(id);
        const type = id.replace('card-','');
        if (!unlockedPlants.includes(type)) {
            el.classList.add('locked');
            el.classList.remove('active');
        } else {
            el.classList.remove('locked');
            if (infiniteHearts) {
                el.classList.remove('disabled');
            } else {
                if(points < costs[id]) el.classList.add('disabled');
                else el.classList.remove('disabled');
            }
        }
    }
}

function createSun() {
    const sun = document.createElement('div');
    sun.className = 'sun';
    sun.innerHTML = '💖';
    const board = document.getElementById('game-board');
    sun.style.left = Math.random() * (board.offsetWidth - 40) + 'px';
    sun.style.top = '-40px';
    
    board.appendChild(sun);
    
    // 阳光下落动画
    let top = -40;
    const targetTop = Math.random() * (board.offsetHeight - 100) + 50;
    
    const fallInterval = setInterval(() => {
        top += 2;
        sun.style.top = top + 'px';
        if(top >= targetTop) clearInterval(fallInterval);
    }, 20);

    // 点击收集
    sun.onclick = function() {
        updatePoints(25);
        sun.remove();
        clearInterval(fallInterval);
        createParticle(parseFloat(sun.style.left), parseFloat(sun.style.top), '+25');
    };

    // 10秒后消失
    setTimeout(() => { if(sun.parentNode) sun.remove(); }, 8000);
}

function startWave(w) {
    wave = w;
    document.getElementById('wave-info').innerText = `${wave}/${TOTAL_WAVES}`;
    isSpawning = true;
    setProgressionForWave(w);
    updateGridInteractivity();
    showPrompt(`第${w}波开始`);
    
    let count = 10 + wave * 5; // 敌人数量增加，波次变长
    let spawnInterval = 1500 - wave * 200;
    
    let spawned = 0;
    enemySpawnTimer = setInterval(() => {
        if (!gameActive) return;
        spawnEnemy(wave);
        spawned++;
        if (spawned >= count) {
            clearInterval(enemySpawnTimer);
            enemySpawnTimer = null;
            isSpawning = false;
        }
    }, spawnInterval);

    if (w === 3) {
        setTimeout(() => {
            if (!gameActive) return;
            spawnBoss();
            showPrompt('大Boss来袭');
        }, 6000);
    }
}

function spawnEnemy(level, speedOverride) {
    const board = document.getElementById('game-board');
    const enemy = document.createElement('div');
    enemy.className = 'enemy';
    
    // 敌人配置
    const enemyTypes = [
        { type: 'normal', icon: '👾', hpMod: 1, speedMod: 1 },
        { type: 'tank', icon: '👿', hpMod: 2.5, speedMod: 0.6 }, // 坦克：血厚慢速
        { type: 'fast', icon: '🕷️', hpMod: 0.6, speedMod: 1.4 }, // 刺客：血薄快速
        { type: 'boss', icon: '💢', hpMod: 3, speedMod: 0.8 }    // 精英
    ];
    
    // 随机选择类型 (Boss只在后期出现)
    let typePool = enemyTypes.slice(0, 2); // 默认普通和坦克
    if (level >= 2) typePool = enemyTypes.slice(0, 3);
    if (level >= 3) typePool = enemyTypes;
    
    const config = typePool[Math.floor(Math.random() * typePool.length)];
    
    enemy.innerHTML = config.icon;
    
    const col = Math.floor(Math.random() * COLS);
    const colWidth = board.offsetWidth / COLS;
    const x = col * colWidth + (colWidth - 50)/2;
    enemy.style.left = x + 'px';
    enemy.style.top = '-50px';
    
    board.appendChild(enemy);
    
    // 基础数值
    const baseHp = 15 * level;
    const baseSpeed = 0.35 + level * 0.05; // 进一步提高基础速度
    
    const speedValue = (typeof speedOverride === 'number') ? speedOverride : (baseSpeed * config.speedMod);
    enemies.push({
        el: enemy,
        x: x,
        y: -50,
        hp: baseHp * config.hpMod,
        maxHp: baseHp * config.hpMod,
        speed: speedValue,
        originalSpeed: speedValue,
        slowTimer: 0,
        etype: config.type,
        col: col,
        attackCooldown: 0
    });
}

function spawnBoss() {
    const board = document.getElementById('game-board');
    const enemy = document.createElement('div');
    enemy.className = 'enemy boss';
    enemy.innerHTML = '💢';
    const col = Math.floor(Math.random() * COLS);
    const colWidth = board.offsetWidth / COLS;
    const x = col * colWidth + (colWidth - 50)/2;
    enemy.style.left = x + 'px';
    enemy.style.top = '-60px';
    board.appendChild(enemy);
    const baseHp = 15 * 3;
    const baseSpeed = 0.35 + 3 * 0.05;
    const hp = baseHp * 10;
    const speed = baseSpeed * 0.4; // Boss稍微快一点
    bossEnemy = {
        el: enemy,
        x: x,
        y: -60,
        hp: hp,
        maxHp: hp,
        speed: speed,
        originalSpeed: speed,
        regenRate: hp * 0.002,
        slowTimer: 0,
        etype: 'boss',
        col: col,
        attackCooldown: 0
    };
    enemies.push(bossEnemy);
    createBossHpBar();
    startBossMinions();
}

function showHelpButton() {
    const btn = document.getElementById('help-btn');
    if (!btn) return;
    btn.style.display = 'inline-block';
    if (!btn._bound) {
        btn.addEventListener('click', invokeHelp);
        btn._bound = true;
    }
}

function createBossHpBar() {
    const layer = document.getElementById('game-layer');
    if (!layer) return;
    let bar = document.getElementById('boss-hp-bar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'boss-hp-bar';
        const fill = document.createElement('div');
        fill.id = 'boss-hp-fill';
        bar.appendChild(fill);
        layer.appendChild(bar);
    }
    updateBossHpBar();
}

function updateBossHpBar() {
    const fill = document.getElementById('boss-hp-fill');
    const bar = document.getElementById('boss-hp-bar');
    if (!fill || !bar) return;
    if (!bossEnemy) { bar.style.display = 'none'; return; }
    bar.style.display = 'block';
    const ratio = Math.max(0, Math.min(1, bossEnemy.hp / bossEnemy.maxHp));
    fill.style.width = (ratio * 100) + '%';
}

function removeBossHpBar() {
    const bar = document.getElementById('boss-hp-bar');
    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
}

function startBossMinions() {
    if (bossMinionTimer) return;
    bossMinionTimer = setInterval(() => {
        if (!gameActive || !bossEnemy) return;
        for (let i = 0; i < 3; i++) {
            spawnEnemy(3, bossEnemy.speed);
        }
    }, 1200);
}

function stopBossMinions() {
    if (bossMinionTimer) {
        clearInterval(bossMinionTimer);
        bossMinionTimer = null;
    }
}

function createGiantHeart() {
    const board = document.getElementById('game-board');
    const h = document.createElement('div');
    h.className = 'giant-heart';
    h.innerText = '❤️';
    const rect = board.getBoundingClientRect();
    h.style.left = (rect.width/2 - 80) + 'px';
    h.style.top = (rect.height/2 - 80) + 'px';
    board.appendChild(h);
    setTimeout(() => { if (h.parentNode) h.remove(); }, 1200);
}

function clearAllEnemies() {
    enemies.forEach(e => e.el.remove());
    enemies = [];
    bossEnemy = null;
    stopBossMinions();
    if (enemySpawnTimer) {
        clearInterval(enemySpawnTimer);
        enemySpawnTimer = null;
    }
    isSpawning = false;
}

function invokeHelp() {
    createGiantHeart();
    
    // 视觉特效
    const layer = document.getElementById('game-layer');
    
    // 闪光
    const flash = document.createElement('div');
    flash.className = 'screen-flash';
    layer.appendChild(flash);
    setTimeout(() => flash.remove(), 1000);
    
    // 文字
    const text = document.createElement('div');
    text.className = 'celebration-text';
    text.innerHTML = "老公来啦！<br>无限火力开启！";
    layer.appendChild(text);
    setTimeout(() => text.remove(), 3000);
    
    // 震动
    const board = document.getElementById('game-board');
    board.style.animation = 'none';
    board.offsetHeight; /* trigger reflow */
    board.style.animation = 'shake 0.8s cubic-bezier(.36,.07,.19,.97) both';

    clearAllEnemies();
    infiniteHearts = true;
    updatePoints(0);
    const overlay = document.getElementById('buff-overlay');
    if (overlay) overlay.style.display = 'block';
    const btn = document.getElementById('help-btn');
    if (btn) btn.style.display = 'none';
    
    // 启动无限刷怪
    setTimeout(() => {
        startInfiniteRush();
    }, 1500);
}

function startInfiniteRush() {
    showPrompt("疯狂模式：无限刷怪！");
    isSpawning = true;
    
    // 启动倒计时（如果尚未启动）
    const layer = document.getElementById('game-layer');
    let timerDisplay = document.getElementById('rush-timer');
    
    if (!timerDisplay) { // 第一次进入无限模式
        timerDisplay = document.createElement('div');
        timerDisplay.id = 'rush-timer';
        timerDisplay.style.position = 'absolute';
        timerDisplay.style.top = '100px';
        timerDisplay.style.left = '50%';
        timerDisplay.style.transform = 'translateX(-50%)';
        timerDisplay.style.color = '#ff3366';
        timerDisplay.style.fontSize = '32px';
        timerDisplay.style.fontWeight = 'bold';
        timerDisplay.style.zIndex = '200';
        timerDisplay.style.textShadow = '0 0 10px #fff';
        layer.appendChild(timerDisplay);
        
        let timeLeft = 60;
        timerDisplay.innerText = `坚持 ${timeLeft} 秒`;
        
        const rushInterval = setInterval(() => {
            if (!gameActive) {
                clearInterval(rushInterval);
                if(timerDisplay) timerDisplay.remove();
                return;
            }
            timeLeft--;
            timerDisplay.innerText = `坚持 ${timeLeft} 秒`;
            
            if (timeLeft <= 0) {
                clearInterval(rushInterval);
                if(timerDisplay) timerDisplay.remove();
                gameWin();
            }
        }, 1000);
    }
    
    if (enemySpawnTimer) clearInterval(enemySpawnTimer);
    
    enemySpawnTimer = setInterval(() => {
        if (!gameActive) return;
        const count = Math.floor(Math.random() * 2) + 1; // 1-2个
        for(let i=0; i<count; i++) {
            // 极大提高速度
            spawnEnemy(3, Math.random() * 0.8 + 0.5); 
        }
    }, 500);
}

function gameWin() {
    gameActive = false;
    cancelAnimationFrame(gameLoopId);
    if (enemySpawnTimer) clearInterval(enemySpawnTimer);
    if (resourceTimer) clearInterval(resourceTimer);
    stopBossMinions();
    
    // 清除所有敌人
    enemies.forEach(e => e.el.remove());
    enemies = [];
    
    document.getElementById('modal-title').innerText = "挑战成功！";
    document.getElementById('modal-msg').innerHTML = "虽然生活中有小怪兽，<br>但因为有爱，<br>我们永远是赢家！<br>老婆真棒！";
    document.getElementById('game-modal').style.display = 'flex';
    
    const btn = document.querySelector('#game-modal .game-btn');
    btn.onclick = () => location.reload();
    btn.innerText = "再玩一次";
}

function gameLoop() {
    if (!gameActive) return;
    
    const board = document.getElementById('game-board');
    const rowHeight = board.offsetHeight / ROWS;
    
    // 1. 移动敌人
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        
        // 减速逻辑处理
        let currentSpeed = e.speed;
        if (e.slowTimer > 0) {
            currentSpeed = e.originalSpeed * 0.5;
            e.slowTimer--;
            e.el.style.filter = 'sepia(1) hue-rotate(180deg) saturate(3)'; // 冰冻变蓝效果
        } else {
            e.el.style.filter = '';
        }
        
        e.y += currentSpeed;
        e.el.style.top = e.y + 'px';
        
        // 碰撞检测：是否碰到植物
        const currentRow = Math.floor((e.y + 40) / rowHeight);
        
        if (currentRow >= 0 && currentRow < ROWS) {
            const cell = grid[currentRow][e.col];
            if (cell.hasPlant) {
                 e.y -= currentSpeed;
                 e.attackCooldown++;
                 if (e.attackCooldown > 60) { // 1秒攻击一次
                     cell.plantObj.hp -= 20;
                     createParticle(e.x+25, e.y+50, '💥');
                     e.attackCooldown = 0;
                     // 植物死亡
                     if (cell.plantObj.hp <= 0) {
                         cell.el.innerHTML = ''; // 移除植物图标
                         cell.hasPlant = false;
                         cell.plantObj = null;
                     }
                 }
            }
        }

        // 游戏结束判定：到达底部 -> 触发老公救场
        if (e.y > board.offsetHeight - 20) {
            invokeHelp();
            return;
        }
        
        // 死亡判定
        if (e.hp <= 0) {
            createParticle(e.x + 25, e.y + 25, '✨');
            e.el.remove();
            enemies.splice(i, 1);
            if (bossEnemy && e === bossEnemy) {
                bossEnemy = null;
                stopBossMinions();
                removeBossHpBar();
            }
        }
    }

    if (bossEnemy && !helpShown) {
        if (bossEnemy.y > board.offsetHeight * 0.5) {
            showHelpButton();
            helpShown = true;
        }
    }
    if (bossEnemy) {
        bossEnemy.hp = Math.min(bossEnemy.maxHp, bossEnemy.hp + bossEnemy.regenRate / 60);
        updateBossHpBar();
    }
    
    // 2. 植物攻击
    const now = Date.now();
    for (let r=0; r<ROWS; r++) {
        for (let c=0; c<COLS; c++) {
            if (grid[r][c].hasPlant) {
                const p = grid[r][c].plantObj;
                if (p.type === 'shooter' || p.type === 'ice') {
                    if (now - p.lastShot > 1000) { // 1秒一发
                        const hasEnemy = enemies.some(e => e.col === c && e.y < (r * rowHeight) && e.y > -50);
                        if (hasEnemy) {
                            spawnBullet(r, c, p.type);
                            p.lastShot = now;
                        }
                    }
                }
            }
        }
    }

    // 3. 子弹移动
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.y -= 8;
        b.el.style.top = b.y + 'px';
        
        // 击中判定
        let hit = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            // 简单矩形碰撞
            if (Math.abs(b.x - e.x) < 30 && Math.abs(b.y - e.y) < 30) {
                e.hp -= 10; // 伤害
                
                // 特殊效果
                if (b.type === 'ice') {
                    e.slowTimer = 180; // 减速3秒 (60fps * 3)
                    createParticle(e.x+25, e.y+25, '❄️');
                } else {
                    createParticle(e.x+25, e.y+25, '💥');
                }

                e.el.style.transform = 'scale(1.1)';
                setTimeout(() => e.el.style.transform = 'scale(1)', 100);
                hit = true;
                break;
            }
        }
        
        if (hit || b.y < -20) {
            b.el.remove();
            bullets.splice(i, 1);
        }
    }
    
    requestAnimationFrame(gameLoop);
}

// 全局胜利检查器
setInterval(() => {
    if (!gameActive) return;
    if (infiniteHearts) return; // 无限火力模式下不进行常规胜利判定

    // 只有当不生成怪了，且场上没怪了，才算波次/游戏结束
    if (!isSpawning && enemies.length === 0) {
        if (wave === TOTAL_WAVES) {
            // 游戏胜利
            if (!window.victoryPending) {
                 window.victoryPending = true;
                 setTimeout(() => {
                     if (enemies.length === 0) gameWin();
                     else window.victoryPending = false;
                 }, 2000);
            }
        } else {
            // 下一波
            if (!window.wavePending) {
                window.wavePending = true;
                setTimeout(() => {
                    startWave(wave + 1);
                    window.wavePending = false;
                }, 2000);
            }
        }
    }
}, 1000);

function spawnBullet(r, c, type) {
    const board = document.getElementById('game-board');
    const rowHeight = board.offsetHeight / ROWS;
    const colWidth = board.offsetWidth / COLS;
    
    const b = document.createElement('div');
    b.className = 'bullet';
    const x = c * colWidth + colWidth/2 - 10;
    const y = r * rowHeight + 10;
    
    b.style.left = x + 'px';
    b.style.top = y + 'px';
    
    if (type === 'ice') {
        b.style.background = '#00ffff';
        b.style.boxShadow = '0 0 10px #00ffff';
    }

    board.appendChild(b);
    
    bullets.push({ el: b, x: x, y: y, type: type });
}

function gameOver() {
    gameActive = false;
    cancelAnimationFrame(gameLoopId);
    document.getElementById('modal-title').innerText = "再试一次";
    document.getElementById('modal-msg').innerText = "生活的小烦恼太多啦，但别放弃，爱能战胜一切！";
    document.getElementById('game-modal').style.display = 'flex';
    
    // 替换重玩按钮逻辑，不再刷新页面
    const btn = document.querySelector('#game-modal .game-btn');
    btn.onclick = resetGame;
    btn.innerText = "重整旗鼓";
}

function resetGame() {
    // 清理场景
    document.getElementById('game-modal').style.display = 'none';
    enemies.forEach(e => e.el.remove());
    enemies = [];
    bullets.forEach(b => b.el.remove());
    bullets = [];
    document.querySelectorAll('.sun').forEach(s => s.remove());
    
    // 重置状态
    points = 520;
    wave = 1;
    isSpawning = false;
    if(enemySpawnTimer) clearInterval(enemySpawnTimer);
    if(resourceTimer) clearInterval(resourceTimer);
    enemySpawnTimer = null;
    
    window.victoryPending = false;
    window.wavePending = false;
    bossEnemy = null;
    helpShown = false;
    infiniteHearts = false;
    const overlay = document.getElementById('buff-overlay');
    if (overlay) overlay.style.display = 'none';
    const btn = document.getElementById('help-btn');
    if (btn) btn.style.display = 'none';

    // 重新开始
    initGrid();
    gameActive = true;
    updatePoints(0);
    gameLoopId = requestAnimationFrame(gameLoop);
    startWave(1);
    
    // 重新启动资源生成
    resourceTimer = setInterval(() => {
        if(!gameActive) return;
        createSun();
    }, 5000);
}

function gameWin() {
    gameActive = false;
    cancelAnimationFrame(gameLoopId);
    document.getElementById('modal-title').innerText = "守护成功！";
    document.getElementById('modal-msg').innerText = "你真棒！所有的烦恼都被爱心消灭啦！永远爱你！";
    document.getElementById('game-modal').style.display = 'flex';
    
    // 胜利也可以重玩
    const btn = document.querySelector('#game-modal .game-btn');
    btn.onclick = resetGame;
    btn.innerText = "再玩一次";

    // 胜利烟花
    for(let i=0; i<20; i++) {
        setTimeout(() => {
            createParticle(Math.random()*window.innerWidth, Math.random()*window.innerHeight, '🎆');
        }, i*200);
    }
}

// 粒子特效
function createParticle(x, y, char) {
    const p = document.createElement('div');
    p.style.position = 'absolute';
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    p.style.fontSize = '20px';
    p.innerHTML = char;
    p.style.pointerEvents = 'none';
    p.style.zIndex = 200;
    p.style.transition = 'all 1s ease-out';
    document.body.appendChild(p);
    
    setTimeout(() => {
        p.style.transform = `translate(${Math.random()*100-50}px, ${Math.random()*100-50}px) scale(0)`;
        p.style.opacity = 0;
    }, 10);
    setTimeout(() => p.remove(), 1000);
}

function updateUnlockedCards() {
    const idMap = { 'shooter': 'card-shooter', 'ice': 'card-ice', 'wall': 'card-wall', 'bomb': 'card-bomb' };
    Object.keys(idMap).forEach(type => {
        const el = document.getElementById(idMap[type]);
        if (!el) return;
        if (unlockedPlants.includes(type)) el.classList.remove('locked');
        else el.classList.add('locked');
    });
    checkCardAffordability();
}

// --- 启动绑定与全局导出 ---
window.startRomance = startRomance;
window.startGame = startGame;
window.selectPlant = selectPlant;
window.clickHeart = clickHeart;
