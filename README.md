# codex-relay-skill v2

**Orchestrator skill for mClaw** — local agent executes tools and reports; external `gpt-5.5` handles planning, analysis, and synthesis.

## Architecture

```
User (WeChat) → mClaw (hands + mouth) → GPT 5.5 (brain) → mClaw executes → User report
```

## Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Main skill entry — triage rules, workflows, triggers |
| `ROLES.md` | Role prompts: planner / analyst / reviewer / writer |
| `ORCHESTRATION.md` | mClaw playbook — decision tree, report template |
| `relay.mjs` | Node relay with `--role` support |
| `INSTALL.md` | Install guide |

## Install (mClaw)

```
安装 skill：https://github.com/YOUR_USER/codex-relay-skill
```

Setup `workspace/auth.txt` (51 bytes, no newline).

## Usage

```
帮我看这个网页：https://example.com
外部推理：设计一个高并发订单系统
审查代码：src/app.js
深度分析：Redis vs Memcached 选型
```

## Local test

```bash
echo -n "sk-xxx" > ../../auth.txt
node relay.mjs "hello"
node relay.mjs --role analyst "summarize: ..."
node relay.mjs --models
```

## License

MIT
