-- Ensure each company has at most one agent_settings row so UPSERT on company_id works.
ALTER TABLE public.agent_settings
  ADD CONSTRAINT agent_settings_company_id_key UNIQUE (company_id);

-- Harden helper functions by fixing the search_path and using schema-qualified references.
CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT up.company_id
  FROM public.user_profiles AS up
  WHERE up.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.match_document_chunks(
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
  WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;
