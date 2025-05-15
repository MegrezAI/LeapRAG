export interface Chunk {
  id: string;
  idx: number;
  content_with_weight: string;
  chunk_id?: string; // Equivalent to id, just to be compatible with the results returned by other interfaces.
  doc_id: string;
  docnm_kwd: string;
  important_kwd: string[];
  question_kwd: string[];
  image_id: string;
  highlight?: string;
  available_int: number; // 1: enabled, 0: disabled
  positions: number[][];
  similarity?: number;
  vector_similarity?: number;
  term_similarity?: number;
  mixed: {
    idx: number;
    id: string;
  }[];
}

export interface ChunkListResponse {
  total: number;
  chunks: Chunk[];
  doc: {
    id: string;
    [key: string]: any;
  };
}

export interface DocAgg {
  doc_name: string;
  doc_id: string;
  total: number;
}

export interface ChunkRetrievalTestResponse {
  chunks: Chunk[];
  total: number;
  labels?: string[];
  doc_aggs: DocAgg[];
}
