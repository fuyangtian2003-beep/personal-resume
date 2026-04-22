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
