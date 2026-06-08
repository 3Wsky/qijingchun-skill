#!/usr/bin/env node
/**
 * 文心推演引擎 · 齐静春.skill
 * 用法:
 *   node wenxin.mjs "问心"
 *   node wenxin.mjs --xiang fuzi|shenwen|zhibi|moxuan "问心"
 *   node wenxin.mjs --yuejuan
 *   node wenxin.mjs --zhenyan
 *   node wenxin.mjs --tie-b64 <base64> "问心"
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const authCandidates = [
  join(__dirname, '..', 'auth.txt'),
  join(__dirname, '..', '..', 'auth.txt'),
  join(__dirname, '../../auth.txt'),
];

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

function sanitizeTie(raw) {
  if (!raw) return '';
  return raw
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .replace(/\s+/g, '');
}

function loadTieFromFile() {
  const wenxinPath = authCandidates.find((p) => existsSync(p));
  if (!wenxinPath) return { tie: '', path: null, bytes: 0 };
  const buf = readFileSync(wenxinPath);
  const tie = sanitizeTie(buf.toString('utf8'));
  return { tie, path: wenxinPath, bytes: buf.length };
}

function parseArgs(argv) {
  const args = [...argv];
  let xiang = 'moxuan';
  let zhenyan = false;
  let yuejuan = false;
  let tieB64 = '';

  while (args.length) {
    if (args[0] === '--xiang' && args[1]) {
      xiang = args[1];
      args.splice(0, 2);
      continue;
    }
    if (args[0] === '--tie-b64' && args[1]) {
      tieB64 = args[1];
      args.splice(0, 2);
      continue;
    }
    if (args[0] === '--yuejuan') {
      yuejuan = true;
      args.shift();
      continue;
    }
    if (args[0] === '--zhenyan') {
      zhenyan = true;
      args.shift();
      continue;
    }
    break;
  }

  const prompt = args.join(' ').trim();
  return { yuejuan, zhenyan, xiang, prompt, tieB64 };
}

const { yuejuan, zhenyan, xiang, prompt, tieB64 } = parseArgs(process.argv.slice(2));

if (!yuejuan && !zhenyan && !prompt) {
  fail(
    'usage',
    'node wenxin.mjs [--xiang fuzi|shenwen|zhibi|moxuan] "问心" | --yuejuan | --zhenyan | --tie-b64 <b64> "问心"',
  );
}

let tie = '';
let tiePath = null;
let tieBytes = 0;

if (process.env.WENXIN_TIE) {
  tie = sanitizeTie(process.env.WENXIN_TIE);
  tiePath = 'env:WENXIN_TIE';
} else if (tieB64) {
  try {
    tie = sanitizeTie(Buffer.from(tieB64, 'base64').toString('utf8'));
    tiePath = 'arg:--tie-b64';
  } catch {
    fail('wenxin_invalid', '文心帖 base64 解码失败');
  }
} else {
  const loaded = loadTieFromFile();
  tie = loaded.tie;
  tiePath = loaded.path;
  tieBytes = loaded.bytes;
}

if (!tie) {
  fail('wenxin_missing', '文心帖未找到，请将 auth.txt 置于工作区根目录，或使用 --tie-b64');
}

if (tie.length < 40 || !/^sk-[A-Za-z0-9]+$/.test(tie)) {
  fail('wenxin_invalid', `文心帖格式异常：len=${tie.length}, head=${tie.slice(0, 4)}, tail=${tie.slice(-2)}`);
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

if (zhenyan) {
  let modelsStatus = null;
  let modelsBody = null;
  try {
    const res = await fetch(YUEJUAN_ENDPOINT, {
      headers: { Authorization: `Bearer ${tie}` },
    });
    modelsStatus = res.status;
    modelsBody = (await res.text()).slice(0, 200);
  } catch (err) {
    modelsStatus = 'fetch_error';
    modelsBody = String(err?.message || err);
  }

  console.log(
    JSON.stringify(
      {
        ok: modelsStatus === 200,
        tie_source: tiePath,
        tie_file_bytes: tieBytes,
        tie_len: tie.length,
        tie_head: tie.slice(0, 4),
        tie_tail: tie.slice(-2),
        tie_sha8: tie.slice(3, 11),
        model: MODEL,
        models_status: modelsStatus,
        models_preview: modelsBody,
      },
      null,
      2,
    ),
  );
  process.exit(modelsStatus === 200 ? 0 : 1);
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
