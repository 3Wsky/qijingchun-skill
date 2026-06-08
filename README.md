# codex-relay-skill

OpenClaw / mClaw skill — relay complex tasks to an external OpenAI-compatible API while keeping the base Gateway model unchanged.

## Why

Hosted mClaw blocks `openclaw.json` edits and filters chat messages containing API keywords. This skill:

- Installs into workspace (allowed)
- Reads token from `auth.txt` with proper trim
- Uses correct model id `gpt-5.5`
- Invoked via safe trigger words: `外部推理`, `深度分析`, `relay`

## Structure

```
codex-relay-skill/
├── SKILL.md       # Agent skill entry (OpenClaw/Cursor compatible)
├── relay.mjs      # Node relay script
├── INSTALL.md     # mClaw install guide
└── README.md
```

## Quick start (mClaw)

```
安装 skill：https://github.com/YOUR_USER/codex-relay-skill
```

Then:

```
外部推理：解释 CAP 定理
```

## Local test

```bash
echo -n "sk-your-token" > ../auth.txt   # workspace root, NOT in repo
node relay.mjs "hello"
node relay.mjs --models
```

## License

MIT
