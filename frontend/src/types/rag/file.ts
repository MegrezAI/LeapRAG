export enum FileType {
  FOLDER = 'folder',
  VIRTUAL = 'virtual',
  VISUAL = 'visual'
}

export interface File {
  id: string;
  parent_id: string;
  tenant_id: string;
  created_by: string;
  name: string;
  location: string;
  size: number;
  type: FileType;
  created_at?: string;
  updated_at?: string;
}
