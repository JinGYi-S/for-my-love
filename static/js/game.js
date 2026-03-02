// --- Game Constants & Configuration ---
const CONFIG = {
    gravity: 900,           // 降低重力，让跳跃更轻盈 (原1200)
    jumpStrength: 750,      // 提升跳跃高度 (原700) -> MaxHeight ≈ 312px
    moveSpeed: 450,         // 略微提升水平移动速度 (原400)
    platformWidth: 90,      // 增加基础宽度 (原80)
    platformHeight: 20,
    platformGapMin: 50,     // 减小最小间距 (原80)
    platformGapMax: 160,    // 大幅减小最大间距 (原200)，确保一定能跳过去
    colors: {
        sky: ['#87CEEB', '#E0F7FA'],
        cloud: '#FFFFFF',
        player: '#FF6B8B',
        platform: '#FFFFFF',
        text: '#333333'
    }
};

// --- Game State ---
const state = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    lastTime: 0,
    isRunning: false,
    score: 0,
    highScore: 0,
    cameraY: 0,
    
    player: {
        x: 0,
        y: 0,
        width: 40,
        height: 40,
        vx: 0,
        vy: 0,
        facingRight: true
    },
    
    platforms: [],
    particles: [],
    items: [], // hearts, stars
    clouds: [], // background clouds
    
    input: {
        left: false,
        right: false
    }
};

// --- Initialization ---
window.onload = function() {
    initGame();
};

function initGame() {
    state.canvas = document.getElementById('game-canvas');
    state.ctx = state.canvas.getContext('2d');
    
    // Handle resize
    window.addEventListener('resize', resize);
    resize();
    
    // Handle input
    setupInput();
    
    // Love Timer
    const start = new Date("2022-01-11");
    const diff = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24));
    const timerDiv = document.createElement('div');
    timerDiv.style.color = '#FF6B8B';
    timerDiv.style.fontSize = '18px';
    timerDiv.style.marginBottom = '20px';
    timerDiv.innerHTML = `❤️ 已经相爱 <b>${diff}</b> 天 ❤️`;
    const h1 = document.querySelector('#start-screen h1');
    if(h1) h1.after(timerDiv);

    // UI Buttons
    document.getElementById('game-container').addEventListener('click', (e) => {
        // If clicking UI buttons, let them handle it
        if (e.target.tagName === 'BUTTON') return;
        
        // If in menu, start game
        const startScreen = document.getElementById('start-screen');
        if (startScreen.style.display !== 'none') {
            startGame();
        }
    });
    
    document.getElementById('restart-btn').addEventListener('click', startGame);
    
    // Start loop
    requestAnimationFrame(gameLoop);
}

function resize() {
    state.width = state.canvas.width = window.innerWidth;
    state.height = state.canvas.height = window.innerHeight;
}

function setupInput() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') state.input.left = true;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') state.input.right = true;
        if (e.code === 'Space' && !state.isRunning) startGame();
    });
    
    window.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') state.input.left = false;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') state.input.right = false;
    });
    
    // Touch
    state.canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleTouch(e.touches);
    }, {passive: false});
    
    state.canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        handleTouch(e.touches);
    }, {passive: false});
    
    state.canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleTouch(e.touches);
    }, {passive: false});
}

function handleTouch(touches) {
    state.input.left = false;
    state.input.right = false;
    
    for (let i = 0; i < touches.length; i++) {
        const t = touches[i];
        if (t.clientX < state.width / 2) {
            state.input.left = true;
        } else {
            state.input.right = true;
        }
    }
}

function startGame() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('score-board').style.display = 'block';
    
    state.isRunning = true;
    state.score = 0;
    state.cameraY = 0;
    
    // Reset Player
    state.player.x = state.width / 2 - state.player.width / 2;
    state.player.y = state.height - 200;
    state.player.vx = 0;
    state.player.vy = -CONFIG.jumpStrength; // Start with a jump
    
    // Generate Initial Platforms
    state.platforms = [];
    state.items = [];
    state.particles = [];
    state.clouds = []; // Background clouds
    
    // Background clouds
    for(let i=0; i<10; i++) {
        state.clouds.push({
            x: Math.random() * state.width,
            y: Math.random() * state.height,
            size: Math.random() * 0.5 + 0.5,
            speed: Math.random() * 20 + 10
        });
    }
    
    // Base platform
    state.platforms.push({
        x: 0,
        y: state.height - 50,
        width: state.width,
        height: 50,
        type: 'base'
    });
    
    // Generate up to screen height * 2 initially
    let currentY = state.height - 150;
    while (currentY > -state.height) {
        generatePlatform(currentY);
        currentY -= (Math.random() * (CONFIG.platformGapMax - CONFIG.platformGapMin) + CONFIG.platformGapMin);
    }
    
    state.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function generatePlatform(y) {
    const margin = 20;
    const w = CONFIG.platformWidth + Math.random() * 40;
    const x = Math.random() * (state.width - w - margin * 2) + margin;
    
    const type = Math.random() < 0.1 ? 'moving' : 'normal';
    
    state.platforms.push({
        x: x,
        y: y,
        width: w,
        height: CONFIG.platformHeight,
        type: type,
        vx: type === 'moving' ? (Math.random() < 0.5 ? 100 : -100) : 0
    });
    
    // Chance to spawn item
    if (Math.random() < 0.3) {
        state.items.push({
            x: x + w / 2 - 15,
            y: y - 40,
            width: 30,
            height: 30,
            type: Math.random() < 0.2 ? 'star' : 'heart', // 20% 概率是星星（超级跳）
            collected: false
        });
    }
}

// --- Main Loop ---
function gameLoop(timestamp) {
    if (!state.isRunning) {
        // Draw idle background or menu loop if needed
        return;
    }
    
    const dt = Math.min((timestamp - state.lastTime) / 1000, 0.05); // Cap dt at 50ms to prevent huge jumps
    state.lastTime = timestamp;
    
    update(dt);
    draw();
    
    if (state.isRunning) {
        requestAnimationFrame(gameLoop);
    }
}

// --- Update Logic ---
function update(dt) {
    const p = state.player;
    
    // Horizontal Movement
    if (state.input.left) {
        p.vx = -CONFIG.moveSpeed;
        p.facingRight = false;
    } else if (state.input.right) {
        p.vx = CONFIG.moveSpeed;
        p.facingRight = true;
    } else {
        p.vx *= 0.9; // Friction
    }
    
    p.x += p.vx * dt;
    
    // Screen wrapping
    if (p.x + p.width < 0) p.x = state.width;
    if (p.x > state.width) p.x = -p.width;
    
    // Vertical Movement (Gravity)
    p.vy += CONFIG.gravity * dt;
    p.y += p.vy * dt;
    
    // Camera / Scrolling
    if (p.y < state.height * 0.4) {
        const diff = state.height * 0.4 - p.y;
        p.y = state.height * 0.4;
        
        // Move everything down
        state.platforms.forEach(plat => plat.y += diff);
        state.items.forEach(item => item.y += diff);
        state.particles.forEach(part => part.y += diff);
        state.clouds.forEach(c => c.y += diff * 0.5); // Parallax for clouds
        
        state.score += Math.floor(diff * 0.1);
        document.getElementById('score').innerText = state.score;
        
        // Remove off-screen platforms
        state.platforms = state.platforms.filter(plat => plat.y < state.height + 100);
        state.items = state.items.filter(item => item.y < state.height + 100);
        
        // Generate new platforms
        const highestPlatform = state.platforms.reduce((min, p) => p.y < min ? p.y : min, state.height);
        if (highestPlatform > 100) {
            generatePlatform(highestPlatform - (Math.random() * (CONFIG.platformGapMax - CONFIG.platformGapMin) + CONFIG.platformGapMin));
        }
    }
    
    // Platform Collision
    if (p.vy > 0) { // Only check when falling
        state.platforms.forEach(plat => {
            if (p.y + p.height > plat.y && 
                p.y + p.height < plat.y + plat.height + 20 && // Tolerance
                p.x + p.width > plat.x + 10 && 
                p.x < plat.x + plat.width - 10) {
                
                // Bounce
                p.vy = -CONFIG.jumpStrength;
                createParticles(p.x + p.width/2, p.y + p.height, 5, '#FFF');
                
                // Play sound effect (optional/todo)
            }
        });
    }
    
    // Platform Update (Moving platforms)
    state.platforms.forEach(plat => {
        if (plat.type === 'moving') {
            plat.x += plat.vx * dt;
            if (plat.x < 0 || plat.x + plat.width > state.width) {
                plat.vx *= -1;
            }
        }
    });
    
    // Item Collection
    state.items.forEach(item => {
        if (!item.collected && 
            p.x < item.x + item.width && 
            p.x + p.width > item.x && 
            p.y < item.y + item.height && 
            p.y + p.height > item.y) {
            
            item.collected = true;
            state.score += (item.type === 'star' ? 500 : 100);
            createParticles(item.x + item.width/2, item.y + item.height/2, 10, item.type === 'star' ? '#FFD700' : '#FF6B8B');
            
            // Boost
            if (item.type === 'star') {
                p.vy = -CONFIG.jumpStrength * 1.5; // Super jump
            }
        }
    });
    state.items = state.items.filter(i => !i.collected);
    
    // Particles
    state.particles.forEach(part => {
        part.x += part.vx * dt;
        part.y += part.vy * dt;
        part.life -= dt;
        part.alpha = part.life;
    });
    state.particles = state.particles.filter(p => p.life > 0);
    
    // Game Over Check
    if (p.y > state.height) {
        gameOver();
    }
    
    // Background Clouds Drift
    state.clouds.forEach(c => {
        c.y += c.speed * dt * 0.5;
        if (c.y > state.height + 50) {
            c.y = -50;
            c.x = Math.random() * state.width;
        }
    });
}

function gameOver() {
    state.isRunning = false;
    document.getElementById('final-score').innerText = state.score;
    document.getElementById('game-over-screen').style.display = 'block';
    document.getElementById('score-board').style.display = 'none';
}

function createParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        state.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 200,
            vy: (Math.random() - 0.5) * 200,
            life: 1.0,
            color: color,
            size: Math.random() * 5 + 2
        });
    }
}

// --- Draw Logic ---
function draw() {
    const ctx = state.ctx;
    ctx.clearRect(0, 0, state.width, state.height);
    
    // 1. Draw Background Elements (Sun & Clouds)
    // Sun
    const sunY = state.height * 0.15;
    ctx.fillStyle = '#FFF2CC';
    ctx.beginPath();
    ctx.arc(state.width * 0.8, sunY, 60, 0, Math.PI * 2);
    ctx.fill();
    // Sun rays
    ctx.strokeStyle = 'rgba(255, 242, 204, 0.5)';
    ctx.lineWidth = 2;
    const time = Date.now() / 2000;
    for(let i=0; i<12; i++) {
        const angle = time + (i * Math.PI / 6);
        ctx.beginPath();
        ctx.moveTo(state.width * 0.8 + Math.cos(angle)*70, sunY + Math.sin(angle)*70);
        ctx.lineTo(state.width * 0.8 + Math.cos(angle)*100, sunY + Math.sin(angle)*100);
        ctx.stroke();
    }
    
    // Background Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    state.clouds.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, 30 * c.size, 0, Math.PI * 2);
        ctx.arc(c.x + 20 * c.size, c.y + 10 * c.size, 35 * c.size, 0, Math.PI * 2);
        ctx.arc(c.x - 20 * c.size, c.y + 10 * c.size, 35 * c.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // 2. Draw Platforms
    state.platforms.forEach(plat => {
        ctx.fillStyle = CONFIG.colors.platform;
        // Rounded rect for cloud look
        drawCloud(ctx, plat.x, plat.y, plat.width, plat.height);
    });
    
    // 3. Draw Items
    state.items.forEach(item => {
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(item.type === 'star' ? '⭐' : '❤️', item.x + item.width/2, item.y + item.height/2);
    });
    
    // 4. Draw Particles
    state.particles.forEach(p => {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });
    
    // 5. Draw Player
    const p = state.player;
    ctx.save();
    ctx.translate(p.x + p.width/2, p.y + p.height/2);
    if (!p.facingRight) ctx.scale(-1, 1);
    
    // Draw a cute character (e.g., Angel/Cupid/Heart with wings)
    // Body (Heart)
    ctx.fillStyle = CONFIG.colors.player;
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("👼", 0, 0); // Angel emoji as placeholder
    
    ctx.restore();
}

// Helper to draw cloud-like platforms
function drawCloud(ctx, x, y, w, h) {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    
    // Fallback for roundRect
    if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, h/2);
    } else {
        ctx.moveTo(x + h/2, y);
        ctx.lineTo(x + w - h/2, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + h/2);
        ctx.quadraticCurveTo(x + w, y + h, x + w - h/2, y + h);
        ctx.lineTo(x + h/2, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h/2);
        ctx.quadraticCurveTo(x, y, x + h/2, y);
    }
    ctx.fill();
    
    // Fluff
    ctx.beginPath();
    ctx.arc(x + 10, y, 15, 0, Math.PI * 2);
    ctx.arc(x + w - 10, y, 12, 0, Math.PI * 2);
    ctx.arc(x + w/2, y - 5, 18, 0, Math.PI * 2);
    ctx.fill();
}
