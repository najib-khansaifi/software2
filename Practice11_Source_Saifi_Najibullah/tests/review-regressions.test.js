// Regression tests for the two confirmed findings of the agentic review (docs/AGENTIC_REVIEW.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateExplanation} from '../src/ai/contract.js';
import {timeRow} from '../src/ui/render.js';

const avail = {roomId: 'A-305', roomLabel: 'Atlas Seminar Room (A-305)', start: '13:00', end: '14:00', isAvailable: true, reasonCode: 'available', nowLabel: '09:00', maxMinutes: 120};
const busy = {...avail, isAvailable: false, reasonCode: 'overlap'};

// F1: invented booking details / policies / people / other rooms must be rejected (AC2).
const invented = [
  [avail, 'The room is available. Professor Smith booked the slot before.'],
  [avail, 'Atlas Seminar Room is available; Byte Computing Studio is also free.'],
  [avail, 'The room is available, but bookings need dean approval.'],
  [avail, 'It is available, and three other groups use it later.'],
  [avail, 'Available. Your slot is secured.'],
  [avail, 'It is available, so go ahead and reserve it now.'],
  [busy, 'Not available: Dr. Jones holds that slot.'],
  [busy, 'The room is vacant; it must be yours.'],
  [busy, 'Not available. Email bob at example for another room.']
];
for (const [facts, text] of invented) test(`F1 rejects invented content: ${text}`, () => assert.equal(validateExplanation({explanation: text}, facts).ok, false));

const legit = [
  [avail, 'Atlas Seminar Room (A-305) is available from 13:00 to 14:00. No rule or booking blocks that window.'],
  [avail, 'Good news: Atlas Seminar Room (A-305) is available from 13:00 to 14:00.'],
  [busy, 'Atlas Seminar Room (A-305) is not available from 13:00 to 14:00 because that window overlaps an existing booking.'],
  [{...busy, reasonCode: 'blocked'}, 'Atlas Seminar Room (A-305) is not available from 13:00 to 14:00 because the room is temporarily blocked.'],
  [{...busy, reasonCode: 'duration', end: '17:00'}, 'Atlas Seminar Room (A-305) is not available from 13:00 to 17:00 because that window is longer than the 120-minute maximum.']
];
for (const [facts, text] of legit) test(`F1 still accepts grounded wording: ${text.slice(0, 50)}…`, () => assert.equal(validateExplanation({explanation: text}, facts).ok, true));

// F2: time values come from the URL and must be escaped before entering innerHTML.
test('F2 time inputs escape attribute-breaking values', () => {
  const html = timeRow({start: '" autofocus onfocus=alert(1) x="', end: '12:00'});
  // Every <input> tag must contain exactly id/type/value: no injected attributes.
  const tags = html.match(/<input [^>]*>/g);
  assert.equal(tags.length, 2);
  for (const tag of tags) assert.match(tag, /^<input id="(start|end)" type="time" value="[^"]*">$/);
  assert.match(tags[0], /value="&quot; autofocus onfocus=alert\(1\) x=&quot;"/);
});
test('F2 normal times still render', () => assert.match(timeRow({start: '11:00', end: '12:00'}), /id="start" type="time" value="11:00"[\s\S]*id="end" type="time" value="12:00"/));
