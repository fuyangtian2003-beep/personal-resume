document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('chip-canvas');
    const ctx = canvas.getContext('2d');
    const loadingScreen = document.getElementById('loading-screen');

    // 初始化背景/讲解音频
    const demoAudio = new Audio('assets/audio/v1.mp3');
    demoAudio.loop = true; // 开启原生循环播放，保障二次播放的健壮性
    let fadeOutTimer = null; // 音频淡出定时器
    const progressEl = document.getElementById('loading-progress');
    const progressBar = document.getElementById('loader-progress-bar');
    const audioControl = document.getElementById('audio-control');
    const audioText = audioControl ? audioControl.querySelector('.audio-text') : null;

    // HUD 节点
    const hudProgress = document.getElementById('hud-progress');
    const hudTargetFrame = document.getElementById('hud-target-frame');
    const hudCurrentFrame = document.getElementById('hud-current-frame');
    const hudFps = document.getElementById('hud-fps');
    const hudActiveLayer = document.getElementById('hud-active-layer');

    // 固定定位面板集合
    const panels = {
        intro: document.getElementById('panel-intro'),
        frontend: document.getElementById('panel-frontend'),
        backend: document.getElementById('panel-backend'),
        database: document.getElementById('panel-database'),
        action: document.getElementById('panel-action')
    };

    const TOTAL_FRAMES = 225;
    const images = [];
    let loadedCount = 0;

    // 渲染状态
    let isLoaded = false;
    let currentFrame = 0;
    let targetFrame = 0;
    let lastFrameTime = performance.now();
    let frameTimes = [];

    // 自动播放分段速度配置 (基于当前渲染帧号，单位：帧/秒，消除设备高低刷影响)
    const AUTO_PLAY_SPEEDS = [
        { startFrame: 0, endFrame: 87, speed: 30 },      // 介绍阶段：每秒播放 21 帧 (对应原 0.35 速度)
        { startFrame: 88, endFrame: 119, speed: 28 },     // 前端阶段：每秒播放 12 帧 (对应原 0.20 速度)
        { startFrame: 120, endFrame: 154, speed: 28 },    // 后端阶段：每秒播放 12 帧 (对应原 0.20 速度)
        { startFrame: 155, endFrame: 191, speed: 28 },    // 数据库阶段：每秒播放 12 帧 (对应原 0.20 速度)
        { startFrame: 192, endFrame: 224, speed: 30 }     // 终点阶段：每秒播放 21 帧 (对应原 0.35 速度)
    ];

    // 演示播放控制变量
    let isAutoPlaying = false; // 是否处于自动播放状态
    let isProgramScroll = false; // 标志位：区分是由自动播放还是用户手动触发的滚动
    let isRewinding = false; // 是否处于倒带状态
    const REWIND_SPEED = 28; // 倒带速度 (每秒退回 112 帧，224帧全程约 2.0 秒，匀速)
    let isWaitingAtEnd = false; // 是否处于终点停留等待状态
    let endWaitTimer = null; // 终点停留定时器
    const END_WAIT_DELAY = 10000; // 终点停留延迟 (10秒)

    // 演示按钮节点
    const btnAutoDemo = document.getElementById('btn-auto-demo');
    const playIcon = document.getElementById('play-icon');
    const playText = document.getElementById('play-text');

    // 自适应调整画布大小
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // 缩放后立即重绘当前帧
        if (isLoaded) {
            drawFrame(Math.round(currentFrame));
        }
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // 1. 预加载 225 帧 WebP 图集
    function preloadImages() {
        for (let i = 0; i < TOTAL_FRAMES; i++) {
            const img = new Image();
            const frameStr = String(i).padStart(3, '0');
            // 拼接文件名：如 frame_000_delay-0.041s.webp
            img.src = `assets/xinpian/frame_${frameStr}_delay-0.041s.webp`;

            img.onload = () => {
                loadedCount++;
                const progressPercent = Math.floor((loadedCount / TOTAL_FRAMES) * 100);
                progressEl.innerText = `${progressPercent}%`;
                if (progressBar) {
                    progressBar.style.width = `${progressPercent}%`;
                }

                if (loadedCount === TOTAL_FRAMES) {
                    onAllImagesLoaded();
                }
            };

            img.onerror = () => {
                console.error(`⚠️ [序列帧加载失败] 无法加载帧：assets/xinpian/frame_${frameStr}_delay-0.041s.webp`);
                loadedCount++;
                const progressPercent = Math.floor((loadedCount / TOTAL_FRAMES) * 100);
                if (progressBar) {
                    progressBar.style.width = `${progressPercent}%`;
                }
                if (loadedCount === TOTAL_FRAMES) {
                    onAllImagesLoaded();
                }
            };

            images.push(img);
        }
    }

    // 2. 加载完成后的回调
    function onAllImagesLoaded() {
        isLoaded = true;
        loadingScreen.classList.add('hidden');
        console.log("%c🔥 [芯片视觉实验室] 225 帧 WebP 序列预加载成功，一镜到底引擎就绪！", "color: #00fff9; font-weight: bold;");

        // 触发第一次更新
        updateTargetFrame();
        currentFrame = targetFrame; // 首帧直接定位
        drawFrame(Math.round(currentFrame));

        // 启动帧循环
        requestAnimationFrame(renderLoop);
    }

    // 3. 绘制单帧图片（Cover 比例铺满自适应）
    function drawFrame(index) {
        const img = images[index];
        if (!img || !img.complete) return;

        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 计算 cover 比例
        const imgRatio = img.width / img.height;
        const canvasRatio = canvas.width / canvas.height;

        let drawW, drawH, drawX, drawY;

        if (canvasRatio > imgRatio) {
            // 视口过宽 -> 宽度撑满，高度溢出裁剪
            drawW = canvas.width;
            drawH = canvas.width / imgRatio;
            drawX = 0;
            drawY = (canvas.height - drawH) / 2;
        } else {
            // 视口过窄 -> 高度撑满，宽度溢出裁剪
            drawH = canvas.height;
            drawW = canvas.height * imgRatio;
            drawX = (canvas.width - drawW) / 2;
            drawY = 0;
        }

        // 绘制到 Canvas
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }

    // 4. 更新目标帧（基于当前滚动高度）
    function updateTargetFrame() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

        // 映射滚动进度 0% - 100%
        const progress = maxScroll > 0 ? scrollTop / maxScroll : 0;

        // 映射到帧数索引 0 到 224
        targetFrame = progress * (TOTAL_FRAMES - 1);

        // 更新调试面板 HUD
        hudProgress.innerText = `${(progress * 100).toFixed(2)}%`;
        hudTargetFrame.innerText = Math.round(targetFrame);
    }

    // 自动播放速度寻找函数
    function getAutoPlaySpeed(frame) {
        for (const segment of AUTO_PLAY_SPEEDS) {
            if (frame >= segment.startFrame && frame <= segment.endFrame) {
                return segment.speed;
            }
        }
        return 0.2; // 默认防御速度
    }

    // 切换播放状态
    function toggleAutoPlay() {
        if (isAutoPlaying) {
            pauseAutoPlay();
        } else {
            startAutoPlay();
        }
    }

    // 音频渐隐淡出效果
    function fadeOutAudio(durationMs) {
        if (fadeOutTimer) clearInterval(fadeOutTimer);
        const originalVolume = 1.0;
        const steps = 30; // 30步完成淡出
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
                demoAudio.volume = originalVolume; // 恢复默认音量备用
            }
        }, stepTime);
    }

    // 启动自动播放演示
    function startAutoPlay() {
        if (!isLoaded) return;
        isAutoPlaying = true;
        if (playIcon) playIcon.className = 'ri-pause-circle-line';
        if (playText) playText.innerText = 'PLAYING DEMO // 点击暂停演示';
        
        // 安全清除可能正在运行的淡出
        if (fadeOutTimer) {
            clearInterval(fadeOutTimer);
            fadeOutTimer = null;
        }
        demoAudio.volume = 1.0;

        // 若在起点（首屏）重开，强制音乐从 0 开始以对齐画面
        if (currentFrame < 1) {
            demoAudio.currentTime = 0;
        }

        demoAudio.play().then(() => {
            updateAudioControlUI();
        }).catch(err => {
            console.warn("⚠️ 浏览器音频播放受阻，需发生用户交互:", err);
            updateAudioControlUI();
        });
        console.log("🔋 [Auto Play] 演示模式已启动，音频播放中。");
    }

    // 暂停自动播放
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
        
        // 瞬间阻断淡出并归位音量
        if (fadeOutTimer) {
            clearInterval(fadeOutTimer);
            fadeOutTimer = null;
        }
        demoAudio.pause();
        demoAudio.volume = 1.0;
        updateAudioControlUI();
        console.log("🔌 [Auto Play] 演示模式已暂停，音频已暂停并重置音量。");
    }

    // 更新音频控制器 UI 状态
    function updateAudioControlUI() {
        if (!audioControl) return;
        
        if (demoAudio.muted) {
            audioControl.classList.remove('playing');
            audioControl.classList.add('muted');
            audioText.innerText = 'AUDIO OFF';
        } else {
            audioControl.classList.remove('muted');
            audioText.innerText = 'AUDIO ON';
            // 仅在实际在自动播放、非倒带、非停留时跳动波形
            if (isAutoPlaying && !isRewinding && !isWaitingAtEnd) {
                audioControl.classList.add('playing');
            } else {
                audioControl.classList.remove('playing');
            }
        }
    }

    // 5. 按“当前正在渲染的整数帧号”精准切换全息卡片显隐
    function updatePanelStates(frameIndex) {
        // 精准帧数判定区间：
        // 1. 0 - 87 帧：芯片主标题介绍
        if (frameIndex >= 0 && frameIndex < 88) {
            setActivePanel('intro');
            hudActiveLayer.innerText = 'CHIP_INTRO';
            hudActiveLayer.style.color = 'var(--primary)';
        }
        // 2. 88 - 119 帧：前端交互视界
        else if (frameIndex >= 88 && frameIndex < 120) {
            setActivePanel('frontend');
            hudActiveLayer.innerText = 'LAYER_01_FRONTEND';
            hudActiveLayer.style.color = '#00fff9';
        }
        // 3. 120 - 154 帧：后端超频引擎
        else if (frameIndex >= 120 && frameIndex < 155) {
            setActivePanel('backend');
            hudActiveLayer.innerText = 'LAYER_02_BACKEND';
            hudActiveLayer.style.color = '#8b5cf6';
        }
        // 4. 155 - 191 帧：底层安全数据持久化（根据用户要求在此处截断）
        else if (frameIndex >= 155 && frameIndex < 192) {
            setActivePanel('database');
            hudActiveLayer.innerText = 'LAYER_03_DATABASE';
            hudActiveLayer.style.color = '#f59e0b';
        }
        // 5. 192 - 224 帧：合体重组，招募行动/现在就安装搞怪面板
        else {
            setActivePanel('action');
            hudActiveLayer.innerText = 'SYSTEM_INSTALL_ACTION';
            hudActiveLayer.style.color = '#ef4444';
        }
    }

    function setActivePanel(activeKey) {
        Object.keys(panels).forEach(key => {
            if (key === activeKey) {
                panels[key].classList.add('active');
            } else {
                panels[key].classList.remove('active');
            }
        });
    }

    // 监听滚动事件更新目标帧
    window.addEventListener('scroll', () => {
        updateTargetFrame();
    }, { passive: true });

    // 用户手动操作滚轮或手势时自动暂停
    window.addEventListener('wheel', () => {
        if (isAutoPlaying) pauseAutoPlay();
    }, { passive: true });
    window.addEventListener('touchmove', () => {
        if (isAutoPlaying) pauseAutoPlay();
    }, { passive: true });
    window.addEventListener('keydown', (e) => {
        const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Space', 'Home', 'End'];
        if (isAutoPlaying && scrollKeys.includes(e.code)) {
            pauseAutoPlay();
        }
    });

    // 点击事件绑定
    if (btnAutoDemo) {
        btnAutoDemo.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止冒泡
            toggleAutoPlay();
        });
    }

    // 音频控制器快捷静音点击
    if (audioControl) {
        audioControl.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻断冒泡，防止触发全局播放/暂停
            demoAudio.muted = !demoAudio.muted;
            updateAudioControlUI();
        });
        // 首次同步 UI 状态
        updateAudioControlUI();
    }

    // 全局点击事件代理
    document.addEventListener('click', (e) => {
        // 排除特定的功能性按钮
        const isInteractiveBtn = e.target.closest('#btn-auto-demo') ||
            e.target.closest('.btn-action-buy') ||
            e.target.closest('.btn-return') ||
            e.target.closest('#audio-control');
        if (!isInteractiveBtn) {
            toggleAutoPlay();
        }
    });

    // 6. 物理阻尼 Lerp 渲染主循环 (60 FPS)
    function renderLoop() {
        if (!isLoaded) return;

        // 计算 Delta Time (基于真实时间，以秒为单位)
        const now = performance.now();
        const deltaTime = now - lastFrameTime;
        lastFrameTime = now;

        // 限制单帧最大计算间隔为 0.1 秒，防范切后台产生的超大突跳
        const dt = Math.min(100, deltaTime) / 1000;

        // 自动演示逻辑控制 (基于绝对时间，脱离帧率)
        if (isAutoPlaying) {
            if (isWaitingAtEnd) {
                // 终点静止等待，什么都不做，等待定时器触发
            } else if (isRewinding) {
                // 匀速倒带状态
                if (targetFrame <= 0) {
                    // 倒带完成，当画面也基本退回起点时，切换回正向演示
                    if (currentFrame < 0.5) {
                        isRewinding = false;
                        if (playText) playText.innerText = 'PLAYING DEMO // 点击暂停演示';
                        // 重置音频并重新播放
                        demoAudio.currentTime = 0;
                        demoAudio.volume = 1.0;
                        demoAudio.play().then(() => {
                            updateAudioControlUI();
                        }).catch(err => {
                            console.warn("⚠️ 自动重启演示音频播放受阻:", err);
                            updateAudioControlUI();
                        });
                    }
                } else {
                    // 匀速递减目标帧 (基于 Delta Time，恒定速度)
                    targetFrame = Math.max(0, targetFrame - REWIND_SPEED * dt);
                    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                    if (maxScroll > 0) {
                        const progress = targetFrame / (TOTAL_FRAMES - 1);
                        const nextScrollTop = progress * maxScroll;

                        isProgramScroll = true;
                        window.scrollTo(0, nextScrollTop);
                        isProgramScroll = false;
                    }
                }
            } else {
                // 正向播放状态
                const speed = getAutoPlaySpeed(currentFrame); // speed 为每秒帧数

                if (targetFrame >= TOTAL_FRAMES - 1) {
                    // 已播放到最后，触发 10 秒终点停留并淡出音频
                    isWaitingAtEnd = true;
                    if (playText) playText.innerText = 'WAITING // 停留 10 秒后自动回溯';
                    
                    fadeOutAudio(1500); // 1.5 秒淡出音频
                    updateAudioControlUI(); // 同步更新音频波形为静止

                    endWaitTimer = setTimeout(() => {
                        isWaitingAtEnd = false;
                        isRewinding = true;
                        if (playText) playText.innerText = 'REWINDING // 自动回溯中...';
                        endWaitTimer = null;
                    }, END_WAIT_DELAY);
                } else {
                    targetFrame = Math.min(TOTAL_FRAMES - 1, targetFrame + speed * dt);
                    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                    if (maxScroll > 0) {
                        const progress = targetFrame / (TOTAL_FRAMES - 1);
                        const nextScrollTop = progress * maxScroll;

                        isProgramScroll = true;
                        window.scrollTo(0, nextScrollTop);
                        isProgramScroll = false;
                    }
                }
            }
        }

        // 计算当前帧的物理滑行 (基于时间换算阻尼，k=3.5 使得倒带恒定耗时约 1.3 秒，优雅缓慢)
        const diff = targetFrame - currentFrame;
        const factor = 1 - Math.exp(-3.5 * dt);

        if (Math.abs(diff) > 0.01) {
            currentFrame += diff * factor;
            const currentRoundedFrame = Math.round(currentFrame);
            drawFrame(currentRoundedFrame);
            hudCurrentFrame.innerText = currentRoundedFrame;

            // 基于正在渲染的当前帧号动态切换卡片，保证文字与画面中的芯片拆解状态同步
            updatePanelStates(currentRoundedFrame);
        } else {
            currentFrame = targetFrame;
            const currentRoundedFrame = Math.round(currentFrame);
            hudCurrentFrame.innerText = currentRoundedFrame;
            updatePanelStates(currentRoundedFrame);
        }

        // 计算 FPS 并显示
        calculateFPS(deltaTime);

        requestAnimationFrame(renderLoop);
    }

    // 计算渲染帧率
    function calculateFPS(delta) {
        frameTimes.push(delta);
        if (frameTimes.length > 30) {
            frameTimes.shift();
        }

        const avgDelta = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        const fps = 1000 / avgDelta;

        // 降低 HUD 渲染数字抖动频率
        if (Math.random() < 0.1) {
            hudFps.innerText = `${fps.toFixed(1)} FPS`;
        }
    }

    // 开始预加载
    preloadImages();
});
