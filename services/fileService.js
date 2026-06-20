import { ID, Permission, Role } from 'react-native-appwrite';
import { storage } from './appwrite';
import { APPLICATION_DOCUMENTS_BUCKET_ID, PROFILE_PICTURES_BUCKET_ID } from '../utils/jobUtils';

const filePermissions = (userId) => [
  Permission.read(Role.any()),
  Permission.read(Role.users()),
  Permission.update(Role.user(userId)),
  Permission.delete(Role.user(userId)),
];

const normalizePickedFile = (asset) => {
  if (!asset?.uri) return null;
  return {
    name: asset.name || asset.fileName || `upload-${Date.now()}`,
    type: asset.mimeType || asset.type || 'application/octet-stream',
    size: asset.size || 1,
    uri: asset.uri,
  };
};

const getFileExtension = (file) => {
  const name = String(file?.name || file?.url || '');
  const extension = name.split('?')[0].split('.').pop();
  return extension ? extension.toLowerCase() : '';
};

const getStoredFileUrl = (file, mode = 'view') => {
  const document = fileService.parseFileReference(file);
  if (!document) return '';
  if (document.bucketId && document.fileId) {
    return mode === 'download'
      ? String(storage.getFileDownload(document.bucketId, document.fileId))
      : String(storage.getFileView(document.bucketId, document.fileId));
  }
  return document.url || '';
};

export const fileService = {
  uploadPickedFile: async (asset, userId) => {
    const file = normalizePickedFile(asset);
    if (!file) throw new Error('No file selected.');

    const uploaded = await storage.createFile(
      APPLICATION_DOCUMENTS_BUCKET_ID,
      ID.unique(),
      file,
      filePermissions(userId)
    );

    return {
      fileId: uploaded.$id,
      bucketId: APPLICATION_DOCUMENTS_BUCKET_ID,
      name: file.name,
      type: file.type,
      size: file.size,
      url: String(storage.getFileView(APPLICATION_DOCUMENTS_BUCKET_ID, uploaded.$id)),
    };
  },

  uploadProfileImage: async (asset, userId) => {
    const file = normalizePickedFile({
      ...asset,
      name: asset?.fileName || asset?.name || `profile-${Date.now()}.jpg`,
      mimeType: asset?.mimeType || 'image/jpeg',
    });
    if (!file) throw new Error('No image selected.');

    const uploaded = await storage.createFile(
      PROFILE_PICTURES_BUCKET_ID,
      ID.unique(),
      file,
      filePermissions(userId)
    );

    return {
      fileId: uploaded.$id,
      bucketId: PROFILE_PICTURES_BUCKET_ID,
      name: file.name,
      type: file.type,
      size: file.size,
      url: String(storage.getFileView(PROFILE_PICTURES_BUCKET_ID, uploaded.$id)),
    };
  },

  serializeFileReference: (file) => JSON.stringify(file),

  parseFileReference: (value) => {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch (error) {
      return {
        name: 'Uploaded document',
        url: value,
        type: '',
      };
    }
  },

  getFileViewUrl: (file) => getStoredFileUrl(file, 'view'),

  getFileDownloadUrl: (file) => getStoredFileUrl(file, 'download'),

  getOpenUrl: (file) => {
    const document = fileService.parseFileReference(file);
    const type = String(document?.type || '').toLowerCase();
    const extension = getFileExtension(document);
    const isPdf = type.includes('pdf') || extension === 'pdf';
    return getStoredFileUrl(document, isPdf ? 'download' : 'view');
  },
};
