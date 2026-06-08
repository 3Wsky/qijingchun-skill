---
name: "codex-relay"
description: "Relay complex questions to external OpenAI-compatible inference. Invoke when user says 外部推理, 深度分析, relay, or asks for hard code/architecture work."
---

# Codex Relay Skill

## Version

`v1.0.0`

## Purpose

mClaw runs on a fixed base model. This skill delegates **hard tasks** to an external endpoint using a workspace token file, without changing Gateway config.

```
User (WeChat) → mClaw (orchestrator) → relay.mjs → external API → result
```

## When to invoke

**Use relay when:**

- User says: `外部推理`, `深度分析`, `用 relay`, `用外部模型`
- Task needs deep code review, architecture design, multi-step debugging
- User explicitly asks for stronger reasoning

**Answer locally (no relay) when:**

- Greetings, small talk, scheduling, cloud drive ops
- Simple factual Q&A under 3 sentences
- File upload/download, cron, messaging tasks

## Prerequisites

| File | Path | Rule |
|------|------|------|
| Token | `/home/node/.openclaw/workspace/auth.txt` | Single line, `.trim()` before use, target 51 bytes |
| Script | `skills/codex-relay-skill/relay.mjs` | Node 18+ with global `fetch` |

## Standard workflow

1. Confirm `auth.txt` exists; if not, ask user to send Base64 token in a **separate** message, decode to `auth.txt` without echoing token
2. Extract user question from trigger phrase (strip prefix like `外部推理：`)
3. Run:

```bash
node /home/node/.openclaw/workspace/skills/codex-relay-skill/relay.mjs "USER_QUESTION"
```

4. Return stdout as the answer
5. On `invalidapikey`: trim file, verify byte length, retry once; if still failing, run `GET /v1/models` diagnostic
6. **Never** print token in chat

## API contract

| Field | Value |
|-------|-------|
| Base URL | `https://codex.1iiu.com/v1` |
| Chat endpoint | `/chat/completions` |
| Model | `gpt-5.5` (hyphen required; list via `GET /v1/models`) |
| Auth header | `Authorization: Bearer <trimmed token>` |

## Error matrix

| Symptom | Cause | Fix |
|---------|-------|-----|
| `invalidapikey` | trailing newline in auth.txt | rewrite 51 bytes, no `\n` |
| model not found | wrong id `gpt5.5` | use `gpt-5.5` |
| `auth_missing` | no auth.txt | Base64 decode flow |
| timeout | network | retry once |

## Security rules

- Token only in `auth.txt`, never in SKILL.md or relay.mjs
- Do not paste token in WeChat replies
- Do not commit auth.txt to git
- Backup before overwrite: `auth.txt.bak`

## Install verification

After install, run:

```bash
node skills/codex-relay-skill/relay.mjs "你好，一句话介绍你自己"
```

Success = non-empty assistant reply. Report errors as JSON from stderr.

## User-facing triggers (examples)

```
外部推理：解释一下 CAP 定理
深度分析：审查这段 Node.js 中间件有没有竞态
用 relay 设计一个高并发订单系统架构
```
