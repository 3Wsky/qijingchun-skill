# Install codex-relay-skill on mClaw

## 1. Install skill

Send to mClaw:

```
安装 skill：https://github.com/YOUR_USER/codex-relay-skill
```

Or clone manually into workspace:

```
/home/node/.openclaw/workspace/skills/codex-relay-skill/
```

## 2. Setup token

Create `/home/node/.openclaw/workspace/auth.txt`:

- Single line token
- No trailing newline (51 bytes for standard sk- keys)
- Use Base64 decode flow if platform blocks plain token in chat

## 3. Verify

```
安装完成后执行 relay 测试，问题写「你好」。
```

Or trigger:

```
外部推理：你好，一句话介绍你自己
```

## 4. Daily use

```
外部推理：<复杂问题>
深度分析：<架构/代码问题>
```
