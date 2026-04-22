# Troubleshooting Log (2026-04-22)

### 1. CSS Injection Failure (CSS 注入失败)
- **问题描述**：使用 `replace_file_content` 替换 `@media` 块时，因目标代码中包含肉眼难察的“空行”导致匹配失败。
- **解决办法**：先用 `view_file` 确认带行号的源码，严格包含所有空白字符（包括空行和缩进）进行全量块匹配。
- **教训**：代码匹配要像对待原子一样严谨，多一个空格都不行。
