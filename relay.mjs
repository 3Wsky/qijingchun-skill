#!/usr/bin/env node
/**
 * codex-relay — workspace external inference relay
 * Usage: node relay.mjs "your question"
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = join(__dirname, '..', '..');
const authPath = join(workspaceRoot, 'auth.txt');

const ENDPOINT = 'https://codex.1iiu.com/v1/chat/completions';
const MODELS_ENDPOINT = 'https://codex.1iiu.com/v1/models';
const MODEL = 'gpt-5.5';

function fail(code, message, extra = {}) {
  console.error(JSON.stringify({ error: code, message, ...extra }));
  process.exit(1);
}

const prompt = process.argv.slice(2).join(' ').trim();
if (!prompt) {
  fail('usage', 'node relay.mjs "your question"');
}

if (!existsSync(authPath)) {
  fail('auth_missing', `auth.txt not found at ${authPath}`);
}

const raw = readFileSync(authPath, 'utf8');
const token = raw.trim();

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

// --models flag for diagnostics
if (prompt === '--models') {
  const data = await apiCall(MODELS_ENDPOINT);
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

const data = await apiCall(ENDPOINT, {
  model: MODEL,
  messages: [{ role: 'user', content: prompt }],
});

const content = data?.choices?.[0]?.message?.content;
if (!content) {
  fail('empty_content', 'no assistant message in response', { detail: data });
}

process.stdout.write(content);
