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
            { title: "三维全息投影", desc: "基于 WebGL 的全息交互系统", img: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80" },
            { title: "神经网络可视化", desc: "实时呈现 AI 决策链条的拓扑结构", img: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80" },
            { title: "量子加密通信", desc: "端到端非对称加密安全实验台", img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80" }
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
            isVisible = entries[0].isIntersecting;
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
            }
            requestAnimationFrame(animate);
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
            threeEngine.isVisible = entries[0].isIntersecting;
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
            threeEngine.animationID = requestAnimationFrame(animate);
            if (threeEngine.isVisible) {
                if (threeEngine.earth) {
                    threeEngine.earth.rotation.y += 0.0002; // 极致优雅的慢速自转
                }
                threeEngine.renderer.render(threeEngine.scene, threeEngine.camera);
            }
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
        const cards = document.querySelectorAll('.lab-card');
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

    resumePage.addEventListener('scroll', () => {
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
                <div class="visual-card glass">
                    <div class="glow"></div>
                    <div class="inner-content">
                        <code>
                            <span class="c-1">const</span> <span class="c-2">developer</span> = {<br>
                            &nbsp;&nbsp;<span class="c-3">name</span>: <span class="c-4">'${p.name}'</span>,<br>
                            &nbsp;&nbsp;<span class="c-3">role</span>: <span class="c-4">'Full Stack'</span>,<br>
                            &nbsp;&nbsp;<span class="c-3">passion</span>: <span class="c-4">'Visual Arts'</span><br>
                            };
                        </code>
                    </div>
                </div>
            </div>
        `;
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
                    <a href="mailto:${RESUME_DATA.profile.email}" class="contact-item">
                        <i class="ri-mail-send-line"></i>
                        <span>发送邮件</span>
                    </a>
                    <a href="#" class="contact-item" id="wechat-btn">
                        <i class="ri-wechat-line"></i>
                        <span>微信联系</span>
                    </a>
                </div>
            </div>
        `;
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

    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    let isPlaying = false;
    let isPaused = false;
    let score = 0;
    let frameCount = 0;

    // 游戏视口可见性监听
    let isVisible = false;
    const observer = new IntersectionObserver((entries) => {
        isVisible = entries[0].isIntersecting;
    }, { threshold: 0.1 });
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
            this.speed = this.size * 0.5; // 远景慢，近景快
            this.alpha = 0.2 + Math.random() * 0.5;
        }
        update() {
            this.y += this.speed;
            if (this.y > canvas.height) {
                this.y = -10;
                this.x = Math.random() * canvas.width;
            }
        }
        draw() {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
            ctx.fillRect(this.x, this.y, this.size, this.size);
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

    class Enemy {
        constructor() {
            this.w = 60; this.h = 30;
            this.x = Math.random() * (canvas.width - this.w) + this.w / 2;
            this.y = -50;
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
        }
        update() {
            if (!this.alive) return;
            // 出场动画
            if (this.y < this.targetY) this.y += 1.5;
            else {
                // 闪现逻辑
                if (this.blinkTimer > 0) {
                    this.blinkTimer--;
                    if (this.blinkTimer > 20) this.alpha -= 0.05; // 前20帧淡出
                    else if (this.blinkTimer === 20) {
                        this.x = Math.random() * (canvas.width - this.w) + this.w / 2; // 跃迁
                    } else this.alpha += 0.05; // 后20帧淡入
                    this.alpha = Math.max(0, Math.min(1, this.alpha));
                    return; // 跃迁期间不执行其他逻辑
                }
                if (this.blinkCooldown > 0) this.blinkCooldown--;
                if (this.laserCooldown > 0) this.laserCooldown--;

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
        boss = null;
        console.log("%c🏆 BOSS ELIMINATED!", "color: #22c55e; font-weight: bold;");
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
        canvas.width = rect.width;
        canvas.height = 600;
        // 仅在初次或宽度剧变时初始化流星，防止缩放时抖动
        if (stars.length === 0 || Math.abs(oldWidth - canvas.width) > 100) {
            initStars();
        }
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
        if (isPlaying) isPaused = true;
    });

    canvas.addEventListener('mouseenter', () => {
        if (isPlaying) isPaused = false;
    });

    quitBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isPlaying = false;
        isPaused = false;
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
            requestAnimationFrame(gameLoop);
            return;
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

        if (isPlaying && !isPaused) {
            frameCount++;

            // 超频模式边缘特效
            if (ship && ship.isOverclocked) {
                ctx.strokeStyle = `rgba(255, 0, 193, ${0.3 + Math.random() * 0.2})`;
                ctx.lineWidth = 10;
                ctx.strokeRect(0, 0, canvas.width, canvas.height);
            }

            // 绘制星海背景
            stars.forEach(s => { s.update(); s.draw(); });

            ship.update(mouseX, mouseY);
            ship.draw();

            // 阶梯式 Boss 战触发 (3000, 10000, 30000, 100000)
            if (!isBossMode && !boss) {
                if (score >= 100000 && !spawnedBosses.has('ZERO_DAY_EXPLOIT')) {
                    spawnBoss('ZERO_DAY_EXPLOIT', 500, '#ff2d55', 10);
                } else if (score >= 30000 && !spawnedBosses.has('SYSTEM_CRASHER')) {
                    spawnBoss('SYSTEM_CRASHER', 120, '#ff00c1', 3);
                } else if (score >= 10000 && !spawnedBosses.has('LOGIC_EATER')) {
                    spawnBoss('LOGIC_EATER', 50, '#00fff9', 2);
                } else if (score >= 3000 && !spawnedBosses.has('PATCH_MINER')) {
                    spawnBoss('PATCH_MINER', 20, '#fbbf24', 1);
                }
            }

            if (isBossMode && boss) {
                boss.update();
                boss.draw();
                // Boss 战期间允许少量小怪出现 (4倍稀疏)
                if (frameCount % 160 === 0) enemies.push(new Enemy());
            } else {
                // 普通小怪生成逻辑
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

        ctx.restore(); // 结束屏幕震动
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
        spawnedBosses.clear(); // 重置 Boss 出场记录
        frameCount = 0;
        screenShake = 0;
    });

    function gameOver() {
        isPlaying = false;
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
        GLOBE_TROTTER: { id: 'globe', title: '环球旅行者', desc: '深度观察 3D 地球，视野已跨越国界。', icon: '🌍' }
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

    // 滚动监听成就
    let scrollAchieved = false;
    window.addEventListener('scroll', () => {
        if (!scrollAchieved && (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100) {
            window.unlockAchievement('EXPLORER');
            scrollAchieved = true;
        }
    });
}
