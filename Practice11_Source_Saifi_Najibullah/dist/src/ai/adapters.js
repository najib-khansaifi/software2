// LLM adapters. An adapter is {name, explain(facts, {signal}) -> Promise<{explanation}>}.
// No secrets live here: the browser only ever talks to the mock or to a server-side proxy URL.

const sleep = (ms, signal) => new Promise((resolve, reject) => {
  const timer = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('aborted')); }, {once: true});
});

const REASON_TEXT = {
  available: f => `${f.roomLabel} is available from ${f.start} to ${f.end}. No booking or rule blocks that time.`,
  overlap: f => `${f.roomLabel} is not available from ${f.start} to ${f.end} because that time overlaps an existing booking.`,
  blocked: f => `${f.roomLabel} is not available from ${f.start} to ${f.end} because the room is temporarily blocked.`,
  order: f => `That request is not valid: the end time (${f.end}) must be later than the start time (${f.start}).`,
  now: f => `${f.roomLabel} is not available because the start time (${f.start}) must be after ${f.nowLabel}.`,
  duration: f => `${f.roomLabel} is not available because bookings can be at most ${f.maxMinutes} minutes long.`,
  invalid: () => 'That request is not valid, so the room cannot be booked. Please choose a start and end time.'
};

/** Clearly labelled mock: builds the explanation from the structured facts only. No network, no key. */
export function createMockAdapter({delayMs = 0} = {}) {
  return {
    name: 'mock',
    async explain(facts, {signal} = {}) {
      if (delayMs) await sleep(delayMs, signal);
      const build = REASON_TEXT[facts.reasonCode];
      return {explanation: build ? build(facts) : 'No explanation is available for this result.'};
    }
  };
}

/** Test/demo adapters for the failure paths (timeout and API error). */
export const createSlowAdapter = ({delayMs = 60000} = {}) => ({name: 'slow-mock', explain: (_f, {signal} = {}) => sleep(delayMs, signal).then(() => ({explanation: 'late'}))});
export const createFailingAdapter = (message = 'simulated API failure') => ({name: 'failing-mock', explain: async () => { throw new Error(message); }});

/**
 * Adapter for a real model behind YOUR server (the server holds the API key and applies SYSTEM_PROMPT).
 * The browser sends only the minimal facts object. Not deployed in this static classroom build.
 */
export function createRemoteAdapter({endpoint = '/api/explain', fetchImpl = globalThis.fetch} = {}) {
  return {
    name: 'remote',
    async explain(facts, {signal} = {}) {
      const res = await fetchImpl(endpoint, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({facts}), signal});
      if (!res.ok) throw new Error(`explain endpoint returned ${res.status}`);
      return res.json();
    }
  };
}
