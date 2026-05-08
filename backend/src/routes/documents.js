const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { processDocument } = require('../services/ragService');
const { supabase } = require('../services/supabaseClient');

const router = express.Router();
// Use memory storage for MVP (in production, might want to stream or save to disk first)
const upload = multer({ storage: multer.memoryStorage() });

// Upload and process PDF
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are supported' });
    }

    // Process the document
    const result = await processDocument(file.buffer, file.originalname, req.company.id);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'Failed to process document' });
  }
});

// List documents
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('company_id', req.company.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error('Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('id')
      .eq('id', id)
      .eq('company_id', req.company.id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('company_id', req.company.id);

    if (deleteError) throw deleteError;

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete Error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

module.exports = router;
