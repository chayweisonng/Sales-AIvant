-- Alter the document_chunks table to use 768 dimensions for Gemini embeddings
ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(768);

-- Also update the match_document_chunks function to use 768 dimensions
DROP FUNCTION IF EXISTS match_document_chunks;

CREATE OR REPLACE FUNCTION match_document_chunks (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk_text text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.chunk_text,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;
