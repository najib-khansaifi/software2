// Scores the recorded prompt-trial outputs with the SAME validator the app uses.
// Usage: node tools/score-prompts.js
import {readFileSync, writeFileSync} from 'node:fs';
import {validateExplanation, LIMITS} from '../src/ai/contract.js';

const cases = JSON.parse(readFileSync(new URL('../docs/prompt-trial-cases.json', import.meta.url)));
const {outputs} = JSON.parse(readFileSync(new URL('../docs/prompt-trial-outputs.json', import.meta.url)));
const sentences = t => t.split(/[.!?]+(?:\s+|$)/).filter(s => s.trim()).length;
const rows = [];
for (const version of ['v1', 'v2', 'v3']) {
  outputs[version].forEach((raw, i) => {
    const facts = {...cases[i].facts, roomId: ''};
    let json = null; try { const p = JSON.parse(raw); if (p && typeof p.explanation === 'string') json = p.explanation; } catch {}
    const text = json ?? raw;
    const verdict = validateExplanation({explanation: text}, facts);
    const status = facts.isAvailable ? /\bavailable\b/i.test(text) && !/not available|isn't available|can't be booked/i.test(text) : /not available|isn't available|can't be booked|cannot/i.test(text);
    rows.push({version, case: cases[i].id, name: cases[i].name, jsonContract: json !== null, sentences: sentences(text), chars: text.length, statusAgrees: status, extraAdvice: /try a different|another room|shorten|check whether|you could|you might|you may want/i.test(text), validator: verdict.ok ? 'pass' : `fail:${verdict.error}`, text});
  });
}
const summary = {};
for (const v of ['v1', 'v2', 'v3']) {
  const r = rows.filter(x => x.version === v);
  summary[v] = {n: r.length, jsonContract: r.filter(x => x.jsonContract).length, within2Sentences: r.filter(x => x.sentences <= LIMITS.MAX_SENTENCES).length, statusAgrees: r.filter(x => x.statusAgrees).length, noExtraAdvice: r.filter(x => !x.extraAdvice).length, validatorPass: r.filter(x => x.validator === 'pass').length, avgChars: Math.round(r.reduce((a, x) => a + x.chars, 0) / r.length)};
}
writeFileSync(new URL('../docs/prompt-scores.json', import.meta.url), JSON.stringify({summary, rows}, null, 1));
console.table(summary); console.table(rows.map(({text, ...r}) => r));
