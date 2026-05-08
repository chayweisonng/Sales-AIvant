const { PDFParse } = require('pdf-parse');
const { get_encoding } = require('tiktoken');
const { supabase } = require('./supabaseClient');
const { generateEmbeddings } = require('./embeddingService');

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

/**
 * Split text into chunks using tiktoken
 */
function chunkText(text) {
  const enc = get_encoding('cl100k_base');
  const tokens = enc.encode(text);
  const chunks = [];
  
  let start = 0;
  while (start < tokens.length) {
    const end = Math.min(start + CHUNK_SIZE, tokens.length);
    const chunkTokens = tokens.slice(start, end);
    const chunkText = enc.decode(chunkTokens);
    
    // Quick cleanup of whitespace
    const cleanChunk = new TextDecoder().decode(chunkText).replace(/\s+/g, ' ').trim();
    if (cleanChunk) {
      chunks.push(cleanChunk);
    }
    
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  
  enc.free();
  return chunks;
}

/**
 * Main process pipeline
 */
async function processDocument(fileBuffer, filename, companyId) {
  let parser;
  let documentId;
  try {
    console.log(`[RAG] Processing document: ${filename}`);
    
    // 1. Create document record as 'pending'
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert({
        company_id: companyId,
        filename: filename,
        status: 'pending'
      })
      .select()
      .single();
      
    if (docError) throw docError;
    documentId = docData.id;

    // 2. Extract Text
    parser = new PDFParse({ data: fileBuffer });
    const pdfData = await parser.getText();
    const extractedText = pdfData.text;

    // 3. Chunk Text
    const chunks = chunkText(extractedText);
    console.log(`[RAG] Extracted ${chunks.length} chunks`);

    // 4. Generate embeddings
    const embeddings = await generateEmbeddings(chunks);

    // 5. Insert Chunks into DB
    const chunkRecords = chunks.map((chunkText, index) => ({
      document_id: documentId,
      chunk_text: chunkText,
      embedding: embeddings[index],
      chunk_index: index
    }));

    const { error: chunkError } = await supabase
      .from('document_chunks')
      .insert(chunkRecords);

    if (chunkError) throw chunkError;

    // 6. Mark Document as Indexed
    await supabase
      .from('documents')
      .update({ 
        status: 'indexed',
        extracted_text: extractedText.substring(0, 50000) // store a portion for reference if needed
      })
      .eq('id', documentId);

    console.log(`[RAG] Successfully indexed: ${filename}`);
    return { success: true, documentId, chunks: chunks.length };

  } catch (error) {
    if (documentId) {
      await supabase
        .from('documents')
        .update({ status: 'failed' })
        .eq('id', documentId);
    }

    console.error(`[RAG] Error processing document:`, error);
    throw error;
  } finally {
    if (parser) {
      await parser.destroy();
    }
  }
}

module.exports = {
  processDocument
};
