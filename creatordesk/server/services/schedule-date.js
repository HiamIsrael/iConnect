import { validationError } from '../errors.js';

export function scheduleDate(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(Z|[+-]\d\d:\d\d)$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    Date.parse(value) < Date.now() + 60000
  ) {
    throw validationError(
      'Choose a future date at least one minute away, with an explicit timezone.',
    );
  }
  return new Date(value).toISOString();
}
