import { type TenantInfoParams } from '@/lib/schema/account/tenant';
import { type DialogParamsSchema } from '@/lib/schema/dialog';
import { POST, GET, PUT, DELETE } from '@/lib/utils/request';
import { generateHash, generateRandomString } from '@/lib/utils/tools';
import { type TokenPair, type UserInfo } from '@/types/account/account';
import { type ApiKey } from '@/types/account/apikey';
import { type Dialog } from '@/types/dialog';
const ACCOUNT_PREFIX = '/console/account';

// 用户登录
export const LoginApi = (data: {
  email: string;
  password: string;
  language?: string;
  remember_me?: boolean;
  invite_token?: string;
}) =>
  POST<TokenPair>(`${ACCOUNT_PREFIX}/login`, {
    email: data.email,
    password: generateHash(data.password),
    language: data.language,
    remember_me: data.remember_me,
    invite_token: data.invite_token
  });

// 用户注册
export const RegisterApi = (data: { email: string; password: string }) =>
  POST<{ result: string }>(`${ACCOUNT_PREFIX}/register`, {
    email: data.email,
    name: `user_${Date.now().toString(36)}${generateRandomString(4)}`,
    password: generateHash(data.password)
  });

// 用户登出
export const LogoutApi = () => GET(`${ACCOUNT_PREFIX}/logout`);

// 获取当前用户信息
export const getCurrentUserApi = () => GET<UserInfo>(`${ACCOUNT_PREFIX}/current-account`);

// 刷新访问令牌
export const refreshTokenApi = (refreshToken: string) =>
  POST<TokenPair>(`${ACCOUNT_PREFIX}/refresh-token`, {
    refresh_token: refreshToken
  });

// 更新用户名
export const updateUsernameApi = (username: string) =>
  POST<UserInfo>(`${ACCOUNT_PREFIX}/username`, { username });

// 更新头像
export const updateAvatarApi = (avatar: string) =>
  POST<UserInfo>(`${ACCOUNT_PREFIX}/avatar`, { avatar });

// 更新界面语言
export const updateInterfaceLanguageApi = (language: string) =>
  POST<UserInfo>(`${ACCOUNT_PREFIX}/interface-language`, {
    interface_language: language
  });

// 更新界面主题
export const updateInterfaceThemeApi = (theme: string) =>
  POST(`${ACCOUNT_PREFIX}/interface-theme`, {
    interface_theme: theme
  });

// 更新时区
export const updateTimezoneApi = (timezone: string) =>
  POST<UserInfo>(`${ACCOUNT_PREFIX}/timezone`, { timezone });

// 更新密码
export const updatePasswordApi = (data: {
  password: string;
  new_password: string;
  repeat_new_password: string;
}) =>
  POST(`${ACCOUNT_PREFIX}/password`, {
    password: generateHash(data.password),
    new_password: generateHash(data.new_password),
    repeat_new_password: generateHash(data.repeat_new_password)
  });

// 获取第三方集成信息
export const getIntegrateApi = () => GET(`${ACCOUNT_PREFIX}/integrate`);

// 获取账号删除验证码
export const getDeleteVerifyApi = () => GET(`${ACCOUNT_PREFIX}/delete-verify`);

// 删除账号
export const deleteAccountApi = (data: { token: string; code: string }) =>
  POST(`${ACCOUNT_PREFIX}/delete`, data);

// 更新账号删除反馈
export const updateDeleteFeedbackApi = (data: { email: string; feedback: string }) =>
  POST(`${ACCOUNT_PREFIX}/delete-update-feedback`, data);

export const updateTenantInfoApi = (data: TenantInfoParams) =>
  POST(`${ACCOUNT_PREFIX}/set-tenant-info`, data);

export const getApiKeysApi = () => GET<ApiKey[]>(`${ACCOUNT_PREFIX}/apikey`);

export const getApiKeyApi = (apikey: string) => GET<ApiKey>(`${ACCOUNT_PREFIX}/apikey/${apikey}`);

export const createApiKeyApi = (data: { source: string; dialog_id?: string }) =>
  POST<ApiKey>(`${ACCOUNT_PREFIX}/apikey`, data);

export const updateApiKeyApi = (
  apikey: string,
  data: { source?: string; agent_id?: string; dialog_config?: DialogParamsSchema }
) => PUT<ApiKey>(`${ACCOUNT_PREFIX}/apikey/${apikey}`, data);

export const deleteApiKeyApi = (apikey: string) => DELETE(`${ACCOUNT_PREFIX}/apikey/${apikey}`);

export const getApiKeysByAgentIdApi = (agent_id: string) =>
  GET<ApiKey[]>(`${ACCOUNT_PREFIX}/apikey?agent_id=${agent_id}`);
