// "Explain availability" service. The deterministic checker is the only authority on availability;
// the adapter (LLM or mock) may only phrase the result. Any problem degrades to a deterministic fallback.
import {checkAvailability} from '../domain/availability.js';
import {parseTime} from '../domain/time.js';
import {NOW_LABEL, MAX_DURATION} from '../config.js';
import {LIMITS, validateExplainRequest, validateExplanation} from './contract.js';

export const LABELS = Object.freeze({
  generated: 'Generated explanation (not a confirmed booking)',
  fallback: 'Standard rule message (explanation service unavailable)'
});

function withTimeout(run, ms) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(Object.assign(new Error('timeout'), {code: 'timeout'})); }, ms);
  });
  return Promise.race([Promise.resolve().then(() => run(controller.signal)), timeout]).finally(() => clearTimeout(timer));
}

const rejected = (error, message) => ({ok: false, error, message, generated: false});

export async function explainAvailability(request, {rooms, now, adapter, timeoutMs = LIMITS.TIMEOUT_MS} = {}) {
  const parsed = validateExplainRequest(request);
  if (!parsed.ok) return rejected(parsed.error, parsed.message);
  const {roomId, start, end, isAvailable, reasonCode} = parsed.value;

  const room = rooms.find(r => r.id === roomId);
  if (!room) return rejected('unknown_room', 'That room does not exist.');

  // The rule engine is re-run here; the caller cannot supply or forge the decision.
  const result = checkAvailability(room, parseTime(start), parseTime(end), now);
  if (result.available !== isAvailable || result.code !== reasonCode) {
    return rejected('mismatch', 'The supplied result does not match the booking rules.');
  }
  const decision = {available: result.available, code: result.code};
  const fallback = reason => ({ok: true, generated: false, source: 'fallback', fallbackReason: reason, label: LABELS.fallback, explanation: result.message, decision});

  if (!adapter || typeof adapter.explain !== 'function') return fallback('no_adapter');

  // Minimal context: no capacity, equipment, other bookings or personal data.
  const facts = {roomId, roomLabel: `${room.name} (${room.id})`, start, end, isAvailable: result.available, reasonCode: result.code, nowLabel: NOW_LABEL, maxMinutes: MAX_DURATION};

  let output;
  try {
    output = await withTimeout(signal => adapter.explain(facts, {signal}), timeoutMs);
  } catch (err) {
    return fallback(err && err.code === 'timeout' ? 'timeout' : 'adapter_error');
  }
  const checked = validateExplanation(output, facts);
  if (!checked.ok) return fallback(`invalid_output:${checked.error}`);

  return {ok: true, generated: true, source: adapter.name, label: LABELS.generated, explanation: checked.value.explanation, decision};
}
