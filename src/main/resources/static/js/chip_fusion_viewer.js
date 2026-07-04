document.addEventListener('DOMContentLoaded', () => {
    // 1. 3D 核心依赖本地包及 CDN 容灾降级配置
    const LIBS = {
        three: {
            primary: "js/lib/three_r128.min.js",
            fallback: "https://cdn.bootcdn.net/ajax/libs/three.js/r128/three.min.js"
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

    // 2. DOM 节点引用
    const canvas2d = document.getElementById('chip-canvas');
    const ctx2d = canvas2d ? canvas2d.getContext('2d') : null;
    const canvas3d = document.getElementById('chip-3d-canvas');
    const loadingScreen = document.getElementById('loading-screen');
    const progressEl = document.getElementById('loading-progress');
    const progressBar = document.getElementById('loader-progress-bar');
    const audioControl = document.getElementById('audio-control');
    const audioText = audioControl ? audioControl.querySelector('.audio-text') : null;
    const scrollDownHint = document.getElementById('scroll-down-hint');

    // 3D 苹果级大荧幕 DOM 节点
    const cyberTheater = document.getElementById('cyber-theater-container');
    const appleCaseTitle = document.getElementById('apple-case-title');
    const appleCaseSubtitle = document.getElementById('apple-case-subtitle');
    const casesVideo = document.getElementById('cases-video');
    const isMobileDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // 2.8 异步视频播放排队与状态防抖函数（解决滚动时高频 play/pause 触发的 AbortError 黑屏卡死 Bug）
    function safePlayVideo(video) {
        if (!video) return;
        if (isMobileDevice) {
            // 移动端在解锁后保持背景播放，无需频繁触发 play/pause 以避开浏览器安全限制
            if (video.paused) {
                video.play().catch(() => {});
            }
            return;
        }
        if (video.dataset.playState === 'playing') return;

        video.dataset.playState = 'playing';
        video.play().then(() => {
            if (video.dataset.playState === 'paused') {
                video.pause();
            }
        }).catch(err => {
            console.log("[Video] safePlayVideo promise interrupted:", err.message);
            if (video.dataset.playState === 'playing') {
                setTimeout(() => {
                    if (video.dataset.playState === 'playing' && video.paused) {
                        video.play().catch(() => { });
                    }
                }, 150);
            }
        });
    }

    function safePauseVideo(video) {
        if (!video) return;
        if (isMobileDevice) {
            // 移动端保持后台播放，依靠外层 container 的 CSS 显隐来控制展示
            return;
        }
        if (video.dataset.playState === 'paused') return;

        video.dataset.playState = 'paused';
        video.pause();
    }

    // 2.9 移动端视频加载状态监听与自动播放限制解锁
    if (casesVideo) {
        const setVideoLoaded = () => {
            casesVideo.classList.add('loaded');
            console.log("[Video] First frame loaded, video element visual activated.");
        };
        casesVideo.addEventListener('loadeddata', setVideoLoaded);
        casesVideo.addEventListener('canplay', setVideoLoaded);
        casesVideo.addEventListener('playing', setVideoLoaded);

        // 如果浏览器早已准备好视频，直接激活
        if (casesVideo.readyState >= 2) {
            setVideoLoaded();
        }

        // 解锁移动端静音自动播放限制（触屏/滚动交互时触发一次静默播放解锁）
        const unlockMobileVideo = () => {
            // 解锁成功后直接保持播放状态，不需要暂停它
            casesVideo.play().then(() => {
                console.log("[Video] Mobile autoplay restriction successfully unlocked.");
            }).catch(err => {
                console.log("[Video] Mobile autoplay unlock attempted:", err.message);
            });
            window.removeEventListener('touchstart', unlockMobileVideo);
            window.removeEventListener('mousedown', unlockMobileVideo);
            window.removeEventListener('scroll', unlockMobileVideo);
        };
        window.addEventListener('touchstart', unlockMobileVideo, { passive: true });
        window.addEventListener('mousedown', unlockMobileVideo, { passive: true });
        window.addEventListener('scroll', unlockMobileVideo, { passive: true });

        // 针对切后台、锁屏等场景切回前台后的移动端视频重启容灾
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && isMobileDevice && casesVideo && casesVideo.paused) {
                casesVideo.play().catch(() => {});
            }
        });

        // 每次用户触屏移动端时，若视频因异常暂停，则静默尝试重新播放
        window.addEventListener('touchstart', () => {
            if (isMobileDevice && casesVideo && casesVideo.paused) {
                casesVideo.play().catch(() => {});
            }
        }, { passive: true });
    }


    // HUD 调试节点
    const hudProgress = document.getElementById('hud-progress');
    const hudTargetFrame = document.getElementById('hud-target-frame');
    const hudCurrentFrame = document.getElementById('hud-current-frame');
    const hudFps = document.getElementById('hud-fps');
    const hudActiveLayer = document.getElementById('hud-active-layer');

    // 全息说明卡片面板
    const panels = {
        intro: document.getElementById('panel-intro'),
        frontend: document.getElementById('panel-frontend'),
        backend: document.getElementById('panel-backend'),
        database: document.getElementById('panel-database'),
        action: document.getElementById('panel-action'),
        action3d: document.getElementById('panel-action-3d')
    };

    // 3. 基础参数与状态配置
    const WEBP_FRAMES_COUNT = 225; // 2D WebP 序列帧图片总数 (0-224)
    const TOTAL_FRAMES = 320;      // 融合后页面总虚拟滚动帧数 (0-319)
    const images = []; // WebP 序列帧缓存
    let loadedImagesCount = 0;
    let isLoaded = false; // 是否整体加载完毕

    // 播放/滚动逻辑控制变量
    let currentFrame = 0;
    let targetFrame = 0;
    let scrollProgress = 0; // 滚动百分比 (0.00 - 1.00)
    let lastFrameTime = performance.now();
    let frameTimes = [];

    // 自动播放分段速度配置 (对应原来的演示播放倍率，消除设备帧率差异)
    const AUTO_PLAY_SPEEDS = [
        { startFrame: 0, endFrame: 87, speed: 30 },
        { startFrame: 88, endFrame: 119, speed: 28 },
        { startFrame: 120, endFrame: 154, speed: 28 },
        { startFrame: 155, endFrame: 191, speed: 28 },
        { startFrame: 192, endFrame: 224, speed: 30 },
        { startFrame: 225, endFrame: 319, speed: 20 } // 3D 接力段较平缓，营造天降阻尼与案例展示穿梭感
    ];

    let isAutoPlaying = false;
    let isProgramScroll = false;
    let isRewinding = false;
    const REWIND_SPEED = 28;
    let isWaitingAtEnd = false;
    let endWaitTimer = null;
    const END_WAIT_DELAY = 10000; // 终点停留10秒

    // 音频管理
    const demoAudio = new Audio('assets/audio/v1.mp3');
    demoAudio.loop = true;
    let fadeOutTimer = null;

    // Three.js 状态联动变量
    let isThreeReady = false;
    let scene, camera, renderer, controls, particleSystem;
    let loadedModel = null;
    let baseScale = 1.0;

    // 3D 滚动姿态 Lerp 目标
    let targetRotationY = 0;
    let targetRotationX = 0;
    let targetScale = 1.0;
    let targetCameraY = 1.5;
    let targetModelY = 4.0; // 芯片模型 Y 轴，用于控制升降降临效果
    let targetModelX = 0.0; // 新增：芯片模型 X 轴左右横移
    let targetModelZ = 0.0; // 新增：芯片模型 Z 轴前后远近位移

    // 轨道控制器手势阻断判定
    let userInteracting = false;
    let interactionTimeout = null;

    // 4. 自适应尺寸同步
    function resizeCanvas() {
        if (canvas2d) {
            canvas2d.width = window.innerWidth;
            canvas2d.height = window.innerHeight;
            if (isLoaded && currentFrame < 192) {
                draw2DFrame(Math.round(currentFrame));
            }
        }
        if (isThreeReady && renderer && camera) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // 5. 并行异步预加载：WebP 序列帧 + Three.js 本地/在线依赖
    async function initPreloader() {
        try {
            // 依赖链并行加载
            const dependencyPromise = (async () => {
                await loadDependency('three');
                await loadDependency('gltf');
                await loadDependency('controls');
            })();

            // 225帧图片异步加载
            const imagesPromise = new Promise((resolve) => {
                for (let i = 0; i < WEBP_FRAMES_COUNT; i++) {
                    const img = new Image();
                    const frameStr = String(i).padStart(3, '0');
                    img.src = `assets/xinpian/frame_${frameStr}_delay-0.041s.webp`;

                    img.onload = () => {
                        loadedImagesCount++;
                        checkOverallProgress(resolve);
                    };
                    img.onerror = () => {
                        console.error(`⚠️ [序列帧加载失败] 无法加载帧：assets/xinpian/frame_${frameStr}_delay-0.041s.webp`);
                        loadedImagesCount++;
                        checkOverallProgress(resolve);
                    };
                    images.push(img);
                }
            });

            // 等待图片和 3D 引擎全部就绪
            await Promise.all([dependencyPromise, imagesPromise]);

            // 初始化 Three.js 场景并解析 3D 模型
            initThreeScene();
        } catch (e) {
            console.error("加载核心依赖或序列帧遇到致命错误，初始化中止：", e);
            if (typeof window.triggerLoaderFallback === 'function') {
                window.triggerLoaderFallback("ERROR");
            }
        }
    }

    function checkOverallProgress(resolve) {
        // 图片权重占 70%，3D 引擎加载完毕占 30% 递增
        const progressPercent = Math.min(95, Math.floor((loadedImagesCount / WEBP_FRAMES_COUNT) * 95));
        if (progressEl) progressEl.innerText = `${progressPercent}%`;
        if (progressBar) progressBar.style.width = `${progressPercent}%`;

        if (loadedImagesCount === WEBP_FRAMES_COUNT) {
            resolve();
        }
    }

    // 动态脚本引入核心
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
            console.log(`%c[Dependency Success] ${name} 装载成功 (本地包)`, "color: #00fff9;");
        } catch (e) {
            console.warn(`[Dependency Warning] ${name} 本地包加载失败，正尝试 CDN 镜像源...`);
            try {
                await loadScript(lib.fallback);
                console.log(`[Dependency Success] ${name} 已通过 CDN 镜像源成功恢复`);
            } catch (err) {
                console.error(`[Dependency Error] ${name} 所有源均加载失败！`);
                throw err;
            }
        }
    }

    // 6. 二进制解码：内存解密 Base64 避开 CORS 跨域限制
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

    // 7. Three.js 场景构建与 3D 模型内存加载
    function initThreeScene() {
        if (!canvas3d) return;

        // WebGL 渲染器
        renderer = new THREE.WebGLRenderer({
            canvas: canvas3d,
            antialias: true,
            alpha: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.25;

        // 场景创建
        scene = new THREE.Scene();

        // 摄像机
        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 1.5, 8);

        // 轨道控制器 (OrbitControls)
        controls = new THREE.OrbitControls(camera, canvas3d);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = false; // 禁用缩放以透传滚轮事件，防网页滚动拦截！
        controls.maxPolarAngle = Math.PI / 2 + 0.15; // 不允许翻入地表下
        controls.minDistance = 2;
        controls.maxDistance = 15;

        // 轨道控制器拖拽手势检测
        controls.addEventListener('start', () => {
            userInteracting = true;
            if (interactionTimeout) clearTimeout(interactionTimeout);
        });
        controls.addEventListener('end', () => {
            interactionTimeout = setTimeout(() => {
                userInteracting = false;
            }, 1200); // 释放手势 1.2 秒后回归网页滚动 Lerp 控制
        });

        // 场景光源设计
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
        scene.add(ambientLight);

        const primaryLight = new THREE.DirectionalLight(0x00fff9, 2.5);
        primaryLight.position.set(5, 12, 7);
        scene.add(primaryLight);

        const secondaryLight = new THREE.DirectionalLight(0x8b5cf6, 1.5);
        secondaryLight.position.set(-6, -3, -5);
        scene.add(secondaryLight);

        // 量子粒子系统
        createQuantumParticles();

        // 解析并解析内存中的 13MB 原始模型
        try {
            const buffer = base64ToArrayBuffer(CHIP_MODEL_BASE64);
            const loader = new THREE.GLTFLoader();

            loader.parse(buffer, '', (gltf) => {
                const model = gltf.scene;

                // 计算模型边界盒以自适应居中与缩放
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());

                model.position.x += (model.position.x - center.x);
                model.position.y += (model.position.y - center.y);
                model.position.z += (model.position.z - center.z);

                const maxDim = Math.max(size.x, size.y, size.z);
                baseScale = 3.2 / maxDim; // 缩放到优雅高度
                model.scale.set(baseScale, baseScale, baseScale);

                scene.add(model);
                loadedModel = model;

                // 强制将芯片 Y 坐标挂载到高处，准备空降
                loadedModel.position.y = targetModelY;

                // 全面加载结束！
                isLoaded = true;
                isThreeReady = true;
                window.isChip3DReady = true;
                if (typeof window.clearWatchdog === 'function') {
                    window.clearWatchdog(); // 成功装载，清除行内超时守护
                }

                if (progressEl) progressEl.innerText = "100%";
                if (progressBar) progressBar.style.width = "100%";

                setTimeout(() => {
                    if (loadingScreen) {
                        loadingScreen.classList.add('hidden');
                    }
                    // 3D核心与225帧图全部就位后，后置触发大荧幕视频的静默缓冲，防止抢夺首屏并发网络通道
                    if (casesVideo) {
                        casesVideo.preload = 'auto';
                        casesVideo.load();
                        console.log("%c🎬 [Lazy Load Video] Video stream buffered silently in background.", "color: #3b82f6;");
                    }
                }, 300);

                console.log("%c🔥 [芯片融合空间] 双舞台控制器就绪，开始渲染循环！", "color: #a855f7; font-weight: bold;");

                // 初始化首帧
                updateTargetFrame();
                currentFrame = targetFrame;
                draw2DFrame(Math.round(currentFrame));

                // 启动 60FPS 渲染大循环
                lastFrameTime = performance.now();
                requestAnimationFrame(renderLoop);
            }, (error) => {
                console.error("Three.js 内存解析模型失败：", error);
                if (typeof window.triggerLoaderFallback === 'function') {
                    window.triggerLoaderFallback("ERROR");
                }
            });
        } catch (e) {
            console.error("模型解码异常：", e);
            if (typeof window.triggerLoaderFallback === 'function') {
                window.triggerLoaderFallback("ERROR");
            }
        }
    }

    // 8. 赛博量子尘埃系统
    function createQuantumParticles() {
        const particleCount = 180;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 15;     // X
            positions[i + 1] = (Math.random() - 0.5) * 10; // Y
            positions[i + 2] = (Math.random() - 0.5) * 15; // Z
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xef4444, // 量子红色调微尘，贴合最后的重组风格
            size: 0.045,
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending
        });

        particleSystem = new THREE.Points(geometry, material);
        scene.add(particleSystem);
    }

    function animateParticles(dt) {
        if (!particleSystem) return;
        const positions = particleSystem.geometry.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) {
            positions[i] -= 0.6 * dt; // 粒子微沉
            if (positions[i] < -5) {
                positions[i] = 5;
            }
        }
        particleSystem.geometry.attributes.position.needsUpdate = true;
    }

    // 9. 2D WebP 序列帧绘制方法 (带有 Cover 比例自适应缩放)
    function draw2DFrame(index) {
        // 安全防御：在3D后半段绘制锁定在最后一帧 WebP 上
        const safeIndex = Math.min(WEBP_FRAMES_COUNT - 1, Math.max(0, Math.round(index)));
        const img = images[safeIndex];
        if (!img || !img.complete || !ctx2d) return;

        ctx2d.clearRect(0, 0, canvas2d.width, canvas2d.height);

        const imgRatio = img.width / img.height;
        const canvasRatio = canvas2d.width / canvas2d.height;
        let drawW, drawH, drawX, drawY;

        if (canvasRatio > imgRatio) {
            drawW = canvas2d.width;
            drawH = canvas2d.width / imgRatio;
            drawX = 0;
            drawY = (canvas2d.height - drawH) / 2;
        } else {
            drawH = canvas2d.height;
            drawW = canvas2d.height * imgRatio;
            drawX = (canvas2d.width - drawW) / 2;
            drawY = 0;
        }

        ctx2d.drawImage(img, drawX, drawY, drawW, drawH);
    }

    // 10. 核心调度：基于页面滚动高度计算 2D / 3D 双画布物理淡入淡出及天降阻尼
    function updateStageTransition(frameIndex) {
        if (!canvas2d || !canvas3d) return;

        const bgEl = document.querySelector('.cyber-background');

        // 极客下滑指示器：仅在 2D 芯片合体完毕（192-224帧）时显现，进入 3D 阶段后淡出隐藏
        if (scrollDownHint) {
            if (frameIndex >= 192 && frameIndex < 225) {
                scrollDownHint.classList.add('active');
            } else {
                scrollDownHint.classList.remove('active');
            }
        }

        // 接力阈值修改：2D WebP（0 - 224帧）全部播放完毕后，在 225 - 319 虚拟帧接力切换 3D 并控制案例大荧幕
        if (frameIndex < 225) {
            // A. 纯 2D Canvas 展示阶段
            canvas2d.style.display = 'block';
            canvas2d.style.opacity = '1';

            canvas3d.style.opacity = '0';
            canvas3d.style.pointerEvents = 'none';
            canvas3d.style.transform = 'translateY(-80px)'; // 3D 芯片上提隐藏

            // 三维模型及运动姿态复位
            targetModelX = 0.0;
            targetModelY = 4.0;
            targetModelZ = 0.0;
            targetScale = 0.8;
            targetCameraY = 1.5;

            // 隐藏苹果大荧幕与停止视频
            if (cyberTheater) cyberTheater.classList.remove('active');
            if (casesVideo) {
                casesVideo.pause();
            }

            // 背景复位
            if (bgEl) bgEl.classList.remove('state-case-study');
        } else {
            // B. 2D/3D 无缝淡入淡出及天降接力阶段
            // 修改淡入淡出比例计算：由于 3D 被延长到 320 帧，接力只在 225 - 244 帧（亮相期）进行以保平滑
            const transitionEndFrame = 244;
            const alpha = frameIndex >= transitionEndFrame ? 1.0 : (frameIndex - 225) / (transitionEndFrame - 225);

            // 2D 渐隐，在 100% 后直接 display: none 节约重绘开销
            canvas2d.style.opacity = (1 - alpha).toFixed(2);
            if (alpha >= 0.98) {
                canvas2d.style.display = 'none';
            } else {
                canvas2d.style.display = 'block';
            }

            // 3D 渐显并天降就位
            canvas3d.style.opacity = alpha.toFixed(2);
            const translateY = -80 * (1 - alpha);
            canvas3d.style.transform = `translateY(${translateY}px)`; // CSS 姿态同步移动

            // ==========================================
            // 3D 阶段分段穿梭轨迹与大荧幕状态机
            // ==========================================
            if (frameIndex >= 225 && frameIndex < 245) {
                // B1. 3D 芯片降落落地段 (225 - 244)
                targetModelX = 0.0;
                targetModelY = 0.0;
                targetModelZ = 0.0;
                targetScale = 1.0;
                targetCameraY = 1.0;
                targetRotationX = 0.45;

                // 隐藏大荧幕
                if (cyberTheater) cyberTheater.classList.remove('active');
                safePauseVideo(casesVideo);
                if (bgEl) bgEl.classList.remove('state-case-study');
            }
            else if (frameIndex >= 245 && frameIndex < 280) {
                // B2. 官网大荧幕展示段 (245 - 279) —— 飞入右上方，侧偏慢转
                targetModelX = 1.8;
                targetModelY = 1.2;
                targetModelZ = -3.5;
                targetScale = 0.75;
                targetCameraY = 1.0;
                targetRotationX = 0.6;
                // 自转增量
                targetRotationY = (frameIndex - 245) * 0.022;

                // 淡入大荧幕与控制文字
                if (cyberTheater) cyberTheater.classList.add('active');
                if (appleCaseTitle) appleCaseTitle.innerText = "开发官网。";
                if (appleCaseSubtitle) appleCaseSubtitle.innerText = "极速响应，一镜到底。";

                safePlayVideo(casesVideo);

                // 注入背景降噪类
                if (bgEl) bgEl.classList.add('state-case-study');
            }
            else if (frameIndex >= 280 && frameIndex < 315) {
                // B3. 小程序大荧幕展示段 (280 - 314) —— 划抛物线下弧线穿梭至左侧
                targetModelX = -1.8;
                targetModelY = 0.7;
                targetModelZ = -3.0;
                targetScale = 0.75;
                targetCameraY = 1.0;
                targetRotationX = 0.5;
                // 持续慢转
                targetRotationY = (frameIndex - 280) * 0.022;

                // 保持大荧幕，切换苹果风大字
                if (cyberTheater) cyberTheater.classList.add('active');
                if (appleCaseTitle) appleCaseTitle.innerText = "微信小程序。";
                if (appleCaseSubtitle) appleCaseSubtitle.innerText = "极致加载，安全稳健。";

                safePlayVideo(casesVideo);

                // 保持背景降噪
                if (bgEl) bgEl.classList.add('state-case-study');
            }
            else {
                // B4. 最终就绪段 (315 - 320) —— 芯片冲向前台归位，大荧幕淡出，激活 3D 自由把玩
                targetModelX = 0.0;
                targetModelY = 0.0;
                targetModelZ = 0.0;
                targetScale = 1.0;
                targetCameraY = 1.0;
                targetRotationX = 0.45;

                // 大荧幕淡出，视频重置
                if (cyberTheater) cyberTheater.classList.remove('active');
                safePauseVideo(casesVideo);

                // 背景恢复，网格显现
                if (bgEl) bgEl.classList.remove('state-case-study');
            }

            // 在最后一阶段 (>= 315) 且没有在正反向倒带时，激活 3D 自由交互，其余时刻阻断手势以透传滚动
            if (frameIndex >= 315 && !isRewinding) {
                canvas3d.style.pointerEvents = 'auto';
            } else {
                canvas3d.style.pointerEvents = 'none';
            }
        }
    }

    // 11. 卡片文字讲解面板按帧精准滑入滑出
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
        } else if (frameIndex >= 192 && frameIndex < 225) {
            activeKey = 'action';
            layerName = 'CHIP_REASSEMBLY';
            activeColor = '#ef4444';
        } else if (frameIndex >= 225 && frameIndex < 315) {
            activeKey = 'none'; // 3D 大荧幕展示期间不显示侧边面板
            layerName = 'CASE_STUDIES';
            activeColor = '#ffffff';
        } else {
            activeKey = 'action3d'; // 最终 3D 结尾专属的苹果风“立即购买”面板
            layerName = 'HIRE_FULLSTACK';
            activeColor = '#ffffff';
        }

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

    // 12. 页面滚动事件绑定
    function updateTargetFrame() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        scrollProgress = maxScroll > 0 ? scrollTop / maxScroll : 0;

        // 映射出目标帧 (0 - 224)
        targetFrame = scrollProgress * (TOTAL_FRAMES - 1);

        if (hudProgress) hudProgress.innerText = `${(scrollProgress * 100).toFixed(2)}%`;
        if (hudTargetFrame) hudTargetFrame.innerText = Math.round(targetFrame);

        // 实时映射 3D 芯片的目标姿态
        update3DTargetPose(scrollProgress);
    }

    window.addEventListener('scroll', () => {
        if (isLoaded) {
            updateTargetFrame();
        }
    }, { passive: true });

    // 13. 滚动进度下 3D 芯片自旋转及缩放映射公式
    function update3DTargetPose(progress) {
        // 3D 轨迹调度已统一由 updateStageTransition 帧驱动，此处置空以避免多重状态源冲突
    }

    // 14. 自动播放演示控制逻辑 (与双 Canvas 接力 100% 融合)
    const btnAutoDemo = document.getElementById('btn-auto-demo');
    const playIcon = document.getElementById('play-icon');
    const playText = document.getElementById('play-text');

    function toggleAutoPlay() {
        if (isAutoPlaying) {
            pauseAutoPlay();
        } else {
            startAutoPlay();
        }
    }

    function startAutoPlay() {
        if (!isLoaded) return;
        isAutoPlaying = true;
        if (playIcon) playIcon.className = 'ri-pause-circle-line';
        if (playText) playText.innerText = 'PLAYING DEMO // 点击暂停演示';

        if (fadeOutTimer) {
            clearInterval(fadeOutTimer);
            fadeOutTimer = null;
        }
        demoAudio.volume = 1.0;

        // 若当前处于 3D 区域 (>= 224)，点击开启 Demo 时自动将滚动复位至顶部重新开始 2D 演示
        if (currentFrame >= WEBP_FRAMES_COUNT - 1) {
            currentFrame = 0;
            targetFrame = 0;
            demoAudio.currentTime = 0;
            scrollToFrame(0);
        } else if (currentFrame < 1) {
            demoAudio.currentTime = 0;
        }
        demoAudio.play().then(() => {
            updateAudioControlUI();
        }).catch(err => {
            console.warn("音频启动被浏览器阻挡:", err);
            updateAudioControlUI();
        });
        console.log("🔋 [Auto Play] 演示开始。");
    }

    function pauseAutoPlay() {
        isAutoPlaying = false;
        if (playIcon) playIcon.className = 'ri-play-circle-line';
        if (playText) playText.innerText = 'CLICK TO PLAY DEMO // 点击开启演示';
        if (endWaitTimer) {
            clearTimeout(endWaitTimer);
            endWaitTimer = null;
        }
        isWaitingAtEnd = false;
        isRewinding = false;

        if (fadeOutTimer) {
            clearInterval(fadeOutTimer);
            fadeOutTimer = null;
        }
        demoAudio.pause();
        demoAudio.volume = 1.0;
        updateAudioControlUI();
        console.log("🔌 [Auto Play] 演示暂停。");
    }

    function fadeOutAudio(durationMs) {
        if (fadeOutTimer) clearInterval(fadeOutTimer);
        const originalVolume = 1.0;
        const steps = 30;
        const stepTime = durationMs / steps;
        let currentStep = 0;

        fadeOutTimer = setInterval(() => {
            currentStep++;
            const nextVolume = Math.max(0, originalVolume * (1 - currentStep / steps));
            demoAudio.volume = nextVolume;
            if (currentStep >= steps) {
                clearInterval(fadeOutTimer);
                fadeOutTimer = null;
                demoAudio.pause();
                demoAudio.volume = originalVolume;
            }
        }, stepTime);
    }

    function getAutoPlaySpeed(frame) {
        for (const segment of AUTO_PLAY_SPEEDS) {
            if (frame >= segment.startFrame && frame <= segment.endFrame) {
                return segment.speed;
            }
        }
        return 28;
    }

    // 交互防死锁刹车系统
    window.addEventListener('wheel', () => { if (isAutoPlaying) pauseAutoPlay(); }, { passive: true });
    window.addEventListener('touchmove', () => { if (isAutoPlaying) pauseAutoPlay(); }, { passive: true });
    window.addEventListener('keydown', (e) => {
        const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Space', 'Home', 'End'];
        if (isAutoPlaying && scrollKeys.includes(e.code)) {
            pauseAutoPlay();
        }
    });

    if (btnAutoDemo) {
        btnAutoDemo.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleAutoPlay();
        });
    }

    // 全局点击点击背景均可启闭自动演示 (防拖拽交互及误触导致自动演示复位)
    document.addEventListener('click', (e) => {
        const isInteractiveBtn = e.target.closest('#btn-auto-demo') ||
            e.target.closest('.btn-action-buy') ||
            e.target.closest('.btn-return') ||
            e.target.closest('#audio-control') ||
            e.target.closest('#chip-3d-canvas');
        if (isInteractiveBtn) return; // 点击了交互按钮或3D画布，直接忽略

        // 3D 章节防穿透气囊：若当前处于 3D 阶段 (>= 224 帧)，点击任何背景均不响应自动播放，彻底杜绝拖拽手势甩出画布误触 Demo
        if (currentFrame >= WEBP_FRAMES_COUNT - 1) {
            return;
        }

        if (isLoaded) {
            toggleAutoPlay();
        }
    });

    // 15. 融合后 60FPS 渲染大循环 (Lerp 姿态与接力切换)
    function renderLoop() {
        if (!isLoaded) return;

        const now = performance.now();
        const deltaTime = now - lastFrameTime;
        lastFrameTime = now;

        const dt = Math.min(100, deltaTime) / 1000;

        // 3D 专属静音防护：只要当前帧处于 3D 阶段且音乐仍在播，自动触发 BGM 渐隐淡出，防止音乐污染 3D 空间
        if (currentFrame >= WEBP_FRAMES_COUNT - 1 && !demoAudio.paused && !fadeOutTimer) {
            fadeOutAudio(1000);
        }

        // A. 自动播放与滚动高度驱动
        if (isAutoPlaying) {
            if (isWaitingAtEnd) {
                // 终点等待
            } else if (isRewinding) {
                // 倒带回滚
                if (targetFrame <= 0) {
                    if (currentFrame < 0.5) {
                        isRewinding = false;
                        if (playText) playText.innerText = 'PLAYING DEMO // 点击暂停演示';
                        demoAudio.currentTime = 0;
                        demoAudio.volume = 1.0;
                        demoAudio.play().then(() => updateAudioControlUI()).catch(() => { });
                    }
                } else {
                    targetFrame = Math.max(0, targetFrame - REWIND_SPEED * dt);
                    scrollToFrame(targetFrame);
                }
            } else {
                // 正向播放：最大自动播放限制在 WebP 重组完毕处 (224 帧)
                const speed = getAutoPlaySpeed(currentFrame);
                if (targetFrame >= WEBP_FRAMES_COUNT - 1) {
                    // 触达 2D 终点，停留10秒并优雅渐隐音乐
                    isWaitingAtEnd = true;
                    if (playText) playText.innerText = 'WAITING // 停留 10 秒后自动回溯';
                    fadeOutAudio(1500);
                    updateAudioControlUI();

                    endWaitTimer = setTimeout(() => {
                        isWaitingAtEnd = false;
                        isRewinding = true;
                        if (playText) playText.innerText = 'REWINDING // 自动回溯中...';
                        endWaitTimer = null;
                    }, END_WAIT_DELAY);
                } else {
                    targetFrame = Math.min(WEBP_FRAMES_COUNT - 1, targetFrame + speed * dt);
                    scrollToFrame(targetFrame);
                }
            }
        }

        // B. 虚拟帧阻尼滑行 (Lerp 算法，k=3.5，保证正反放和物理滑行均丝滑)
        const diff = targetFrame - currentFrame;
        const factor = 1 - Math.exp(-4.5 * dt);

        if (Math.abs(diff) > 0.01) {
            currentFrame += diff * factor;
        } else {
            currentFrame = targetFrame;
        }

        const currentRoundedFrame = Math.round(currentFrame);

        // C. 更新 2D WebP 画布绘制 (仅在需要展示 2D 的帧数区间，由 192 调大至 225 帧)
        if (currentRoundedFrame < 225) {
            draw2DFrame(currentRoundedFrame);
        }

        // D. 核心接力调度：控制双 Canvas 显隐、透明度、CSS 位移与 pointerEvents
        updateStageTransition(currentRoundedFrame);

        // E. 3D 芯片位置与姿态的平滑阻尼插值 (仅在 3D Canvas 展现且用户没有操作 OrbitControls 时)
        if (isThreeReady && loadedModel) {
            animateParticles(dt);

            if (!userInteracting) {
                const k = 1 - Math.exp(-3.5 * dt);

                // 模型旋转 Lerp 逼近
                loadedModel.rotation.y += (targetRotationY - loadedModel.rotation.y) * k;
                loadedModel.rotation.x += (targetRotationX - loadedModel.rotation.x) * k;

                // 模型缩放 Lerp 逼近
                const scaleTarget = baseScale * targetScale;
                loadedModel.scale.x += (scaleTarget - loadedModel.scale.x) * k;
                loadedModel.scale.y += (scaleTarget - loadedModel.scale.y) * k;
                loadedModel.scale.z += (scaleTarget - loadedModel.scale.z) * k;

                // 3D 坐标 X, Y, Z 轴三维平滑阻尼 Lerp (配合新路径位移)
                loadedModel.position.x += (targetModelX - loadedModel.position.x) * k;
                loadedModel.position.y += (targetModelY - loadedModel.position.y) * k;
                loadedModel.position.z += (targetModelZ - loadedModel.position.z) * k;

                // 摄像机高度 Lerp 变化
                camera.position.y += (targetCameraY - camera.position.y) * k;
            } else {
                // 鼠标交互状态下，芯片模型产生极其细微的自旋转呼吸动效，体现生命力
                loadedModel.rotation.y += 0.025 * dt;
            }

            // 更新轨道控制器 damping 并渲染
            controls.update();
            renderer.render(scene, camera);
        }

        // F. 精准刷新全息说明面板卡片显隐
        updatePanelStates(currentRoundedFrame);

        // HUD 调试面板渲染
        if (hudCurrentFrame) {
            hudCurrentFrame.innerText = currentRoundedFrame;
        }
        calculateFPS(deltaTime);

        requestAnimationFrame(renderLoop);
    }

    function scrollToFrame(frameIdx) {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        if (maxScroll > 0) {
            const progress = frameIdx / (TOTAL_FRAMES - 1);
            isProgramScroll = true;
            window.scrollTo(0, progress * maxScroll);
            isProgramScroll = false;
        }
    }

    // 16. FPS 计算器与降低数字抖动
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

    // 17. 右下角极简赛博音频控制器 UI
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
            if (isAutoPlaying && !isRewinding && !isWaitingAtEnd) {
                audioControl.classList.add('playing');
            } else {
                audioControl.classList.remove('playing');
            }
        }
    }

    // 首次点击任意位置激活音频播放（解禁浏览器安全政策）
    document.addEventListener('click', () => {
        if (demoAudio.paused && !demoAudio.muted) {
            demoAudio.play().catch(() => { });
        }
    }, { once: true });

    // 18. 启动并行依赖与序列帧加载
    initPreloader();
});
