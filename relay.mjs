#!/usr/bin/env node
/**
 * codex-relay v2 — external inference relay with role prompts
 * Usage:
 *   node relay.mjs "question"
 *   node relay.mjs --role planner|analyst|reviewer|writer "prompt"
 *   node relay.mjs --models
 */
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = join(__dirname, '..', '..');
const authPath = join(workspaceRoot, 'auth.txt');
const rolesPath = join(__dirname, 'ROLES.md');

const ENDPOINT = 'https://codex.1iiu.com/v1/chat/completions';
const MODELS_ENDPOINT = 'https://codex.1iiu.com/v1/models';
const MODEL = 'gpt-5.5';

const ROLE_PROMPTS = {
  planner: `你是规划大脑。mClaw 本地 Agent 替你执行工具。严格输出 JSON：{"analysis":"","actions":[{"tool":"","params":"","reason":""}],"report":"","deliverable":""}。report 用中文≤300字。`,
  analyst: `你是内容分析大脑。用中文输出：一句话结论、三个要点、可信度判断、下一步建议。总计≤400字。`,
  reviewer: `你是代码审查大脑。用中文输出：总体评价、P0/P1/P2问题清单（含位置+问题+建议）、Top3优先修复项。`,
  writer: `你是长文写作大脑。直接输出完整中文文章/markdown。`,
  default: `你是深度推理大脑。用简洁中文回答。代码用代码块，架构用要点列表。`,
};

function fail(code, message, extra = {}) {
  console.error(JSON.stringify({ error: code, message, ...extra }));
  process.exit(1);
}

function parseArgs(argv) {
  const args = [...argv];
  let role = 'default';
  if (args[0] === '--role' && args[1]) {
    role = args[1];
    args.splice(0, 2);
  }
  if (args[0] === '--models') {
    return { models: true, role, prompt: '' };
  }
  const prompt = args.join(' ').trim();
  return { models: false, role, prompt };
}

const { models, role, prompt } = parseArgs(process.argv.slice(2));

if (!models && !prompt) {
  fail('usage', 'node relay.mjs [--role planner|analyst|reviewer|writer] "prompt" | --models');
}

if (!existsSync(authPath)) {
  fail('auth_missing', `auth.txt not found at ${authPath}`);
}

const token = readFileSync(authPath, 'utf8').trim();
if (token.length < 40) {
  fail('auth_invalid', `token too short after trim: ${token.length} bytes`);
}

async function apiCall(url, body) {
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    fail('bad_response', 'non-JSON response', { status: res.status, body: text.slice(0, 300) });
  }
  if (!res.ok) {
    fail('api_error', data?.error?.message || 'request failed', { status: res.status, detail: data });
  }
  return data;
}

if (models) {
  const data = await apiCall(MODELS_ENDPOINT);
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

const systemPrompt = ROLE_PROMPTS[role] || ROLE_PROMPTS.default;

const data = await apiCall(ENDPOINT, {
  model: MODEL,
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ],
});

const content = data?.choices?.[0]?.message?.content;
if (!content) {
  fail('empty_content', 'no assistant message in response', { detail: data });
}

process.stdout.write(content);
