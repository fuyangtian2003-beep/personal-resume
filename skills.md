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
