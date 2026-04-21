/**
 * Interactivity & Rendering Logic for Personal Resume
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Render Data
    renderHero();
    renderAbout();
    renderSkills();
    renderProjects();
    renderContact();

    // 1.5 Cursor Glow Movement
    const glow = document.getElementById('cursor-glow');
    window.addEventListener('mousemove', (e) => {
        glow.style.left = e.clientX + 'px';
        glow.style.top = e.clientY + 'px';

        // 探测是否悬浮在交互元素上
        const target = e.target;
        if (target.closest('a, .btn-primary, .btn-secondary, .glass, .stat-card, .project-card')) {
            glow.style.width = '800px';
            glow.style.height = '800px';
            glow.style.background = 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)';
        } else {
            glow.style.width = '600px';
            glow.style.height = '600px';
            glow.style.background = 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)';
        }
    });

    // 2. Navbar Scroll Effect
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(5, 7, 10, 0.9)';
            navbar.style.height = '70px';
            navbar.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
        } else {
            navbar.style.background = 'rgba(15, 18, 25, 0.7)';
            navbar.style.height = '80px';
            navbar.style.borderBottom = '1px solid transparent';
        }
    });

    // 3. Reveal Sections on Scroll
    initRevealAnimations();

    // 4. Smooth Scroll
    initSmoothScroll();

    // --- Helper Functions ---

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

    function initRevealAnimations() {
        const revealCallback = (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal-active');
                    observer.unobserve(entry.target);
                }
            });
        };
        const revealObserver = new IntersectionObserver(revealCallback, { threshold: 0.1 });
        document.querySelectorAll('section, .glass, .stat-card, .project-card').forEach(el => {
            el.classList.add('reveal-hidden');
            revealObserver.observe(el);
        });
    }

    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    window.scrollTo({
                        top: target.offsetTop - 70,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    console.log("%c🚀 Resume Data Driven Engine Active", "color: #6366f1; font-weight: bold;");
});
