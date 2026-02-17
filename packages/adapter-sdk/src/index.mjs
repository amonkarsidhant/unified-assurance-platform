export class AdapterError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'AdapterError';
    this.details = details;
  }
}

export function createAdapterResult({ execution = null, evidence = [], signals = [], noData = false, warnings = [] } = {}) {
  return { execution, evidence, signals, noData, warnings };
}

export function assertAdapterInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AdapterError('adapter input must be an object');
  }
  if (!('payload' in input)) {
    throw new AdapterError('adapter input payload is required');
  }
  return input;
}
