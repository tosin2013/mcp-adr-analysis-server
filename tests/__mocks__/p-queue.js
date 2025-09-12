/**
 * Mock for p-queue to avoid ESM import issues in tests
 */

class MockPQueue {
  constructor(options = {}) {
    this.options = options;
    this.pending = 0;
    this.size = 0;
    this.isPaused = false;
  }

  async add(fn, options = {}) {
    this.pending++;
    this.size++;
    try {
      const result = await fn();
      return result;
    } finally {
      this.pending--;
      this.size--;
    }
  }

  async addAll(functions, options = {}) {
    const results = [];
    for (const fn of functions) {
      results.push(await this.add(fn, options));
    }
    return results;
  }

  pause() {
    this.isPaused = true;
  }

  start() {
    this.isPaused = false;
  }

  clear() {
    this.size = 0;
  }

  async onEmpty() {
    return Promise.resolve();
  }

  async onIdle() {
    return Promise.resolve();
  }
}

// Both CommonJS and ESM style exports to handle Jest's import resolution
module.exports = MockPQueue;
module.exports.default = MockPQueue;

// Also make it available as a constructor when imported as default
Object.defineProperty(module.exports, 'default', {
  value: MockPQueue,
  enumerable: true,
  configurable: true,
});
