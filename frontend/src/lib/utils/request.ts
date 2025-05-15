import axios, {
  type Method,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosProgressEvent,
  type ResponseType
} from 'axios';
import { get as _get } from 'lodash-es';
import { EventSourceParserStream } from 'eventsource-parser/stream';

import { current_version } from '../constants/version';
import { toast } from 'sonner';
import { refreshAccessTokenOrRelogin, asyncRunSafe } from '@/services/refresh-token';
import { type ApiResponse } from '@/types/helpers';
import { type Reference } from '@/types/conversation';
import { ErrorCode } from '../constants/error-code';
import { getTranslation } from './locale';

const TIME_OUT = 100000;

const API_BASE_URL =
  globalThis.document?.body?.getAttribute('data-api-base-url') || process.env.SERVICE_API_URL_BASE;

interface ConfigType {
  headers?: { [key: string]: string };
  hold?: boolean;
  timeout?: number;
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
  cancelToken?: AbortController;
  responseType?: ResponseType;
  silent?: boolean;
  isPublicAPI?: boolean;
}

export interface SSEExtraInfo {
  answer: string;
  reference?: Reference;
  prompt?: string;
  id: string;
  session_id: string;
}

export interface SSECallbacks {
  onData?: (data: string, moreInfo: any) => void;
  onCompleted?: () => void;
  onError?: (error: string, errorCode?: string) => void;
  getAbortController?: (controller: AbortController) => void;
}

interface SSERequestConfig extends ConfigType {
  callbacks?: SSECallbacks;
}

/**
 * 请求开始
 */
function requestStart(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const token = window.localStorage.getItem('console_token');
  // config.headers['X-Version'] = current_version;
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  return config;
}

/**
 * 请求成功,检查请求头
 */
function responseSuccess(response: AxiosResponse) {
  return response;
}

/**
 * 响应数据检查
 */
function checkRes<T>(response: AxiosResponse<ApiResponse<T>>) {
  const { status, data } = response;

  if (data === undefined) {
    return Promise.reject('Server Error');
  }

  if (status < 200 || status >= 400) {
    return Promise.reject(data);
  }

  if (typeof data === 'object' && 'result' in data!) {
    if (data.result === 'success') {
      if ('err' in data) {
        return data;
      }

      if ('count' in data) {
        return data;
      }
      return data.data as T;
    }
    return Promise.reject(data);
  }

  return data as T;
}

/**
 * 响应错误
 */
async function responseError(error: any) {
  const t = await getTranslation();
  console.log('error->', '请求错误', error);

  const errData = error.response?.data;
  const loginUrl = `${window.location.origin}/sign-in`;
  const ERROR_CODE_VALUES = Object.values(ErrorCode);

  // 根据 error_code 处理错误
  if (errData?.error_code) {
    switch (errData.error_code) {
      case ErrorCode.UNAUTHORIZED_AND_FORCE_LOGOUT:
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        window.location.reload();
        return Promise.reject(error);

      case ErrorCode.UNAUTHORIZED:
        try {
          const [refreshErr] = await asyncRunSafe(refreshAccessTokenOrRelogin(TIME_OUT));
          if (refreshErr === null) {
            const { url, data, method } = error.config;
            return request(url, data, error.config, method);
          }

          globalThis.location.href = loginUrl;
          return Promise.reject(error);
        } catch (error) {
          return Promise.reject(error);
        }

      case ErrorCode.AGENT_NOT_FOUND:
        if (!error.config?.silent) {
          toast.error(t(`ErrorCode.${errData.error_code}`));
          window.location.href = `${window.location.origin}/agents`;
          return Promise.reject(error);
        }
        break;

      default:
        if (ERROR_CODE_VALUES.includes(errData.error_code) && !error.config?.silent) {
          toast.error(t(`ErrorCode.${errData.error_code}`));
        }
        return Promise.reject(error);
    }
  }

  // 处理没有 error_code 的错误
  if (!error.config?.silent) {
    toast.error(error.message || 'Server Error');
  }

  return Promise.reject(error);
}

/* 创建请求实例 */
const instance = axios.create({
  timeout: 300000, // 超时时间
  baseURL: '/api',
  headers: {
    'content-type': 'application/json'
  }
});

/* 请求拦截 */
instance.interceptors.request.use(requestStart, (err) => Promise.reject(err));
/* 响应拦截 */
instance.interceptors.response.use(responseSuccess, (err) => Promise.reject(err));

export function request(
  url: string,
  data: any,
  { cancelToken, ...config }: ConfigType,
  method: Method
): Promise<ApiResponse<any>> {
  /* 去空 */
  for (const key in data) {
    if (data[key] === null || data[key] === undefined) {
      delete data[key];
    }
  }

  return instance
    .request({
      baseURL: API_BASE_URL,
      url,
      method,
      data: ['POST', 'PUT', 'DELETE'].includes(method) ? data : null,
      params: !['POST', 'PUT', 'DELETE'].includes(method) ? data : null,
      signal: cancelToken?.signal,
      ...config
    })
    .then((res) => {
      return checkRes(res);
    })
    .catch((err) => responseError(err));
}

function isAbortError(error: any) {
  return (
    error.toString() === 'AbortError: The user aborted a request.' ||
    error.toString().includes('TypeError: Cannot assign to read only property')
  );
}

async function handleStreamResponse(response: Response, callbacks: SSECallbacks) {
  const reader = response.body
    ?.pipeThrough(new TextDecoderStream())
    ?.pipeThrough(new EventSourceParserStream())
    .getReader();

  while (true) {
    const { done, value } = (await reader?.read()) || {};
    if (done) {
      callbacks.onCompleted?.();
      break;
    }

    try {
      const data = JSON.parse(value?.data || '');

      if (data.code !== 0) {
        callbacks.onError?.(data.message || 'Server Error', data.code?.toString());
        continue;
      }

      // if the last message
      if (data.data === true) {
        callbacks.onCompleted?.();
        continue;
      }

      const responseData = data.data;
      if (responseData.answer !== undefined) {
        callbacks.onData?.(responseData.answer, responseData);
      }
    } catch (e) {
      console.warn('SSE parse error:', e);
    }
  }
}

export async function sseRequest(
  url: string,
  data: any = {},
  config: SSERequestConfig = {}
): Promise<void> {
  const { callbacks = {}, cancelToken, headers = {}, ...restConfig } = config;

  const abortController = cancelToken || new AbortController();
  callbacks.getAbortController?.(abortController);

  for (const key in data) {
    if (data[key] === null || data[key] === undefined) {
      delete data[key];
    }
  }

  try {
    const token = window.localStorage.getItem('console_token');
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
        ...headers
      },
      body: JSON.stringify(data),
      signal: abortController.signal,
      ...restConfig
    });

    if (response.status === 401) {
      try {
        await refreshAccessTokenOrRelogin(TIME_OUT);
        return sseRequest(url, data, config);
      } catch (error) {
        window.location.href = `${window.location.origin}/sign-in`;
        throw error;
      }
    }

    if (!response.ok) {
      const errorData = await response.json();
      toast.error(errorData.message || 'Server Error');
      callbacks.onError?.('Server Error');
      return;
    }

    await handleStreamResponse(response, callbacks);
  } catch (error: any) {
    if (!isAbortError(error)) {
      toast.error(error.toString());
      callbacks.onError?.(error.toString());
    }
    throw error;
  }
}

/**
 * api请求方式
 * @param {String} url
 * @param {Any} params
 * @param {Object} config
 * @returns
 */

/** */

export function GET<T>(url: string, params = {}, config: ConfigType = {}): Promise<T> {
  return request(url, params, config, 'GET');
}

export function POST<T>(url: string, data = {}, config: ConfigType = {}): Promise<T> {
  return request(url, data, config, 'POST');
}

export function PUT<T>(url: string, data = {}, config: ConfigType = {}): Promise<T> {
  return request(url, data, config, 'PUT');
}

export function DELETE<T>(url: string, data = {}, config: ConfigType = {}): Promise<T> {
  return request(url, data, config, 'DELETE');
}
