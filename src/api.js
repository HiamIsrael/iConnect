const TOKEN_KEY = 'iconnect_token';

// Tunable resilience settings. Mutable on purpose so tests can shrink the
// timeouts/delays. GET requests are retried; mutations (POST/PUT/DELETE)
// are never retried.
export const RETRY = {
  attempts: 3,
  delaysMs: [1000, 3000],
  timeoutMs: 20000,
  slowAfterMs: 2500,
};

export const SERVER_WAKING_MESSAGE =
  "Can't reach the server right now. It may be waking up — please try again in a moment.";

const GATEWAY_STATUSES = [502, 503, 504];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- API status feed -------------------------------------------------------
// Drives the <ServerStatus /> toast so a slow or waking server is always
// visible instead of a silently blank page.

let apiStatus = { state: 'idle', attempt: 0, attempts: RETRY.attempts };
const statusListeners = new Set();

function publishApiStatus(state, attempt = 0) {
  apiStatus = { state, attempt, attempts: RETRY.attempts };
  for (const listener of statusListeners) {
    try {
      listener(apiStatus);
    } catch (error) {
      console.error('API status listener error', error);
    }
  }
}

export function getApiStatus() {
  return apiStatus;
}

export function subscribeApiStatus(listener) {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

// --- Token storage (safe when localStorage is unavailable) ------------------

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Non-browser environments (unit tests) or blocked storage — no-op.
  }
}

// --- Resilient fetch ---------------------------------------------------------

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function httpError(data, status, fallbackMessage) {
  const error = new Error(data.error || fallbackMessage || `Request failed with status ${status}`);
  error.status = status;
  error.retryable = false;
  return error;
}

function unreachableError() {
  const error = new Error(SERVER_WAKING_MESSAGE);
  error.status = 0;
  error.retryable = false;
  return error;
}

async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const attempts = isGet ? RETRY.attempts : 1;
  const timeoutMs = isGet ? RETRY.timeoutMs : RETRY.timeoutMs * 3;

  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  // Flag the UI as soon as a request is taking longer than expected.
  const slowTimer = setTimeout(() => {
    if (getApiStatus().state !== 'retrying') publishApiStatus('slow', 1);
  }, RETRY.slowAfterMs);

  let error = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        `/api${path}`,
        {
          ...options,
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
        },
        timeoutMs,
      );
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        clearTimeout(slowTimer);
        publishApiStatus('idle', 0);
        return data;
      }
      error = httpError(data, response.status);
      // Only gateway errors (a sleeping/waking server) are worth retrying,
      // and only for GET — retrying a mutation could apply it twice.
      error.retryable = isGet && GATEWAY_STATUSES.includes(response.status);
    } catch {
      // Network failure or timeout — the server is unreachable.
      error = unreachableError();
      error.retryable = isGet;
    }

    if (!error.retryable || attempt === attempts) break;
    publishApiStatus('retrying', attempt + 1);
    await sleep(RETRY.delaysMs[attempt - 1]);
  }

  clearTimeout(slowTimer);
  if (error.status === 0 || GATEWAY_STATUSES.includes(error.status)) {
    // We genuinely could not reach the server — surface it in the toast.
    publishApiStatus('error', attempts);
  } else {
    // Server answered (404, 401, …) — reachability is fine.
    publishApiStatus('idle', 0);
  }
  throw error;
}

export async function uploadFile(file, kind) {
  const form = new FormData();
  form.append('file', file);
  form.append('kind', kind);

  const slowTimer = setTimeout(() => {
    if (getApiStatus().state !== 'retrying') publishApiStatus('slow', 1);
  }, RETRY.slowAfterMs);

  let response;
  try {
    response = await fetchWithTimeout(
      '/api/uploads',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      },
      RETRY.timeoutMs * 3,
    );
  } catch {
    clearTimeout(slowTimer);
    publishApiStatus('error', 1);
    throw unreachableError();
  }

  const data = await response.json().catch(() => ({}));
  clearTimeout(slowTimer);
  if (!response.ok) {
    if (response.status === 0 || GATEWAY_STATUSES.includes(response.status)) {
      publishApiStatus('error', 1);
    } else {
      publishApiStatus('idle', 0);
    }
    throw httpError(data, response.status, 'Upload failed.');
  }
  publishApiStatus('idle', 0);
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
  del: (path) => request(path, { method: 'DELETE' }),
};
