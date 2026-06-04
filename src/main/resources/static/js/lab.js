/**
 * Cyber Lab: 3D Interactive Constellation & Hologram Projector Engine
 * Designed by Antigravity
 * Powered by Vanilla JS & HTML5 Canvas
 */

document.addEventListener('DOMContentLoaded', () => {
    // 检查 RESUME_DATA 是否存在
    if (typeof RESUME_DATA === 'undefined') {
        console.error('❌ [Lab Engine] 简历数据加载失败，未找到 RESUME_DATA！');
        return;
    }

    // --- 全局物理与控制参数 ---
    const config = {
        rotationSpeed: 0.001, // 默认自转速度 (rad/frame)
        zoom: 1.0,           // 滚轮缩放比例
        maxZoom: 2.0,
        minZoom: 0.5,
        fov: 350,            // 视距 (焦距)
        nodeRadius: 8,       // 技能节点半径
        coreRadius: 12,      // 核心分类节点半径
        glowIntensity: 20,   // 发光强度
        particleDensity: 60, // 虚幻背景星星数量
        activeColor: '#00f0ff',
        secondaryColor: '#bd00ff',
    };

    // --- 初始化 DOM 句柄 ---
    const canvas = document.getElementById('constellation-canvas');
    const ctx = canvas.getContext('2d');
    const cardEl = document.querySelector('.hologram-card');
    
    // --- 极客调参面板逻辑 ---
    const paramPanel = document.getElementById('param-panel');
    const toggleParamBtn = document.getElementById('toggle-param');
    const speedRange = document.getElementById('speed-range');
    const zoomRange = document.getElementById('zoom-range');

    // 调参面板折叠切换
    if (toggleParamBtn && paramPanel) {
        toggleParamBtn.addEventListener('click', () => {
            paramPanel.classList.toggle('collapsed');
        });
    }

    // 监听调参滑块
    if (speedRange) {
        speedRange.addEventListener('input', (e) => {
            config.rotationSpeed = parseFloat(e.target.value);
        });
    }
    if (zoomRange) {
        zoomRange.addEventListener('input', (e) => {
            config.zoom = parseFloat(e.target.value);
        });
    }

    // --- 3D 节点类与核心星图渲染 ---
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    let centerX = width / 2;
    let centerY = height / 2;

    // 自适应画布大小
    function resizeCanvas() {
        width = canvas.offsetWidth;
        height = canvas.offsetHeight;
        centerX = width / 2;
        centerY = height / 2;
        // 考虑 Retina 屏
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 3D 向量类
    class Point3D {
        constructor(x, y, z, label = '', type = 'skill', itemData = null) {
            this.x = x;
            this.y = y;
            this.z = z;
            this.label = label;
            this.type = type; // 'core' (分类核心) | 'skill' (普通技能) | 'background' (装饰背景星)
            this.itemData = itemData; // 存储技能信息 {name, level}
            this.screenX = 0;
            this.screenY = 0;
            this.screenScale = 1;
            this.isHovered = false;
            this.pulseTimer = 0; // 动画波纹计时器
        }

        // 绕 Y 轴旋转
        rotateY(angle) {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const x1 = this.x * cos - this.z * sin;
            const z1 = this.x * sin + this.z * cos;
            this.x = x1;
            this.z = z1;
        }

        // 绕 X 轴旋转
        rotateX(angle) {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const y1 = this.y * cos - this.z * sin;
            const z1 = this.y * sin + this.z * cos;
            this.y = y1;
            this.z = z1;
        }

        // 投影到 2D 屏幕
        project() {
            // 近裁剪面防护：当粒子运动到相机后方（z <= -fov），强制截断保护，防止分母为 0 或负数导致 NaN 奇异值
            const zSafe = Math.max(this.z, -config.fov + 20); 
            this.screenScale = config.fov / (config.fov + zSafe);
            this.screenX = centerX + this.x * this.screenScale * config.zoom;
            this.screenY = centerY + this.y * this.screenScale * config.zoom;
        }

        // 绘制节点
        draw() {
            const size = (this.type === 'core' ? config.coreRadius : config.nodeRadius) * this.screenScale;
            // 越往前（z 越小），透明度越高，最大为 1.0；越往后（z 越大），透明度越低，最小为 0.15
            const zProgress = (this.z + 200) / 400; // 映射在 0 ~ 1 范围
            let alpha = Math.max(0.15, Math.min(1.0, 1.2 - zProgress));
            
            ctx.save();
            
            if (this.type === 'background') {
                // 装饰星：发光极弱的白色星点
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.4})`;
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.arc(this.screenX, this.screenY, 1.5 * this.screenScale, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // 核心或技能节点：发光效果
                const color = this.type === 'core' ? config.secondaryColor : config.activeColor;
                
                // 悬停交互高亮
                if (this.isHovered) {
                    alpha = 1.0;
                    ctx.shadowColor = color;
                    ctx.shadowBlur = config.glowIntensity * 1.5;
                    
                    // 绘制外发光涟漪 ring
                    this.pulseTimer += 0.05;
                    const ringRadius = size * (1.5 + Math.sin(this.pulseTimer) * 0.5);
                    ctx.strokeStyle = `${color}33`; // 20% alpha
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(this.screenX, this.screenY, ringRadius, 0, Math.PI * 2);
                    ctx.stroke();
                } else {
                    ctx.shadowColor = color;
                    ctx.shadowBlur = config.glowIntensity * this.screenScale;
                }
                
                // 绘制内实体
                ctx.fillStyle = this.isHovered ? '#ffffff' : color;
                ctx.beginPath();
                ctx.arc(this.screenX, this.screenY, size, 0, Math.PI * 2);
                ctx.fill();
                
                // 绘制边框
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.lineWidth = 1;
                ctx.stroke();

                // 绘制文字标签 (只给靠近前面的节点画，或者当鼠标悬浮时画，避免屏幕过于杂乱)
                if (this.z < 80 || this.isHovered) {
                    ctx.font = `${this.type === 'core' ? '12px' : '10px'} var(--font-heading)`;
                    ctx.fillStyle = this.isHovered ? '#ffffff' : `rgba(240, 244, 248, ${alpha})`;
                    ctx.shadowBlur = 0; // 文本不加虚影防模糊
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    ctx.fillText(this.label, this.screenX, this.screenY + size + 6);
                }
            }
            
            ctx.restore();
        }
    }

    // --- 构建 3D 星系节点结构 ---
    const nodes = [];
    const connections = [];

    function initConstellation() {
        nodes.length = 0;
        connections.length = 0;
        
        // 星体分布半径
        const sphereRadius = 180;
        
        // 1. 创建三大核心分类节点
        const categories = RESUME_DATA.skills;
        const categoryNodes = [];
        
        categories.forEach((cat, index) => {
            // 平分空间角度，让三个核心在球内三角拉开
            const angle = (index / categories.length) * Math.PI * 2;
            const x = Math.cos(angle) * (sphereRadius * 0.5);
            const z = Math.sin(angle) * (sphereRadius * 0.5);
            const y = (index - 1) * 30; // 高度拉开
            
            const coreNode = new Point3D(x, y, z, cat.category, 'core', cat);
            nodes.push(coreNode);
            categoryNodes.push(coreNode);
            
            // 2. 将技能节点分布在核心星周围 (形成局部星座星群)
            cat.items.forEach((item, itemIdx) => {
                const subAngle = (itemIdx / cat.items.length) * Math.PI * 2;
                const offsetRadius = 60 + Math.random() * 20;
                
                // 相对于核心坐标的偏移
                const dx = Math.cos(subAngle) * offsetRadius;
                const dz = Math.sin(subAngle) * offsetRadius;
                const dy = (Math.random() - 0.5) * 40;
                
                const skillNode = new Point3D(
                    coreNode.x + dx, 
                    coreNode.y + dy, 
                    coreNode.z + dz, 
                    item.name, 
                    'skill', 
                    item
                );
                nodes.push(skillNode);
                
                // 建立分类核心到技能项的连线
                connections.push({ from: coreNode, to: skillNode, type: 'core-to-skill' });
            });
        });

        // 核心星之间也连线，形成稳定的三角框架
        for (let i = 0; i < categoryNodes.length; i++) {
            const from = categoryNodes[i];
            const to = categoryNodes[(i + 1) % categoryNodes.length];
            connections.push({ from, to, type: 'core-to-core' });
        }

        // 3. 产生一些纯背景装饰星星，点缀 3D 深空
        for (let i = 0; i < config.particleDensity; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const r = sphereRadius * (1.2 + Math.random() * 0.8); // 分布在球体外围
            
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);
            
            nodes.push(new Point3D(x, y, z, '', 'background'));
        }
    }
    initConstellation();

    // --- 鼠标交互控制星图自转/拖拽 ---
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let rotX = 0.001; // X轴微小旋转增量
    let rotY = config.rotationSpeed; // Y轴微小旋转增量
    let hoverNode = null;

    // 拖拽控制
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (isDragging) {
            // 计算拖拽的增量，转换成旋转弧度，并进行最大转速限幅以防节点溢出相机视界
            const dx = e.clientX - lastMouseX;
            const dy = e.clientY - lastMouseY;
            
            rotY = Math.max(-0.08, Math.min(0.08, dx * 0.005));
            rotX = Math.max(-0.08, Math.min(0.08, dy * 0.005));
            
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        } else {
            // 鼠标非拖拽状态，进行悬停节点碰撞检测
            let foundHover = false;
            
            // 只检测普通技能星和核心星
            for (let node of nodes) {
                if (node.type === 'background') continue;
                
                const size = (node.type === 'core' ? config.coreRadius : config.nodeRadius) * node.screenScale;
                const distance = Math.hypot(mouseX - node.screenX, mouseY - node.screenY);
                
                if (distance < size + 6) { // 增加 6 像素点击热区
                    if (hoverNode && hoverNode !== node) {
                        hoverNode.isHovered = false;
                    }
                    node.isHovered = true;
                    hoverNode = node;
                    foundHover = true;
                    canvas.style.cursor = 'pointer';
                    break;
                }
            }

            if (!foundHover) {
                if (hoverNode) {
                    hoverNode.isHovered = false;
                    hoverNode = null;
                }
                canvas.style.cursor = 'grab';
            }
        }
    });

    // 点击事件触发右侧投影
    canvas.addEventListener('click', (e) => {
        if (hoverNode && !isDragging) {
            if (hoverNode.type === 'skill' && hoverNode.itemData) {
                projectSkillDetails(hoverNode.itemData);
            } else if (hoverNode.type === 'core' && hoverNode.itemData) {
                // 点击核心节点，随机选一个子技能或展示大类介绍
                projectCategoryDetails(hoverNode.itemData);
            }
        }
    });

    // 滚轮缩放控制
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomDelta = e.deltaY * -0.001;
        config.zoom = Math.min(config.maxZoom, Math.max(config.minZoom, config.zoom + zoomDelta));
        if (zoomRange) {
            zoomRange.value = config.zoom;
        }
    });

    // --- 核心渲染循环 (Z-Sorting 画师算法) ---
    function renderLoop() {
        ctx.clearRect(0, 0, width, height);

        // 1. 如果没有拖拽，进行微小自转衰减
        if (!isDragging) {
            rotX *= 0.95; // 旋转阻尼
            // 维持基础自转速度
            const targetRotY = config.rotationSpeed;
            rotY = rotY * 0.95 + targetRotY * 0.05;
        }

        // 2. 旋转所有节点坐标
        nodes.forEach(node => {
            node.rotateY(rotY);
            node.rotateX(rotX);
            node.project();
        });

        // 3. 画师算法：按照 Z 轴从后往前 (深处到浅处) 对元素进行排序
        // 连线本身也是 3D 的，为了完美结合，我们按连线两个顶点的平均 Z 轴值进行绘制
        const renderQueue = [];
        
        connections.forEach(conn => {
            const avgZ = (conn.from.z + conn.to.z) / 2;
            renderQueue.push({ type: 'connection', z: avgZ, data: conn });
        });

        nodes.forEach(node => {
            renderQueue.push({ type: 'node', z: node.z, data: node });
        });

        // 从大到小排序 (即 Z 从远到近，Z 越正代表越远，先画远处的)
        renderQueue.sort((a, b) => b.z - a.z);

        // 4. 开始依次渲染
        renderQueue.forEach(item => {
            if (item.type === 'connection') {
                drawConnection(item.data);
            } else {
                item.data.draw();
            }
        });

        requestAnimationFrame(renderLoop);
    }

    // 绘制 3D 连线
    function drawConnection(conn) {
        const { from, to, type } = conn;
        
        // 节点必须已经投影在屏幕内
        const zProgress = ((from.z + to.z) / 2 + 200) / 400;
        const alpha = Math.max(0.04, Math.min(0.7, 0.8 - zProgress));
        
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(from.screenX, from.screenY);
        ctx.lineTo(to.screenX, to.screenY);
        
        if (type === 'core-to-core') {
            // 核心三角连线：紫色流光
            ctx.strokeStyle = `rgba(189, 0, 255, ${alpha * 0.8})`;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]); // 虚线
        } else {
            // 核心到技能的蛛网线：青色微光
            ctx.strokeStyle = `rgba(0, 240, 255, ${alpha * 0.5})`;
            ctx.lineWidth = 0.8;
            ctx.setLineDash([]); // 实线
        }
        
        ctx.stroke();
        ctx.restore();
    }

    // 启动星图渲染
    renderLoop();

    // --- 全息投影数据渲染 (Hologram System) ---
    const holoTitle = document.getElementById('holo-title');
    const holoLevelFill = document.getElementById('holo-level-fill');
    const holoLevelNum = document.getElementById('holo-level-num');
    const holoCategoryDesc = document.getElementById('holo-category-desc');
    const holoProjectsContainer = document.getElementById('holo-projects');
    const holoNotifyText = document.getElementById('holo-notify-text');

    // 模拟打印机扫描文字的打字机特效
    let typewriterTimeout = null;
    function typeWriter(element, text, speed = 25, callback = null) {
        if (typewriterTimeout) {
            clearTimeout(typewriterTimeout);
        }
        element.innerHTML = '';
        let i = 0;
        function typing() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                typewriterTimeout = setTimeout(typing, speed);
            } else {
                typewriterTimeout = null;
                if (callback) {
                    callback();
                }
            }
        }
        typing();
    }

    // 闪烁特效通知
    function flashNotify(msg) {
        if (!holoNotifyText) return;
        holoNotifyText.style.animation = 'none';
        holoNotifyText.offsetHeight; // 触发 reflow
        holoNotifyText.textContent = `SYSTEM // ${msg}`;
        holoNotifyText.style.animation = 'radar-scan 0.3s ease-out';
    }

    // 初始化展示默认信息
    function showDefaultProjector() {
        if (holoTitle) holoTitle.textContent = "LAB // 实验室主控台";
        if (holoCategoryDesc) {
            holoCategoryDesc.innerHTML = `<span style="color: var(--primary);">SYSTEM READY.</span> 请点击左侧三维星图中的任意技能节点（如 Java/Spring Boot、Vue.js 等），全息系统将自动扫描关联的数据结构、熟练矩阵与精选实战作品。`;
        }
        if (holoLevelFill) holoLevelFill.style.width = '0%';
        if (holoLevelNum) holoLevelNum.textContent = '00';
        if (holoProjectsContainer) {
            holoProjectsContainer.innerHTML = `
                <div style="border: 1px dashed rgba(255, 255, 255, 0.05); padding: 1.5rem; text-align: center; border-radius: 12px; color: var(--text-muted); font-size: 0.85rem;">
                    <i class="ri-radar-line" style="font-size: 1.5rem; color: var(--primary); display: block; margin-bottom: 0.5rem; animation: pulse 2s infinite;"></i>
                    等待节点捕获与投影映射...
                </div>
            `;
        }
    }
    showDefaultProjector();

    // 点击分类核心节点时的渲染
    function projectCategoryDetails(catData) {
        flashNotify(`CLASSIFY CORE CAPTURED: ${catData.category}`);
        
        // 3D 翻转卡片视觉冲击
        triggerCardFlip();

        if (holoTitle) holoTitle.textContent = catData.category;
        
        const descText = `这是全栈架构中的核心维度之一。该分类下包含 ${catData.items.map(i => i.name).join('、')} 等关键技术模块。整体技术稳健度良好，支持复杂的工程化落地。`;
        if (holoCategoryDesc) typeWriter(holoCategoryDesc, descText, 15);
        
        // 计算此类别的平均分
        const avgLevel = Math.round(catData.items.reduce((sum, item) => sum + item.level, 0) / catData.items.length);
        if (holoLevelFill) holoLevelFill.style.width = `${avgLevel}%`;
        if (holoLevelNum) holoLevelNum.textContent = avgLevel;

        // 渲染此大类下的所有项目
        renderAssociatedProjects(catData.category);
    }

    // 点击具体技能节点时的渲染
    function projectSkillDetails(skillItem) {
        flashNotify(`SKILL NODE LOCKED: ${skillItem.name}`);
        
        triggerCardFlip();

        if (holoTitle) holoTitle.textContent = skillItem.name;
        
        // 动态给出一段极客式的能力评级文字
        let ratingText = '';
        if (skillItem.level >= 95) ratingText = '【统帅级】具备该技术的极致调优能力与深入源码级的架构理解，能在超高压环境下独立攻坚。';
        else if (skillItem.level >= 90) ratingText = '【专家级】具备深厚的实战沉淀与优化经验，主导过多项核心工程建设，能够解决复杂的生产链路级痛点。';
        else if (skillItem.level >= 85) ratingText = '【核心级】熟练运用各种主流设计模式，保障高内聚低耦合的代码输出，技术调用熟练，能实现业务的快速交付。';
        else ratingText = '【生产级】能够配合大型项目开发，理解系统架构并高质量完成开发工作。';

        const descText = `技术熟练度评级为 ${skillItem.level}%。${ratingText}`;
        if (holoCategoryDesc) typeWriter(holoCategoryDesc, descText, 15);

        if (holoLevelFill) holoLevelFill.style.width = `${skillItem.level}%`;
        if (holoLevelNum) holoLevelNum.textContent = skillItem.level;

        // 根据技能名字，从项目列表中进行标签模糊匹配
        renderAssociatedProjects(skillItem.name);
    }

    // 渲染关联项目的算法
    function renderAssociatedProjects(targetName) {
        if (!holoProjectsContainer) return;
        
        const matchedProjects = RESUME_DATA.projects.filter(proj => {
            // 如果技能名是 Vue.js / Uni-app，则拆开拆字模糊匹配
            const cleanTarget = targetName.toLowerCase().replace(/\.js/g, '').replace(/\//g, ' ');
            return proj.tags.some(tag => {
                const cleanTag = tag.toLowerCase();
                return cleanTarget.includes(cleanTag) || cleanTag.includes(cleanTarget);
            }) || proj.desc.toLowerCase().includes(cleanTarget);
        });

        if (matchedProjects.length === 0) {
            // 没有直接匹配的项目，渲染一个极客的“系统预测适配”项目，或者显示无匹配提示
            holoProjectsContainer.innerHTML = `
                <div style="border: 1px dashed rgba(0, 240, 255, 0.1); padding: 1.2rem; border-radius: 12px; font-size: 0.8rem; line-height: 1.5; color: var(--text-muted);">
                    <i class="ri-information-line" style="color: var(--secondary); margin-right: 4px;"></i>
                    没有直接挂载的专属开源作品，但该项技能已深度渗透至本站的所有架构模块中。包括在后台基于 API 通道的安全拦截和前后端交互响应。
                </div>
            `;
            return;
        }

        let html = '';
        matchedProjects.forEach(proj => {
            html += `
                <div class="holo-project-card">
                    <h4>${proj.title}</h4>
                    <p>${proj.desc}</p>
                    <div class="holo-project-tags">
                        ${proj.tags.map(t => `<span class="holo-tag">${t}</span>`).join('')}
                    </div>
                </div>
            `;
        });
        holoProjectsContainer.innerHTML = html;
    }

    // 卡片翻转微动效
    function triggerCardFlip() {
        if (!cardEl) return;
        cardEl.style.transform = 'rotateY(15deg) scale(0.98)';
        setTimeout(() => {
            cardEl.style.transform = 'rotateY(0deg) scale(1.0)';
        }, 300);
    }

    // --- 3D Tilt 卡片交互 (鼠标跟随倾斜) ---
    if (cardEl && window.innerWidth > 1024) {
        cardEl.addEventListener('mousemove', (e) => {
            const rect = cardEl.getBoundingClientRect();
            // 计算鼠标相对卡片中心的坐标 (-0.5 到 0.5 范围)
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            
            // 最大旋转 12 度
            const rotateX = -y * 15;
            const rotateY = x * 15;
            
            cardEl.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        });

        cardEl.addEventListener('mouseleave', () => {
            cardEl.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1.0)';
            cardEl.style.transition = 'transform 0.5s ease';
        });
        
        cardEl.addEventListener('mouseenter', () => {
            cardEl.style.transition = 'none'; // 移入时取消过渡以防卡顿
        });
    }
});
