/**
 * Interactivity & Rendering & Slider Logic for Personal Resume
 */

document.addEventListener('DOMContentLoaded', () => {

    // 1. Render Data
    renderHero();
    renderAbout();
    renderSkills();
    renderProjects();
    renderContact();

    // 1.5 高性能鼠标跟随光效 (使用 rAF 和 transform)
    const glow = document.getElementById('cursor-glow');
    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        // 悬浮交互逻辑 (保持不变但优化触发)
        const target = e.target;
        if (target.closest('a, .btn-primary, .btn-secondary, .glass, .stat-card, .project-card, .slide-btn')) {
            glow.classList.add('glow-expand');
        } else {
            glow.classList.remove('glow-expand');
        }
    });

    function updateGlow() {
        // 平滑插值 (Lerp) 让跟随更柔和，同时使用 translate3d 开启硬件加速
        currentX += (mouseX - currentX) * 0.15;
        currentY += (mouseY - currentY) * 0.15;
        glow.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
        requestAnimationFrame(updateGlow);
    }
    updateGlow();

    // 2. Page Slider Logic (原味视觉 + 性能冷冻 + 懒加载 + Three.js 3D 引擎)
    const slider = document.getElementById('page-slider');
    const arrowRight = document.getElementById('slide-arrow-right');
    const arrowLeft = document.getElementById('slide-arrow-left');
    const resumePage = document.getElementById('resume-page');
    const showcasePage = document.getElementById('showcase-page');
    let isShowcaseRendered = false;
    let threeEngine = {
        scene: null,
        camera: null,
        renderer: null,
        earth: null,
        animationID: null
    };

    // 动态加载 Three.js 引擎
    function loadThreeJS(callback) {
        if (window.THREE) {
            callback();
            return;
        }
        console.log("%c📦 Summoning Three.js Engine...", "color: #3b82f6; font-weight: bold;");
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js';
        script.onload = callback;
        document.head.appendChild(script);
    }

    arrowRight.addEventListener('click', () => {
        showcasePage.style.visibility = 'visible';
        slider.style.transform = 'translateX(-100vw)';
        arrowRight.classList.add('hidden');
        arrowLeft.classList.remove('hidden');

        loadThreeJS(() => {
            if (!isShowcaseRendered) {
                setTimeout(() => {
                    renderShowcase();
                    isShowcaseRendered = true;
                }, 400);
            } else {
                setTimeout(() => {
                    initEarth();
                    // 手动触发一次 Resize 校准，确保尺寸正确
                    window.dispatchEvent(new Event('resize'));
                }, 800);
            }
        });

        setTimeout(() => {
            resumePage.style.visibility = 'hidden';
        }, 850);
    });

    arrowLeft.addEventListener('click', () => {
        resumePage.style.visibility = 'visible';
        slider.style.transform = 'translateX(0)';
        arrowLeft.classList.add('hidden');
        arrowRight.classList.remove('hidden');

        // 性能冷冻：彻底停止 WebGL 渲染循环
        if (threeEngine.animationID) {
            cancelAnimationFrame(threeEngine.animationID);
            threeEngine.animationID = null;
            console.log("%c🌍 3D Earth Engine Hibernated", "color: #f43f5e; font-weight: bold;");
        }

        setTimeout(() => {
            showcasePage.style.visibility = 'hidden';
        }, 850);
    });

    // --- Showcase Engine (Three.js Edition) ---

    function renderShowcase() {
        initEarth();

        const gallery = document.getElementById('showcase-gallery');
        if (!gallery) return;

        const labs = [
            { title: "3D 地球同步轨道", desc: "基于 Three.js 的实时地球渲染系统", img: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80" },
            { title: "赛博交互终端", desc: "集成自动化引导的命令行交互系统", img: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80" },
            { title: "星舰防御系统", desc: "基于 Canvas 的高性能街机游戏", img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80" }
        ];

        gallery.innerHTML = labs.map(lab => `
            <div class="lab-card">
                <img src="${lab.img}" class="card-image" alt="${lab.title}" loading="lazy">
                <div class="card-overlay"></div>
                <div class="card-info">
                    <h2 class="badge">Experimental</h2>
                    <h3>${lab.title}</h3>
                    <p>${lab.desc}</p>
                </div>
            </div>
        `).join('');

        init3DInteraction();
        initMouseTrail(); // 初始化粒子拖尾
    }

    function initMouseTrail() {
        const wrapper = document.querySelector('.showcase-wrapper');
        if (!wrapper || document.getElementById('trail-canvas')) return;

        const canvas = document.createElement('canvas');
        canvas.id = 'trail-canvas';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none'; // 不干扰交互
        canvas.style.zIndex = '1';
        wrapper.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        let particles = [];
        const maxParticles = 1200; // 硬上限
        const softCap = 500;      // 软上限，开始限流
        let lastX = 0, lastY = 0;
        let isVisible = true; // 2D 粒子可见性状态
        let isMouseInGame = false; // 是否在游戏区域

        // 鲁棒获取游戏容器，用于屏蔽拖尾
        const gameContainer = document.getElementById('game-section');

        // 监听可见性
        const observer = new IntersectionObserver((entries) => {
            const wasVisible = isVisible;
            isVisible = entries[0].isIntersecting;
            
            // 唤醒逻辑
            if (isVisible && !wasVisible) {
                console.log("%c✨ 2D Particles Resumed", "color: #818cf8;");
                animate();
            }
        }, { threshold: 0.1 });
        observer.observe(wrapper);

        // 监听是否进入游戏区域，用来屏蔽全局拖尾
        if (gameContainer) {
            gameContainer.addEventListener('mouseenter', () => isMouseInGame = true);
            gameContainer.addEventListener('mouseleave', () => isMouseInGame = false);
        }

        function resize() {
            canvas.width = wrapper.offsetWidth;
            canvas.height = wrapper.offsetHeight;
        }

        class Particle {
            constructor(x, y, vx, vy) {
                this.x = x;
                this.y = y;
                this.vx = vx * 0.3; // 动量缩放
                this.vy = vy * 0.3;
                this.alpha = 1;
                this.originalSize = Math.random() * 3 + 1;
                this.size = this.originalSize;
                this.color = '#ffffff';
                this.life = 1.0;

                // 环境星属性
                this.isAmbient = false;
                this.maxAlpha = 1;
                this.phase = 'in'; // 'in' 为淡入, 'out' 为淡出
            }
            update(currentCount) {
                if (this.isAmbient) {
                    // 环境星逻辑：极慢的呼吸感
                    if (this.phase === 'in') {
                        this.alpha += 0.003;
                        if (this.alpha >= this.maxAlpha) this.phase = 'out';
                    } else {
                        this.alpha -= 0.0015;
                    }
                    this.life = this.alpha;

                    // 极微弱的漂移
                    this.x += this.vx;
                    this.y += this.vy;
                } else {
                    // 鼠标拖尾逻辑
                    this.x += this.vx;
                    this.y += this.vy;
                    this.vx *= 0.98;
                    this.vy *= 0.98;

                    let decayRate = 0.005;
                    if (currentCount > softCap) {
                        const factor = (currentCount - softCap) / (maxParticles - softCap);
                        decayRate += factor * 0.02;
                    }
                    this.alpha -= decayRate;
                    this.life = this.alpha;
                }

                // 同步缩小尺寸
                this.size = this.originalSize * Math.max(0, this.alpha);

                // 边缘检测：碰边即逝 (增加 10px 缓冲，避免边缘闪烁)
                if (this.x < -10 || this.x > canvas.width + 10 || this.y < -10 || this.y > canvas.height + 10) {
                    this.life = 0;
                }
            }
            draw() {
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        window.addEventListener('mousemove', (e) => {
            // 鲁棒性可见性检查
            if (showcasePage.classList.contains('hidden') || showcasePage.style.visibility === 'hidden') return;

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // 计算速度
            // 游戏区域不产生全局拖尾
            if (isMouseInGame) return;

            const dx = x - lastX;
            const dy = y - lastY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // 反瞬移保护：如果位移距离过大（如 > 150px），判定为滚动或瞬移，不产生粒子
            if (distance < 150 && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
                // 动态产生概率：超过软上限后，产生新粒子的几率线性下降
                let spawnChance = 1.0;
                if (particles.length > softCap) {
                    spawnChance = 1.0 - (particles.length - softCap) / (maxParticles - softCap);
                }

                if (Math.random() < spawnChance) {
                    particles.push(new Particle(x, y, dx, dy));
                }

                // 兜底：如果意外超过硬上限，移除最老的
                if (particles.length > maxParticles) {
                    particles.shift();
                }
            }

            lastX = x;
            lastY = y;
        });

        let frameCount = 0;
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const currentCount = particles.length;

            // 背景星阶梯控制逻辑
            const ambientCount = particles.filter(p => p.isAmbient).length;
            const ambientMax = 200;
            const ambientSoftCap = 100;

            let spawnInterval = 40; // 默认减速生产 (超过 100 颗后)
            if (ambientCount < ambientSoftCap) {
                spawnInterval = 5; // 加速生产 (不足 100 颗时)
            }

            frameCount++;
            if (frameCount % spawnInterval === 0 && ambientCount < ambientMax) {
                const rx = Math.random() * canvas.width;
                const ry = Math.random() * canvas.height;

                const p = new Particle(rx, ry, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1);
                p.isAmbient = true;
                p.alpha = 0.01;
                p.maxAlpha = Math.random() * 0.7 + 0.1;
                p.originalSize = Math.random() * 2 + 0.5;
                particles.push(p);
            }

            particles = particles.filter(p => p.life > 0 && p.alpha > 0);
            if (isVisible) {
                particles.forEach(p => {
                    p.update(currentCount);
                    p.draw();
                });
                requestAnimationFrame(animate);
            }
        }

        window.addEventListener('resize', resize);
        resize();
        animate();
    }

    function initEarth() {
        const container = document.getElementById('earth-container');
        if (!container || !window.THREE) return;

        threeEngine.isVisible = true; // 3D 可见性
        const observer = new IntersectionObserver((entries) => {
            const wasVisible = threeEngine.isVisible;
            threeEngine.isVisible = entries[0].isIntersecting;
            
            // 如果从不可见变为可见，重新启动动画循环
            if (threeEngine.isVisible && !wasVisible) {
                console.log("%c🌍 3D Earth Resumed by Observer", "color: #10b981;");
                animate();
            }
        }, { threshold: 0.1 });
        observer.observe(container);

        // 如果已经初始化过渲染器，只需重启动画循环
        if (threeEngine.renderer) {
            animate();
            console.log("%c🌍 3D Earth Engine Resumed", "color: #10b981; font-weight: bold;");
            return;
        }

        const width = container.offsetWidth;
        const height = container.offsetHeight;

        // 1. Scene & Camera
        threeEngine.scene = new THREE.Scene();
        threeEngine.camera = new THREE.PerspectiveCamera(45, width / height, 1, 4000);
        threeEngine.camera.position.z = 1100; // 配合极致沉降

        // 2. Renderer
        threeEngine.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        threeEngine.renderer.setSize(width, height);
        threeEngine.renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(threeEngine.renderer.domElement);

        // 3. Earth Geometry & Texture
        const loader = new THREE.TextureLoader();
        // 换回鲜艳的高饱和度贴图
        const texture = loader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg');

        const geometry = new THREE.SphereGeometry(200, 64, 64);
        // 使用 MeshBasicMaterial，不需要光照也能保持最高亮度
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.98
        });
        threeEngine.earth = new THREE.Mesh(geometry, material);
        threeEngine.earth.rotation.y = Math.PI * 0.6; // 初始朝向：亚洲/中国方向

        // 响应式下沉高度处理 (已上移优化)
        const isMobile = window.innerWidth <= 768;
        threeEngine.earth.position.y = isMobile ? -50 : -100;

        threeEngine.scene.add(threeEngine.earth);

        // 4. Atmosphere Glow (调亮大气层)
        const atmoGeo = new THREE.SphereGeometry(208, 64, 64);
        const atmoMat = new THREE.MeshBasicMaterial({
            color: 0x6366f1,
            transparent: true,
            opacity: 0.25,
            side: THREE.BackSide
        });
        const atmosphere = new THREE.Mesh(atmoGeo, atmoMat);
        atmosphere.position.y = isMobile ? -50 : -100;
        threeEngine.scene.add(atmosphere);

        function animate() {
            if (!threeEngine.isVisible) {
                threeEngine.animationID = null;
                return; // 看不见，直接断流
            }
            
            threeEngine.animationID = requestAnimationFrame(animate);
            if (threeEngine.earth) {
                threeEngine.earth.rotation.y += 0.0002; // 极致优雅的慢速自转
            }
            threeEngine.renderer.render(threeEngine.scene, threeEngine.camera);
        }

        function onWindowResize() {
            const w = container.offsetWidth;
            const h = container.offsetHeight;
            threeEngine.camera.aspect = w / h;
            threeEngine.camera.updateProjectionMatrix();
            threeEngine.renderer.setSize(w, h);
        }

        window.addEventListener('resize', onWindowResize);
        animate();
        console.log("%c🌍 3D Earth Engine Online (Three.js Mode)", "color: #10b981; font-weight: bold;");

        // 成就触发：环球旅行者 (点击地球容器)
        container.addEventListener('mousedown', () => {
            window.unlockAchievement('GLOBE_TROTTER');
        });
    }

    function init3DInteraction() {
        const cards = document.querySelectorAll('.lab-card, .skill-group');
        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                // 计算旋转角度 (最大 10 度)
                const rotateX = ((y - centerY) / centerY) * -10;
                const rotateY = ((x - centerX) / centerX) * 10;

                card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'rotateX(0) rotateY(0)';
            });
        });
    }

    // 3. Navbar & Scroll Logic (Target internal page)
    const navbar = document.getElementById('navbar');

    let scrollIndicatorTimeout;
    resumePage.addEventListener('scroll', () => {
        const indicator = document.querySelector('.scroll-indicator');
        if (indicator) {
            indicator.classList.add('hidden');
            clearTimeout(scrollIndicatorTimeout);
            if (resumePage.scrollTop < 10) {
                scrollIndicatorTimeout = setTimeout(() => {
                    if (resumePage.scrollTop < 10) {
                        indicator.classList.remove('hidden');
                    }
                }, 2000);
            }
        }

        if (resumePage.scrollTop > 50) {
            navbar.style.background = 'rgba(5, 7, 10, 0.9)';
            navbar.style.height = '70px';
            navbar.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
        } else {
            navbar.style.background = 'rgba(15, 18, 25, 0.7)';
            navbar.style.height = '80px';
            navbar.style.borderBottom = '1px solid transparent';
        }
    });

    // 4. Reveal Sections on Scroll
    initRevealAnimations(resumePage);

    // 5. Smooth Scroll
    initSmoothScroll(resumePage);

    // 6. 初始化粒子背景 (实现 CPU/GPU 负载均衡)
    initParticles();

    // --- Helper Functions ---

    function initParticles() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const bg = document.querySelector('.bg-gradient');
        if (!bg) return;

        bg.appendChild(canvas);
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.opacity = '0.3';

        let particles = [];
        const count = 50;

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        class Particle {
            constructor() {
                this.init();
            }
            init() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.size = Math.random() * 2;
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
                if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
            }
            draw() {
                ctx.fillStyle = 'rgba(99, 102, 241, 0.5)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        for (let i = 0; i < count; i++) particles.push(new Particle());

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animate);
        }

        window.addEventListener('resize', resize);
        resize();
        animate();
    }

    function renderHero() {
        const container = document.getElementById('hero-container');
        const p = RESUME_DATA.profile;
        container.innerHTML = `
            <div class="hero-content">
                <h2 class="badge">欢迎来到我的数字世界</h2>
                <h1>你好，我是 <span class="text-gradient">${p.name}</span></h1>
                <p class="lead">${p.role}</p>
                <div class="hero-btns">
                    <a href="#projects" class="btn-primary">查看作品 <i class="ri-arrow-right-line"></i></a>
                    <a href="#contact" class="btn-secondary">联系我 <i class="ri-chat-3-line"></i></a>
                </div>
            </div>
            <div class="hero-visual">
                <div class="terminal-card">
                    <div class="terminal-header">
                        <div class="terminal-dots">
                            <span class="dot red"></span>
                            <span class="dot yellow"></span>
                            <span class="dot green"></span>
                        </div>
                        <div class="terminal-title">bash — vuyangtian</div>
                    </div>
                    <div class="terminal-body" id="terminal-body">
                        <div class="terminal-line">Welcome to Bob's OS v1.0.0...</div>
                        <div class="terminal-line">Type 'help' to see available commands.</div>
                        <div class="input-area">
                            <span class="prompt">bob@fythub:~$</span>
                            <input type="text" class="terminal-input" id="terminal-input" spellcheck="false" autocomplete="off">
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 初始化终端逻辑
        setTimeout(() => initTerminal(), 100);
    }

    function initTerminal() {
        const input = document.getElementById('terminal-input');
        const body = document.getElementById('terminal-body');
        if (!input || !body) return;

        let isManualInterrupted = false;

        // 点击聚焦
        document.querySelector('.terminal-card').addEventListener('click', () => {
            input.focus();
        });

        const commands = {
            'help': 'Available commands: [whoami, ls, cat, help, clear, exit]',
            'whoami': `${RESUME_DATA.profile.chineseName} - ${RESUME_DATA.profile.role}. A code architect specializing in high-performance web systems and visual experiences.`,
            'ls': 'skills/  projects/  experience/  achievements/',
            'cat skills': 'Core: Java 21, Spring Boot, Three.js, Redis. <br>Design: Glassmorphism, UI/UX Engineering.',
            'cat projects': 'Recent: School Marketplace, Starship Defender Engine, Personal Resume (Current).',
            'cat experience': 'Full-stack development with a focus on scalable architecture and creative frontend interaction.',
            'exit': 'Access denied. You can never leave the matrix.',
            'clear': 'CLEAR_CMD'
        };

        function executeCommand(val) {
            if (!val) return;
            appendLine(`bob@fythub:~$ ${val}`, 'command-input');

            if (val === 'clear') {
                const lines = body.querySelectorAll('.terminal-line');
                lines.forEach(l => l.remove());
            } else if (commands[val]) {
                appendLine(commands[val], 'command-output');
            } else if (val.startsWith('cat ')) {
                const target = val.replace('cat ', '');
                const response = commands[val] || `Error: File '${target}' not found.`;
                appendLine(response, 'command-output');
            } else {
                appendLine(`Command not found: ${val}. Type 'help' for assistance.`, 'error');
            }
            body.scrollTop = body.scrollHeight;
        }

        function appendLine(text, className) {
            const line = document.createElement('div');
            line.className = `terminal-line ${className}`;
            line.innerHTML = text;
            body.insertBefore(line, input.parentElement);
        }

        // 自动输入逻辑 (支持链式等待)
        async function autoType(text) {
            for (let i = 0; i < text.length; i++) {
                if (isManualInterrupted) return;
                input.value += text[i];
                await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 50));
            }

            if (!isManualInterrupted) {
                return new Promise(resolve => {
                    setTimeout(() => {
                        if (!isManualInterrupted) {
                            executeCommand(input.value);
                            input.value = '';
                            input.focus();
                        }
                        resolve();
                    }, 500);
                });
            }
        }

        input.addEventListener('mousedown', () => {
            isManualInterrupted = true;
        });

        input.addEventListener('keydown', (e) => {
            isManualInterrupted = true; // 只要用户按键，立刻停止自动输入
            if (e.key === 'Enter') {
                const val = input.value.trim().toLowerCase();
                executeCommand(val);
                input.value = '';
            }
        });

        // 1.5秒后开始自动输入序列
        setTimeout(async () => {
            if (!isManualInterrupted) {
                input.focus();
                await autoType('help');

                // 等待 1 秒后再打第二枪
                if (!isManualInterrupted) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await autoType('whoami');
                }
            }
        }, 1500);
    }

    function renderAbout() {
        const container = document.getElementById('about-container');
        const p = RESUME_DATA.profile;
        const stats = RESUME_DATA.stats.map(s => `
            <div class="stat-card glass">
                <h3>${s.value}</h3>
                <p>${s.label}</p>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="about-text">
                <p>${p.bio}</p>
                <div class="personal-info">
                    <div class="info-item"><i class="ri-map-pin-2-line"></i> <span>${p.location}</span></div>
                    <div class="info-item"><i class="ri-mail-line"></i> <span>${p.email}</span></div>
                    <div class="info-item"><i class="ri-quill-pen-line"></i> <span>${p.experience}</span></div>
                </div>
            </div>
            <div class="about-stats">
                ${stats}
            </div>
        `;
    }

    function renderSkills() {
        const container = document.getElementById('skills-container');
        container.innerHTML = RESUME_DATA.skills.map(group => `
            <div class="skill-group glass">
                <h3><i class="${group.icon}"></i> ${group.category}</h3>
                <div class="skill-items">
                    ${group.items.map(s => `
                        <div class="skill-item">
                            <span>${s.name}</span>
                            <div class="progress-bar">
                                <div class="progress" style="width: ${s.level}%"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    function renderProjects() {
        const container = document.getElementById('projects-container');
        container.innerHTML = RESUME_DATA.projects.map(pj => `
            <div class="project-card glass">
                <div class="project-img">
                    <img src="${pj.img}" alt="${pj.title}" loading="lazy">
                </div>
                <div class="project-info">
                    <h3>${pj.title}</h3>
                    <p>${pj.desc}</p>
                    <div class="tags">
                        ${pj.tags.map(t => `<span>${t}</span>`).join('')}
                    </div>
                    <a href="${pj.link}" class="project-link">查看详情 <i class="ri-external-link-line"></i></a>
                </div>
            </div>
        `).join('');
    }

    function renderContact() {
        const container = document.getElementById('contact-container');
        container.innerHTML = `
            <div class="contact-card glass">
                <div class="contact-text">
                    <h2>准备好开启合作了吗？</h2>
                    <p>如果您有任何有趣的想法或项目，欢迎随时联系我。我始终对新技术和新挑战保持开放态度。</p>
                </div>
                <div class="contact-links">
                    <div class="contact-item" id="email-copy-btn" style="cursor: pointer;">
                        <i class="ri-mail-send-line"></i>
                        <span>复制邮箱</span>
                    </div>
                    <div class="contact-item" id="wechat-btn" style="cursor: pointer;">
                        <i class="ri-wechat-line"></i>
                        <span>微信联系</span>
                    </div>
                </div>
            </div>
        `;

        // 绑定邮箱复制
        document.getElementById('email-copy-btn').addEventListener('click', () => {
            const email = RESUME_DATA.profile.email;
            navigator.clipboard.writeText(email).then(() => {
                showToast("邮箱已复制到剪贴板！");
            });
        });

        // 绑定微信弹窗
        document.getElementById('wechat-btn').addEventListener('click', () => {
            showWechatModal();
        });
    }

    function initRevealAnimations(scrollContainer) {
        const revealCallback = (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal-active');
                    observer.unobserve(entry.target);
                }
            });
        };
        const revealObserver = new IntersectionObserver(revealCallback, {
            root: scrollContainer,
            threshold: 0.1
        });
        // 排除 footer，防止底部跳动
        document.querySelectorAll('section, .glass:not(footer), .stat-card, .project-card').forEach(el => {
            el.classList.add('reveal-hidden');
            revealObserver.observe(el);
        });
    }

    function initSmoothScroll(scrollContainer) {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    scrollContainer.scrollTo({
                        top: target.offsetTop - 70,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    console.log("%c🚀 Page Slider Engine Active", "color: #0ea5e9; font-weight: bold;");

    // 延迟初始化游戏
    setTimeout(initStarshipGame, 1000);
});

/**
 * --- Starship Defender Game Engine ---
 * 基于 Canvas 的高性能 2D 射击游戏逻辑
 */
function initStarshipGame() {
    const canvas = document.getElementById('game-canvas');
    const container = document.getElementById('game-section');
    const startBtn = document.getElementById('start-game-btn');
    const quitBtn = document.getElementById('quit-game-btn');
    const overlay = document.getElementById('game-overlay');
    const scoreEl = document.getElementById('game-score');
    const fullscreenBtn = document.getElementById('fullscreen-game-btn');

    // 注入设置页面 DOM 节点
    const settingsBtn = document.getElementById('settings-game-btn');
    const settingsMenu = document.getElementById('game-settings-menu');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const autoFireCheckbox = document.getElementById('settings-autofire');
    const musicCheckbox = document.getElementById('settings-music');

    if (!canvas || !container) return;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    let isAutoFire = isMobile; // 移动端默认开启，PC默认关闭
    let isMusicOn = false;
    let gameBgm = null;

    function playBgm() {
        if (!gameBgm) {
            gameBgm = new Audio('assets/bgm.mp3');
            gameBgm.loop = true;
        }
        if (isMusicOn && isPlaying && !isPaused) {
            gameBgm.play().catch(err => {
                console.warn("🔊 [BGM play fallback/missing]: bgm.mp3 play was blocked or resource unavailable.", err.message);
            });
        }
    }

    function stopBgm() {
        if (gameBgm) {
            try {
                gameBgm.pause();
            } catch (err) {
                console.warn("🔊 [BGM pause failed]:", err.message);
            }
        }
    }

    const ctx = canvas.getContext('2d');
    let isPlaying = false;
    let isPaused = false;
    let score = 0;
    let frameCount = 0;

    let isVisible = true; // 默认为 true，防止首屏加载不灵
    const observer = new IntersectionObserver((entries) => {
        const wasVisible = isVisible;
        isVisible = entries[0].isIntersecting;
        
        // 唤醒逻辑
        if (isVisible && !wasVisible) {
            console.log("%c🚀 Starship Engine Resumed", "color: #3b82f6;");
            gameLoop();
        }
    }, { threshold: 0.01 }); // 降低阈值，只要露头就画
    observer.observe(container);

    // 实体容器
    let ship = null;
    let bullets = [];
    let enemies = [];
    let stars = []; // 星海粒子
    let shockwaves = []; // EMP 冲击波
    let screenShake = 0; // 屏幕震动强度

    class Star {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2;
            this.speed = this.size * 0.5 + 0.5; // 基础速度
            this.alpha = 0.2 + Math.random() * 0.5;
            this.chars = "0123456789ABCDEF$#@%&*+-/<>[]";
            this.char = this.chars[Math.floor(Math.random() * this.chars.length)];
        }
        update() {
            // 计算曲率动力学权重 (warpFactor: 0 -> 1 -> 0)
            let warpFactor = 0;
            if (ship && ship.isOverclocked) {
                const timeLeft = ship.overclockTimer;
                const transition = 60; // 1秒(60帧)过渡期
                if (timeLeft > 480 - transition) warpFactor = (480 - timeLeft) / transition;
                else if (timeLeft < transition) warpFactor = timeLeft / transition;
                else warpFactor = 1.0;
            }

            let speedMult = 1 + (11 * warpFactor);
            this.y += this.speed * speedMult;

            if (this.y > canvas.height) {
                this.y = -20;
                this.x = Math.random() * canvas.width;
                this.char = this.chars[Math.floor(Math.random() * this.chars.length)];
            }
        }
        draw() {
            let warpFactor = 0;
            if (ship && ship.isOverclocked) {
                const timeLeft = ship.overclockTimer;
                const transition = 60;
                if (timeLeft > 480 - transition) warpFactor = (480 - timeLeft) / transition;
                else if (timeLeft < transition) warpFactor = timeLeft / transition;
                else warpFactor = 1.0;
            }

            // 1. 渲染代码流 (亮度压低)
            if (warpFactor > 0.01) {
                ctx.save();
                ctx.fillStyle = '#00fff9';
                const fontSize = this.size * 8 + 8;
                ctx.font = `${fontSize}px monospace`;
                ctx.globalAlpha = this.alpha * warpFactor * 0.4; // 基础透明度 0.4
                ctx.fillText(this.char, this.x, this.y);
                ctx.restore();
            }

            // 2. 渲染原始星空 (与代码流平滑交替)
            if (warpFactor < 0.99) {
                ctx.save();
                ctx.globalAlpha = this.alpha * (1 - warpFactor);
                ctx.fillStyle = '#fff';
                ctx.fillRect(this.x, this.y, this.size, this.size);
                ctx.restore();
            }
        }
    }

    function initStars() {
        stars = [];
        for (let i = 0; i < 150; i++) stars.push(new Star());
    }

    // 游戏状态增强
    let powerups = [];
    const shieldBars = document.querySelectorAll('.bar.shield');
    const hullBars = document.querySelectorAll('.bar.hull');

    class Ship {
        constructor() {
            this.w = 40; this.h = 40;
            this.x = canvas.width / 2; this.y = canvas.height - 80;
            this.color = '#6366f1';

            // 生命系统
            this.maxShield = 3; this.shield = 3;
            this.maxHull = 2; this.hull = 2;
            this.lastHitTime = 0;

            // 强化系统
            this.wingmen = [];
            this.weaponLevel = 1;
            this.wingmanLevel = 0; // 新增：僚机强化等级 (0-3)

            // 超频系统
            this.combo = 0;
            this.comboTimer = 0;
            this.isOverclocked = false;
            this.overclockTimer = 0;
            // 视觉系统
            this.shieldScale = 0; // 护盾缩放
            this.shieldAlpha = 0; // 护盾透明度
            this.shieldHitPulse = 0; // 受击震荡强度
            this.lastAutoShootTime = 0;
        }

        takeDamage() {
            if (this.isOverclocked) return; // 超频模式免疫伤害

            // 优先牺牲僚机抵挡伤害
            if (this.wingmen.length > 0) {
                const lostWingman = this.wingmen.pop();
                this.wingmanLevel = 0; // 核心：僚机阵亡，增益清零
                createExplosion(lostWingman.x, lostWingman.y, lostWingman.color);
                console.log("%c💥 Wingman Sacrificed! Buffs Reset.", "color: #ff2d55; font-weight: bold;");
                return;
            }

            this.lastHitTime = Date.now();
            if (this.shield > 0) {
                this.shield--;
                this.shieldHitPulse = 1.5; // 触发护盾受击视觉脉冲
                container.style.boxShadow = 'inset 0 0 30px rgba(0, 255, 249, 0.5)';
            } else if (this.hull > 0) {
                this.hull--;
                container.style.boxShadow = 'inset 0 0 40px rgba(251, 191, 36, 0.6)';
                container.style.animation = 'shake 0.2s linear';
            }
            this.updateUI();
            if (this.hull <= 0) gameOver();
        }

        repair() {
            if (this.hull < this.maxHull) {
                this.hull++;
                this.updateUI();
                return true;
            }
            return false;
        }

        updateUI() {
            shieldBars.forEach((bar, i) => {
                if (i < this.shield) bar.classList.remove('depleted');
                else bar.classList.add('depleted');
            });
            hullBars.forEach((bar, i) => {
                if (i < this.hull) bar.classList.remove('depleted');
                else bar.classList.add('depleted');
            });
        }

        regenShield() {
            if (this.shield < this.maxShield && Date.now() - this.lastHitTime > 10000) {
                this.shield++;
                this.lastHitTime = Date.now(); // 重置计时器，每10秒回一格
                this.updateUI();
                console.log("%c🛡️ Shield Recharged!", "color: #00fff9; font-weight: bold;");
            }
        }

        update(mx, my) {
            this.x += (mx - this.x) * 0.15;
            this.y += (my - this.y) * 0.15;
            this.x = Math.max(this.w, Math.min(canvas.width - this.w, this.x));
            this.y = Math.max(canvas.height / 2, Math.min(canvas.height - this.h, this.y));
            this.regenShield();

            // 护盾视觉物理模拟
            if (this.shield > 0 || this.isOverclocked) {
                this.shieldScale += (1.0 - this.shieldScale) * 0.12;
                this.shieldAlpha += (1.0 - this.shieldAlpha) * 0.1;
            } else {
                this.shieldScale *= 0.85;
                this.shieldAlpha *= 0.85;
            }
            this.shieldHitPulse *= 0.85; // 震荡快速衰减

            // 超频与连击计时器
            if (this.isOverclocked) {
                this.overclockTimer--;
                if (this.overclockTimer <= 0) this.isOverclocked = false;

                // 暴走：全自动射击
                if (Date.now() - this.lastAutoShootTime > 80) {
                    this.autoShoot();
                    this.lastAutoShootTime = Date.now();
                    screenShake = Math.max(screenShake, 5); // 持续射击震动
                }
            }
            if (this.comboTimer > 0) {
                this.comboTimer -= 16;
                if (this.comboTimer <= 0) this.combo = 0;
            }

            // 僚机跟随与自动火控
            this.wingmen.forEach((w, i) => {
                const offset = i === 0 ? -50 : 50;
                w.x += (this.x + offset - w.x) * 0.1;
                w.y += (this.y + 20 - w.y) * 0.1;
                w.autoUpdate(this.wingmanLevel); // 核心：空闲时自动开火
            });
        }

        autoShoot() {
            const bulletXOffset = [0];
            if (this.weaponLevel >= 2) bulletXOffset.push(-15, 15);
            if (this.weaponLevel >= 3) bulletXOffset.push(-30, 30);

            bulletXOffset.forEach(offset => {
                const b = new Bullet(this.x + offset, this.y - 20);
                b.vy = -18; // 暴走弹速更快
                bullets.push(b);
            });
        }

        draw() {
            // 超频视觉特效：残影与闪烁
            if (this.isOverclocked) {
                ctx.save(); ctx.globalAlpha = 0.3;
                ctx.translate(this.x + Math.random() * 10 - 5, this.y + Math.random() * 10 - 5);
                ctx.strokeStyle = '#ff00c1'; ctx.stroke(); ctx.restore();
            }

            // 绘制僚机
            this.wingmen.forEach(w => w.draw());

            ctx.save();
            ctx.translate(this.x, this.y);

            // 超频颜色切换
            const mainColor = this.isOverclocked ? '#ff00c1' : this.color;
            ctx.strokeStyle = mainColor;
            ctx.lineWidth = 2;
            ctx.shadowBlur = this.isOverclocked ? 30 : 15;
            ctx.shadowColor = mainColor;

            // 护盾力场动态渲染
            if (this.shieldAlpha > 0.01) {
                ctx.beginPath();
                // 基础半径 35，叠加缩放与受击震荡
                const currentRadius = 35 * this.shieldScale * (1 + this.shieldHitPulse * 0.15);
                ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);

                // 动态计算透明度与颜色
                const baseAlpha = this.isOverclocked ? 0.4 : 0.15;
                const alpha = this.shieldAlpha * (baseAlpha + this.shieldHitPulse * 0.4);
                const color = this.isOverclocked ? `rgba(255, 0, 193, ${alpha})` : `rgba(0, 255, 249, ${alpha})`;

                ctx.strokeStyle = color;
                ctx.lineWidth = 2 + this.shieldHitPulse * 4; // 受击时线条变粗
                ctx.shadowBlur = 15 + this.shieldHitPulse * 25; // 受击时发光增强
                ctx.shadowColor = this.isOverclocked ? '#ff00c1' : '#00fff9';
                ctx.stroke();
            }
            // ... (绘制本体逻辑保持不变)

            ctx.beginPath();
            ctx.moveTo(0, -20);
            ctx.lineTo(15, 15);
            ctx.lineTo(0, 8);
            ctx.lineTo(-15, 15);
            ctx.closePath();
            ctx.stroke();

            ctx.fillStyle = '#f43f5e';
            ctx.beginPath();
            ctx.arc(0, 15 + Math.random() * 5, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    class Bullet {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.vy = -12;
            this.alive = true;
        }
        update() {
            this.y += this.vy;
            if (this.y < -10) this.alive = false;
        }
        draw() {
            ctx.fillStyle = '#00fff9';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00fff9';
            ctx.fillRect(this.x - 1, this.y, 2, 10);
        }
    }

    class Wingman {
        constructor(x, y) {
            this.x = x; this.y = y; this.color = '#00fff9';
            this.lastAutoShootTime = Date.now();
        }
        draw() {
            ctx.save(); ctx.translate(this.x, this.y);
            ctx.strokeStyle = this.color; ctx.lineWidth = 1; ctx.shadowBlur = 5; ctx.shadowColor = this.color;
            ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(8, 8); ctx.lineTo(-8, 8); ctx.closePath(); ctx.stroke();
            ctx.restore();
        }
        shoot() {
            bullets.push(new Bullet(this.x, this.y - 10));
            this.lastAutoShootTime = Date.now(); // 无论是自动还是手动，只要开火就重置计时器
        }
        autoUpdate(level = 0) {
            // 等级 0-3 对应的开火间隔：600ms, 400ms, 250ms, 150ms
            const intervals = [600, 400, 250, 150];
            const interval = intervals[Math.min(level, 3)];

            if (Date.now() - this.lastAutoShootTime > interval) {
                this.shoot();
            }
        }
    }

    class PowerUp {
        constructor(x, y, type) {
            this.x = x; this.y = y; this.type = type; // 'HEAL', 'WINGMAN', 'WEAPON'
            this.vy = 0.8 + Math.random() * 0.4; // 减慢下落速度
            this.vx = (Math.random() - 0.5) * 2; // 增加水平飘移
            this.alive = true;
            this.life = 1800; // 约 30 秒寿命
            this.colors = { 'HEAL': '#22c55e', 'WINGMAN': '#00fff9', 'WEAPON': '#fbbf24' };
            this.labels = { 'HEAL': '✚', 'WINGMAN': '🛰️', 'WEAPON': '🚀' };
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.life--;

            // 边缘反弹
            if (this.x < 15 || this.x > canvas.width - 15) this.vx *= -1;
            if (this.y > canvas.height - 15) this.vy *= -1;
            if (this.y < 50) this.vy = Math.abs(this.vy); // 防止弹回顶部消失

            if (this.life <= 0) this.alive = false;
        }
        draw() {
            ctx.save(); ctx.translate(this.x, this.y);
            // 闪烁效果（快到期时）
            if (this.life < 300 && frameCount % 10 < 5) ctx.globalAlpha = 0.3;

            ctx.shadowBlur = 10; ctx.shadowColor = this.colors[this.type];
            ctx.fillStyle = this.colors[this.type];
            ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = '12px Arial'; ctx.textAlign = 'center';
            ctx.fillText(this.labels[this.type], 0, 4); ctx.restore();
        }
    }

    class EnemyBullet {
        constructor(x, y, vx = 0, vy = 5) {
            this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.alive = true;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.y > canvas.height || this.y < -50 || this.x < -50 || this.x > canvas.width + 50) this.alive = false;
        }
        draw() {
            ctx.fillStyle = '#ff2d55'; ctx.shadowBlur = 5; ctx.shadowColor = '#ff2d55';
            ctx.beginPath(); ctx.arc(this.x, this.y, 3, 0, Math.PI * 2); ctx.fill();
        }
    }

    let enemyBullets = [];

    class Shockwave {
        constructor(x, y, color) {
            this.x = x; this.y = y; this.color = color;
            this.r = 0; this.maxR = 800;
            this.alive = true;
            this.width = 20;
            this.hasHitBoss = false; // 确保每圈冲击波只对 Boss 造成一次伤害
        }
        update() {
            this.r += 15;
            if (this.r > this.maxR) this.alive = false;
        }
        draw() {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.width * (1 - this.r / this.maxR);
            ctx.shadowBlur = 20; ctx.shadowColor = this.color;
            ctx.stroke();
            ctx.restore();
        }
    }

    // 新增：弱追踪弹 (用于无尽模式 Boss)
    class HomingBullet extends EnemyBullet {
        constructor(x, y) {
            super(x, y, 0, 0);
            this.speed = 2.8;
            this.turnRate = 0.02;
            this.angle = Math.PI / 2;
            this.life = 420; // 总寿命 7 秒 (420 帧)
            this.alpha = 1;
        }
        update() {
            // 前 4 秒 (240 帧) 保持追踪
            if (ship && this.life > 180) {
                const targetAngle = Math.atan2(ship.y - this.y, ship.x - this.x);
                let diff = targetAngle - this.angle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.angle += diff * this.turnRate;
            }
            // 后 3 秒 (180 帧) 停止追踪并淡出
            if (this.life <= 180) {
                this.alpha = this.life / 180;
            }

            this.vx = Math.cos(this.angle) * this.speed;
            this.vy = Math.sin(this.angle) * this.speed;
            this.life--;
            if (this.life <= 0) this.alive = false;

            super.update();
        }
        draw() {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = '#a855f7';
            ctx.shadowBlur = 10; ctx.shadowColor = '#a855f7';
            ctx.beginPath(); ctx.arc(this.x, this.y, 5, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }

    class Enemy {
        constructor(startX = null, startY = null) {
            this.w = 60; this.h = 30;
            this.x = startX !== null ? startX : (Math.random() * (canvas.width - this.w) + this.w / 2);
            this.y = startY !== null ? startY : -50;
            this.vy = 2 + Math.random() * 2;
            this.alive = true;
            const labels = ['BUG', 'NULL', '404', 'ERROR', 'CRASH', 'XSS', 'DDOS'];
            this.text = labels[Math.floor(Math.random() * labels.length)];
            this.isElite = ['XSS', 'CRASH', 'DDOS'].includes(this.text);
            this.color = this.isElite ? '#ff00c1' : '#ff2d55';
            this.lastShootTime = 0;
        }
        update() {
            this.y += this.vy;
            if (this.isElite && Date.now() - this.lastShootTime > 2000 && Math.random() < 0.02) {
                enemyBullets.push(new EnemyBullet(this.x, this.y + 15));
                this.lastShootTime = Date.now();
            }
            if (this.y > canvas.height + 50) this.alive = false;
        }
        draw() {
            ctx.save();
            ctx.strokeStyle = this.color; ctx.lineWidth = this.isElite ? 3 : 2;
            ctx.shadowBlur = 10; ctx.shadowColor = this.color;
            ctx.strokeRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
            ctx.fillStyle = this.color; ctx.font = 'bold 12px Fira Code, monospace';
            ctx.textAlign = 'center'; ctx.fillText(this.text, this.x, this.y + 4);
            ctx.restore();
        }
    }

    class ExplosionParticle {
        constructor(x, y, color) {
            this.x = x; this.y = y;
            this.vx = (Math.random() - 0.5) * 6;
            this.vy = (Math.random() - 0.5) * 6;
            this.alpha = 1; this.color = color;
            this.size = Math.random() * 3;
        }
        update() { this.x += this.vx; this.y += this.vy; this.alpha -= 0.02; }
        draw() {
            ctx.save(); ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.size, this.size);
            ctx.restore();
        }
    }

    let boss = null;
    let isBossMode = false;
    let gameWon = false;
    let nextEndlessBossScore = 250000;
    let endlessBossCount = 0;
    let spawnedBosses = new Set();

    class Boss {
        constructor(name, hp, color, dropCount) {
            this.name = name;
            this.hp = hp; this.maxHp = hp;
            this.color = color;
            this.dropCount = dropCount;
            this.w = 200; this.h = 60;
            this.x = canvas.width / 2; this.y = -100;
            this.targetY = 100;
            this.vx = name === 'SYSTEM_CRASHER' ? 4 : (name === 'ZERO_DAY_EXPLOIT' ? 2.5 : 2);
            this.lastShootTime = 0;
            this.alive = true;
            this.laserTimer = 0;
            this.laserActive = 0;
            this.alpha = 1;
            this.blinkTimer = 0;
            this.blinkCooldown = 0;
            this.healDropTimer = 0; // 新增：战斗中掉落药包计时器
            this.wingmanDropTimer = 0; // 新增：战斗中掉落僚机计时器
            this.laserCooldown = 0; // 新增：激光攻击冷却
            this.attackTimer = 0; // 新增：进化攻击计数器
            this.swarmTimer = 0; // 新增：狂暴刷怪计时器
        }
        update() {
            if (!this.alive) return;
            if (this.swarmTimer > 0) this.swarmTimer--;

            // 出场动画
            if (this.y < this.targetY) this.y += 1.5;
            else {
                // 闪现逻辑
                if (this.blinkTimer > 0) {
                    this.blinkTimer--;
                    if (this.blinkTimer > 20) this.alpha -= 0.05; // 前20帧淡出
                    else if (this.blinkTimer === 20) {
                        this.x = Math.random() * (canvas.width - this.w) + this.w / 2; // 跃迁
                    } else this.alpha += 0.05; // 后 20 帧淡入
                    this.alpha = Math.max(0, Math.min(1, this.alpha));
                    return; // 跃迁期间不执行其他逻辑
                }
                if (this.blinkCooldown > 0) this.blinkCooldown--;
                if (this.laserCooldown > 0) this.laserCooldown--;

                // 无尽模式变种 Boss 增强逻辑
                if (this.name.startsWith('VAR_STRIKER')) {
                    this.attackTimer++;

                    // 1. 弱追踪弹 (每 3 秒)
                    if (this.attackTimer % 180 === 0) {
                        enemyBullets.push(new HomingBullet(this.x, this.y + 30));
                    }

                    // 2. 召唤小怪潮 (改成开启 5 秒狂暴刷怪模式)
                    if (this.attackTimer % 1200 === 0 && this.y >= this.targetY) {
                        this.swarmTimer = 300; // 5 秒
                        // 冲击波作为启动特效
                        shockwaves.push(new Shockwave(this.x, this.y, this.color));
                        console.log("%c⚠️ VAR_STRIKER: SWARM MODE ACTIVATED (5s)!", "color: #ff00c1; font-weight: bold;");
                    }

                    // 3. 扩散弹幕 (每 5 秒)
                    if (this.attackTimer % 300 === 0) {
                        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                            enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(a) * 3, Math.sin(a) * 3));
                        }
                    }
                }

                // 战斗中掉落补给 (仅限超级 Boss)
                if (this.name === 'ZERO_DAY_EXPLOIT' && this.blinkTimer === 0) {
                    this.healDropTimer++;
                    if (this.healDropTimer >= 300) { // 每5秒掉一个修复包
                        powerups.push(new PowerUp(this.x, this.y, 'HEAL'));
                        this.healDropTimer = 0;
                    }
                    this.wingmanDropTimer++;
                    if (this.wingmanDropTimer >= 480) { // 每8秒掉一个僚机
                        powerups.push(new PowerUp(this.x, this.y, 'WINGMAN'));
                        this.wingmanDropTimer = 0;
                    }
                }

                // 移动逻辑：激光蓄力或发射期间禁止移动
                if (!(this.laserTimer > 0 || this.laserActive > 0)) {
                    if (this.name === 'ZERO_DAY_EXPLOIT') {
                        this.x += this.vx * 1.5;
                        // 触发闪现判定 (冷却结束且非施法状态)
                        if (this.blinkCooldown <= 0 && Math.random() < 0.01) {
                            this.blinkTimer = 40;
                            this.blinkCooldown = 300; // 5秒冷却
                        }
                    } else {
                        this.x += this.vx;
                    }

                    if (this.x < this.w / 2 || this.x > canvas.width - this.w / 2) this.vx *= -1;
                }

                // 射击逻辑
                const now = Date.now();
                const interval = this.name === 'ZERO_DAY_EXPLOIT' ? 600 : (this.name === 'SYSTEM_CRASHER' ? 800 : 1500);

                if (now - this.lastShootTime > interval) {
                    if (this.name === 'ZERO_DAY_EXPLOIT') {
                        // 1. 扩散式攻击 (360度)
                        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
                            enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(a) * 4, Math.sin(a) * 4));
                        }
                        // 2. 蓄力激光触发判断 (概率 + 冷却判定)
                        if (this.laserCooldown <= 0 && Math.random() < 0.3) this.laserTimer = 60; // 60帧蓄力
                    } else {
                        const bulletCount = this.name === 'PATCH_MINER' ? 3 : 5;
                        for (let i = -Math.floor(bulletCount / 2); i <= Math.floor(bulletCount / 2); i++) {
                            enemyBullets.push(new EnemyBullet(this.x + i * 40, this.y + 30, 0, this.name === 'SYSTEM_CRASHER' ? 6 : 4));
                        }
                    }
                    this.lastShootTime = now;
                }

                // 激光逻辑
                if (this.laserTimer > 0) {
                    this.laserTimer--;
                    if (this.laserTimer === 0) {
                        this.laserActive = 20; // 持续20帧
                        this.laserCooldown = 180; // 发射后进入3秒冷却
                        screenShake = 15;
                    }
                }
                if (this.laserActive > 0) {
                    this.laserActive--;
                    // 激光伤害判定
                    if (ship && Math.abs(ship.x - this.x) < 50) ship.takeDamage();
                }
            }
        }
        draw() {
            if (!this.alive) return;
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.strokeStyle = this.color; ctx.lineWidth = 5;
            ctx.shadowBlur = 20; ctx.shadowColor = this.color;
            ctx.strokeRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);

            ctx.fillStyle = `rgba(${this.hexToRgb(this.color)}, 0.2)`;
            ctx.fillRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);

            // 绘制激光蓄力提示
            if (this.laserTimer > 0) {
                ctx.fillStyle = `rgba(255, 45, 85, ${0.1 + (60 - this.laserTimer) / 60})`;
                ctx.fillRect(this.x - 40, this.y + 30, 80, canvas.height);
            }
            // 绘制激活的激光
            if (this.laserActive > 0) {
                ctx.fillStyle = '#ff2d55';
                ctx.shadowBlur = 40; ctx.shadowColor = '#ff2d55';
                ctx.fillRect(this.x - 50, this.y + 30, 100, canvas.height);
            }

            // 血条
            const hpWidth = (this.hp / this.maxHp) * this.w;
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - this.w / 2, this.y - this.h / 2 - 15, hpWidth, 5);

            ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Fira Code'; ctx.textAlign = 'center';
            ctx.fillText(this.name, this.x, this.y + 10);
            ctx.restore();
        }
        hexToRgb(hex) {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `${r}, ${g}, ${b}`;
        }
        dropLoot() {
            for (let i = 0; i < this.dropCount; i++) {
                const types = ['HEAL', 'WINGMAN', 'WEAPON'];
                const pX = this.x + (Math.random() - 0.5) * 150;
                const pY = this.y + (Math.random() - 0.5) * 50;
                powerups.push(new PowerUp(pX, pY, types[Math.floor(Math.random() * types.length)]));
            }
        }
    }
    function createExplosion(x, y, color) {
        for (let i = 0; i < 15; i++) {
            particles.push(new ExplosionParticle(x, y, color));
        }
    }

    function checkBossDeath() {
        if (!boss || boss.hp > 0) return;

        isBossMode = false;
        score += (boss.maxHp * 100); // 奖励分
        scoreEl.innerText = `SCORE: ${score.toString().padStart(4, '0')}`;
        createExplosion(boss.x, boss.y, boss.color);
        boss.dropLoot(); // 必掉物资包
        triggerEMP(); // 击败 Boss 奖励全屏清弹

        // 最终 Boss 通关逻辑
        if (boss.name === 'ROOT_ENTITY' && !gameWon) {
            gameWon = true;
            window.unlockAchievement('THE_ARCHITECT');
            console.log("%c👑 SYSTEM CLEARED: YOU ARE THE ARCHITECT!", "color: #fbbf24; font-weight: bold; font-size: 1.2em;");
            // 初始化下一个无尽 Boss 分数 (在当前分基础上加 3-5万)
            nextEndlessBossScore = score + 30000;
        }

        console.log(`%c🏆 BOSS ${boss.name} ELIMINATED!`, "color: #22c55e; font-weight: bold;");
        boss = null;
    }

    function handleCollisions() {
        // 子弹 vs 敌人
        bullets.forEach(b => {
            // 子弹 vs 普通敌人
            enemies.forEach(e => {
                if (b.alive && e.alive && Math.hypot(b.x - e.x, b.y - e.y) < 30) {
                    b.alive = false; e.alive = false; score += 100;
                    scoreEl.innerText = `SCORE: ${score.toString().padStart(4, '0')}`;
                    if (score >= 1000) window.unlockAchievement('PILOT'); // 成就：代码卫士
                    createExplosion(e.x, e.y, '#ff2d55');

                    // Combo 处理
                    if (ship) {
                        ship.combo++;
                        ship.comboTimer = 2000;
                        if (ship.combo >= 15 && !ship.isOverclocked) {
                            ship.isOverclocked = true;
                            ship.overclockTimer = 480; // 8秒无敌
                            console.log("%c🔥 OVERCLOCK ACTIVATED!", "color: #ff00c1; font-weight: bold;");
                        }
                    }

                    // 掉落逻辑 (下调至 8% 概率)
                    if (Math.random() < 0.08) {
                        const types = ['HEAL', 'WINGMAN', 'WEAPON'];
                        powerups.push(new PowerUp(e.x, e.y, types[Math.floor(Math.random() * types.length)]));
                    }
                }
            });

            // 子弹 vs Boss (闪现期间无敌)
            if (b.alive && isBossMode && boss && boss.alpha > 0.8 && Math.hypot(b.x - boss.x, b.y - boss.y) < 60) {
                b.alive = false;
                boss.hp--;
                createExplosion(b.x, b.y, boss.color);
                checkBossDeath();
            }
        });

        if (ship) {
            // ... (玩家相关碰撞保持不变)
            // 敌人 vs 玩家
            enemies.forEach(e => {
                if (e.alive && Math.hypot(ship.x - e.x, ship.y - e.y) < 40) {
                    e.alive = false;
                    ship.takeDamage();
                }
            });

            // 敌方子弹 vs 玩家
            enemyBullets.forEach(eb => {
                if (eb.alive && Math.hypot(ship.x - eb.x, ship.y - eb.y) < 25) {
                    eb.alive = false;
                    ship.takeDamage();
                }
            });

            // 道具 vs 玩家
            powerups.forEach(p => {
                if (p.alive && Math.hypot(ship.x - p.x, ship.y - p.y) < 30) {
                    p.alive = false;
                    if (p.type === 'HEAL') {
                        // 能量转换：满状态触发 EMP
                        if (ship.shield === ship.maxShield && ship.hull === ship.maxHull) {
                            triggerEMP();
                        } else {
                            ship.repair();
                        }
                    }
                    else if (p.type === 'WINGMAN') {
                        if (ship.wingmen.length < 2) ship.wingmen.push(new Wingman(p.x, p.y));
                        else score += 500;
                    } else if (p.type === 'WEAPON') {
                        if (ship.weaponLevel < 3) {
                            ship.weaponLevel++;
                        } else {
                            // 溢出转化：提升僚机火力
                            ship.wingmanLevel = Math.min(3, ship.wingmanLevel + 1);
                            console.log(`%c🚀 Wingmen Overclocked: Lv.${ship.wingmanLevel}`, "color: #fbbf24; font-weight: bold;");
                        }
                    }
                }
            });
        }

        // 冲击波 vs 普通敌人 & Boss
        shockwaves.forEach(sw => {
            // 对普通敌人：秒杀
            enemies.forEach(e => {
                if (e.alive && Math.hypot(e.x - sw.x, e.y - sw.y) < sw.r) {
                    e.alive = false;
                    score += 50;
                    scoreEl.innerText = `SCORE: ${score.toString().padStart(4, '0')}`;
                    createExplosion(e.x, e.y, '#ff2d55');
                }
            });

            // 对 Boss：过载伤害 (20 + 1% 比例)
            if (isBossMode && boss && !sw.hasHitBoss) {
                if (Math.hypot(boss.x - sw.x, boss.y - sw.y) < sw.r) {
                    const dmg = 20 + Math.floor(boss.maxHp * 0.01);
                    boss.hp -= dmg;
                    sw.hasHitBoss = true; // 每一波冲击波只伤一次
                    createExplosion(boss.x, boss.y, sw.color);
                    console.log(`%c💥 OVERLOAD DAMAGE: ${dmg} to ${boss.name}`, "color: #fbbf24; font-weight: bold;");
                    checkBossDeath();
                }
            }
        });
    }

    function triggerEMP() {
        if (!ship) return;
        console.log("%c💥 SHOCKWAVE ACTIVATED!", "color: #fbbf24; font-weight: bold; font-size: 1.2em;");
        shockwaves.push(new Shockwave(ship.x, ship.y, '#fbbf24'));
        screenShake = 20; // 强力震动
    }

    function resize() {
        const rect = container.getBoundingClientRect();
        const oldWidth = canvas.width;
        
        // 全屏自适应：如果处于全屏模式，高度撑满容器；否则保持 600
        const isFullscreen = container.classList.contains('fullscreen');
        canvas.width = rect.width;
        canvas.height = isFullscreen ? rect.height : 600;
        
        // 仅在初次或宽度剧变时初始化流星，防止缩放时抖动
        if (stars.length === 0 || Math.abs(oldWidth - canvas.width) > 100) {
            initStars();
        }
    }

    // 全屏切换逻辑
    let originalParent = null;
    let originalNextSibling = null;

    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isEntering = !container.classList.contains('fullscreen');
            
            if (isEntering) {
                // 记录原始位置，用于恢复
                originalParent = container.parentNode;
                originalNextSibling = container.nextSibling;
                
                // 核心：脱离父级 transform 限制，挂载到 body
                container.classList.add('fullscreen');
                document.body.appendChild(container);
                
                const icon = fullscreenBtn.querySelector('i');
                icon.className = 'ri-fullscreen-exit-line';
                fullscreenBtn.title = 'RESTORE SYSTEM';
                showToast('FULLSCREEN MODE ENGAGED');
            } else {
                // 还原到 DOM 原位
                container.classList.remove('fullscreen');
                if (originalParent) {
                    originalParent.insertBefore(container, originalNextSibling);
                }
                
                const icon = fullscreenBtn.querySelector('i');
                icon.className = 'ri-fullscreen-line';
                fullscreenBtn.title = 'TOGGLE FULLSCREEN';
                showToast('SYSTEM RESTORED');
            }
            
            // 强制重绘尺寸
            setTimeout(resize, 100); 
        });
    }

    // 移除老旧 autofireBtn，注入 settings 面板事件
    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!settingsMenu) return;
            
            const isMenuHidden = settingsMenu.classList.contains('hidden');
            if (isMenuHidden) {
                // 打开设置菜单
                settingsMenu.classList.remove('hidden');
                // 同步复选框状态
                if (autoFireCheckbox) autoFireCheckbox.checked = isAutoFire;
                if (musicCheckbox) musicCheckbox.checked = isMusicOn;
                // 暂停游戏与音乐
                if (isPlaying) {
                    isPaused = true;
                    stopBgm();
                }
            } else {
                // 关闭设置菜单（应用配置）
                settingsMenu.classList.add('hidden');
                if (autoFireCheckbox) isAutoFire = autoFireCheckbox.checked;
                if (musicCheckbox) isMusicOn = musicCheckbox.checked;
                // 恢复游戏与音乐
                if (isPlaying) {
                    isPaused = false;
                    if (isMusicOn) playBgm();
                    else stopBgm();
                }
                showToast('CONFIG APPLIED');
            }
        });
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (settingsMenu) settingsMenu.classList.add('hidden');
            if (autoFireCheckbox) isAutoFire = autoFireCheckbox.checked;
            if (musicCheckbox) isMusicOn = musicCheckbox.checked;
            
            if (isPlaying) {
                isPaused = false;
                if (isMusicOn) playBgm();
                else stopBgm();
            }
            showToast('CONFIG APPLIED');
        });
    }

    if (settingsMenu) {
        settingsMenu.addEventListener('click', (e) => {
            if (e.target === settingsMenu) {
                settingsMenu.classList.add('hidden');
                if (autoFireCheckbox) isAutoFire = autoFireCheckbox.checked;
                if (musicCheckbox) isMusicOn = musicCheckbox.checked;
                
                if (isPlaying) {
                    isPaused = false;
                    if (isMusicOn) playBgm();
                    else stopBgm();
                }
                showToast('CONFIG APPLIED');
            }
        });
    }

    window.addEventListener('resize', resize);
    resize();

    let mouseX = canvas.width / 2;
    let mouseY = canvas.height - 80;

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    // --- 移动端触摸适配 (Mobile Touch Support) ---
    const handleTouch = (e) => {
        if (!isPlaying || isPaused) return;
        if (e.touches.length > 0) {
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            mouseX = touch.clientX - rect.left;
            mouseY = touch.clientY - rect.top;
            if (e.cancelable) e.preventDefault(); // 阻止手机浏览器默认的滚屏行为
        }
    };

    canvas.addEventListener('touchstart', (e) => {
        handleTouch(e);
        // 模拟点击开火
        const mousedownEvent = new MouseEvent('mousedown');
        canvas.dispatchEvent(mousedownEvent);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        handleTouch(e);
    }, { passive: false });

    canvas.addEventListener('mousedown', () => {
        if (!isPlaying || !ship || isPaused) return;

        // 核心射击逻辑：根据武器等级决定弹道数量
        if (ship.weaponLevel === 1) {
            bullets.push(new Bullet(ship.x, ship.y - 20));
        } else if (ship.weaponLevel === 2) {
            bullets.push(new Bullet(ship.x - 10, ship.y - 20));
            bullets.push(new Bullet(ship.x + 10, ship.y - 20));
        } else {
            bullets.push(new Bullet(ship.x, ship.y - 25));
            bullets.push(new Bullet(ship.x - 15, ship.y - 15));
            bullets.push(new Bullet(ship.x + 15, ship.y - 15));
        }

        // 僚机同步火力支援
        ship.wingmen.forEach(w => w.shoot());

        // 触发射击视觉闪烁特效
        const flash = document.createElement('div');
        flash.className = 'shoot-flash';
        container.appendChild(flash);
        setTimeout(() => flash.remove(), 50);
    });

    canvas.addEventListener('mouseleave', () => {
        if (isPlaying) {
            isPaused = true;
            stopBgm();
        }
    });

    canvas.addEventListener('mouseenter', () => {
        // 如果设置菜单开启，不要在移入时自动恢复游戏
        const settingsClosed = !settingsMenu || settingsMenu.classList.contains('hidden');
        if (isPlaying && settingsClosed) {
            isPaused = false;
            if (isMusicOn) playBgm();
        }
    });

    quitBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isPlaying = false;
        isPaused = false;
        stopBgm(); // 退出时停止音乐播放
        if (settingsMenu) settingsMenu.classList.add('hidden'); // 退出时确保设置关闭
        overlay.classList.remove('hidden');

        const h2 = overlay.querySelector('h2');
        const p = overlay.querySelector('p');
        const btn = document.getElementById('start-game-btn');

        h2.innerText = 'MISSION ABORTED';
        h2.setAttribute('data-text', 'MISSION ABORTED');
        p.innerText = `LAST KNOWN SCORE: ${score}`;
        btn.innerText = 'REBOOT SYSTEM';
    });

    function gameLoop() {
        if (!isVisible) {
            return; // 彻底停火，由 Observer 负责唤醒
        }

        // 强力重置绘图状态，防止阴影残留扩散
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        // 强制使用背景色填充，防止变色 BUG
        ctx.fillStyle = isPaused ? 'rgba(10, 12, 18, 0.9)' : 'rgba(10, 12, 18, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 屏幕震动
        ctx.save();
        if (screenShake > 0) {
            ctx.translate(Math.random() * screenShake - screenShake / 2, Math.random() * screenShake - screenShake / 2);
            screenShake *= 0.9;
            if (screenShake < 0.5) screenShake = 0;
        }

        if (isPaused) {
            ctx.fillStyle = '#fff';
            ctx.font = '30px Space Grotesk';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        }

        // 无论是否在游戏中，都绘制星海背景（除了游戏赢/输的特定静止状态）
        if (!isPaused) {
            stars.forEach(s => { s.update(); s.draw(); });
        }

        if (isPlaying && !isPaused) {
            // 自动开火系统：当开启 isAutoFire 时，每 12 帧（约 200ms）自动发射子弹
            if (isAutoFire && frameCount % 12 === 0) {
                const mousedownEvent = new MouseEvent('mousedown');
                canvas.dispatchEvent(mousedownEvent);
            }
            frameCount++;

            // 超频模式边缘特效
            if (ship && ship.isOverclocked) {
                ctx.strokeStyle = `rgba(255, 0, 193, ${0.3 + Math.random() * 0.2})`;
                ctx.lineWidth = 10;
                ctx.strokeRect(0, 0, canvas.width, canvas.height);
            }

            ship.update(mouseX, mouseY);
            ship.draw();

            // 阶梯式 Boss 战触发... (此处逻辑保持不变)
            if (!isBossMode && !boss) {
                if (score >= 200000 && !spawnedBosses.has('ROOT_ENTITY')) {
                    spawnBoss('ROOT_ENTITY', 1500, '#fbbf24', 5);
                } else if (score >= 100000 && !spawnedBosses.has('ZERO_DAY_EXPLOIT')) {
                    spawnBoss('ZERO_DAY_EXPLOIT', 500, '#ff2d55', 10);
                } else if (score >= 30000 && !spawnedBosses.has('SYSTEM_CRASHER')) {
                    spawnBoss('SYSTEM_CRASHER', 120, '#ff00c1', 3);
                } else if (score >= 10000 && !spawnedBosses.has('LOGIC_EATER')) {
                    spawnBoss('LOGIC_EATER', 50, '#00fff9', 2);
                } else if (score >= 3000 && !spawnedBosses.has('PATCH_MINER')) {
                    spawnBoss('PATCH_MINER', 20, '#fbbf24', 1);
                } else if (gameWon && score >= nextEndlessBossScore) {
                    endlessBossCount++;
                    const name = `VAR_STRIKER_V${endlessBossCount}`;
                    const hp = 300 + (endlessBossCount * 100);
                    const colors = ['#ff2d55', '#ff00c1', '#00fff9', '#fbbf24'];
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    spawnBoss(name, hp, color, 3);
                    nextEndlessBossScore += 30000 + Math.random() * 20000;
                }
            }

            if (isBossMode && boss) {
                boss.update();
                boss.draw();
                let spawnInterval = (boss.swarmTimer > 0) ? 12 : 160;
                if (frameCount % spawnInterval === 0) enemies.push(new Enemy());
            } else {
                if (frameCount % Math.max(10, 40 - Math.floor(score / 1000)) === 0) {
                    enemies.push(new Enemy());
                }
            }

            bullets = bullets.filter(b => b.alive);
            bullets.forEach(b => { b.update(); b.draw(); });

            enemyBullets = enemyBullets.filter(eb => eb.alive);
            enemyBullets.forEach(eb => { eb.update(); eb.draw(); });

            enemies = enemies.filter(e => e.alive);
            enemies.forEach(e => { e.update(); e.draw(); });

            particles = particles.filter(p => p.alpha > 0);
            particles.forEach(p => { p.update(); p.draw(); });

            powerups = powerups.filter(p => p.alive);
            powerups.forEach(p => { p.update(); p.draw(); });

            shockwaves = shockwaves.filter(sw => sw.alive);
            shockwaves.forEach(sw => { sw.update(); sw.draw(); });

            handleCollisions();
        }

        ctx.restore();
        requestAnimationFrame(gameLoop);
    }

    function spawnBoss(name, hp, color, drops) {
        isBossMode = true;
        boss = new Boss(name, hp, color, drops);
        spawnedBosses.add(name);
        console.log(`%c⚠️ BOSS INCOMING: ${name}`, `color: ${color}; font-weight: bold; font-size: 1.5em;`);

        // 特事特办：超级 Boss 进场直接激发玩家狂暴
        if (name === 'ZERO_DAY_EXPLOIT' && ship) {
            ship.isOverclocked = true;
            ship.overclockTimer = 600; // 10秒狂暴
        }
    }

    startBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const h2 = overlay.querySelector('h2');
        const text = 'INITIALIZE DEFENSE';
        h2.innerText = text;
        h2.setAttribute('data-text', text);

        overlay.classList.add('hidden');
        isPlaying = true;
        isPaused = false;
        ship = new Ship();
        ship.updateUI(); // 同步满血状态到 UI

        // 新增：自适应平台开启/关闭自动开火状态
        if (isMobile) {
            isAutoFire = true;
            if (autoFireCheckbox) autoFireCheckbox.checked = true;
            achievementManager.notify('识别到手机用户', '已自动开启【自动开火】系统！', '📱');
        } else {
            // PC 端如果是打开了设置，保持设置里的值；如果未打开过，默认设为 false
            if (autoFireCheckbox) autoFireCheckbox.checked = isAutoFire;
        }
        
        // 游戏启动时同步背景音乐开关状态并启动 BGM
        if (musicCheckbox) musicCheckbox.checked = isMusicOn;
        if (isMusicOn) playBgm();
        score = 0;
        scoreEl.innerText = 'SCORE: 0000';
        enemies = [];
        bullets = [];
        particles = [];
        powerups = []; // 清空上局掉落
        enemyBullets = []; // 清空上局敌弹
        shockwaves = []; // 清空上局冲击波
        boss = null;
        isBossMode = false;
        gameWon = false;
        nextEndlessBossScore = 250000;
        endlessBossCount = 0;
        spawnedBosses.clear(); // 重置 Boss 出场记录
        frameCount = 0;
        screenShake = 0;
    });

    function gameOver() {
        isPlaying = false;
        stopBgm(); // 游戏结束停止音乐播放
        overlay.classList.remove('hidden');
        const h2 = overlay.querySelector('h2');
        const p = overlay.querySelector('p');
        const btn = document.getElementById('start-game-btn');

        h2.innerText = 'CORE TERMINATED';
        h2.setAttribute('data-text', 'CORE TERMINATED');
        p.innerText = `FINAL DEFENSE SCORE: ${score}`;
        btn.innerText = 'REBOOT & RETALIATE';
    }

    gameLoop();

    // ============================================
    // 成就系统核心逻辑 (Achievement System)
    // ============================================
    const ACHIEVEMENTS = {
        WELCOME: { id: 'welcome', title: '初次降临', desc: '欢迎来到炫技空间，开启你的极客之旅。', icon: '🚀' },
        EXPLORER: { id: 'explorer', title: '深度探索', desc: '阅读完所有简历内容，求知欲拉满！', icon: '📖' },
        PILOT: { id: 'pilot', title: '代码卫士', desc: '在星舰防御战中成功击退 10 个 Bug。', icon: '🛡️' },
        GLOBE_TROTTER: { id: 'globe', title: '环球旅行者', desc: '深度观察 3D 地球，视野已跨越国界。', icon: '🌍' },
        THE_ARCHITECT: { id: 'architect', title: '代码建筑师', desc: '击败终极实体 ROOT_ENTITY，掌控了炫技空间的底层逻辑。', icon: '👑' }
    };

    class AchievementManager {
        constructor() {
            this.container = document.getElementById('achievement-container');
            this.unlocked = JSON.parse(localStorage.getItem('unlocked_achievements') || '[]');
            this.queue = [];
            this.isShowing = false;
        }

        unlock(key) {
            const achievement = ACHIEVEMENTS[key];
            if (!achievement || this.unlocked.includes(achievement.id)) return;

            this.unlocked.push(achievement.id);
            localStorage.setItem('unlocked_achievements', JSON.stringify(this.unlocked));

            this.queue.push(achievement);
            this.processQueue();
        }

        // 新增：播报实时通知（不存 localStorage）
        notify(title, desc, icon = '📢') {
            this.queue.push({ title, desc, icon });
            this.processQueue();
        }

        processQueue() {
            if (this.isShowing || this.queue.length === 0) return;

            this.isShowing = true;
            const achievement = this.queue.shift();
            this.showNotification(achievement);
        }

        showNotification(achievement) {
            const card = document.createElement('div');
            card.className = 'achievement-card';
            card.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-content">
                    <div class="achievement-title">${achievement.title}</div>
                    <div class="achievement-desc">${achievement.desc}</div>
                </div>
                <div class="achievement-close">×</div>
            `;

            this.container.appendChild(card);
            requestAnimationFrame(() => card.classList.add('show'));

            setTimeout(() => {
                card.classList.remove('show');
                setTimeout(() => {
                    card.remove();
                    this.isShowing = false;
                    this.processQueue();
                }, 800);
            }, 5000);

            card.querySelector('.achievement-close').onclick = () => {
                card.classList.remove('show');
                setTimeout(() => {
                    card.remove();
                    this.isShowing = false;
                    this.processQueue();
                }, 800);
            };
        }
    }

    const achievementManager = new AchievementManager();
    window.unlockAchievement = (key) => achievementManager.unlock(key);

    // 初始成就
    setTimeout(() => window.unlockAchievement('WELCOME'), 2000);

    // 滚动监听成就 - 修正版：精准指向 resume-page
    let scrollAchieved = false;
    const scrollTarget = document.getElementById('resume-page');

    function checkScroll() {
        if (!scrollTarget || scrollAchieved) return;

        const scrollBottom = scrollTarget.scrollTop + scrollTarget.clientHeight;
        const totalHeight = scrollTarget.scrollHeight;

        if (scrollBottom >= totalHeight - 200) {
            window.unlockAchievement('EXPLORER');
            scrollAchieved = true;
            scrollTarget.removeEventListener('scroll', checkScroll);
        }
    }

    if (scrollTarget) {
        scrollTarget.addEventListener('scroll', checkScroll, { passive: true });
        // 初始检查
        setTimeout(checkScroll, 2000);
    }

    // --- UI Helpers ---
    window.showToast = function (message) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.innerText = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    };

    window.showWechatModal = function () {
        const modal = document.getElementById('wechat-modal');
        if (modal) modal.classList.add('show');
    };

    window.closeWechatModal = function () {
        const modal = document.getElementById('wechat-modal');
        if (modal) modal.classList.remove('show');
    };

    // 绑定微信关闭按钮
    const closeWechatBtn = document.getElementById('close-modal-btn');
    if (closeWechatBtn) {
        closeWechatBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeWechatModal();
        });
    }

    // 增加微信弹窗背景点击关闭
    const wechatModal = document.getElementById('wechat-modal');
    if (wechatModal) {
        wechatModal.addEventListener('click', (e) => {
            if (e.target === wechatModal) {
                closeWechatModal();
            }
        });
    }

    // --- 下拉菜单 & 成就中心 逻辑 ---
    const menuBtn = document.getElementById('menu-btn');
    const achievementModal = document.getElementById('achievement-modal');
    const closeAchievementBtn = document.getElementById('close-achievement-modal');
    const viewAchievementsBtn = document.getElementById('view-achievements');
    const achievementGrid = document.getElementById('achievement-grid');
    const unlockedCountEl = document.getElementById('unlocked-count');
    const totalCountLabelEl = document.getElementById('total-count');

    // 切换下拉菜单
    if (menuBtn) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menuBtn.classList.toggle('active');
        });
    }

    // 点击外部关闭下拉菜单
    document.addEventListener('click', () => {
        if (menuBtn) menuBtn.classList.remove('active');
    });

    // 点击菜单项后自动关闭下拉菜单
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            if (menuBtn) menuBtn.classList.remove('active');
        });
    });

    // 打开成就 Modal
    if (viewAchievementsBtn && achievementModal) {
        viewAchievementsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("Opening achievement modal...");
            renderAchievementModal();

            // 延迟一丢丢，给浏览器时间渲染 innerHTML
            setTimeout(() => {
                achievementModal.classList.add('show');
                console.log("Modal HTML content:", achievementGrid.innerHTML); // 打印渲染出的内容
            }, 50);

            if (menuBtn) menuBtn.classList.remove('active');
        });
    }

    // 关闭成就 Modal
    if (closeAchievementBtn && achievementModal) {
        closeAchievementBtn.addEventListener('click', () => {
            achievementModal.classList.remove('show');
        });
    }

    if (achievementModal) {
        achievementModal.addEventListener('click', (e) => {
            if (e.target === achievementModal) {
                achievementModal.classList.remove('show');
            }
        });
    }



    function renderAchievementModal() {
        console.log("Rendering achievements...", { achievementGrid, achievementManager, ACHIEVEMENTS });
        if (!achievementGrid || !achievementManager || !ACHIEVEMENTS) {
            console.error("Missing core components for achievement rendering");
            return;
        }

        const unlockedIds = achievementManager.unlocked || [];
        const totalKeys = Object.keys(ACHIEVEMENTS);
        console.log(`Found ${totalKeys.length} total achievements, ${unlockedIds.length} unlocked`);

        if (unlockedCountEl) unlockedCountEl.innerText = unlockedIds.length;
        if (totalCountLabelEl) totalCountLabelEl.innerText = totalKeys.length;

        if (totalKeys.length === 0) {
            achievementGrid.innerHTML = '<p style="text-align:center; padding:2rem; color:var(--text-muted);">暂无成就数据...</p>';
            return;
        }

        achievementGrid.innerHTML = totalKeys.map(key => {
            const ach = ACHIEVEMENTS[key];
            const isUnlocked = unlockedIds.includes(ach.id);
            return `
                <div class="achievement-item ${isUnlocked ? 'unlocked' : ''}">
                    <div class="item-icon">${isUnlocked ? ach.icon : '<i class="ri-lock-2-line"></i>'}</div>
                    <div class="item-info">
                        <h4 style="color: #fff;">${isUnlocked ? ach.title : '已锁定'}</h4>
                        <p>${isUnlocked ? ach.desc : '继续探索简历以解锁该成就...'}</p>
                    </div>
                </div>
            `;
        }).join('');
    }
}
