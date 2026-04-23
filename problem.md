# Troubleshooting Log (2026-04-22)

### 1. CSS Injection Failure (CSS 注入失败)
- **问题描述**：使用 `replace_file_content` 替换 `@media` 块时，因目标代码中包含肉眼难察的“空行”导致匹配失败。
- **解决办法**：先用 `view_file` 确认带行号的源码，严格包含所有空白字符（包括空行和缩进）进行全量块匹配。
- **教训**：代码匹配要像对待原子一样严谨，多一个空格都不行。

### 2. JS ReferenceError - Variable Scoping (变量作用域导致引用错误)
- **问题描述**：在 `initMouseTrail` 函数中直接引用了 `initStarshipGame` 函数内的局部变量 `container`，导致脚本抛出 `ReferenceError` 并终止执行。
- **解决办法**：在函数内部使用 `document.getElementById` 重新获取目标 DOM 节点，并增加判空保护。
- **教训**：不要迷信局部变量的“跨界”能力，每一个独立的功能模块都应该拥有自己稳定的 DOM 句柄。
