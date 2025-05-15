import { type Dialog } from '../dialog';

export interface ApiKey {
  tenant_id: string;
  apikey: string;
  dialog_id: string;
  dialog_config: Dialog;
  agent_id: string;
  source: string;
  beta: null;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyPayload {
  apikey: string;
  agent_id: string;
  dialog_id: string;
  dialog_config: Dialog;
}
