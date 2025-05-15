import { type ErrorCodeType } from '@/lib/constants/error-code';

type ResultType = 'success' | 'fail';
export type BaseResponse<T> = {
  result: ResultType;
  data: T;
  message?: string;
};

export type PaginationResponse<T> = {
  result: ResultType;
  data: T[];
  count: number;
};

export type OperationResponse<T> = {
  result: ResultType;
  data: T;
  err?: string;
};

export type ErrorResponse = {
  data: string | null;
  error_code: ErrorCodeType;
  message: string | null;
};

export type DirectResponse<T> = T;

export type ApiResponse<T> =
  | BaseResponse<T>
  | DirectResponse<T>
  | PaginationResponse<T>
  | ErrorResponse;

export type EnumToType<E extends Record<string, string | number>> = {
  [K in keyof E]?: string;
};
