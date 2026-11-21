import {esc} from './render.js';

export const explainSignature = (roomId, start, end, code) => `${roomId}|${start}|${end}|${code}`;

const SOURCE_NAMES = {mock: 'Mock AI (demo, no real model)', remote: 'AI model'};

/** Renders the optional explanation area under the deterministic status. Pure: state in, HTML out. */
export function explainPanel(availability, ai) {
  if (!availability) return '';
  const busy = ai.status === 'loading';
  const button = `<button id="explain" class="secondary" ${busy ? 'disabled' : ''}>Explain availability</button>`;
  let body = '';
  if (busy) {
    body = '<div class="explain loading" role="status">Generating explanation…</div>';
  } else if (ai.status === 'done' && ai.result) {
    const r = ai.result;
    if (!r.ok) {
      body = `<div class="explain error" role="alert"><strong>Cannot explain this request</strong><span>${esc(r.message)}</span></div>`;
    } else if (r.generated) {
      body = `<div class="explain generated" role="status"><span class="tag">${esc(SOURCE_NAMES[r.source] || 'Generated')}</span><p>${esc(r.explanation)}</p><small>${esc(r.label)}. The status above comes from the booking rules.</small></div>`;
    } else {
      body = `<div class="explain fallback" role="status"><span class="tag">Standard rule message</span><p>${esc(r.explanation)}</p><small>${esc(r.label)}. Availability above is unchanged.</small></div>`;
    }
  }
  return `<div class="explain-wrap">${button}${body}</div>`;
}
