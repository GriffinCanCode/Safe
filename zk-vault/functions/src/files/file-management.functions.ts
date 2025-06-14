/**
 * @fileoverview File Management Functions
 * @description Cloud Functions for secure file management in ZK-Vault
 * @security Zero-knowledge file operations using integrated crypto package
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {checkRateLimit} from "../utils/rate-limiting";
import {
  AlgorithmSelector,
  FILE_ENCRYPTION,
} from "@zk-vault/crypto";
import type {AlgorithmSelection} from "@zk-vault/shared";

const db = admin.firestore();
const storage = admin.storage();
const bucket = storage.bucket();

// TypeScript interfaces
interface InitiateFileUploadData {
  fileName: string;
  fileSize: number;
  contentType: string;
  chunkSize?: number;
  encryptionPreferences?: Record<string, unknown>;
}

interface InitiateFileUploadResponse {
  success: boolean;
  fileId: string;
  uploadUrls: string[];
  chunkPaths: string[];
  totalChunks: number;
  algorithmSelection: AlgorithmSelection;
  expiresAt: string;
}

interface FinalizeFileUploadData {
  fileId: string;
  encryptedMetadata: string;
  fileHash: string;
}

interface FinalizeFileUploadResponse {
  success: boolean;
  fileId: string;
  status: string;
}

interface GenerateDownloadUrlsData {
  fileId: string;
}

interface GenerateDownloadUrlsResponse {
  success: boolean;
  fileId: string;
  downloadUrls: string[];
  totalChunks: number;
  encryptedMetadata: string;
  expiresAt: string;
}

interface ShareFileData {
  fileId: string;
  recipientEmail: string;
  encryptedFileKey: string;
  permissions?: string;
}

interface ShareFileResponse {
  success: boolean;
  shareId: string;
  fileId: string;
  recipientEmail: string;
}

interface ListFilesData {
  includeShared?: boolean;
  status?: string;
  limit?: number;
  offset?: number;
}

interface FileItem {
  id: string;
  shareId?: string;
  fileName: string;
  originalSize: number;
  contentType: string;
  encryptedMetadata?: string;
  encryptedFileKey?: string;
  createdAt?: string;
  sharedAt?: string;
  permissions?: string;
  status: string;
  isOwned: boolean;
  isShared: boolean;
  sharedBy?: string;
}

interface ListFilesResponse {
  success: boolean;
  files: FileItem[];
  count: number;
  hasMore: boolean;
}

interface DeleteFileData {
  fileId: string;
}

interface DeleteFileResponse {
  success: boolean;
  fileId: string;
}

interface FileDocument {
  userId: string;
  fileName: string;
  originalSize: number;
  contentType: string;
  totalChunks: number;
  chunkSize: number;
  chunkPaths: string[];
  algorithmSelection: string;
  encryptionPreferences: Record<string, unknown>;
  status: string;
  uploadedChunks: number;
  encryptedMetadata?: string;
  fileHash?: string;
  isDeduplicated?: boolean;
  createdAt: admin.firestore.Timestamp;
  completedAt?: admin.firestore.Timestamp;
  expiresAt: admin.firestore.Timestamp;
}

interface ShareDocument {
  fileId: string;
  ownerId: string;
  sharedWithUserId: string;
  sharedWithEmail: string;
  encryptedFileKey: string;
  permissions: string;
  status: string;
  createdAt: admin.firestore.Timestamp;
  expiresAt: admin.firestore.Timestamp;
}

/**
 * Initiates a new file upload session
 * Creates upload URLs and session tracking for encrypted file chunks
 */
export const initiateFileUpload = functions.https.onCall(
  async (data: InitiateFileUploadData, context: functions.https.CallableContext): Promise<InitiateFileUploadResponse> => {
    try {
      // Ensure user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(context.auth.uid, "initiateFileUpload", 10);

      const {
        fileName,
        fileSize,
        contentType,
        chunkSize = FILE_ENCRYPTION.CHUNK_SIZE,
        encryptionPreferences,
      } = data;

      // Validate input
      if (!fileName || !fileSize || !contentType) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing required file information",
        );
      }

      if (fileSize > FILE_ENCRYPTION.MAX_FILE_SIZE) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "File size exceeds maximum allowed",
        );
      }

      // Select optimal encryption algorithm
      const algorithmSelection =
        await AlgorithmSelector.selectOptimalAlgorithm();

      // Calculate number of chunks
      const totalChunks = Math.ceil(fileSize / chunkSize);

      if (totalChunks > 10000) {
        // Reasonable limit for chunks
        throw new functions.https.HttpsError(
          "invalid-argument",
          "File would exceed maximum chunk limit",
        );
      }

      // Create file record
      const fileRef = db.collection("files").doc();
      const fileId = fileRef.id;
      const userId = context.auth.uid;

      // Generate chunk paths
      const chunkPaths = Array.from(
        {length: totalChunks},
        (_, i) =>
          `files/${userId}/${fileId}/chunks/${i.toString().padStart(6, "0")}`,
      );

      // Create signed URLs for chunk uploads
      const uploadUrls = await Promise.all(
        chunkPaths.map(async (path) => {
          const [url] = await bucket.file(path).getSignedUrl({
            version: "v4",
            action: "write",
            expires: Date.now() + 60 * 60 * 1000, // 1 hour
            contentType: "application/octet-stream",
            virtualHostedStyle: true,
          });
          return url;
        }),
      );

      // Store file metadata
      const fileDocument: Partial<FileDocument> = {
        userId,
        fileName, // This will be encrypted on the client side
        originalSize: fileSize,
        contentType,
        totalChunks,
        chunkSize,
        chunkPaths,
        encryptionPreferences: encryptionPreferences || {},
        status: "pending",
        uploadedChunks: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
        expiresAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        ),
      };

      await fileRef.set(fileDocument);

      return {
        success: true,
        fileId,
        uploadUrls,
        chunkPaths,
        totalChunks,
        algorithmSelection,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };
    } catch (error) {
      console.error("Error in initiateFileUpload:", error);
      throw error instanceof functions.https.HttpsError ? error :
        new functions.https.HttpsError("internal", "An unexpected error occurred");
    }
  },
);

/**
 * Finalizes file upload after all chunks are uploaded
 * Validates chunk integrity and marks file as complete
 */
export const finalizeFileUpload = functions.https.onCall(
  async (data: FinalizeFileUploadData, context: functions.https.CallableContext): Promise<FinalizeFileUploadResponse> => {
    try {
      // Ensure user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(context.auth.uid, "finalizeFileUpload", 10);

      const {fileId, encryptedMetadata, fileHash} = data;

      // Validate input
      if (!fileId || !encryptedMetadata || !fileHash) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing required finalization data",
        );
      }

      // Get file record
      const fileRef = db.collection("files").doc(fileId);
      const fileDoc = await fileRef.get();

      if (!fileDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "File record not found",
        );
      }

      const fileData = fileDoc.data() as FileDocument;

      // Security check: ensure user owns this file
      if (fileData?.userId !== context.auth.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You do not have permission to finalize this file",
        );
      }

      // Check if all chunks are uploaded
      const totalChunks = fileData.totalChunks;
      const chunkExistencePromises = fileData.chunkPaths.map(
        async (path: string) => {
          const [exists] = await bucket.file(path).exists();
          return exists;
        },
      );

      const chunkExistence = await Promise.all(chunkExistencePromises);
      const allChunksUploaded = chunkExistence.every(
        (exists: boolean) => exists,
      );

      if (!allChunksUploaded) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Not all chunks have been uploaded",
        );
      }

      // Update file record
      await fileRef.update({
        status: "complete",
        uploadedChunks: totalChunks,
        encryptedMetadata,
        fileHash,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from completion
        ),
      });

      // Update user's file count and storage usage
      await updateUserStorageStats(context.auth.uid);

      return {
        success: true,
        fileId,
        status: "complete",
      };
    } catch (error) {
      console.error("Error in finalizeFileUpload:", error);
      throw error instanceof functions.https.HttpsError ? error :
        new functions.https.HttpsError("internal", "An unexpected error occurred");
    }
  },
);

/**
 * Generates download URLs for file chunks
 * Provides secure access to encrypted file data
 */
export const generateDownloadUrls = functions.https.onCall(
  async (data: GenerateDownloadUrlsData, context: functions.https.CallableContext): Promise<GenerateDownloadUrlsResponse> => {
    try {
      // Ensure user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(context.auth.uid, "generateDownloadUrls", 20);

      const {fileId} = data;

      // Validate input
      if (!fileId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "File ID is required",
        );
      }

      // Get file record
      const fileRef = db.collection("files").doc(fileId);
      const fileDoc = await fileRef.get();

      if (!fileDoc.exists) {
        throw new functions.https.HttpsError("not-found", "File not found");
      }

      const fileData = fileDoc.data() as FileDocument;

      // Check access permissions
      const isOwner = fileData?.userId === context.auth.uid;

      // Check if file is shared with user
      let isShared = false;
      if (!isOwner) {
        const shareDoc = await db
          .collection("fileShares")
          .where("fileId", "==", fileId)
          .where("sharedWithUserId", "==", context.auth.uid)
          .where("status", "==", "active")
          .limit(1)
          .get();

        isShared = !shareDoc.empty;
      }

      if (!isOwner && !isShared) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You do not have access to this file",
        );
      }

      // Check if file is complete
      if (fileData?.status !== "complete") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "File is not ready for download",
        );
      }

      // Generate download URLs for all chunks
      const downloadUrls = await Promise.all(
        fileData.chunkPaths.map(async (path: string) => {
          const [url] = await bucket.file(path).getSignedUrl({
            version: "v4",
            action: "read",
            expires: Date.now() + 60 * 60 * 1000, // 1 hour
            virtualHostedStyle: true,
          });
          return url;
        }),
      );

      // Log access for audit
      await db.collection("fileAccessLogs").add({
        fileId,
        userId: context.auth.uid,
        action: "download",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        isOwner,
        isShared,
      });

      return {
        success: true,
        fileId,
        downloadUrls,
        totalChunks: fileData.totalChunks,
        encryptedMetadata: fileData.encryptedMetadata || "",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };
    } catch (error) {
      console.error("Error in generateDownloadUrls:", error);
      throw error instanceof functions.https.HttpsError ? error :
        new functions.https.HttpsError("internal", "An unexpected error occurred");
    }
  },
);

/**
 * Shares a file with another user
 * Creates secure sharing mechanism with encrypted keys
 */
export const shareFile = functions.https.onCall(
  async (data: ShareFileData, context: functions.https.CallableContext): Promise<ShareFileResponse> => {
    try {
      // Ensure user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(context.auth.uid, "shareFile", 10);

      const {
        fileId,
        recipientEmail,
        encryptedFileKey,
        permissions = "read",
      } = data;

      // Validate input
      if (!fileId || !recipientEmail || !encryptedFileKey) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing required sharing data",
        );
      }

      // Get file record
      const fileRef = db.collection("files").doc(fileId);
      const fileDoc = await fileRef.get();

      if (!fileDoc.exists) {
        throw new functions.https.HttpsError("not-found", "File not found");
      }

      const fileData = fileDoc.data() as FileDocument;

      // Security check: ensure user owns this file
      if (fileData?.userId !== context.auth.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You do not own this file",
        );
      }

      // Find recipient user
      const recipientQuery = await db
        .collection("users")
        .where("email", "==", recipientEmail.toLowerCase())
        .limit(1)
        .get();

      if (recipientQuery.empty) {
        throw new functions.https.HttpsError(
          "not-found",
          "Recipient user not found",
        );
      }

      const recipientDoc = recipientQuery.docs[0];
      const recipientId = recipientDoc.id;

      // Don't allow sharing with yourself
      if (recipientId === context.auth.uid) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Cannot share file with yourself",
        );
      }

      // Check if already shared
      const existingShare = await db
        .collection("fileShares")
        .where("fileId", "==", fileId)
        .where("sharedWithUserId", "==", recipientId)
        .limit(1)
        .get();

      if (!existingShare.empty) {
        throw new functions.https.HttpsError(
          "already-exists",
          "File is already shared with this user",
        );
      }

      // Create share record
      const shareRef = db.collection("fileShares").doc();

      const shareDocument: Partial<ShareDocument> = {
        fileId,
        ownerId: context.auth.uid,
        sharedWithUserId: recipientId,
        sharedWithEmail: recipientEmail.toLowerCase(),
        encryptedFileKey,
        permissions,
        status: "active",
        createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
        expiresAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        ),
      };

      await shareRef.set(shareDocument);

      return {
        success: true,
        shareId: shareRef.id,
        fileId,
        recipientEmail,
      };
    } catch (error) {
      console.error("Error in shareFile:", error);
      throw error instanceof functions.https.HttpsError ? error :
        new functions.https.HttpsError("internal", "An unexpected error occurred");
    }
  },
);

/**
 * Lists files owned by or shared with the user
 */
export const listFiles = functions.https.onCall(
  async (data: ListFilesData, context: functions.https.CallableContext): Promise<ListFilesResponse> => {
    try {
      // Ensure user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(context.auth.uid, "listFiles", 30);

      const {
        includeShared = true,
        status = "complete",
        limit = 50,
        offset = 0,
      } = data || {};

      const userId = context.auth.uid;
      const files: FileItem[] = [];

      // Get owned files
      const ownedFilesQuery = db
        .collection("files")
        .where("userId", "==", userId)
        .where("status", "==", status)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .offset(offset);

      const ownedFilesSnapshot = await ownedFilesQuery.get();

      ownedFilesSnapshot.docs.forEach(
        (doc: admin.firestore.QueryDocumentSnapshot) => {
          const data = doc.data() as FileDocument;
          files.push({
            id: doc.id,
            fileName: data.fileName, // Already encrypted
            originalSize: data.originalSize,
            contentType: data.contentType,
            encryptedMetadata: data.encryptedMetadata,
            createdAt: data.createdAt?.toDate()?.toISOString(),
            status: data.status,
            isOwned: true,
            isShared: false,
          });
        },
      );

      // Get shared files if requested
      if (includeShared) {
        const sharedFilesQuery = await db
          .collection("fileShares")
          .where("sharedWithUserId", "==", userId)
          .where("status", "==", "active")
          .limit(limit)
          .get();

        for (const shareDoc of sharedFilesQuery.docs) {
          const shareData = shareDoc.data() as ShareDocument;

          // Get the actual file data
          const fileDoc = await db
            .collection("files")
            .doc(shareData.fileId)
            .get();

          if (fileDoc.exists && (fileDoc.data() as FileDocument)?.status === status) {
            const fileData = fileDoc.data() as FileDocument;
            files.push({
              id: fileDoc.id,
              shareId: shareDoc.id,
              fileName: fileData.fileName,
              originalSize: fileData.originalSize,
              contentType: fileData.contentType,
              encryptedMetadata: fileData.encryptedMetadata,
              encryptedFileKey: shareData.encryptedFileKey,
              createdAt: fileData.createdAt?.toDate()?.toISOString(),
              sharedAt: shareData.createdAt?.toDate()?.toISOString(),
              permissions: shareData.permissions,
              status: fileData.status,
              isOwned: false,
              isShared: true,
              sharedBy: shareData.ownerId,
            });
          }
        }
      }

      // Sort by creation date
      files.sort((a, b) => {
        const aDate = new Date(a.createdAt || 0);
        const bDate = new Date(b.createdAt || 0);
        return bDate.getTime() - aDate.getTime();
      });

      return {
        success: true,
        files: files.slice(0, limit),
        count: files.length,
        hasMore: files.length === limit,
      };
    } catch (error) {
      console.error("Error in listFiles:", error);
      throw error instanceof functions.https.HttpsError ? error :
        new functions.https.HttpsError("internal", "An unexpected error occurred");
    }
  },
);

/**
 * Deletes a file and all its chunks
 */
export const deleteFile = functions.https.onCall(
  async (data: DeleteFileData, context: functions.https.CallableContext): Promise<DeleteFileResponse> => {
    try {
      // Ensure user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(context.auth.uid, "deleteFile", 10);

      const {fileId} = data;

      // Validate input
      if (!fileId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "File ID is required",
        );
      }

      // Get file record
      const fileRef = db.collection("files").doc(fileId);
      const fileDoc = await fileRef.get();

      if (!fileDoc.exists) {
        throw new functions.https.HttpsError("not-found", "File not found");
      }

      const fileData = fileDoc.data() as FileDocument;

      // Security check: ensure user owns this file
      if (fileData?.userId !== context.auth.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You do not own this file",
        );
      }

      // Delete file chunks from storage (only if not deduplicated)
      if (!fileData.isDeduplicated && fileData.chunkPaths) {
        const deletePromises = fileData.chunkPaths.map((path: string) => {
          return bucket
            .file(path)
            .delete()
            .catch((err: unknown) => {
              console.warn(`Failed to delete chunk at ${path}:`, err);
              // Continue deletion even if some chunks fail
              return null;
            });
        });

        await Promise.all(deletePromises);
      }

      // Delete all shares of this file
      const sharesSnapshot = await db
        .collection("fileShares")
        .where("fileId", "==", fileId)
        .get();

      const shareBatch = db.batch();
      sharesSnapshot.docs.forEach(
        (doc: admin.firestore.QueryDocumentSnapshot) => {
          shareBatch.delete(doc.ref);
        },
      );

      if (!sharesSnapshot.empty) {
        await shareBatch.commit();
      }

      // Delete the file record
      await fileRef.delete();

      // Update user's storage stats
      await updateUserStorageStats(context.auth.uid);

      return {
        success: true,
        fileId,
      };
    } catch (error) {
      console.error("Error in deleteFile:", error);
      throw error instanceof functions.https.HttpsError ? error :
        new functions.https.HttpsError("internal", "An unexpected error occurred");
    }
  },
);

/**
 * Helper function to update user storage statistics
 */
async function updateUserStorageStats(userId: string): Promise<void> {
  try {
    // Get all user's files
    const filesSnapshot = await db
      .collection("files")
      .where("userId", "==", userId)
      .where("status", "==", "complete")
      .get();

    let totalFiles = 0;
    let totalStorageUsed = 0;

    filesSnapshot.docs.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
      const fileData = doc.data() as FileDocument;
      totalFiles++;
      totalStorageUsed += fileData.originalSize || 0;
    });

    // Update user document
    await db.collection("users").doc(userId).update({
      totalFiles,
      totalStorageUsed,
      storageUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating user storage stats:", error);
    // Don't throw error as this is a background operation
  }
}
