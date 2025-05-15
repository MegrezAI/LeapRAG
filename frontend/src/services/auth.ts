import { LoginApi, RegisterApi } from '@/api/account';

interface AuthParams {
  email: string;
  password: string;
}

export async function signIn(params: AuthParams) {
  const response = await LoginApi(params);
  localStorage.setItem('console_token', response.access_token);
  localStorage.setItem('refresh_token', response.refresh_token);
  return response;
}

export async function signUpAndSignIn(params: AuthParams) {
  await RegisterApi(params);
  return signIn(params);
}
