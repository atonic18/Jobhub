const { Client, Databases, Storage, Query } = require('node-appwrite');

const parseBody = (req) => {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body);
  } catch (error) {
    return {};
  }
};

const getClient = () => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_FUNCTION_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://sfo.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '1212125')
    .setKey(process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_API_KEY);

  return {
    databases: new Databases(client),
    storage: new Storage(client),
  };
};

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .trim();

const extractKeywords = (text) => {
  const stopWords = new Set(['and', 'the', 'for', 'with', 'from', 'that', 'this', 'your', 'you', 'are', 'was', 'were', 'have', 'has', 'job']);
  const counts = normalizeText(text)
    .split(' ')
    .filter((token) => token.length >= 3 && !stopWords.has(token))
    .reduce((map, token) => {
      map[token] = (map[token] || 0) + 1;
      return map;
    }, {});

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([keyword]) => keyword);
};

const getDocumentById = async (databases, databaseId, documentId) => {
  if (documentId) return databases.getDocument(databaseId, 'employee_documents', documentId);
  throw new Error('documentId is required.');
};

const getBuffer = async (storage, bucketId, fileId) => {
  const result = await storage.getFileDownload(bucketId, fileId);
  return Buffer.from(result);
};

const extractPdfText = async (buffer) => {
  const pdfParse = require('pdf-parse');
  const parsed = await pdfParse(buffer);
  return parsed.text || '';
};

const extractImageText = async (buffer) => {
  const { createWorker } = require('tesseract.js');
  const worker = await createWorker('eng');
  try {
    const result = await worker.recognize(buffer);
    return result?.data?.text || '';
  } finally {
    await worker.terminate();
  }
};

module.exports = async ({ req, res, error }) => {
  const { documentId } = parseBody(req);
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'jobhub_db';
  const { databases, storage } = getClient();

  try {
    const document = await getDocumentById(databases, databaseId, documentId);
    await databases.updateDocument(databaseId, 'employee_documents', document.$id, {
      scan_status: 'processing',
      scan_error: '',
    });

    const buffer = await getBuffer(storage, document.bucket_id, document.file_id);
    const type = String(document.file_type || document.file_name || '').toLowerCase();
    let text = '';

    if (type.includes('pdf') || type.endsWith('.pdf')) {
      text = await extractPdfText(buffer);
    } else if (type.includes('image') || /\.(jpg|jpeg|png|webp)$/i.test(type)) {
      text = await extractImageText(buffer);
    } else {
      throw new Error('Only PDF and image documents can be scanned.');
    }

    const cleanText = text.trim();
    if (!cleanText) throw new Error('No readable text could be extracted from this document.');

    const keywords = extractKeywords(cleanText);
    const updated = await databases.updateDocument(databaseId, 'employee_documents', document.$id, {
      extracted_keywords: keywords,
      scan_status: 'completed',
      scan_error: '',
    });

    return res.json({ success: true, document: updated, keywords });
  } catch (err) {
    error(err.message);
    if (documentId) {
      await databases.updateDocument(databaseId, 'employee_documents', documentId, {
        scan_status: 'failed',
        scan_error: err.message,
      }).catch(() => null);
    }
    return res.json({ success: false, error: err.message }, 500);
  }
};
