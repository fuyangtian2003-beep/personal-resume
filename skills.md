# Skills: High-Performance Canvas Game Engine (2026-04-22)

### 1. State-Driven UI Sync (状态驱动的 UI 同步)
- **技巧**：不要在 `gameLoop` 里直接操作 DOM。使用 `updateUI()` 封装，仅在状态变更（如受损、回充）时触发。
- **优势**：极大减少布局抖动（Layout Thrashing），保持 60FPS。

### 2. Composition over Inheritance (组合优于继承)
- **案例**：`Ship` 并不继承 `Wingman`，而是通过 `wingmen: []` 数组持有其实例。
- **同步位移**：在 `update` 循环中利用差值平滑同步（`lerp`），实现“如影随形”的伴随感。

### 3. Collision Optimization (碰撞检测优化)
- **技巧**：利用 `Math.hypot` 进行圆形碰撞检测，简单高效。
- **扩展**：针对掉落物、子弹、敌机、玩家四方势力，采用分层碰撞检测逻辑。

### 4. Asynchronous Notification Queue (异步非阻塞通知队列)
- **核心逻辑**：通过 `isShowing` 锁机制与 `setTimeout` 回调，将并发触发的视觉事件（如成就解锁）转化为串行展示。
- **优势**：避免多重弹窗重叠导致的视觉混乱，确保每一个“高光时刻”都能获得足够的停留时长。

### 5. Damping-Based Visual Feedback (基于阻尼衰减的视觉反馈)
- **实现**：在 `update` 循环中使用 `value *= 0.85`（或其他阻尼系数）来实现受击震荡、发光爆发等瞬时视觉特效。
- **优势**：相比简单的 `setTimeout` 定时切换，这种基于物理衰减的动画更具动感和生命力，符合直觉。

### 6. Morphing Particles (形态变换粒子)
- **技巧**：在一个类（如 `Star`）中封装多种 `draw` 模式。根据全局状态（如 `isOverclocked`）实时切换渲染逻辑（从 `rect` 到 `fillText`）。
- **优势**：无需销毁和重新创建对象，实现背景环境的“瞬间无缝变色/变态”，视觉冲击力极强。

### 7. Weight-Driven Animation (权重驱动动画)
- **技巧**：使用一个 `0.0` 到 `1.0` 的权重变量（如 `warpFactor`），通过剩余时间（如 `overclockTimer`）动态计算其值。
- **应用**：将该权重同时映射到速度倍率（`1 + 11 * factor`）和透明度（`alpha * factor`），实现多维度视觉效果的线性同步平滑过渡。

### 8. Phase-Based Projectile Lifecycle (阶段式弹药生命周期)
- **技巧**：将弹药寿命划分为“活跃追踪期”（如前 4s）和“能量损耗期”（如后 3s）。
- **应用**：活跃期执行追踪算法；损耗期停止转向并线性降低 `alpha` 透明度。
- **优势**：既保证了攻击的有效性，又避免了过时弹药污染视觉画面，增强了射击游戏的打击清理感。

### 9. Dynamic Spawn Rate Modulation (动态刷怪率调节)
- **技巧**：通过 Boss 状态机中的 `swarmTimer` 实时修改全局 `gameLoop` 中的 `spawnInterval` 参数。
- **效果**：在 Boss 发动技能时，将刷怪频率提升至黄金平衡点（每 12 帧一个），营造出持续涌动的“虫群感”，既保证了视觉上的压迫力，又兼顾了游戏的可玩性与挑战性。

## 10. 静态前端一键飞升：GitHub + Cloudflare Pages 自动化部署方案 (2026-04-23)
### 场景
将 Spring Boot 内部的静态前端（`src/main/resources/static`）独立部署到云端，实现国内访问加速及自动更新。

### 核心步骤
1. **仓库同步**：
   - 本地 Git 关联远程仓库：`git remote add origin https://github.com/fuyangtian2003-beep/personal-resume.git`
   - 推送代码：`git push -u origin main`
2. **Cloudflare Pages 配置**：
   - **Build command**: (保持空白，严禁填写内容)
   - **Build output directory**: `src/main/resources/static` (锁定前端目录，保护后端源码)
3. **自动化流**：
   - 后续只需执行 `git push`，Cloudflare 会自动触发构建并秒级上线。

### 优势
- **安全性**：利用 Private 仓库配合 Pages，外网只能看到编译后的前端，看不见 Java 源码。
- **速度**：Cloudflare CDN 全球加速，即便没有绑定子域名，其自带的 SSL 和节点分发也比普通虚拟主机快得多。

## 11. 移动端“顺滑”操控与自动火控系统 (2026-04-23)
### 挑战
手机浏览器在滑动 Canvas 时会默认触发页面滚动，导致游戏无法操作且画面乱跑。

### 解决方案
- **阻止劫持**：在 `touchstart` 和 `touchmove` 中调用 `e.preventDefault({ passive: false })`，强制切断浏览器滚屏逻辑。
- **坐标重映射**：利用 `e.touches[0]` 结合 `getBoundingClientRect()` 动态解算触点坐标。
- **自动火控 (Auto-Fire)**：通过 `navigator.userAgent` 识别手机端，并在 `gameLoop` 中以固定频率（如 15 帧/次）自动触发 `mousedown` 逻辑，解决手机端点击不便的问题。

## 12. 极客版纯净二维码生成方案 (2026-04-23)
### 推荐 API
使用 `api.qrserver.com` 实现无广告、高定制的二维码。

### 调用示例
```html
<img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=YOUR_URL&bgcolor=0a0c12&color=00fff9" />
```
### 优势
- **配色对齐**：支持通过 `color` 和 `bgcolor` 参数直接匹配网页的 UI 风格（如霓虹色）。
- **零成本**：无需任何第三方库，一行 URL 即可渲染。
- **纯净度**：无任何多余跳转或广告水印。

