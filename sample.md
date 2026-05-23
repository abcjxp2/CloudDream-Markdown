# XPMD 示例

这是一个 macOS Markdown 查看器，目标是接近 Codex 预览的阅读体验：清爽、稳定、重点在内容。

## 功能

- [x] 打开本地 `.md` 文件
- [x] 拖拽 Markdown 文件到窗口
- [x] 表格、代码块、任务列表渲染
- [x] 文件保存后自动刷新

| 类型 | 状态 |
|---|---|
| 标题 | 支持 |
| 表格 | 支持 |
| 代码高亮 | 支持 |

> 这个示例文件可以用来快速验证渲染效果。

```ts
type Viewer = {
  name: string;
  platform: 'macOS';
};

const app: Viewer = {
  name: 'XPMD',
  platform: 'macOS'
};
```
