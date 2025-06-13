/**
 * @fileoverview Deduplication Functions
 * @description Cloud Functions for file deduplication in ZK-Vault
 * @security Zero-knowledge deduplication - server never sees decrypted content
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { handleError } from "../utils/error-handler";
import { checkRateLimit } from "../utils/rate-limiting";

const db = admin.firestore();
const storage = admin.storage();
const bucket = storage.bucket();

/**
 * Checks if a file with the same hash already exists
 * Enables client-side deduplication without revealing file contents
 */
export const checkFileExists = functions.https.onCall(async (data, context) => {
  try {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }

    // Apply rate limiting
    await checkRateLimit(context.auth.uid, "checkFileExists", 30);

    const {
      fileHash, // Client-computed hash of the encrypted file
      encryptionType, // Type of encryption used
    } = data;

    // Validate input
    if (!fileHash) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing fileHash",
      );
    }

    // Check if file with same hash exists in the system
    // Note: We're checking a hash of already-encrypted data, so this is
    // a zero-knowledge operation - we never see the plaintext
    const filesSnapshot = await db
      .collection("files")
      .where("fileHash", "==", fileHash)
      .where("status", "==", "complete")
      .where("encryptionType", "==", encryptionType || "standard")
      .limit(1)
      .get();

    if (filesSnapshot.empty) {
      // No matching file found
      return {
        exists: false,
      };
    }

    // File with same hash exists
    const existingFile = filesSnapshot.docs[0].data();

    // Check if the current user already owns this file
    if (existingFile.userId === context.auth.uid) {
      return {
        exists: true,
        ownedByUser: true,
        fileId: filesSnapshot.docs[0].id,
      };
    }

    // File exists but is owned by another user
    // We don't reveal the owner, just that it exists
    return {
      exists: true,
      ownedByUser: false,
    };
  } catch (error) {
    return handleError(error, "checkFileExists");
  }
});

/**
 * Registers a file hash for deduplication
 * Called after successful file upload to enable future deduplication
 */
export const registerFileHash = functions.https.onCall(
  async (data, context) => {
    try {
      // Ensure user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(context.auth.uid, "registerFileHash", 20);

      const {
        fileId,
        fileHash,
        encryptionType = "standard",
        chunkHashes = [],
      } = data;

      // Validate input
      if (!fileId || !fileHash) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing fileId or fileHash",
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

      const fileData = fileDoc.data();

      // Security check: ensure user owns this file
      if (fileData?.userId !== context.auth.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You do not have permission to update this file",
        );
      }

      // Update file record with hash information
      await fileRef.update({
        fileHash,
        encryptionType,
        chunkHashes:
          chunkHashes.length > 0
            ? chunkHashes
            : admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Add to deduplication index
      const dedupRef = db.collection("deduplicationIndex").doc(fileHash);

      await db.runTransaction(async (transaction) => {
        const dedupDoc = await transaction.get(dedupRef);

        if (!dedupDoc.exists) {
          // Create new deduplication entry
          transaction.set(dedupRef, {
            fileHash,
            encryptionType,
            fileIds: [fileId],
            userIds: [context.auth!.uid],
            referenceCount: 1,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          // Update existing deduplication entry
          const dedupData = dedupDoc.data();
          if (!dedupData) {
            throw new Error("Deduplication data is missing");
          }

          const fileIds = dedupData.fileIds || [];
          const userIds = dedupData.userIds || [];

          // Only add if not already in the arrays
          if (!fileIds.includes(fileId)) {
            fileIds.push(fileId);
          }

          if (!userIds.includes(context.auth!.uid)) {
            userIds.push(context.auth!.uid);
          }

          transaction.update(dedupRef, {
            fileIds,
            userIds,
            referenceCount: fileIds.length,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      });

      return {
        success: true,
        fileId,
        fileHash,
      };
    } catch (error) {
      return handleError(error, "registerFileHash");
    }
  },
);

/**
 * Creates a deduplication reference instead of uploading duplicate chunks
 * Allows efficient storage without compromising zero-knowledge principle
 */
export const createDeduplicationReference = functions.https.onCall(
  async (data, context) => {
    try {
      // Ensure user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(
        context.auth.uid,
        "createDeduplicationReference",
        10,
      );

      const {
        fileHash,
        fileName,
        totalSize,
        encryptedMetadata,
        encryptionType = "standard",
      } = data;

      // Validate input
      if (!fileHash || !fileName || !totalSize || !encryptedMetadata) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing required file information",
        );
      }

      // Find the source file with this hash
      const dedupRef = db.collection("deduplicationIndex").doc(fileHash);
      const dedupDoc = await dedupRef.get();

      if (!dedupDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "No file with this hash exists for deduplication",
        );
      }

      const dedupData = dedupDoc.data();

      if (!dedupData) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Deduplication data is missing",
        );
      }

      // Get the first file ID from the deduplication index
      const sourceFileId = dedupData.fileIds[0];

      if (!sourceFileId) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Source file not available for deduplication",
        );
      }

      // Get the source file record
      const sourceFileRef = db.collection("files").doc(sourceFileId);
      const sourceFileDoc = await sourceFileRef.get();

      if (!sourceFileDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Source file record not found",
        );
      }

      const sourceFileData = sourceFileDoc.data();

      if (!sourceFileData) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Source file data is missing",
        );
      }

      // Create a new file record that references the existing chunks
      const fileRef = db.collection("files").doc();
      const fileId = fileRef.id;

      await fileRef.set({
        userId: context.auth.uid,
        fileName, // This is already encrypted by client
        totalSize,
        totalChunks: sourceFileData.totalChunks,
        uploadedChunks: sourceFileData.totalChunks, // All chunks are already available
        contentType: sourceFileData.contentType,
        encryptedMetadata, // Client-encrypted metadata (includes keys, etc.)
        status: "complete",
        fileHash,
        encryptionType,
        isDeduplicated: true,
        sourceFileId,
        chunkPaths: sourceFileData.chunkPaths,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        ),
      });

      // Update the deduplication index
      await dedupRef.update({
        fileIds: admin.firestore.FieldValue.arrayUnion(fileId),
        userIds: admin.firestore.FieldValue.arrayUnion(context.auth.uid),
        referenceCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        fileId,
        isDeduplicated: true,
        sourceFileId,
      };
    } catch (error) {
      return handleError(error, "createDeduplicationReference");
    }
  },
);

/**
 * Handles reference counting for deduplicated files
 * Triggered when a file is deleted to manage deduplication references
 */
export const handleDeduplicationOnDelete = functions.firestore
  .document("files/{fileId}")
  .onDelete(async (snapshot, context) => {
    try {
      const fileData = snapshot.data();
      const fileId = context.params.fileId;

      // Check if this file has a hash for deduplication
      if (!fileData.fileHash) {
        return null; // No deduplication reference to update
      }

      const dedupRef = db
        .collection("deduplicationIndex")
        .doc(fileData.fileHash);
      const dedupDoc = await dedupRef.get();

      if (!dedupDoc.exists) {
        return null; // No deduplication entry exists
      }

      const dedupData = dedupDoc.data();

      if (!dedupData) {
        return null; // No valid deduplication data
      }

      // Remove this file from the deduplication index
      const updatedFileIds = (dedupData.fileIds || []).filter(
        (id: string) => id !== fileId,
      );

      // Recalculate user IDs (this is more complex as we need to check remaining files)
      let updatedUserIds = dedupData.userIds || [];
      const userId = fileData.userId;

      // Check if this user still has other files with this hash
      const userStillHasFiles = updatedFileIds.some(
        async (remainingFileId: string) => {
          const remainingFileDoc = await db
            .collection("files")
            .doc(remainingFileId)
            .get();
          const remainingData = remainingFileDoc.data();
          return (
            remainingFileDoc.exists &&
            remainingData &&
            remainingData.userId === userId
          );
        },
      );

      if (!userStillHasFiles) {
        updatedUserIds = updatedUserIds.filter((id: string) => id !== userId);
      }

      if (updatedFileIds.length === 0) {
        // No more references, delete the deduplication entry
        await dedupRef.delete();
      } else {
        // Update with reduced reference count
        await dedupRef.update({
          fileIds: updatedFileIds,
          userIds: updatedUserIds,
          referenceCount: updatedFileIds.length,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return null;
    } catch (error) {
      console.error("Error handling deduplication on delete:", error);
      return null;
    }
  });

/**
 * Finds potential duplicates within a user's files
 * Helps users identify and clean up duplicate files
 */
export const findUserDuplicates = functions.https.onCall(
  async (data, context) => {
    try {
      // Ensure user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(context.auth.uid, "findUserDuplicates", 5);

      // Get user's files with hashes
      const filesSnapshot = await db
        .collection("files")
        .where("userId", "==", context.auth.uid)
        .where("status", "==", "complete")
        .get();

      if (filesSnapshot.empty) {
        return { duplicates: [] };
      }

      // Group files by hash
      const filesByHash: Record<
        string,
        Array<{
          fileId: string;
          fileName: string;
          totalSize: number;
          createdAt: Date | null;
        }>
      > = {};

      filesSnapshot.forEach((doc) => {
        const file = doc.data();
        const fileId = doc.id;

        if (file.fileHash) {
          if (!filesByHash[file.fileHash]) {
            filesByHash[file.fileHash] = [];
          }

          filesByHash[file.fileHash].push({
            fileId,
            fileName: file.fileName,
            totalSize: file.totalSize,
            createdAt: file.createdAt?.toDate() || null,
          });
        }
      });

      // Find hashes with multiple files (duplicates)
      const duplicateGroups = [];

      for (const [hash, files] of Object.entries(filesByHash)) {
        if (files.length > 1) {
          duplicateGroups.push({
            fileHash: hash,
            duplicateCount: files.length,
            totalSize: files[0].totalSize,
            files: files.sort((a, b) => {
              // Sort by creation date, newest first
              if (!a.createdAt || !b.createdAt) return 0;
              return b.createdAt.getTime() - a.createdAt.getTime();
            }),
          });
        }
      }

      return {
        duplicates: duplicateGroups.sort(
          (a, b) => b.duplicateCount - a.duplicateCount,
        ),
      };
    } catch (error) {
      return handleError(error, "findUserDuplicates");
    }
  },
);
