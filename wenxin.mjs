#!/usr/bin/env node
/**
 * 文心推演引擎 · 齐静春.skill
 * 用法:
 *   node wenxin.mjs "问心"
 *   node wenxin.mjs --xiang fuzi|shenwen|zhibi|moxuan "问心"
 *   node wenxin.mjs --yuejuan
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const authCandidates = [
  join(__dirname, '..', 'auth.txt'),
  join(__dirname, '..', '..', 'auth.txt'),
];
const wenxinPath = authCandidates.find((p) => existsSync(p));

const ENDPOINT = 'https://codex.1iiu.com/v1/chat/completions';
const YUEJUAN_ENDPOINT = 'https://codex.1iiu.com/v1/models';
const MODEL = 'gpt-5.5';

const XIANG = {
  fuzi: `你是夫子相，掌风使者替你执行。严格 JSON：{"analysis":"","actions":[{"tool":"","params":"","reason":""}],"report":"","deliverable":""}。report 中文≤300字。`,
  shenwen: `你是审文相。中文：一句话结论、三要点、可信度、下一步。≤400字。`,
  zhibi: `你是执笔相。直接输出完整中文文章/markdown。`,
  moxuan: `你是默玄相。简洁中文答问。代码用块，架构用要点。`,
};

function fail(code, message, extra = {}) {
  console.error(JSON.stringify({ error: code, message, ...extra }));
  process.exit(1);
}

function parseArgs(argv) {
  const args = [...argv];
  let xiang = 'moxuan';
  if (args[0] === '--xiang' && args[1]) {
    xiang = args[1];
    args.splice(0, 2);
  }
  if (args[0] === '--yuejuan') {
    return { yuejuan: true, xiang, prompt: '' };
  }
  const prompt = args.join(' ').trim();
  return { yuejuan: false, xiang, prompt };
}

const { yuejuan, xiang, prompt } = parseArgs(process.argv.slice(2));

if (!yuejuan && !prompt) {
  fail('usage', 'node wenxin.mjs [--xiang fuzi|shenwen|zhibi|moxuan] "问心" | --yuejuan');
}

if (!wenxinPath) {
  fail('wenxin_missing', `文心帖未找到，请将 auth.txt 置于工作区根目录`);
}

const tie = readFileSync(wenxinPath, 'utf8').trim();
if (tie.length < 40) {
  fail('wenxin_invalid', `文心帖长度异常：${tie.length}`);
}

async function wenxinCall(url, body) {
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${tie}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    fail('bad_response', '非 JSON 回响', { status: res.status, body: text.slice(0, 300) });
  }
  if (!res.ok) {
    fail('wenxin_error', data?.error?.message || '推演失败', { status: res.status, detail: data });
  }
  return data;
}

if (yuejuan) {
  const data = await wenxinCall(YUEJUAN_ENDPOINT);
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

const systemPrompt = XIANG[xiang] || XIANG.moxuan;

const data = await wenxinCall(ENDPOINT, {
  model: MODEL,
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ],
});

const content = data?.choices?.[0]?.message?.content;
if (!content) {
  fail('empty', '先贤无答', { detail: data });
}

process.stdout.write(content);
