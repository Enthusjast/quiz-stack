# Quiz Stack — 静态刷题网站

纯静态刷题/自测网站，可部署到 GitHub Pages。基于 Vue 3 + Vite + TypeScript + Tailwind CSS 构建。

## 功能

### 题型支持
- **type 0** 热身题（送分题）· **type 1** 单选题 · **type 2** 多选题 · **type 3** 填空题 · **type 4** 判断题

### 练习模式
- **顺序练习** — 按题库原始顺序，选项随机打乱
- **乱序练习** — 题目和选项完全随机
- **错题回顾** — 从错题本中抽取题目刷题
- **模拟考试** — 读取题库 `test`/`score` 配置，按题型抽题，交卷后统一点分，分题型显示得分明细，全部答完自动交卷
- **自定义练习** — 自由选择题型（0-4）和乱序方式

### 答题体验
- 选项颜色背景（正确=绿色、错误=红色、漏选=琥珀色）
- 答对自动跳下一题（200ms 延迟）
- 每题重试次数追踪，显示"重试第 N 次"徽章
- 解析提示（`hint` 字段）

### 数据持久化
- 答题进度按 **题库 × 模式** 分别自动保存到 localStorage
- 自动保存状态提示（已保存/保存中/保存失败 + 时间戳）
- 关闭页面/刷新前自动保存（`beforeunload` 监听）

### 练习记录
- 每次完成/交卷自动创建练习记录（含模式、分数、耗时、准确率）
- 首页统计仪表板（今日刷题数、总练习次数、总耗时、总正确率）
- 最近完成记录列表，可点击查看对应记录详情
- 记录分页浏览

### 进度管理
- 题库卡片显示"有进度"徽章
- 进度恢复提示
- 进度导出/导入（JSON 文件）

### 错题管理
- 错题本（按题型、题干、选项、答案和解析生成的稳定指纹去重）
- 关键词搜索 + 题型筛选
- 多选批量删除 + 分页
- 导出/导入错题 JSON

### UI/UX
- 深色模式 + card/paper 视觉风格切换
- 响应式布局（桌面侧栏导航 / 移动端底部状态栏 + 覆盖层导航）
- 题库搜索 + 分类标签过滤 + 分页
- 骨架屏加载动画
- "New" 徽章（新题库标记）
- 相对时间显示（"3 分钟前"）

## 快速开始

```bash
npm install
npm run dev        # 启动开发服务器 (localhost:5173)
npm run build      # 构建生产版本
npm run preview    # 预览构建结果
```

## 添加题库

将题库 JSON 文件放入 `public/data/` 目录，然后在 `public/data/list.json` 中注册。

### list.json 格式

```json
{
  "categories": ["政治", "入学", "前端"],
  "recommended": ["demo"],
  "banks": {
    "demo": {
      "title": "Demo 题库 — 综合练习",
      "categories": ["测试"],
      "questionCount": 21,
      "new": true
    }
  }
}
```

### 题库 JSON 格式

```json
{
  "title": "题库名称",
  "test": [0, 5, 3, 2, 4],
  "score": [0, 2, 3, 1, 2],
  "problems": [
    { "type": 1, "content": "单选题", "choices": ["A","B","C","D"], "answer": 0, "hint": "解析（可选）" },
    { "type": 2, "content": "多选题", "choices": ["A","B","C","D"], "answer": [0,2], "hint": "解析（可选）" },
    { "type": 3, "content": "填空____", "answer": "答案;同义词", "hint": "解析（可选）" },
    { "type": 4, "content": "判断题", "choices": ["正确","错误"], "answer": 0, "hint": "解析（可选）" }
  ]
}
```

| 字段 | 说明 |
|------|------|
| `type` | 0=热身题, 1=单选, 2=多选, 3=填空, 4=判断 |
| `answer` | 单选/判断: 索引; 多选: 索引数组; 填空: 字符串 |
| `hint` | 可选，答题后显示的解析 |
| `test` | 可选，模拟考试抽题配置：标量=总题数，`[n0,n1,n2,n3,n4]`=按题型分别抽题 |
| `score` | 可选，`[s0,s1,s2,s3,s4]` 每题分值，用于考试计分 |

- 填空题多空用 **逗号** 分隔，同义词用 **分号** 分隔（如 `"ls -a;ls -la;ls -al"`）
- 选择题选项会自动打乱，`answer` 对应原始顺序

## GitHub Pages 部署

推送代码到 `main` 分支即可自动部署。需在仓库 Settings → Pages 中设置 Source 为 "Deploy from a branch"，分支选 `gh-pages`。

`vite.config.ts` 中的 `base` 路径需与仓库名匹配（自定义域名设为 `'/'`）。

## 技术栈

- Vue 3 + Composition API（`<script setup>`）+ TypeScript
- Vite + Vue Router 4（hash 模式）
- Tailwind CSS + Lucide Vue
- localStorage 持久化（composables 管理状态）

## 兼容性

题库数据格式兼容 [vstc](https://github.com/yemaster/vstc) 和 [vtix-ng](https://github.com/yemaster/vtix-ng)，可直接复用现有题库文件。
