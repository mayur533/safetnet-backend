import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';

const CHAT_FILES_DIR = `${RNFS.DocumentDirectoryPath}/chat_files`;
const STORAGE_KEY = 'chat_file_storage';

export interface StoredFile {
  messageId: string | number;
  fileUrl: string;
  localPath: string;
  fileName: string;
  fileSize?: number;
  downloadedAt: string;
}

/**
 * Initialize the chat files directory
 */
export const initChatFilesDir = async () => {
  try {
    const dirExists = await RNFS.exists(CHAT_FILES_DIR);
    if (!dirExists) {
      await RNFS.mkdir(CHAT_FILES_DIR);
    }
  } catch (error) {
    console.error('Error initializing chat files directory:', error);
  }
};

/**
 * Get stored file information
 */
export const getStoredFile = async (messageId: string | number, fileUrl: string): Promise<StoredFile | null> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const files: StoredFile[] = JSON.parse(stored);
    const file = files.find(
      (f) => f.messageId === messageId.toString() && f.fileUrl === fileUrl
    );
    return file || null;
  } catch (error) {
    console.error('Error getting stored file:', error);
    return null;
  }
};

/**
 * Download and store a file
 */
export const downloadAndStoreFile = async (
  messageId: string | number,
  fileUrl: string,
  fileName: string,
  fileSize?: number
): Promise<string> => {
  try {
    await initChatFilesDir();
    
    // Check if already downloaded
    const existing = await getStoredFile(messageId, fileUrl);
    if (existing) {
      const exists = await RNFS.exists(existing.localPath);
      if (exists) {
        return existing.localPath;
      }
    }
    
    // Generate local file path
    const fileExtension = fileName.split('.').pop() || '';
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const localPath = `${CHAT_FILES_DIR}/${messageId}_${Date.now()}.${fileExtension}`;
    
    // Download file
    const downloadResult = await RNFS.downloadFile({
      fromUrl: fileUrl,
      toFile: localPath,
    }).promise;
    
    if (downloadResult.statusCode === 200) {
      // Store file info
      const storedFile: StoredFile = {
        messageId: messageId.toString(),
        fileUrl,
        localPath,
        fileName: sanitizedFileName,
        fileSize,
        downloadedAt: new Date().toISOString(),
      };
      
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const files: StoredFile[] = stored ? JSON.parse(stored) : [];
      const existingIndex = files.findIndex(
        (f) => f.messageId === messageId.toString() && f.fileUrl === fileUrl
      );
      
      if (existingIndex >= 0) {
        files[existingIndex] = storedFile;
      } else {
        files.push(storedFile);
      }
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(files));
      return localPath;
    } else {
      throw new Error(`Download failed with status code: ${downloadResult.statusCode}`);
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

/**
 * Get local file path for sender (original location)
 */
export const getSenderFileUri = (uri: string): string => {
  // For sender, return the original URI
  return uri;
};

/**
 * Check if file is an image
 */
export const isImageFile = (fileName: string, mimeType?: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  const imageMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
  
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return imageExtensions.includes(ext) || (mimeType ? imageMimes.includes(mimeType) : false);
};

/**
 * Check if file is a video
 */
export const isVideoFile = (fileName: string, mimeType?: string): boolean => {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.3gp'];
  const videoMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];
  
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return videoExtensions.includes(ext) || (mimeType ? videoMimes.includes(mimeType) : false);
};


