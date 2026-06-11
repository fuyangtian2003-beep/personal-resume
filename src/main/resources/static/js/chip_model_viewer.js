document.addEventListener('DOMContentLoaded', () => {

    // CDN 双路加速与容灾配置 (首选本地离线包保证秒开，备选国内高速镜像源容灾)
    const LIBS = {
        three: {
            primary: "https://cdn.bootcdn.net/ajax/libs/three.js/r128/three.min.js",
            fallback: "js/lib/three.min.js"
        },
        gltf: {
            primary: "https://cdn.jsdmirror.com/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js",
            fallback: "js/lib/GLTFLoader.js"
        },
        controls: {
            primary: "https://cdn.jsdmirror.com/npm/three@0.128.0/examples/js/controls/OrbitControls.js",
            fallback: "js/lib/OrbitControls.js"
        }
    };
    const progressEl = document.getElementById('loading-progress');
    const progressBar = document.getElementById('loader-progress-bar');
    const loadingScreen = document.getElementById('loading-screen');
    const canvas = document.getElementById('chip-canvas');
    const audioControl = document.getElementById('audio-control');
    const audioText = audioControl ? audioControl.querySelector('.audio-text') : null;

    // HUD 调试节点
    const hudProgress = document.getElementById('hud-progress');
    const hudTargetFrame = document.getElementById('hud-target-frame');
    const hudCurrentFrame = document.getElementById('hud-current-frame');
    const hudFps = document.getElementById('hud-fps');
    const hudActiveLayer = document.getElementById('hud-active-layer');

    // 说明面板
    const panels = {
        intro: document.getElementById('panel-intro'),
        frontend: document.getElementById('panel-frontend'),
        backend: document.getElementById('panel-backend'),
        database: document.getElementById('panel-database'),
        action: document.getElementById('panel-action')
    };

    // 音频对象
    const demoAudio = new Audio('assets/audio/v1.mp3');
    demoAudio.loop = true;
    let fadeOutTimer = null;

    // 状态控制变量
    let scrollProgress = 0; // 当前页面滚动进度 (0.00 - 1.00)
    let currentFrame = 0;   // 映射的虚拟帧 (0 - 224)
    let loadedModel = null; // 加载成功的 3D 模型
    let baseScale = 1.0;    // 自动适配后的基础缩放系数
    let isThreeReady = false;

    // 交互状态联动
    let targetRotationY = 0;
    let targetRotationX = 0;
    let targetScale = 1.0;
    let targetCameraY = 0;
    
    // OrbitControls 交互冷却判定
    let userInteracting = false;
    let interactionTimeout = null;

    // FPS 计算变量
    let lastFrameTime = performance.now();
    let frameTimes = [];

    // 1. 模拟进度条加载动画 (增加极速秒开高保真交互体验)
    let fakeProgress = 0;
    const progressInterval = setInterval(() => {
        if (fakeProgress < 95) {
            fakeProgress += Math.floor(Math.random() * 8) + 2;
            if (fakeProgress > 95) fakeProgress = 95;
            updateLoadingProgress(fakeProgress);
        }
    }, 40);

    function updateLoadingProgress(val) {
        if (progressEl) progressEl.innerText = `${val}%`;
        if (progressBar) progressBar.style.width = `${val}%`;
    }

    // 2. 动态并行/串行加载 Three.js 依赖
    function loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async function loadDependency(name) {
        const lib = LIBS[name];
        try {
            await loadScript(lib.primary);
            console.log(`%c[CDN Success] ${name} 依赖装载成功 (国内高速源)`, "color: #00fff9;");
        } catch (e) {
            console.warn(`[CDN Warning] ${name} 国内源加载失败，正在切回备用国外官方源...`);
            try {
                await loadScript(lib.fallback);
                console.log(`[CDN Success] ${name} 依赖已通过备用源装载`);
            } catch (err) {
                console.error(`[CDN Error] ${name} 所有源均加载失败！`);
                throw err;
            }
        }
    }

    // 3. 初始化加载链
    async function startLoadingChain() {
        try {
            await loadDependency('three');
            await loadDependency('gltf');
            await loadDependency('controls');
            
            // 依赖全部就绪，初始化 3D 视界
            initThreeScene();
        } catch (e) {
            console.error("初始化 3D 依赖失败，请检查网络连接：", e);
            updateLoadingProgress("ERROR");
        }
    }

    // 4. 二进制解码函数：将嵌入式 Base64 转为 ArrayBuffer
    function base64ToArrayBuffer(base64) {
        const base64String = base64.split(',')[1] || base64;
        const binaryString = window.atob(base64String);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    // 5. Three.js 核心初始化与场景构建
    let scene, camera, renderer, controls, particleSystem;

    function initThreeScene() {
        // 让 Canvas 容器变为可点选状态，启用 3D 鼠标拖拽
        if (canvas) {
            canvas.style.pointerEvents = 'auto';
        }

        // 渲染器设置
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;

        // 场景创建
        scene = new THREE.Scene();

        // 相机配置
        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 2, 8);

        // 轨道控制器
        controls = new THREE.OrbitControls(camera, canvas);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        // 关键性能与交互优化：禁用滚轮缩放，防止拦截网页滚动！
        controls.enableZoom = false; 
        controls.maxPolarAngle = Math.PI / 2 + 0.1; // 限制仰角，不可穿入地面
        controls.minDistance = 2;
        controls.maxDistance = 15;

        // 绑定轨道控制器手势，让拖拽和回弹交互自然
        controls.addEventListener('start', () => {
            userInteracting = true;
            if (interactionTimeout) clearTimeout(interactionTimeout);
        });
        controls.addEventListener('end', () => {
            // 用户释放操作后冷却 1.5 秒再平滑切回自动跟随滚动模式
            interactionTimeout = setTimeout(() => {
                userInteracting = false;
            }, 1500);
        });

        // 光源布局
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        // 科技蓝色平行主光
        const mainLight = new THREE.DirectionalLight(0x00fff9, 2.5);
        mainLight.position.set(5, 10, 7);
        scene.add(mainLight);

        // 柔和紫色平行辅光
        const subLight = new THREE.DirectionalLight(0x8b5cf6, 1.5);
        subLight.position.set(-5, -3, -5);
        scene.add(subLight);

        // 6. 添加赛博量子微尘粒子系统
        createQuantumParticles();

        // 7. 解码 Base64 并在内存中无 Fetch 直接解析加载 GLB 3D 模型
        try {
            const buffer = base64ToArrayBuffer(CHIP_MODEL_BASE64);
            const loader = new THREE.GLTFLoader();
            
            loader.parse(buffer, '', (gltf) => {
                const model = gltf.scene;
                
                // 居中与缩放适配算法
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                
                // 归一化中心位置
                model.position.x += (model.position.x - center.x);
                model.position.y += (model.position.y - center.y);
                model.position.z += (model.position.z - center.z);
                
                // 自动缩放模型高度至最优雅的 3.2 单位
                const maxDim = Math.max(size.x, size.y, size.z);
                baseScale = 3.2 / maxDim;
                model.scale.set(baseScale, baseScale, baseScale);
                
                scene.add(model);
                loadedModel = model;
                isThreeReady = true;
                
                // 清理加载定时器并完成进度条
                clearInterval(progressInterval);
                updateLoadingProgress(100);
                
                setTimeout(() => {
                    if (loadingScreen) {
                        loadingScreen.classList.add('hidden');
                    }
                }, 300);
                
                console.log("%c🔥 [3D 芯片实验室] Base64 二进制模型内存解析成功，渲染引擎初始化完毕！", "color: #00fff9; font-weight: bold;");
                
                // 启动渲染大循环
                lastFrameTime = performance.now();
                requestAnimationFrame(renderLoop);
            }, (error) => {
                console.error("3D 模型数据解析错误:", error);
            });
        } catch (e) {
            console.error("Base64 模型解码抛出异常:", e);
        }
    }

    // 8. 创建背景粒子群
    function createQuantumParticles() {
        const particleCount = 200;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 15;     // X 轴
            positions[i + 1] = (Math.random() - 0.5) * 10; // Y 轴
            positions[i + 2] = (Math.random() - 0.5) * 15; // Z 轴
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0x00fff9,
            size: 0.04,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });

        particleSystem = new THREE.Points(geometry, material);
        scene.add(particleSystem);
    }

    // 9. 更新量子粒子位置动效
    function animateParticles(dt) {
        if (!particleSystem) return;
        const positions = particleSystem.geometry.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) {
            positions[i] -= 0.5 * dt; // 粒子缓缓下沉落入黑洞
            if (positions[i] < -5) {
                positions[i] = 5; // 重新投递到顶部循环
            }
        }
        particleSystem.geometry.attributes.position.needsUpdate = true;
    }

    // 10. 全息讲解面板卡片按“虚拟滚动帧”精准调度显隐
    function updatePanelStates(frameIndex) {
        let activeKey = 'intro';
        let layerName = 'CHIP_INTRO';
        let activeColor = 'var(--primary)';

        if (frameIndex >= 0 && frameIndex < 88) {
            activeKey = 'intro';
            layerName = 'CHIP_INTRO';
            activeColor = 'var(--primary)';
        } else if (frameIndex >= 88 && frameIndex < 120) {
            activeKey = 'frontend';
            layerName = 'LAYER_01_FRONTEND';
            activeColor = '#00fff9';
        } else if (frameIndex >= 120 && frameIndex < 155) {
            activeKey = 'backend';
            layerName = 'LAYER_02_BACKEND';
            activeColor = '#8b5cf6';
        } else if (frameIndex >= 155 && frameIndex < 192) {
            activeKey = 'database';
            layerName = 'LAYER_03_DATABASE';
            activeColor = '#f59e0b';
        } else {
            activeKey = 'action';
            layerName = 'SYSTEM_INSTALL_ACTION';
            activeColor = '#ef4444';
        }

        // 遍历更新面板样式
        Object.keys(panels).forEach(key => {
            if (panels[key]) {
                if (key === activeKey) {
                    panels[key].classList.add('active');
                } else {
                    panels[key].classList.remove('active');
                }
            }
        });

        if (hudActiveLayer) {
            hudActiveLayer.innerText = layerName;
            hudActiveLayer.style.color = activeColor;
        }
    }

    // 11. 页面滚动监听核心：将滚动百分比映射为 3D 姿态映射
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        scrollProgress = maxScroll > 0 ? scrollTop / maxScroll : 0;

        // 映射出 0 - 224 的虚拟滚动帧
        currentFrame = Math.round(scrollProgress * 224);

        // 更新 HUD
        if (hudProgress) hudProgress.innerText = `${(scrollProgress * 100).toFixed(2)}%`;
        if (hudTargetFrame) hudTargetFrame.innerText = currentFrame;

        // 根据滚动阶段动态调整 3D 模型的目标姿态
        update3DTargetPose(scrollProgress);
        
        // 瞬间同步讲解面板显隐
        updatePanelStates(currentFrame);
    }, { passive: true });

    // 12. 滚动状态下 3D 姿态映射计算公式
    function update3DTargetPose(progress) {
        // Y 轴自转分量：随页面滚动而徐徐转动
        targetRotationY = progress * Math.PI * 2.5;
        
        // X 轴倾角分量：在不同的段落高度表现不同的展示俯仰角
        if (progress < 0.3) {
            targetRotationX = 0.4;
            targetScale = 1.0;
            targetCameraY = 1.5;
        } else if (progress < 0.6) {
            // 前中层阶段，略微前倾，展示细节
            targetRotationX = 0.8;
            targetScale = 1.25;
            targetCameraY = 0.8;
        } else if (progress < 0.85) {
            // 底层架构，镜头拉远并俯视
            targetRotationX = 0.2;
            targetScale = 1.0;
            targetCameraY = 0.2;
        } else {
            // 终点，合体重组，大尺度旋转并复位
            targetRotationX = 0.4;
            targetScale = 1.1;
            targetCameraY = 1.0;
        }
    }

    // 13. Three.js 60FPS 物理 Lerp 渲染大循环
    function renderLoop() {
        if (!isThreeReady) return;

        const now = performance.now();
        const deltaTime = now - lastFrameTime;
        lastFrameTime = now;

        // 安全限制
        const dt = Math.min(100, deltaTime) / 1000;

        // A. 自更新量子粒子尘埃
        animateParticles(dt);

        // B. 滚动姿态物理阻尼平滑插值 (如果用户当前未用鼠标拖拽交互)
        if (loadedModel && !userInteracting) {
            // Lerp 缓动因子
            const k = 1 - Math.exp(-3.5 * dt);
            
            // 缓缓逼近滚动映射的目标值
            loadedModel.rotation.y += (targetRotationY - loadedModel.rotation.y) * k;
            loadedModel.rotation.x += (targetRotationX - loadedModel.rotation.x) * k;
            
            // 缩放缓动
            const scaleTarget = baseScale * targetScale;
            loadedModel.scale.x += (scaleTarget - loadedModel.scale.x) * k;
            loadedModel.scale.y += (scaleTarget - loadedModel.scale.y) * k;
            loadedModel.scale.z += (scaleTarget - loadedModel.scale.z) * k;

            // 相机高度平滑推进
            camera.position.y += (targetCameraY - camera.position.y) * k;
        } else if (loadedModel && userInteracting) {
            // 鼠标交互中，让模型有一个极其微弱的自晃动呼吸动效，防止死板
            loadedModel.rotation.y += 0.03 * dt;
        }

        // C. 更新调试 HUD 中当前的渲染帧
        if (hudCurrentFrame) {
            hudCurrentFrame.innerText = currentFrame;
        }

        // D. 控制器阻尼回弹
        controls.update();
        renderer.render(scene, camera);

        // E. 帧率测量
        calculateFPS(deltaTime);

        requestAnimationFrame(renderLoop);
    }

    // 14. 降低数字抖动的 FPS 计算器
    function calculateFPS(delta) {
        frameTimes.push(delta);
        if (frameTimes.length > 30) {
            frameTimes.shift();
        }
        const avgDelta = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        const fps = 1000 / avgDelta;
        if (hudFps && Math.random() < 0.1) {
            hudFps.innerText = `${fps.toFixed(1)} FPS`;
        }
    }

    // 15. 窗口自适应缩放
    window.addEventListener('resize', () => {
        if (!isThreeReady) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 16. 全息音效引擎适配
    if (audioControl) {
        audioControl.addEventListener('click', (e) => {
            e.stopPropagation();
            demoAudio.muted = !demoAudio.muted;
            updateAudioControlUI();
        });
        updateAudioControlUI();
    }

    function updateAudioControlUI() {
        if (!audioControl) return;
        if (demoAudio.muted) {
            audioControl.classList.remove('playing');
            audioControl.classList.add('muted');
            if (audioText) audioText.innerText = 'AUDIO OFF';
        } else {
            audioControl.classList.remove('muted');
            if (audioText) audioText.innerText = 'AUDIO ON';
            audioControl.classList.add('playing');
        }
    }

    // 触发音乐在第一次点击屏幕时启动 (防止现代浏览器安全策略阻断)
    document.addEventListener('click', () => {
        if (demoAudio.paused && !demoAudio.muted) {
            demoAudio.play().catch(() => {});
        }
    }, { once: true });

    // 开始动态装载与解析
    startLoadingChain();
});
