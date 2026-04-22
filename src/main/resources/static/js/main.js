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
            { title: "神经网络可视化", desc: "实时呈现 AI 决策链条的拓扑结构", img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc51?w=800&q=80" },
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

        // 监听可见性
        const observer = new IntersectionObserver((entries) => {
            isVisible = entries[0].isIntersecting;
        }, { threshold: 0.1 });
        observer.observe(wrapper);

        // 监听是否进入游戏区域，用来屏蔽全局拖尾
        container.addEventListener('mouseenter', () => isMouseInGame = true);
        container.addEventListener('mouseleave', () => isMouseInGame = false);

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
    let particles = [];

    class Ship {
        constructor() {
            this.w = 40;
            this.h = 40;
            this.x = canvas.width / 2;
            this.y = canvas.height - 80;
            this.targetX = this.x;
            this.targetY = this.y;
            this.color = '#6366f1';
        }

        update(mx, my) {
            this.targetX = mx;
            this.targetY = my;
            this.x += (this.targetX - this.x) * 0.15;
            this.y += (this.targetY - this.y) * 0.15;
            this.x = Math.max(this.w, Math.min(canvas.width - this.w, this.x));
            this.y = Math.max(canvas.height / 2, Math.min(canvas.height - this.h, this.y));
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
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

    class Enemy {
        constructor() {
            this.w = 60;
            this.h = 30;
            this.x = Math.random() * (canvas.width - this.w) + this.w / 2;
            this.y = -50;
            this.vy = 2 + Math.random() * 2;
            this.alive = true;
            const labels = ['BUG', 'NULL', '404', 'ERROR', 'CRASH', 'XSS', 'DDOS'];
            this.text = labels[Math.floor(Math.random() * labels.length)];
            this.color = '#ff2d55';
        }
        update() {
            this.y += this.vy;
            if (this.y > canvas.height + 50) this.alive = false;
        }
        draw() {
            ctx.save();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.strokeRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
            ctx.fillStyle = this.color;
            ctx.font = 'bold 12px Fira Code, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.text, this.x, this.y + 4);
            ctx.restore();
        }
    }

    class ExplosionParticle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.vx = (Math.random() - 0.5) * 6;
            this.vy = (Math.random() - 0.5) * 6;
            this.alpha = 1;
            this.color = color;
            this.size = Math.random() * 3;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.alpha -= 0.02;
        }
        draw() {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.size, this.size);
            ctx.restore();
        }
    }

    function createExplosion(x, y, color) {
        for (let i = 0; i < 15; i++) {
            particles.push(new ExplosionParticle(x, y, color));
        }
    }

    function handleCollisions() {
        bullets.forEach(b => {
            enemies.forEach(e => {
                if (b.alive && e.alive) {
                    const dist = Math.hypot(b.x - e.x, b.y - e.y);
                    if (dist < 30) {
                        b.alive = false;
                        e.alive = false;
                        score += 100;
                        scoreEl.innerText = `SCORE: ${score.toString().padStart(4, '0')}`;
                        createExplosion(e.x, e.y, '#ff2d55');
                    }
                }
            });
        });

        if (ship) {
            enemies.forEach(e => {
                if (e.alive) {
                    const dist = Math.hypot(ship.x - e.x, ship.y - e.y);
                    if (dist < 40) {
                        e.alive = false;
                        score = Math.max(0, score - 200);
                        scoreEl.innerText = `SCORE: ${score.toString().padStart(4, '0')}`;
                        createExplosion(ship.x, ship.y, '#ffffff');
                        container.style.animation = 'shake 0.2s linear';
                        setTimeout(() => container.style.animation = '', 200);
                    }
                }
            });
        }
    }

    function resize() {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = 600;
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
        if (isPlaying) {
            bullets.push(new Bullet(ship.x, ship.y - 20));
        }
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
        const btn = overlay.querySelector('button');
        
        const text = 'SYSTEM TERMINATED';
        h2.innerText = text;
        h2.setAttribute('data-text', text);
        p.innerText = `最终防御得分: ${score}`;
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

        if (isPaused) {
            ctx.fillStyle = '#fff';
            ctx.font = '30px Space Grotesk';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        }

        if (isPlaying && !isPaused) {
            frameCount++;
            ship.update(mouseX, mouseY);
            ship.draw();

            if (frameCount % Math.max(10, 40 - Math.floor(score / 1000)) === 0) {
                enemies.push(new Enemy());
            }

            bullets = bullets.filter(b => b.alive);
            bullets.forEach(b => { b.update(); b.draw(); });

            enemies = enemies.filter(e => e.alive);
            enemies.forEach(e => { e.update(); e.draw(); });

            particles = particles.filter(p => p.alpha > 0);
            particles.forEach(p => { p.update(); p.draw(); });

            handleCollisions();
        }

        requestAnimationFrame(gameLoop);
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
        score = 0;
        scoreEl.innerText = 'SCORE: 0000';
        enemies = [];
        bullets = [];
        particles = [];
        frameCount = 0;
    });

    gameLoop();
}
