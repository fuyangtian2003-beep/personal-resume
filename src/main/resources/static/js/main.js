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

    // 2. Page Slider Logic
    const slider = document.getElementById('page-slider');
    const arrowRight = document.getElementById('slide-arrow-right');
    const arrowLeft = document.getElementById('slide-arrow-left');

    arrowRight.addEventListener('click', () => {
        slider.style.transform = 'translateX(-100vw)';
        arrowRight.classList.add('hidden');
        arrowLeft.classList.remove('hidden');
        // 性能优化：隐藏不显示的页面
        setTimeout(() => {
            document.getElementById('resume-page').style.visibility = 'hidden';
            document.getElementById('showcase-page').style.visibility = 'visible';
        }, 800);
    });

    arrowLeft.addEventListener('click', () => {
        document.getElementById('resume-page').style.visibility = 'visible';
        slider.style.transform = 'translateX(0)';
        arrowLeft.classList.add('hidden');
        arrowRight.classList.remove('hidden');
        setTimeout(() => {
            document.getElementById('showcase-page').style.visibility = 'hidden';
        }, 800);
    });

    // 3. Navbar & Scroll Logic (Target internal page)
    const resumePage = document.getElementById('resume-page');
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
});
