export interface Document {
  id: string;
  thumbnail: string;
  kb_id: string;
  parser_id: string;
  parser_config: ParserConfig;
  source_type: string;
  type: string;
  created_by: string;
  name: string;
  location: string;
  size: number;
  token_num: number;
  chunk_num: number;
  progress: number;
  progress_msg: string;
  process_begin_at: null;
  process_duration: number;
  meta_fields: Record<string, any>;
  run: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentUploadResponse {
  result: string;
  data: Document[];
  err: string[];
}

export interface DocumentsParams {
  kb_id: string;
  keywords?: string;
  page?: number;
  page_size?: number;
  orderby?: string;
  desc?: boolean;
}

export interface DocumentParams {
  doc_id: string;
  name?: string;
  status?: string;
  meta?: string;
  parser_id?: string;
  parser_config?: ParserConfig;
}

interface ParserConfig {
  pages: number[][];
}
