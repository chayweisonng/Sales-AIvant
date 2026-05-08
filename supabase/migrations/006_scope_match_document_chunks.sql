CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_company_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk_text text,
  similarity float
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.chunk_text,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks AS dc
  INNER JOIN public.documents AS d
    ON d.id = dc.document_id
  WHERE d.status = 'indexed'
    AND (filter_company_id IS NULL OR d.company_id = filter_company_id)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT LEAST(match_count, 200);
$$;
