// Feature contract for "Explain availability" (see docs/FEATURE_CONTRACT.md).
// Everything here is pure and deterministic so it can be unit-tested without a model.
import {parseTime} from '../domain/time.js';

export const LIMITS = Object.freeze({MAX_ID_LENGTH: 16, MAX_TIME_LENGTH: 5, MAX_EXPLANATION_CHARS: 280, MAX_SENTENCES: 2, TIMEOUT_MS: 3000});
export const REASON_CODES = Object.freeze(['available', 'blocked', 'overlap', 'invalid', 'order', 'now', 'duration']);
const ID_RE = /^[A-Za-z0-9-]+$/;

const fail = (error, message) => ({ok: false, error, message});

function checkString(label, value, max) {
  if (typeof value !== 'string') return fail('malformed', `${label} must be text.`);
  if (value.trim() === '') return fail('empty', `${label} is required.`);
  if (value.length > max) return fail('too_long', `${label} is too long (max ${max} characters).`);
  return null;
}

/** Validates the request sent to the explanation service. Untrusted input. */
export function validateExplainRequest(req) {
  if (req === null || typeof req !== 'object' || Array.isArray(req)) return fail('malformed', 'Request must be an object.');
  const {roomId, start, end, isAvailable, reasonCode} = req;
  const idErr = checkString('Room', roomId, LIMITS.MAX_ID_LENGTH);
  if (idErr) return idErr;
  if (!ID_RE.test(roomId)) return fail('malformed', 'Room id has invalid characters.');
  for (const [label, value] of [['Start time', start], ['End time', end]]) {
    const err = checkString(label, value, LIMITS.MAX_TIME_LENGTH);
    if (err) return err;
    if (parseTime(value) === null) return fail('malformed', `${label} must look like HH:MM.`);
  }
  if (typeof isAvailable !== 'boolean') return fail('malformed', 'isAvailable must be true or false.');
  if (!REASON_CODES.includes(reasonCode)) return fail('malformed', 'Unknown reason code.');
  return {ok: true, value: {roomId, start, end, isAvailable, reasonCode}};
}

// Closed vocabulary: explanation words must come from this list or from the supplied room label.
// This is what enforces "no invented booking details" (people, other rooms, policies, commitments).
const ALLOWED_WORDS = new Set(`a an the and or no not is are be it this that so for of in at to from after than later longer most maximum
minute minutes long time window start end selected available unavailable booking bookings booked rule rules blocks blocked temporarily
overlaps overlap existing because room request valid invalid must can cannot isn't can't please choose good news sorry`.split(/\s+/));
const wordsOf = text => (text.replace(/[\u2019]/g, "'").match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || []).map(w => w.toLowerCase());

const normTime = t => t.replace(/^0(\d:)/, '$1');
const POSITIVE_CLAIM = /\b(?<!not )(?<!un)(is|are|be) (currently |now )?(available|free|open)\b/i;
const NEGATIVE_MARKER = /\b(not|unavailable|cannot|can't|isn't|blocked|invalid|must|longer than|later than|after)\b/i;
const BOOKING_CLAIM = /\b(booked for you|i (have |'ve )?(booked|reserved)|has been (booked|reserved)|is (now )?(booked|reserved|confirmed)|confirmed)\b/i;

/**
 * Validates model output against the deterministic facts. Heuristic checks, not a proof of truth:
 * it blocks the common failure modes (wrong status, extra numbers/times, markup, over-length, booking claims).
 */
export function validateExplanation(output, facts) {
  if (output === null || typeof output !== 'object' || Array.isArray(output)) return fail('bad_shape', 'Output must be an object.');
  const keys = Object.keys(output);
  if (keys.length !== 1 || keys[0] !== 'explanation') return fail('bad_shape', 'Output must be exactly {explanation}.');
  const text = output.explanation;
  if (typeof text !== 'string') return fail('bad_shape', 'explanation must be a string.');
  const t = text.trim();
  if (t === '') return fail('empty', 'Explanation is empty.');
  if (t.length > LIMITS.MAX_EXPLANATION_CHARS) return fail('too_long', 'Explanation is too long.');
  if (/[<>]/.test(t) || /https?:\/\/|www\./i.test(t)) return fail('markup', 'Explanation must be plain text.');
  const sentences = t.split(/[.!?]+(?:\s+|$)/).filter(s => s.trim() !== '');
  if (sentences.length > LIMITS.MAX_SENTENCES) return fail('too_many_sentences', 'More than two sentences.');
  if (BOOKING_CLAIM.test(t)) return fail('booking_claim', 'Explanation claims a booking or confirmation.');
  if (facts.isAvailable) {
    if (/\b(not available|unavailable|blocked|cannot|can't|unable)\b/i.test(t) || !/\bavailable\b/i.test(t)) return fail('status_mismatch', 'Explanation contradicts "available".');
  } else if (POSITIVE_CLAIM.test(t) || !NEGATIVE_MARKER.test(t)) {
    return fail('status_mismatch', 'Explanation contradicts "not available".');
  }
  const labelWords = new Set(wordsOf(facts.roomLabel || ''));
  for (const w of wordsOf(t)) {
    if (!ALLOWED_WORDS.has(w) && !labelWords.has(w)) return fail('unsupported_words', `Explanation uses "${w}", which is not in the allowed vocabulary.`);
  }
  const allowed = new Set([facts.start, facts.end, facts.nowLabel, String(facts.maxMinutes)].filter(Boolean).map(normTime));
  for (const d of `${facts.roomLabel || ''} ${facts.roomId || ''}`.match(/\d+/g) || []) allowed.add(d);
  for (const token of t.match(/\d+(?::\d{2})?/g) || []) {
    if (!allowed.has(normTime(token))) return fail('unsupported_fact', `Explanation mentions "${token}", which was not supplied.`);
  }
  return {ok: true, value: {explanation: t}};
}
