# Quiz Stack — 静态刷题网站

纯静态刷题/自测网站，可部署到 GitHub Pages。基于 Vue 3 + Vite + TypeScript + Tailwind CSS 构建。

## 功能

- **四种题型**：单选题、多选题、填空题、判断题
- **三种练习模式**：顺序练习、乱序练习、错题回顾
- **本地持久化**：答题进度自动保存到 localStorage，刷新不丢失
- **答题统计**：正确率、正确/错误统计、用时记录
- **深色模式**：亮色/暗色主题切换
- **响应式**：桌面端和移动端自适应
- **错题管理**：错题本，支持导出/导入 JSON

## 快速开始

```bash
npm install
npm run dev        # 启动开发服务器
npm run build      # 构建生产版本
npm run preview    # 预览构建结果
```

## 添加题库

将题库 JSON 文件放入 `public/data/` 目录，然后在 `public/data/list.json` 中注册。

### 题库 JSON 格式

```json
{
  "title": "题库名称",
  "problems": [
    { "type": 1, "content": "单选题", "choices": ["A","B","C","D"], "answer": 0, "hint": "解析(可选)" },
    { "type": 2, "content": "多选题", "choices": ["A","B","C","D"], "answer": [0,2], "hint": "解析(可选)" },
    { "type": 3, "content": "填空____", "answer": "答案;同义词", "hint": "解析(可选)" },
    { "type": 4, "content": "判断题", "choices": ["正确","错误"], "answer": 0, "hint": "解析(可选)" }
  ]
}
```

- `type 1`: 单选题，`answer` 为正确选项索引
- `type 2`: 多选题，`answer` 为正确选项索引数组
- `type 3`: 填空题，`answer` 为字符串（多空逗号分隔，同义词分号分隔）
- `type 4`: 判断题，`answer` 为 0 或 1

## GitHub Pages 部署

推送代码到 `main` 分支即可自动部署。需在仓库 Settings → Pages 中设置 Source 为 "GitHub Actions"。

`vite.config.ts` 中的 `base` 路径需与仓库名称匹配。

## 技术栈

- Vue 3 + Composition API + TypeScript
- Vite + Vue Router (hash 模式)
- Tailwind CSS + Lucide Vue

## 参考

题库数据格式兼容 [vtix](https://github.com/yemaster/vtix) 和 [vtix-ng](https://github.com/yemaster/vtix-ng)。