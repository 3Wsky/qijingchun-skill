---
name: "codex-relay"
description: "Orchestrator skill: mClaw executes tools and reports; external gpt-5.5 does planning, analysis, and synthesis. Invoke on 外部推理, 深度分析, 帮我查, 打开网页, relay."
---

# Codex Relay Skill · Orchestrator Mode

## Version

`v2.0.0`

## Architecture

```
用户（微信）
    ↓ 指令
mClaw（通义千问）= 调度员 + 手脚 + 汇报员
    ↓ 复杂任务委托
GPT 5.5（外部 API）= 大脑：规划、分析、综合
    ↓ 返回执行计划 / 分析指令
mClaw 执行工具（web_fetch / browser / 云盘 / 文件 / exec）
    ↓ 原始结果
GPT 5.5 二次综合
    ↓
mClaw 整理成简洁中文汇报给用户
```

**铁律：mClaw 不自己硬答复杂题，只负责「问大脑 → 执行 → 汇报」。**

## Role split

| 角色 | 负责 | 不做 |
|------|------|------|
| **mClaw** | 读 skill、跑 relay、执行工具、上传云盘、微信汇报 | 复杂推理、长篇分析、代码架构设计 |
| **GPT 5.5** | 任务拆解、网页内容分析、代码审查、写作、决策 | 直接碰用户文件/云盘/微信 |

## When to invoke (auto-delegate)

以下场景 **必须** 走外部大脑，禁止 mClaw 自行作答：

| 场景 | 用户说法示例 | mClaw 动作 |
|------|-------------|-----------|
| 网页查看/分析 | 「帮我看这个网页」「查一下 XX 网站」 | fetch → 送大脑分析 |
| 深度技术 | 「审查代码」「设计架构」「排查 bug」 | 读文件 → 大脑分析 |
| 长文写作 | 「写一篇文章」「改写成 XX 风格」 | 大脑生成 → 上传云盘 |
| 对比调研 | 「对比 A 和 B 方案」「搜资料写报告」 | 多源采集 → 大脑综合 |
| 复杂决策 | 「该不该用 Redis」「帮我选型」 | 大脑给建议 + 理由 |
| 显式触发 | 「外部推理」「深度分析」「relay」 | 直接走 relay |

以下场景 **mClaw 自己处理**，不调外部大脑：

- 打招呼、确认收到、定时提醒
- 云盘上传/下载/分享链接
- 创建/读取工作区简单文件
- 发微信/飞书消息
- 图像处理、格式转换等平台原生能力

## Prerequisites

| 文件 | 路径 |
|------|------|
| Token | `/home/node/.openclaw/workspace/auth.txt`（51 字节，无换行，trim） |
| Relay | `skills/codex-relay-skill/relay.mjs` |
| Roles | `skills/codex-relay-skill/ROLES.md` |

## Standard orchestration workflow

### Phase 1 — Triage（mClaw 自做，<5 秒）

1. 判断任务类型（上表）
2. 若简单任务 → 直接执行，结束
3. 若复杂任务 → 进入 Phase 2

### Phase 2 — Collect（mClaw 执行工具）

按任务收集原始材料，**不分析**，只采集：

| 任务类型 | 采集动作 |
|---------|---------|
| 看网页 | `web_fetch` 或 `browser` 获取正文/截图描述 |
| 看代码 | `read` 工作区文件或用户指定路径 |
| 看云盘 | 云盘 API 下载/搜索 |
| 调研 | `web_fetch` 多个 URL（≤3 个） |
| 写作 | 读取 skill 方法论文档（如 mimeng-writing-skill） |

采集结果保存到工作区临时文件：
```
/home/node/.openclaw/workspace/.relay-cache/YYYYMMDD-HHMMSS-input.txt
```

### Phase 3 — Think（送 GPT 5.5）

```bash
node skills/codex-relay-skill/relay.mjs --role planner "<结构化输入>"
```

输入格式（mClaw 组装）：

```markdown
## 用户原始请求
{用户说的话}

## 已采集材料
{网页正文 / 代码 / 文件内容，截断至 12000 字}

## 可用工具（如需进一步操作请列出）
- web_fetch, browser, 云盘读写, 工作区文件, Word/PPT 生成, cron, 微信通知

## 输出要求
请输出 JSON：
{
  "analysis": "你的分析结论",
  "actions": [{"tool": "工具名", "params": "参数", "reason": "原因"}],
  "report": "给用户的简洁汇报（≤300字）",
  "deliverable": "如需生成文件，描述文件名和内容类型"
}
```

### Phase 4 — Execute（mClaw 按 actions 执行）

- 遍历 `actions` 数组，逐项执行
- 每项执行后记录结果到 `.relay-cache/` 日志
- 若 `deliverable` 非空 → 生成 Word/PPT → 上传云盘 → 拿分享链接

### Phase 5 — Report（mClaw 汇报用户）

最终回复格式：

```markdown
## 结论
{report 字段，或 Phase 3 的 analysis 精简版}

## 我做了什么
- 查看了 [URL/文件]
- 调用了外部推理分析
- [上传了 XX 到云盘](分享链接)

## 详情
{仅当用户要求详细时展开，默认 ≤300 字}
```

**绝不暴露**：token、原始 API 响应、内部 JSON 结构。

## Quick relay（单轮，无工具采集）

简单复杂问答，无需先采集：

```bash
node skills/codex-relay-skill/relay.mjs "用户问题"
```

## Web page workflow（高频场景）

用户：「帮我看 https://example.com/article 讲了什么」

```
1. web_fetch 获取正文 → 存 .relay-cache/
2. node relay.mjs --role analyst "分析以下网页正文，用中文 300 字总结要点：\n\n{正文}"
3. 汇报用户：
   ## 结论
   {总结}
   ## 我做了什么
   - 抓取了该网页
   - 外部推理分析完成
```

## Code review workflow

用户：「审查工作区 src/app.js」

```
1. read src/app.js
2. node relay.mjs --role reviewer "审查以下代码，列出问题与改进建议：\n\n{代码}"
3. 汇报用户（问题清单 + 优先级）
```

## Writing workflow

用户：「外部推理：写一篇关于 AI 代理的文章」

```
1. node relay.mjs --role writer "写一篇 1500 字中文文章，主题：AI 代理"
2. 生成 Word → 上传云盘
3. 汇报：结论摘要 + 云盘链接
```

## Error handling

| 错误 | mClaw 处理 |
|------|-----------|
| relay 返回 invalidapikey | trim auth.txt 重试一次；仍失败则告知用户检查凭证 |
| 网页抓取失败 | 告知用户 URL 不可达，问是否换链接 |
| 外部大脑超时 | 重试一次；仍失败则汇报「推理服务暂时不可用」 |
| 平台 400 审查 | 用户消息不含 URL/代码/技术词；mClaw 内部执行不受限 |

## Security

- auth.txt 永不回显
- 用户消息避免含 token/API 等敏感词（平台审查）
- 外部大脑输出需 mClaw 审核后再发用户（过滤凭证泄露）
- `.relay-cache/` 定期清理（>7 天）

## Install & verify

```bash
# 安装后验证
node skills/codex-relay-skill/relay.mjs "你好，一句话"
node skills/codex-relay-skill/relay.mjs --models
node skills/codex-relay-skill/relay.mjs --role planner "用户问：什么是微服务？请按 JSON 格式输出 analysis 和 report"
```

## User trigger phrases

```
外部推理：<问题>
深度分析：<问题>
帮我看这个网页：<URL>
审查代码：<文件路径>
用 relay 调研：<主题>
```
