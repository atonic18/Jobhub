import { ID, Permission, Query, Role } from 'react-native-appwrite';
import { databases, functions } from './appwrite';
import { fileService } from './fileService';

const DATABASE_ID = 'jobhub_db';
const DOCUMENTS_COLLECTION = 'employee_documents';
const JOBHUB_ROUTER_FUNCTION_ID = 'sendMessage';

const ownerPermissions = (userId) => [
  Permission.read(Role.user(userId)),
  Permission.update(Role.user(userId)),
  Permission.delete(Role.user(userId)),
];

const parseExecutionBody = (execution) => {
  const raw = execution?.responseBody || execution?.response || '';
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    return { raw };
  }
};

const getScanStartErrorMessage = (error) => {
  const message = String(error?.message || '');
  if (error?.code === 404 || message.toLowerCase().includes('function with the requested id could not be found')) {
    return 'Document scanner is not deployed yet.';
  }
  return message || 'Document scan could not be started.';
};

const markScanStartFailed = async (documentId, message) => {
  if (!documentId) return;
  await databases.updateDocument(DATABASE_ID, DOCUMENTS_COLLECTION, documentId, {
    scan_status: 'failed',
    scan_error: message,
  }).catch(() => null);
};

const triggerDocumentScan = async (documentId) => {
  try {
    const execution = await functions.createExecution(
      JOBHUB_ROUTER_FUNCTION_ID,
      JSON.stringify({ action: 'processEmployeeDocument', documentId }),
      false
    );
    const body = parseExecutionBody(execution);
    if (body?.success === false || body?.error) {
      throw new Error(body.error || 'Document scan failed.');
    }
    return body;
  } catch (error) {
    const message = getScanStartErrorMessage(error);
    await markScanStartFailed(documentId, message);
    console.warn('Document scan could not be started:', message);
    return null;
  }
};

const getDocumentData = (userId, documentType, uploaded, extra = {}) => ({
  user_id: userId,
  document_type: documentType,
  file_id: uploaded.fileId,
  bucket_id: uploaded.bucketId,
  file_name: uploaded.name,
  file_type: uploaded.type,
  file_size: Number(uploaded.size || 0),
  file_url: uploaded.url,
  extracted_keywords: [],
  scan_status: 'queued',
  scan_error: '',
  ...extra,
});

export const documentService = {
  getDocuments: async (userId) => {
    return await databases.listDocuments(DATABASE_ID, DOCUMENTS_COLLECTION, [
      Query.equal('user_id', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ]);
  },

  uploadDocument: async ({ userId, documentType, asset }) => {
    const uploaded = await fileService.uploadEmployeeDocumentFile(asset, userId);
    try {
      const document = await databases.createDocument(
        DATABASE_ID,
        DOCUMENTS_COLLECTION,
        ID.unique(),
        getDocumentData(userId, documentType, uploaded),
        ownerPermissions(userId)
      );
      triggerDocumentScan(document.$id);
      return document;
    } catch (error) {
      await fileService.deleteStoredFile(uploaded).catch(() => null);
      throw error;
    }
  },

  replaceDocument: async ({ document, asset }) => {
    const uploaded = await fileService.uploadEmployeeDocumentFile(asset, document.user_id);
    const previousFile = {
      bucketId: document.bucket_id,
      fileId: document.file_id,
      name: document.file_name,
    };
    const updated = await databases.updateDocument(
      DATABASE_ID,
      DOCUMENTS_COLLECTION,
      document.$id,
      getDocumentData(document.user_id, document.document_type, uploaded)
    );
    await fileService.deleteStoredFile(previousFile).catch(() => null);
    triggerDocumentScan(updated.$id);
    return updated;
  },

  deleteDocument: async (document) => {
    await fileService.deleteStoredFile({
      bucketId: document.bucket_id,
      fileId: document.file_id,
      name: document.file_name,
    }).catch(() => null);
    return await databases.deleteDocument(DATABASE_ID, DOCUMENTS_COLLECTION, document.$id);
  },

  rescanDocument: async (documentId) => triggerDocumentScan(documentId),

  grantEmployerAccess: async (documents, ownerId, employerId) => {
    return await Promise.all(
      documents.map((document) =>
        fileService.grantFileReadAccess(
          {
            bucketId: document.bucket_id || document.bucketId,
            fileId: document.file_id || document.fileId,
            name: document.file_name || document.name,
          },
          ownerId,
          [employerId]
        ).catch((error) => {
          console.error('Could not grant document access:', error.message);
          return null;
        })
      )
    );
  },

  serializeForApplication: (document) => fileService.serializeFileReference({
    documentId: document.$id || document.documentId,
    bucketId: document.bucket_id || document.bucketId,
    fileId: document.file_id || document.fileId,
    name: document.file_name || document.name,
    type: document.file_type || document.type,
    size: document.file_size || document.size || 0,
    url: document.file_url || document.url || '',
    document_type: document.document_type || document.documentType || 'supporting',
    extracted_keywords: document.extracted_keywords || [],
  }),
};
