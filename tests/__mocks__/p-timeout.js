/**
 * Mock for p-timeout to avoid ESM import issues in tests
 */

class TimeoutError extends Error {
  constructor(message = 'Promise timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

function pTimeout(promise, timeout, fallback) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      if (typeof fallback === 'function') {
        resolve(fallback());
      } else if (fallback !== undefined) {
        resolve(fallback);
      } else {
        reject(new TimeoutError());
      }
    }, timeout);

    promise.then(
      value => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      error => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

pTimeout.TimeoutError = TimeoutError;

// CommonJS export for Jest
module.exports = pTimeout;
module.exports.default = pTimeout;
module.exports.TimeoutError = TimeoutError;
