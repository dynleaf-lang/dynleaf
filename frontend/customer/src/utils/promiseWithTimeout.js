
/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within the timeout,
 * it will reject with a timeout error.
 * 
 * @param {Promise} promise - The promise to wrap with a timeout
 * @param {number} timeoutMs - The timeout in milliseconds
 * @param {string} errorMessage - The error message to show on timeout
 * @returns {Promise} - A promise that will reject if the timeout is exceeded
 */
export const promiseWithTimeout = (promise, timeoutMs = 15000, errorMessage = 'Request timed out') => {
  // Create a timeout promise that rejects after the specified time
  const timeoutPromise = new Promise((_, reject) => {
    const timeoutId = setTimeout(() => {
      clearTimeout(timeoutId);
      reject(new Error(`${errorMessage} after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  // Race the original promise against the timeout
  return Promise.race([promise, timeoutPromise]);
};
