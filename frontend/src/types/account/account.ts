export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface TenantInfo {
  name: string;
  asr_id: string;
  rerank_id: string;
  embd_id: string;
  img2txt_id: string;
  llm_id: string;
  parser_ids: string;
}

export interface UserInfo {
  account: {
    id: string;
    email: string;
    username: string;
    avatar: string | null;
    interface_language: string;
    interface_theme: string;
    timezone: string;
    last_login_at: string;
    status: string;
  };
  tenant_info: TenantInfo;
}
