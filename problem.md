# Troubleshooting Log (2026-04-22)

### 1. CSS Injection Failure (CSS 注入失败)
- **问题描述**：使用 `replace_file_content` 替换 `@media` 块时，因目标代码中包含肉眼难察的“空行”导致匹配失败。
- **解决办法**：先用 `view_file` 确认带行号的源码，严格包含所有空白字符（包括空行和缩进）进行全量块匹配。
- **教训**：代码匹配要像对待原子一样严谨，多一个空格都不行。

### 2. JS ReferenceError - Variable Scoping (变量作用域导致引用错误)
- **问题描述**：在 `initMouseTrail` 函数中直接引用了 `initStarshipGame` 函数内的局部变量 `container`，导致脚本抛出 `ReferenceError` 并终止执行。
- **解决办法**：在函数内部使用 `document.getElementById` 重新获取目标 DOM 节点，并增加判空保护。
- **教训**：不要迷信局部变量的“跨界”能力，每一个独立的功能模块都应该拥有自己稳定的 DOM 句柄。

### 3. Grep Search Failure on File Tail (Grep 搜索末尾失效)
- **问题描述**：在对 `main.js` 进行 `grep_search` 时，即便代码确实存在于文件末尾（如 `score` 变量），搜索工具仍返回空结果。
- **解决办法**：当 Grep 失效时，直接使用 `view_file` 配合 `StartLine` 参数对文件尾部进行“地毯式”人工确认。
- **教训**：搜索工具并非万能，在超大 JS 文件面前，手动定位锚点往往更可靠。

### 4. Cloudflare UI 的“千层套路”：Workers 与 Pages 混淆 (2026-04-23)
- **问题描述**：在 Cloudflare 后台点击 `Create application` 后，默认进入的是 `Workers` 配置流，导致找不到 `Build output directory` 选项。
- **解决办法**：在创建页面务必点击 **`Pages`** 标签页，或者寻找 **`Looking to deploy Pages? Get started`** 的微小链接。
- **教训**：看到 `npx wrangler deploy` 这种字样就说明进错房间了，Pages 才是前端部署的正道。

### 5. Fixed Positioning Failure in Transformed Containers (2026-04-24)
- **问题描述**：在全屏模式下，使用 `position: fixed` 却无法覆盖全屏，游戏容器像消失了一样或被限制在局部。
- **解决办法**：发现父级元素（如 `.main-frame`）使用了 `transform` 或 `perspective`，导致 `fixed` 定位失效。采用“DOM 移形换影”大法，在开启全屏时将容器 `appendChild` 到 `document.body`，退出时还原位置。
- **教训**：`fixed` 不一定是相对于视口的，当心它的父辈们。

### 6. Mobile Backdrop-Filter Latency (移动端模糊滤镜卡顿) (2026-04-24)
- **问题描述**：在移动端大量使用 `backdrop-filter: blur()` 导致渲染帧率剧降，触控响应迟钝。
- **解决办法**：在媒体查询中针对移动端显式禁用所有毛玻璃模糊效果。
- **教训**：视觉效果虽美，移动端性能才是生命线。

### 7. 3D Projective Singularity & Typewriter Race Condition (3D 投影奇异值与打字机竞态阻塞) (2026-06-04)
- **问题描述**：在 `lab.html` 中拖拽星图过久或极速甩动鼠标，页面会瞬间卡死，节点文字消失。
- **原因分析**：
  1. **3D 投影奇异值**：粒子在旋转到相机后方（$z \le -fov$）时，投影公式中的分母 `fov + z` 趋于 0 或为负，导致 screen 坐标计算出 `Infinity` / `NaN`。坐标一旦污染为 `NaN`，在后续帧中无法恢复，造成渲染死锁。
  2. **打字机定时器冲突**：疯狂点击节点导致并发产生数个 `setTimeout`，且没有 `clearTimeout`，最终线程阻塞、内存泄露，导致浏览器卡死。
- **解决办法**：
  1. 在 `Point3D.project()` 中加入近裁剪面防护 `zSafe = Math.max(z, -fov + 20)`，并在 `mousemove` 拖拽中对旋转增量进行限速 Clamping (`rotX, rotY` 限制在 $\pm 0.08$ rad 步长内)。
  2. 在 `typeWriter` 开始前增加定时器句柄的 `clearTimeout` 逻辑，消除竞态冲突。
- **教训**：
  1. 3D 渲染一定要有近裁剪面（Near Clipping Plane）保护和输入限幅，防止产生 `NaN` 数学黑洞。
  2. 凡是有递归异步调用的定时器，必须具备释放旧句柄的安全气囊。

### 14. 父级 Transform 容器导致的 Fixed 定位失效与弹窗飘走重排冲突 (2026-06-14)
- **问题描述**：在“查看项目详情”弹窗展示时，点击按钮会导致弹窗出现在页面非常靠上的位置，且上下滚动页面时，弹窗会随之“飘离”可视区域，甚至使得原本页面顶部的元素和当前视口发生扭曲和重排。
- **原因分析**：
  1. **定位父级陷阱**：在 HTML 架构中，弹窗元素被放置在 `#resume-page` 容器内。由于主页面使用了复杂的水平滑动 transform 变换，这使得子元素的 `position: fixed` 不再相对于浏览器视口（Viewport）进行定位，而是退化为相对于 transform 父容器进行定位。
  2. **重排卡顿**：没有锁死视口高度和禁止后面页面滚动，在弹出大卡片时页面很容易在背景里由于滚动条而发生错乱。
- **解决办法**：
  1. 使用绝对锁定样式：使用 `position: fixed !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important;` 强制弹窗以屏幕中心为锚点。
  2. 配合 CSS 过渡和 HTML 隔离：将项目详情弹窗的 DOM 节点移到 `#app-container` 外，直属 `<body>` 根节点，彻底粉碎任何 Transform 父级陷阱。
- **教训**：当 `fixed` 定位发生各种奇怪的偏离或者随页面滚动飘走时，首选检查父级元素中是否声明了 `transform` / `filter` / `perspective`，并将定位元素提升至 `<body>` 直属子节点进行物理隔离。

### 15. WebGL 18MB 巨无霸模型在手机浏览器下的卡 loading 与网速超时白屏 (2026-06-14)
- **问题描述**：在部分中低端手机端浏览器或地下弱网环境下，进入“芯片实验室”或“3D体验舱”时，加载进度经常无限期卡在 `0%`、`95%` 或抛出 CORS/网络连接错误而显示 `ERROR`，用户无法进去且大眼瞪小眼。
- **原因分析**：
  1. 手机端浏览器对 WebGL 页面的内存占用（特别是 18MB GLB 模型的解密与解析）有严格的限额，一旦超限就会被系统静默截断导致加载中断。
  2. 超时没有被合理监控并显示反馈，导致页面处于无限等待状态。
- **解决办法**：
  1. **10秒看门狗超时监控**：在 JS 加载链最前端开启一个 10 秒倒计时，若在 10 秒内未成功渲染完成，或者中间捕获到依赖抛错，立即将状态置为 `TIMEOUT` / `ERROR` 并淡入展示告警兜底面板。
  2. **剪贴板静默复制救场**：在告警发生时，JS 会自动尝试调用剪贴板 API 将当前页面链接复制入系统剪贴板，并在界面上高亮提示。引导用户通过“Ctrl + V”粘贴到电脑端现代浏览器（Chrome/Edge）中，以解锁极致的 3D 体验。
  3. **手动复制兜底**：若手机浏览器禁用了剪贴板 API 写入，则提供“手动复制”的事件监听，并动态替换文案提供成功反馈。
- **教训**：对于重度 WebGL 交互或超大模型的前端静态项目，必须要假设并设计网络延迟和移动端环境缺失的“降级防御策略”，使用剪贴板实现链接跨设备无缝转移，让体验降级得足够优雅。

### 8. 3D Canvas 拖拽手势穿透与全局自动播放误触冲突 (2026-06-06)
- **问题描述**：在 3D 阶段转动模型时，鼠标按下、拖拽并释放的行为在浏览器中会被捕获为一次 `click` 事件。由于全局绑定了“点击空白背景开启/暂停 Demo 演示”的监听器，且当时该监听未对 3D Canvas 进行排除，导致用户一旦拖拽旋转 3D 芯片，释放后就会误触发全局 Demo 的启动，进而引发页面自动复位到最顶端 0 帧重新播放。
- **解决办法**：加装“双重防误触气囊”：首先在全局点击的交互元素中将 `#chip-3d-canvas` 显式加入排除列表；其次在监听器内部引入“3D 章节安全阻断器”——若当前帧数处于 3D 阶段（`currentFrame >= 224`），点击任何页面背景直接 `return`。彻底杜绝用户因大幅甩动旋转导致鼠标松开处移出 Canvas 边界而在背景触发 click 的误触穿透。
- **教训**：全局事件监听（特别是 click/scroll/key）在引入复杂的 3D 交互或手势画布时，必须要有严格的 `e.target` 边界隔离保护与页面阶段限幅拦截，避免手势释放产生的 click 穿透影响外围页面逻辑。

### 9. 3D 地球引擎及贴图加载超时卡死问题 (2026-06-06)
- **问题描述**：在本地双击 HTML 静态页面（`file://` 协议）或者部分移动端网络环境下，3D 地球无法显示（变黑或不渲染），控制台无报错或有大量 CORS 拦截红字报错。
- **原因分析**：
  1. **引擎 CDN 域名挂掉**：中午将 ThreeJS 的首选 CDN 镜像改为了国内第三方镜像 `cdnjs.net`，但该域名早已彻底失效卡死，导致引擎的加载一直被浏览器 TCP 握手超时挂起（长达数十秒），直至超时 fallback 之前 3D 渲染无法初始化。
  2. **图片贴图受限或 404**：为了防网络波动，直接加载本地 `img/earth-blue-marble.jpg`。但这在 `file://` 双击打开协议下会被浏览器 CORS 机制强制拦截，产生一连串红字报错并导致加载失败。而使用第三方国内镜像 `npm.elemecdn.com` 却由于该未发布到 npm 目录的 example 图片在发布时被忽略而直接返回 404。
- **解决办法**：
  1. **本地资源优先**：将 ThreeJS 引擎的加载源首选设为本地的 `js/lib/three.min.js`，避免外网请求和域名失效隐患。
  2. **双协议智能检测加载**：在 `js/main.js` 里引入协议自适应逻辑。检测到 `file://` 协议时，直接使用官方支持跨域的 `unpkg` 地址（`https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg`）以避开本地 CORS 的红字报错拦截；在 `http/https`（线上部署或本地开发）下，则使用本地 `img/earth-blue-marble.jpg` 贴图实现零外网开销秒开。
- **教训**：
  1. 对于混淆后的第三方静态 JS 类库（如 `three.min.js`），本地具备就应绝对首选本地，不要过度迷信网络 CDN，以防镜像商突然跑路或解析故障导致全站引擎流产。
  2. 在本地 `file://` 开发协议下，对本地磁盘文件的 XHR/Fetch 获取会受到严格同源策略拦截，但对外网有跨域头部的 HTTPS 资源可以放行。因此在双击静态打开页面和部署环境之间，需要做双通道容灾隔离。

### 10. CDN 返回 200 OK HTML 导致 script.onerror 容灾机制失效 (2026-06-06)
- **问题描述**：在 Showcase 页面动态加载 Three.js 引擎时，首选国内 CDN 域名 `cdnjs.net` 失效或遭遇劫持，浏览器抛出 `Uncaught SyntaxError: Unexpected token '<'` 语法错误，但并未自动降级切换至备用官方 Cloudflare CDN。
- **原因分析**：
  1. 传统的 `<script>` 容灾仅依赖 `script.onerror`，该事件只在网络彻底不通或返回 4xx/5xx 等非正常 HTTP 状态码时才会触发。
  2. 当 `cdnjs.net` 域名失效或网络被拦截时，服务器或网关为了显示拦截说明/导航页，返回了一个状态码为 `200 OK` 的 **HTML 页面**（通常以 `<!DOCTYPE html>` 或 `<html>` 开头）。
  3. 浏览器判定该网络请求已成功完成，高高兴兴地触发了 `onload`。JS 引擎在解析执行该 HTML 内容时检测到 `<` 字符从而抛出语法错误。由于加载已完成，`onerror` 根本没有机会触发，导致备用降级逻辑完全失效。
- **解决办法**：
  1. 将首选国内极速源替换为更稳定的 `cdn.bootcdn.net`。
  2. 升级加载器，引入**“双重核验安检”**机制：在 `script.onload` 中增加对全局变量 `window.THREE` 是否存在的二次校验。如果加载成功但 `window.THREE` 依然为 `undefined`，说明接收到的并非真正的 JS 脚本（而是 200 HTML 假货），此时主动清除当前脚本标签并强行调用备用降级逻辑。
- **教训**：
  不要轻信 HTTP 状态码 `200 OK`，动态加载关键第三方库时，必须结合“网络是否成功（onload）”与“目标对象是否就位（双重核验）”双轨判定，方能彻底免疫 200 OK 的劫持污染。

### 11. 3D 核心库及跨域贴图缓存命中失效与秒开优化 (2026-06-07)
- **问题描述**：
  1. 预加载 `<link rel="preload" crossorigin="anonymous">` 跨域贴图后，控制台抛出警告：`A preload for ... is found, but is not used because the request credentials mode does not match`，且切换至 3D 页面仍需重新拉取图片。
  2. 3D 引擎 `three.min.js` 本身过大，在用户点击切换页面时才动态加载，导致切换产生明显的白屏卡顿。
- **原因分析**：
  1. `THREE.TextureLoader` 实例化时，默认发送的跨域请求凭证模式与 HTML 的 `preload` 不匹配，导致浏览器拒绝重用预加载缓存。同时 `preload` 未在数秒内使用会触发 Chrome 黄色警告。
  2. 动态加载未在空闲时进行缓存与执行预挂载，导致交互阻塞。
- **解决办法**：
  1. 将 HTML 的 `preload` 统一升级为低优先级的 `prefetch`，既静默拉取又消除时间限制警告；在 JS 中显式为 `TextureLoader` 调用 `.setCrossOrigin('anonymous')` 确保凭证完全匹配，完美命中缓存。
  2. 在 HTML 中配置 `three.min.js` 的 `prefetch`，并在 JS 中注册 window `load` 监听器，在 onload 触发 1.5 秒后的空闲阶段，自动在后台挂载好 `window.THREE`，实现点击即秒开。
- **教训**：
  1. 跨域贴图预加载必须严格保障“声明端（link）”与“使用端（TextureLoader）”的 `crossOrigin` 身份凭证一气呵成、完全一致。
  2. 静态页面大库的最佳优化法则为：`prefetch` 预缓存文件 + onload 空闲期异步执行挂载。

### 12. CSS 兼容性 Warning - 标准 mask 属性缺失 (2026-06-11)
- **问题描述**：在 CSS 中仅声明 `-webkit-mask` 专有属性，IDE 会报出 `还定义标准属性“mask”以实现兼容性` 的警告。
- **解决办法**：在 `-webkit-mask` 的正下方，紧接声明标准的 W3C `mask` 属性，以保障在主流新版浏览器下的前向兼容性，并清除代码审查 Warning。
- **教训**：声明任何专有前缀属性（如 `-webkit-`, `-moz-` 等）时，都必须跟进标准无前缀声明以求稳健。

### 13. PDF 内嵌图片直接提取导致的背景缺失与长宽失真问题 (2026-06-14)
- **问题描述**：在从项目演示 PDF（“演示（伏杨天）_2-3.pdf”）中直接提取嵌入图像（raw images）时，经常会由于 PDF 排版把文字/批注/背景作为独立矢量绘制而图片仅作底层贴图，导致提取出的裸图丢失了标题、连线和标注信息；同时提取出的 raw 图像可能存在方向颠倒（由 PDF 页面的 `/Rotate` 旋转矩阵引起，而裸提取忽略了此矩阵）。
- **解决办法**：在 Python 脚本中使用 `pymupdf` (fitz) 对 PDF 页面整体进行 2 倍分辨率渲染（通过 `fitz.Matrix(2, 2)` 缩放矩阵并调用 `page.get_pixmap()`），而不是提取 raw bytes。如此一来，整页内容（包括图文、标注和背景色）都会被无损转换成高清 PNG，且完美保留 PDF 页面中设定的旋转方向。
- **教训**：提取 PDF 视觉内容作为软件截图时，“整页缩放渲染”永远比“裸文件流图片提取”更加抗震、稳健且符合人类视觉预期。

### 16. 大体积 JS 资源下载解析阻塞造成 DOM 级看门狗超时机制瘫痪与行内脚本重构 (2026-06-14)
- **问题描述**：在移动端或弱网下，18MB 巨无霸 `model_data.js` 的同步下载与解析卡住，导致 `DOMContentLoaded` 事件迟迟无法触发，原先写在外部 JS（如 `chip_fusion_viewer.js`）底部的 10 秒超时看门狗还未执行就已经随整个外部 JS 被卡死在 0% 白屏处，容错面板根本无法弹出。
- **解决办法**：**看门狗行内化解耦**：将超时监控、防溢出高度隐藏（隐藏 `.loader-spinner` 和 `.loader-progress-bar-container` 等以确保移动端垂直不截断）、自动复制当前 URL 及事件委托绑定手动复制按钮等事件，彻底封装到 HTML `<body>` 顶部的行内 `<script>` 中。行内脚本一进入就立即启动 10s 计时与全局 fallback 函数，外部大 JS 就绪时只需修改 `window.isChip3DReady = true` 并调用 `window.clearWatchdog()` 即可。
- **教训**：在设计极重度资源的加载降级机制时，容错看门狗与降级 UI 的绑定必须写在最顶级的“行内脚本”中以获得最高优先级运行，决不能依赖任何需要网络下载的外部大文件或常规 DOMContentLoaded 事件。

### 17. 动态详情弹窗大图未就绪导致的旧图残留闪烁与异步竞争 (2026-06-14)
- **问题描述**：在“精选作品”卡片点击“查看详情”弹窗时，图片加载慢导致先显示文字，且在多项目切换时，新图完全下载就绪前弹窗中会突兀地残留并渲染“上一个项目的历史旧图”，等新图加载完才突然闪烁切换，体验极其突兀。
- **原因分析**：
  1. 浏览器执行 `detailImg.src = project.detailImg` 时，图片下载属于异步请求。在新图流未完全解码前，`detailImg` DOM 元素保留了旧图的 src 渲染状态，导致旧图残留。
  2. 1MB+ 的大 PNG 在非 prefetch 覆盖的其他网络环境下仍需要时间载入，由于没有 Loading 占位，导致排版发生“文字已就绪、图片白屏慢半拍”的割裂感。
- **解决办法**：
  1. **图片状态原子重置**：在赋值新 src 前，立刻将 `detailImg.src` 改为 1px 的极简透明 Base64 GIF 占位 (`data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7`)，彻底擦除上一张图片的痕迹。
  2. **三点发光骨架预载与淡入**：在 `project-detail-img-wrapper` 中置入绝对定位的科幻青色发光呼吸圆点加载器，并为 `detailImg` 默认挂载 `.loading` 类（设置 `opacity: 0`）。通过 `detailImg.onload` 事件触发时再移除 `.loading` 并将加载器设为 `.hidden`，利用 CSS `transition: opacity 0.3s ease` 达成高清原图的无缝平滑淡入。
- **教训**：在设计带有动态图片内容更替的模态窗交互时，必须遵守“先清空旧图、加装骨架占位、监听 onload 渐现”的黄金法则，彻底绝杀旧缓存残留与异步加载的闪烁缺陷。



