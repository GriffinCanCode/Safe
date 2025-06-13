/**
 * @fileoverview Maintenance Functions
 * @description Cloud Functions for system maintenance operations in ZK-Vault
 * @security Admin-only operations for system maintenance
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { handleError } from "../utils/error-handler";
import { checkRateLimit } from "../utils/rate-limiting";

const db = admin.firestore();
const storage = admin.storage();
const bucket = storage.bucket();

/**
 * Cleans up expired files and chunks
 * Runs daily to remove files that have passed their expiration date
 */
export const cleanupExpiredFiles = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    try {
      // Find expired file records
      const now = admin.firestore.Timestamp.now();
      const expiredFilesSnapshot = await db
        .collection("files")
        .where("expiresAt", "<", now)
        .limit(500) // Process in batches
        .get();

      if (expiredFilesSnapshot.empty) {
        console.log("No expired files to clean up");
        return null;
      }

      console.log(
        `Found ${expiredFilesSnapshot.size} expired files to clean up`,
      );

      // Process each expired file
      const deletePromises = expiredFilesSnapshot.docs.map(async (doc) => {
        const fileData = doc.data();
        const fileId = doc.id;

        // Skip files that are deduplicated references unless they're the last reference
        if (fileData.isDeduplicated && fileData.sourceFileId) {
          // Check if source file still exists and has other references
          const dedupIndexRef = db
            .collection("deduplicationIndex")
            .doc(fileData.fileHash);
          const dedupDoc = await dedupIndexRef.get();

          if (dedupDoc.exists) {
            const dedupData = dedupDoc.data();
            const fileIds = dedupData?.fileIds || [];

            // If there are other files using this hash, just delete the reference
            if (fileIds.length > 1) {
              // Update deduplication index
              await dedupIndexRef.update({
                fileIds: admin.firestore.FieldValue.arrayRemove(fileId),
                referenceCount: admin.firestore.FieldValue.increment(-1),
              });

              // Delete the file record
              await doc.ref.delete();

              console.log(`Deleted deduplicated file reference ${fileId}`);
              return fileId;
            }
          }
        }

        // Delete all chunks from storage
        if (fileData.chunkPaths && Array.isArray(fileData.chunkPaths)) {
          const chunkDeletePromises = fileData.chunkPaths.map(
            (chunkPath: string) => {
              return bucket
                .file(chunkPath)
                .delete()
                .catch((err: any) => {
                  console.warn(`Failed to delete chunk at ${chunkPath}:`, err);
                  // Continue with deletion even if some chunks fail
                  return null;
                });
            },
          );

          await Promise.all(chunkDeletePromises);
        }

        // Delete any file shares
        const shareSnapshot = await db
          .collection("fileShares")
          .where("fileId", "==", fileId)
          .get();

        const shareDeletePromises = shareSnapshot.docs.map((doc) =>
          doc.ref.delete(),
        );
        await Promise.all(shareDeletePromises);

        // Delete the file record
        await doc.ref.delete();

        console.log(`Cleaned up expired file ${fileId}`);
        return fileId;
      });

      await Promise.all(deletePromises);

      return null;
    } catch (error) {
      console.error("Error cleaning up expired files:", error);
      return null;
    }
  });

/**
 * Purges inactive user accounts
 * Removes accounts that have been inactive for a specified period
 */
export const purgeInactiveUsers = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    try {
      // Ensure user is authenticated and an admin
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      // Check if user is an admin
      const userDoc = await db.collection("users").doc(context.auth.uid).get();
      const userData = userDoc.data();

      if (!userData?.isAdmin) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Admin privileges required",
        );
      }

      // Apply rate limiting for admin operations
      await checkRateLimit(context.auth.uid, "admin", 5);

      const { inactiveDays = 365, dryRun = true } = data;

      // Validate input
      if (inactiveDays < 30) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Inactive days must be at least 30",
        );
      }

      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);
      const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);

      // Find inactive users
      const inactiveUsersSnapshot = await db
        .collection("users")
        .where("lastLoginAt", "<", cutoffTimestamp)
        .limit(100) // Process in batches
        .get();

      if (inactiveUsersSnapshot.empty) {
        return {
          success: true,
          message: "No inactive users found",
          purgedCount: 0,
        };
      }

      const inactiveUsers = inactiveUsersSnapshot.docs.map((doc) => ({
        userId: doc.id,
        email: doc.data().email,
        lastLoginAt: doc.data().lastLoginAt?.toDate() || null,
      }));

      // If dry run, just return the list of users that would be purged
      if (dryRun) {
        return {
          success: true,
          dryRun: true,
          inactiveUsers,
          count: inactiveUsers.length,
        };
      }

      // Actually purge the users
      const purgePromises = inactiveUsersSnapshot.docs.map(async (doc) => {
        const userId = doc.id;

        // Delete user's files
        const userFilesSnapshot = await db
          .collection("files")
          .where("userId", "==", userId)
          .get();

        const fileDeletePromises = userFilesSnapshot.docs.map(
          async (fileDoc) => {
            const fileData = fileDoc.data();

            // Delete chunks if not deduplicated
            if (!fileData.isDeduplicated && fileData.chunkPaths) {
              const chunkDeletePromises = fileData.chunkPaths.map(
                (chunkPath: string) => {
                  return bucket
                    .file(chunkPath)
                    .delete()
                    .catch((err: any) => {
                      console.warn(
                        `Failed to delete chunk at ${chunkPath}:`,
                        err,
                      );
                      return null;
                    });
                },
              );

              await Promise.all(chunkDeletePromises);
            }

            // Delete file record
            await fileDoc.ref.delete();
          },
        );

        await Promise.all(fileDeletePromises);

        // Delete user's vault items
        const vaultItemsSnapshot = await db
          .collection("vaultItems")
          .where("userId", "==", userId)
          .get();

        const vaultDeletePromises = vaultItemsSnapshot.docs.map(
          (doc: admin.firestore.QueryDocumentSnapshot) => doc.ref.delete(),
        );
        await Promise.all(vaultDeletePromises);

        // Delete user's shares
        const sharesSnapshot = await db
          .collection("fileShares")
          .where("sharedWithUserId", "==", userId)
          .get();

        const shareDeletePromises = sharesSnapshot.docs.map(
          (doc: admin.firestore.QueryDocumentSnapshot) => doc.ref.delete(),
        );
        await Promise.all(shareDeletePromises);

        // Delete user auth record
        await admin
          .auth()
          .deleteUser(userId)
          .catch((err: any) => {
            console.warn(`Failed to delete auth user ${userId}:`, err);
          });

        // Delete user document
        await doc.ref.delete();

        return userId;
      });

      const purgedUserIds = await Promise.all(purgePromises);

      // Log the purge action
      await db.collection("adminActionLogs").add({
        action: "purge_inactive_users",
        adminId: context.auth.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: {
          inactiveDays,
          purgedCount: purgedUserIds.length,
          purgedUserIds,
        },
      });

      return {
        success: true,
        purgedCount: purgedUserIds.length,
        purgedUserIds,
      };
    } catch (error) {
      return handleError(error, "purgeInactiveUsers");
    }
  },
);

/**
 * Optimizes database indexes and storage
 * Performs maintenance operations to improve system performance
 */
export const optimizeSystem = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    try {
      // Ensure user is authenticated and an admin
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      // Check if user is an admin
      const userDoc = await db.collection("users").doc(context.auth.uid).get();
      const userData = userDoc.data();

      if (!userData?.isAdmin) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Admin privileges required",
        );
      }

      // Apply rate limiting for admin operations
      await checkRateLimit(context.auth.uid, "admin", 2);

      const { operations = ["all"] } = data;
      const results: { [key: string]: any } = {};

      // Check for orphaned chunks
      if (
        operations.includes("all") ||
        operations.includes("orphaned_chunks")
      ) {
        results.orphanedChunks = await cleanupOrphanedChunks();
      }

      // Rebuild deduplication index
      if (
        operations.includes("all") ||
        operations.includes("deduplication_index")
      ) {
        results.deduplicationIndex = await rebuildDeduplicationIndex();
      }

      // Clean up expired sessions
      if (
        operations.includes("all") ||
        operations.includes("expired_sessions")
      ) {
        results.expiredSessions = await cleanupExpiredSessions();
      }

      // Log the optimization action
      await db.collection("adminActionLogs").add({
        action: "optimize_system",
        adminId: context.auth.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        operations,
        results,
      });

      return {
        success: true,
        operations,
        results,
      };
    } catch (error) {
      return handleError(error, "optimizeSystem");
    }
  },
);

/**
 * Helper function to clean up orphaned chunks
 */
async function cleanupOrphanedChunks(): Promise<{
  removed: number;
  errors: number;
}> {
  try {
    // Get all file chunks in storage
    const [files] = await bucket.getFiles({ prefix: "files/" });

    // Get all valid chunk paths from Firestore
    const validChunkPaths = new Set<string>();

    const filesSnapshot = await db.collection("files").get();
    filesSnapshot.forEach((doc) => {
      const fileData = doc.data();
      if (fileData.chunkPaths && Array.isArray(fileData.chunkPaths)) {
        fileData.chunkPaths.forEach((path) => validChunkPaths.add(path));
      }
    });

    // Find orphaned chunks (in storage but not referenced in Firestore)
    const orphanedChunks = files.filter(
      (file) => !validChunkPaths.has(file.name),
    );

    console.log(
      `Found ${orphanedChunks.length} orphaned chunks out of ${files.length} total chunks`,
    );

    // Delete orphaned chunks
    let removed = 0;
    let errors = 0;

    for (const chunk of orphanedChunks) {
      try {
        await chunk.delete();
        removed++;
      } catch (error) {
        console.error(`Error deleting orphaned chunk ${chunk.name}:`, error);
        errors++;
      }
    }

    return { removed, errors };
  } catch (error) {
    console.error("Error cleaning up orphaned chunks:", error);
    return { removed: 0, errors: 1 };
  }
}

/**
 * Helper function to rebuild deduplication index
 */
async function rebuildDeduplicationIndex(): Promise<{
  indexed: number;
  errors: number;
}> {
  try {
    // Clear existing deduplication index
    const existingIndexSnapshot = await db
      .collection("deduplicationIndex")
      .get();

    const batch = db.batch();
    existingIndexSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    // Rebuild index from files with hashes
    const filesWithHashSnapshot = await db
      .collection("files")
      .where("fileHash", "!=", null)
      .get();

    const filesByHash = new Map<
      string,
      { fileIds: string[]; userIds: string[] }
    >();

    filesWithHashSnapshot.forEach((doc) => {
      const fileData = doc.data();
      const fileId = doc.id;
      const fileHash = fileData.fileHash;
      const userId = fileData.userId;

      if (!filesByHash.has(fileHash)) {
        filesByHash.set(fileHash, { fileIds: [], userIds: [] });
      }

      const entry = filesByHash.get(fileHash)!;
      entry.fileIds.push(fileId);

      if (!entry.userIds.includes(userId)) {
        entry.userIds.push(userId);
      }
    });

    // Create new index entries
    let indexed = 0;
    let errors = 0;

    for (const [fileHash, entry] of filesByHash.entries()) {
      try {
        await db.collection("deduplicationIndex").doc(fileHash).set({
          fileHash,
          fileIds: entry.fileIds,
          userIds: entry.userIds,
          referenceCount: entry.fileIds.length,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        indexed++;
      } catch (error) {
        console.error(`Error indexing hash ${fileHash}:`, error);
        errors++;
      }
    }

    return { indexed, errors };
  } catch (error) {
    console.error("Error rebuilding deduplication index:", error);
    return { indexed: 0, errors: 1 };
  }
}

/**
 * Helper function to clean up expired sessions
 */
async function cleanupExpiredSessions(): Promise<{
  removed: number;
  errors: number;
}> {
  try {
    // Find sessions older than 30 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);

    const expiredSessionsSnapshot = await db
      .collection("userSessions")
      .where("timestamp", "<", cutoffTimestamp)
      .limit(1000)
      .get();

    if (expiredSessionsSnapshot.empty) {
      return { removed: 0, errors: 0 };
    }

    // Delete expired sessions in batches
    const batch = db.batch();
    let batchCount = 0;
    let removed = 0;
    let errors = 0;

    for (const doc of expiredSessionsSnapshot.docs) {
      batch.delete(doc.ref);
      batchCount++;

      // Firestore batches are limited to 500 operations
      if (batchCount >= 500) {
        try {
          await batch.commit();
          removed += batchCount;
        } catch (error) {
          console.error(
            "Error committing batch delete of expired sessions:",
            error,
          );
          errors++;
        }

        batchCount = 0;
      }
    }

    // Commit any remaining operations
    if (batchCount > 0) {
      try {
        await batch.commit();
        removed += batchCount;
      } catch (error) {
        console.error(
          "Error committing final batch delete of expired sessions:",
          error,
        );
        errors++;
      }
    }

    return { removed, errors };
  } catch (error) {
    console.error("Error cleaning up expired sessions:", error);
    return { removed: 0, errors: 1 };
  }
}
