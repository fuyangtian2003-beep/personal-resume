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

