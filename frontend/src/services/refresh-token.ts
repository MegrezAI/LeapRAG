import { refreshTokenApi } from '@/api/account';

let isRefreshing = false;
const LOCAL_STORAGE_KEY = 'is_other_tab_refreshing';

export async function asyncRunSafe<T = any>(fn: Promise<T>): Promise<[Error] | [null, T]> {
  try {
    const result = await fn;
    return [null, result];
  } catch (e: any) {
    if (e.response) {
      return [new Error(e.response.data?.message || 'API Error')];
    }
    return [e || new Error('unknown error')];
  }
}

export async function fetchWithRetry<T = any>(
  fn: Promise<T>,
  retries = 3
): Promise<[Error] | [null, T]> {
  const [error, res] = await asyncRunSafe(fn);
  if (error) {
    if (retries > 0) {
      const res = await fetchWithRetry(fn, retries - 1);
      return res;
    } else {
      if (error instanceof Error) return [error];
      return [new Error('unknown error')];
    }
  } else {
    return [null, res];
  }
}

function waitUntilTokenRefreshed() {
  return new Promise<void>((resolve, reject) => {
    function _check() {
      const isRefreshingSign = globalThis.localStorage.getItem(LOCAL_STORAGE_KEY);
      if ((isRefreshingSign && isRefreshingSign === '1') || isRefreshing) {
        setTimeout(() => {
          _check();
        }, 1000);
      } else {
        resolve();
      }
    }
    _check();
  });
}

const isRefreshingSignAvailable = function (delta: number) {
  const nowTime = new Date().getTime();
  const lastTime = globalThis.localStorage.getItem('last_refresh_time') || '0';
  return nowTime - parseInt(lastTime) <= delta;
};

async function getNewAccessToken(timeout: number): Promise<void> {
  try {
    const isRefreshingSign = globalThis.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (
      (isRefreshingSign && isRefreshingSign === '1' && isRefreshingSignAvailable(timeout)) ||
      isRefreshing
    ) {
      await waitUntilTokenRefreshed();
    } else {
      isRefreshing = true;
      globalThis.localStorage.setItem(LOCAL_STORAGE_KEY, '1');
      globalThis.localStorage.setItem('last_refresh_time', new Date().getTime().toString());
      globalThis.addEventListener('beforeunload', releaseRefreshLock);

      const refresh_token = globalThis.localStorage.getItem('refresh_token');
      if (!refresh_token) {
        return Promise.reject(new Error('No refresh token found'));
      }

      const [error, response] = await fetchWithRetry(refreshTokenApi(refresh_token));

      if (error) {
        return Promise.reject(error);
      }

      globalThis.localStorage.setItem('console_token', response.access_token);
      globalThis.localStorage.setItem('refresh_token', response.refresh_token);
    }
  } catch (error) {
    return Promise.reject(error);
  } finally {
    releaseRefreshLock();
  }
}

function releaseRefreshLock() {
  if (isRefreshing) {
    isRefreshing = false;
    globalThis.localStorage.removeItem(LOCAL_STORAGE_KEY);
    globalThis.localStorage.removeItem('last_refresh_time');
    globalThis.removeEventListener('beforeunload', releaseRefreshLock);
  }
}

export async function refreshAccessTokenOrRelogin(timeout: number) {
  return Promise.race([
    new Promise<void>((resolve, reject) =>
      setTimeout(() => {
        releaseRefreshLock();
        reject(new Error('request timeout'));
      }, timeout)
    ),
    getNewAccessToken(timeout)
  ]);
}
