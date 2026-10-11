// Work that settles within `timeoutMs`, one way or the other — on our clock. Clinch's
// server/src/deadline.ts, in plain JavaScript.
//
// The signal handed to `work` is the polite half: it asks `fetch` to drop the request. It is not
// the guarantee. On 2026-10-09 one of Clinch's polls never settled at all, although its request
// was aborted after 12 seconds: no result, no error, no timeout, and everything that waited on it
// waited with it for two days. The race below rejects at the deadline whatever `fetch` does, and
// if `work` turns up afterwards its answer goes nowhere.

/**
 * @template T
 * @param {number} timeoutMs
 * @param {(signal: AbortSignal) => Promise<T>} work
 * @returns {Promise<T>}
 */
export function withDeadline(timeoutMs, work) {
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`no answer within ${timeoutMs}ms`);
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });
  return Promise.race([work(controller.signal), deadline]).finally(() => clearTimeout(timer));
}
