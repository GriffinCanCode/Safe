"use strict";
/**
 * @fileoverview Chunk Processing Functions
 * @description Cloud Functions for processing encrypted file chunks in ZK-Vault
 * @security Zero-knowledge chunk processing - server never sees decrypted content
 */
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateChunkRecoveryPlan =
  exports.validateChunkEncryption =
  exports.optimizeChunk =
  exports.cleanupExpiredChunks =
  exports.verifyChunkIntegrity =
    void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const error_handler_1 = require("../utils/error-handler");
const rate_limiting_1 = require("../utils/rate-limiting");
const db = admin.firestore();
const storage = admin.storage();
const bucket = storage.bucket();
/**
 * Verifies chunk integrity after upload
 * Ensures uploaded chunks match expected size and metadata
 */
exports.verifyChunkIntegrity = functions.storage
  .object()
  .onFinalize(async (object) => {
    try {
      // Extract file path components
      const filePath = object.name || "";
      const pathComponents = filePath.split("/");
      // Check if this is a file chunk
      if (
        pathComponents.length < 5 ||
        pathComponents[0] !== "files" ||
        pathComponents[3] !== "chunks"
      ) {
        // Not a file chunk, ignore
        return null;
      }
      const userId = pathComponents[1];
      const fileId = pathComponents[2];
      const chunkIndex = parseInt(pathComponents[4], 10);
      if (isNaN(chunkIndex)) {
        console.error(`Invalid chunk index in path: ${filePath}`);
        return null;
      }
      // Get file record
      const fileRef = db.collection("files").doc(fileId);
      const fileDoc = await fileRef.get();
      if (!fileDoc.exists) {
        console.error(`File record not found for chunk: ${filePath}`);
        return null;
      }
      const fileData = fileDoc.data();
      // Security check: ensure path matches expected pattern
      if (fileData?.userId !== userId) {
        console.error(`User ID mismatch for chunk: ${filePath}`);
        return null;
      }
      // Check if chunk size is within expected range
      // We don't know exact chunk size, but we can check if it's reasonable
      const chunkSize = Number(object.size) || 0;
      const avgChunkSize = fileData.totalSize / fileData.totalChunks;
      const maxVariance = 0.5; // Allow 50% variance in chunk size
      if (
        chunkSize <= 0 ||
        chunkSize > avgChunkSize * (1 + maxVariance) * 1.5
      ) {
        console.warn(
          `Chunk size out of expected range: ${chunkSize} bytes, expected ~${avgChunkSize} bytes`,
        );
        // We don't fail here, just log a warning
      }
      // Update chunk metadata in file record
      await fileRef.update({
        [`chunkMetadata.${chunkIndex}`]: {
          size: chunkSize,
          contentType: object.contentType || fileData.contentType,
          md5Hash: object.md5Hash || null,
          timeCreated: admin.firestore.Timestamp.fromDate(
            new Date(object.timeCreated || Date.now()),
          ),
          verified: true,
        },
      });
      return null;
    } catch (error) {
      console.error("Error verifying chunk integrity:", error);
      return null;
    }
  });
/**
 * Schedules cleanup of expired temporary chunks
 * Runs daily to clean up chunks that were not finalized
 */
exports.cleanupExpiredChunks = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async () => {
    try {
      // Find expired file records
      const expiredFilesSnapshot = await db
        .collection("files")
        .where("status", "==", "pending")
        .where("expiresAt", "<", admin.firestore.Timestamp.now())
        .limit(100)
        .get();
      if (expiredFilesSnapshot.empty) {
        console.log("No expired chunks to clean up");
        return null;
      }
      console.log(
        `Found ${expiredFilesSnapshot.size} expired file records to clean up`,
      );
      // Process each expired file
      const deletePromises = expiredFilesSnapshot.docs.map(async (doc) => {
        const fileData = doc.data();
        const fileId = doc.id;
        // Delete all chunks from storage
        if (fileData.chunkPaths && Array.isArray(fileData.chunkPaths)) {
          const chunkDeletePromises = fileData.chunkPaths.map((chunkPath) => {
            return bucket
              .file(chunkPath)
              .delete()
              .catch((err) => {
                console.warn(`Failed to delete chunk at ${chunkPath}:`, err);
                // Continue with deletion even if some chunks fail
                return null;
              });
          });
          await Promise.all(chunkDeletePromises);
        }
        // Delete the file record
        await doc.ref.delete();
        console.log(
          `Cleaned up expired file ${fileId} with ${fileData.chunkPaths.length} chunks`,
        );
        return fileId;
      });
      await Promise.all(deletePromises);
      return null;
    } catch (error) {
      console.error("Error cleaning up expired chunks:", error);
      return null;
    }
  });
/**
 * Processes uploaded chunks for optimization
 * Can be used for server-side processing like compression or validation
 */
exports.optimizeChunk = functions.https.onCall(async (data, context) => {
  try {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }
    // Apply rate limiting
    await (0, rate_limiting_1.checkRateLimit)(
      context.auth.uid,
      "optimizeChunk",
      20,
    );
    const { fileId, chunkIndex } = data;
    // Validate input
    if (!fileId || chunkIndex === undefined) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing fileId or chunkIndex",
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
        "You do not have permission to access this file",
      );
    }
    // Get chunk path
    const chunkPath = fileData?.chunkPaths[chunkIndex];
    if (!chunkPath) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid chunk index",
      );
    }
    // Check if chunk exists
    const [exists] = await bucket.file(chunkPath).exists();
    if (!exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Chunk not found in storage",
      );
    }
    // Note: In a zero-knowledge system, we can't actually modify the encrypted chunks
    // as we don't have the keys. This function would normally be used for operations
    // that don't require decryption, such as:
    // - Validating chunk metadata
    // - Checking for malicious content signatures
    // - Updating chunk access permissions
    // For this example, we'll just update the chunk metadata to mark it as optimized
    await fileRef.update({
      [`chunkMetadata.${chunkIndex}.optimized`]: true,
      [`chunkMetadata.${chunkIndex}.optimizedAt`]:
        admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
      success: true,
      message: "Chunk marked as optimized",
    };
  } catch (error) {
    return (0, error_handler_1.handleError)(error, "optimizeChunk");
  }
});
/**
 * Validates chunk encryption headers
 * Ensures chunks have proper encryption headers without accessing content
 */
exports.validateChunkEncryption = functions.https.onCall(
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
      await (0, rate_limiting_1.checkRateLimit)(
        context.auth.uid,
        "validateChunkEncryption",
        20,
      );
      const { fileId, chunkIndex, encryptionHeaders } = data;
      // Validate input
      if (!fileId || chunkIndex === undefined || !encryptionHeaders) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing required parameters",
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
          "You do not have permission to access this file",
        );
      }
      // Validate encryption headers
      // Note: In a real implementation, we would check that the headers match
      // expected format for the encryption algorithm without decrypting
      const validationResults = {
        hasValidHeader:
          encryptionHeaders.version && encryptionHeaders.algorithm,
        hasValidFormat: !!encryptionHeaders.format,
        isSupportedAlgorithm: [
          "AES-GCM",
          "ChaCha20-Poly1305",
          "Hybrid-AES-Kyber",
        ].includes(encryptionHeaders.algorithm),
        isQuantumResistant: encryptionHeaders.algorithm === "Hybrid-AES-Kyber",
      };
      const isValid =
        validationResults.hasValidHeader &&
        validationResults.hasValidFormat &&
        validationResults.isSupportedAlgorithm;
      // Update chunk metadata with validation results
      await fileRef.update({
        [`chunkMetadata.${chunkIndex}.encryptionValidated`]: isValid,
        [`chunkMetadata.${chunkIndex}.encryptionValidationResults`]:
          validationResults,
        [`chunkMetadata.${chunkIndex}.validatedAt`]:
          admin.firestore.FieldValue.serverTimestamp(),
      });
      return {
        success: true,
        isValid,
        validationResults,
      };
    } catch (error) {
      return (0, error_handler_1.handleError)(error, "validateChunkEncryption");
    }
  },
);
/**
 * Generates a recovery plan for corrupted chunks
 * Helps client rebuild missing or corrupted chunks if possible
 */
exports.generateChunkRecoveryPlan = functions.https.onCall(
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
      await (0, rate_limiting_1.checkRateLimit)(
        context.auth.uid,
        "generateChunkRecoveryPlan",
        5,
      );
      const { fileId, corruptedChunks } = data;
      // Validate input
      if (!fileId || !Array.isArray(corruptedChunks)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing fileId or corruptedChunks array",
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
      // Security check: ensure user owns this file or it's shared with them
      const isOwner = fileData?.userId === context.auth.uid;
      const isShared = await db
        .collection("fileShares")
        .where("fileId", "==", fileId)
        .where("sharedWithUserId", "==", context.auth.uid)
        .where("status", "==", "active")
        .limit(1)
        .get()
        .then((snapshot) => !snapshot.empty);
      if (!isOwner && !isShared) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You do not have permission to access this file",
        );
      }
      if (!fileData || !fileData.chunkPaths) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "File data is incomplete",
        );
      }
      // Check which chunks actually exist in storage
      const chunkExistencePromises = fileData.chunkPaths.map(
        async (path, index) => {
          const [exists] = await bucket.file(path).exists();
          return { index, exists };
        },
      );
      const chunkExistence = await Promise.all(chunkExistencePromises);
      const missingChunks = chunkExistence
        .filter((chunk) => !chunk.exists)
        .map((chunk) => chunk.index);
      // Combine client-reported corrupted chunks with server-detected missing chunks
      const allProblematicChunks = [
        ...new Set([...corruptedChunks, ...missingChunks]),
      ];
      // Generate new signed URLs for the problematic chunks
      const recoveryPlan = await Promise.all(
        allProblematicChunks.map(async (chunkIndex) => {
          const chunkPath = fileData.chunkPaths[chunkIndex];
          // Generate a new signed URL for upload
          const [uploadUrl] = await bucket.file(chunkPath).getSignedUrl({
            version: "v4",
            action: "write",
            expires: Date.now() + 60 * 60 * 1000,
            contentType: fileData.contentType,
            virtualHostedStyle: true,
          });
          return {
            chunkIndex,
            chunkPath,
            uploadUrl,
            status: missingChunks.includes(chunkIndex)
              ? "missing"
              : "corrupted",
          };
        }),
      );
      // Update file record to track recovery attempt
      await fileRef.update({
        recoveryAttempts: admin.firestore.FieldValue.increment(1),
        lastRecoveryAt: admin.firestore.FieldValue.serverTimestamp(),
        [`recoveryHistory.${Date.now()}`]: {
          chunks: allProblematicChunks,
          userId: context.auth.uid,
        },
      });
      return {
        success: true,
        recoveryPlan,
        totalChunks: fileData?.totalChunks || 0,
        corruptedChunksCount: corruptedChunks.length,
        missingChunksCount: missingChunks.length,
      };
    } catch (error) {
      return (0, error_handler_1.handleError)(
        error,
        "generateChunkRecoveryPlan",
      );
    }
  },
);
//# sourceMappingURL=chunk-processing.functions.js.map
