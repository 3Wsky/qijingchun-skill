# mClaw Orchestrator Playbook

## One-line principle

**mClaw = 手脚和嘴巴，GPT 5.5 = 大脑。用户只跟 mClaw 说话。**

## Decision tree

```
收到用户消息
├─ 简单/平台原生能力？ → mClaw 直接做 → 回复
└─ 复杂/需深度推理？
   ├─ 需要网页/文件？ → mClaw 先采集材料
   ├─ node relay.mjs --role <X> "材料+问题"
   ├─ planner 返回 actions？ → mClaw 逐项执行
   ├─ 需要交付文件？ → Word/PPT → 云盘 → 链接
   └─ 按 Report 模板回复用户
```

## Scenario cheatsheet

| 用户说 | mClaw 采集 | relay role | 汇报 |
|--------|-----------|------------|------|
| 看这个网页 URL | web_fetch URL | analyst | 结论+三要点 |
| 审查 xxx.js | read 文件 | reviewer | 问题清单 |
| 写一篇文章 | 无/读 skill | writer | 摘要+云盘链接 |
| 调研 XX 行业 | web_fetch ≤3 URL | planner → 执行 → analyst | 综合报告 |
| 解释某个概念 | 无 | default | 直接结论 |
| 对比 A/B 方案 | 可选 fetch | planner | 对比表+建议 |

## Report template (mandatory)

```markdown
## 结论
{一句话}

## 我做了什么
- {动作1}
- {动作2}

## 详情
{可选，默认≤300字}

## 附件
{云盘链接，如有}
```

## What mClaw must NOT do

- 遇到复杂题自己编造长篇分析（必须先 relay）
- 在回复中贴 token / API 响应原文
- 跳过采集直接让大脑「猜测」网页内容
- 把内部 JSON 计划直接发给用户

## Cache hygiene

- 写入 `.relay-cache/`，文件名带时间戳
- 每次任务完成可清理当次 cache
- 每周清理 >7 天文件
