import test from 'node:test';
import assert from 'node:assert/strict';
import {validateExplainRequest, validateExplanation, LIMITS} from '../src/ai/contract.js';

const ok = {roomId: 'A-305', start: '13:00', end: '14:00', isAvailable: true, reasonCode: 'available'};
const facts = {roomId: 'A-305', roomLabel: 'Atlas Seminar Room (A-305)', start: '13:00', end: '14:00', isAvailable: true, reasonCode: 'available', nowLabel: '09:00', maxMinutes: 120};
const unavailable = {...facts, isAvailable: false, reasonCode: 'overlap'};

test('valid request accepted', () => assert.equal(validateExplainRequest(ok).ok, true));
test('null / array / string request rejected', () => { for (const bad of [null, [], 'x', 5, undefined]) assert.equal(validateExplainRequest(bad).error, 'malformed'); });
test('empty room rejected', () => assert.equal(validateExplainRequest({...ok, roomId: '  '}).error, 'empty'));
test('empty time rejected', () => { assert.equal(validateExplainRequest({...ok, start: ''}).error, 'empty'); assert.equal(validateExplainRequest({...ok, end: ' '}).error, 'empty'); });
test('long room id rejected', () => assert.equal(validateExplainRequest({...ok, roomId: 'A'.repeat(LIMITS.MAX_ID_LENGTH + 1)}).error, 'too_long'));
test('very long input (500 chars) rejected', () => assert.equal(validateExplainRequest({...ok, roomId: 'x'.repeat(500)}).error, 'too_long'));
test('malformed time rejected', () => { for (const t of ['25:00', '9:5', 'ab:cd', '12:60', '1200']) assert.equal(validateExplainRequest({...ok, start: t}).ok, false, t); });
test('room id with markup rejected', () => assert.equal(validateExplainRequest({...ok, roomId: '<b>x</b>'}).error, 'malformed'));
test('non-boolean isAvailable rejected', () => assert.equal(validateExplainRequest({...ok, isAvailable: 'true'}).error, 'malformed'));
test('unknown reason code rejected', () => assert.equal(validateExplainRequest({...ok, reasonCode: 'maybe'}).error, 'malformed'));

test('good explanation accepted', () => assert.equal(validateExplanation({explanation: 'Atlas Seminar Room (A-305) is available from 13:00 to 14:00.'}, facts).ok, true));
test('good unavailable explanation accepted', () => assert.equal(validateExplanation({explanation: 'Atlas Seminar Room (A-305) is not available from 13:00 to 14:00 because it overlaps an existing booking.'}, unavailable).ok, true));
test('non-object / wrong shape rejected', () => { for (const bad of [null, 'text', [], {}, {explanation: 5}, {explanation: 'ok', extra: 1}]) assert.equal(validateExplanation(bad, facts).error, 'bad_shape'); });
test('empty explanation rejected', () => assert.equal(validateExplanation({explanation: '   '}, facts).error, 'empty'));
test('over-length explanation rejected', () => assert.equal(validateExplanation({explanation: 'It is available. ' + 'x'.repeat(300)}, facts).error, 'too_long'));
test('three sentences rejected', () => assert.equal(validateExplanation({explanation: 'It is available. Nice. Enjoy.'}, facts).error, 'too_many_sentences'));
test('markup and links rejected', () => { assert.equal(validateExplanation({explanation: '<b>available</b>'}, facts).error, 'markup'); assert.equal(validateExplanation({explanation: 'It is available, see https://x.example'}, facts).error, 'markup'); });
test('says available when checker says not -> rejected', () => assert.equal(validateExplanation({explanation: 'Good news, the room is available.'}, unavailable).error, 'status_mismatch'));
test('says not available when checker says available -> rejected', () => assert.equal(validateExplanation({explanation: 'Sorry, the room is not available.'}, facts).error, 'status_mismatch'));
test('invented time rejected', () => assert.equal(validateExplanation({explanation: 'The room is available from 15:30 to 16:00.'}, facts).error, 'unsupported_fact'));
test('time written without leading zero is the same time', () => assert.equal(validateExplanation({explanation: 'The room is available from 9:00 to 10:00.'}, {...facts, start: '09:00', end: '10:00'}).ok, true));
test('booking / confirmation claim rejected', () => { for (const t of ['The room is available and I have booked it for you.', 'Available, your booking is confirmed.']) assert.equal(validateExplanation({explanation: t}, facts).error, 'booking_claim', t); });
