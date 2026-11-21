// Dependency-free lint: syntax check, no secrets in client code, no eval/new Function.
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const walk = dir => readdirSync(dir).flatMap(n => { const p = path.join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const problems = [];
for (const file of ['src', 'tests', 'tools'].flatMap(d => walk(path.join(root, d))).filter(f => f.endsWith('.js'))) {
  const rel = path.relative(root, file);
  try { execFileSync(process.execPath, ['--check', file], {stdio: 'pipe'}); } catch (e) { problems.push(`${rel}: syntax error`); continue; }
  const text = readFileSync(file, 'utf8');
  if (rel.startsWith('src')) {
    if (/\b(sk-[A-Za-z0-9_-]{16,}|api[_-]?key\s*[:=]|Bearer\s+[A-Za-z0-9._-]{12,})/i.test(text)) problems.push(`${rel}: possible secret in client code`);
    if (/\beval\s*\(|new\s+Function\s*\(/.test(text)) problems.push(`${rel}: eval/new Function is not allowed`);
  }
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log('Lint OK');
