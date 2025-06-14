/**
 * @fileoverview Vault Sharing Functions
 * @description Cloud Functions for advanced vault item sharing in ZK-Vault
 * @security Zero-knowledge sharing with encrypted key exchange and granular permissions
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {handleError} from "../utils/error-handler";
import {checkRateLimit} from "../utils/rate-limiting";
import {
  validateFunctionContext,
  isValidEmail,
} from "../utils/validation.utils";
// Crypto utilities available if needed

const db = admin.firestore();

/**
 * Sharing permission levels
 */
export enum SharingPermission {
  READ = "read",
  WRITE = "write",
  ADMIN = "admin",
}

/**
 * Share status types
 */
export enum ShareStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  DECLINED = "declined",
  REVOKED = "revoked",
  EXPIRED = "expired",
}

/**
 * Interface for access restrictions
 */
interface AccessRestrictions {
  ipWhitelist?: string[];
  deviceWhitelist?: string[];
  timeRestrictions?: {
    startTime: string;
    endTime: string;
    timezone: string;
  };
}

/**
 * Interface for advanced sharing configuration
 */
interface SharingConfig {
  permissions: SharingPermission[];
  expiresAt?: Date;
  maxAccess?: number;
  requiresAcceptance?: boolean;
  allowResharing?: boolean;
  notifyOnAccess?: boolean;
  accessRestrictions?: AccessRestrictions;
}

/**
 * Interface for encrypted keys
 */
interface EncryptedKeys {
  itemKey: string;
  metadataKey?: string;
  signatureKey?: string;
}

/**
 * Interface for share metadata
 */
interface ShareMetadata {
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
  acceptedAt?: admin.firestore.Timestamp;
  lastAccessedAt?: admin.firestore.Timestamp;
  accessCount: number;
}

/**
 * Interface for vault item share
 */
interface VaultItemShare {
  id: string;
  itemId: string;
  ownerId: string;
  sharedWithUserId: string;
  sharedWithEmail: string;
  encryptedKeys: EncryptedKeys;
  permissions: SharingPermission[];
  config: SharingConfig;
  status: ShareStatus;
  metadata: ShareMetadata;
}

/**
 * Interface for create share request data
 */
interface CreateShareRequestData {
  itemId: string;
  recipientEmail: string;
  encryptedKeys: EncryptedKeys;
  permissions?: SharingPermission[];
  config?: Partial<SharingConfig>;
}

/**
 * Interface for share response request data
 */
interface ShareResponseRequestData {
  shareId: string;
  response: "accept" | "decline";
}

/**
 * Interface for get shares request data
 */
interface GetSharesRequestData {
  type?: "sent" | "received" | "all";
  status?: ShareStatus | "all";
  limit?: number;
  offset?: number;
}

/**
 * Interface for update permissions request data
 */
interface UpdatePermissionsRequestData {
  shareId: string;
  permissions: SharingPermission[];
  config?: Partial<SharingConfig>;
}

/**
 * Interface for revoke share request data
 */
interface RevokeShareRequestData {
  shareId: string;
}

/**
 * Interface for track access request data
 */
interface TrackAccessRequestData {
  shareId: string;
  accessType?: string;
}

/**
 * Interface for notification data
 */
interface NotificationData {
  type: string;
  shareId: string;
  fromUserId: string;
  itemId: string;
  permissions?: SharingPermission[];
  requiresAcceptance?: boolean;
  accessType?: string;
}

/**
 * Interface for audit event data
 */
interface AuditEventData {
  shareId: string;
  itemId: string;
  recipientId?: string;
  ownerId?: string;
  permissions?: SharingPermission[];
  oldPermissions?: SharingPermission[];
  newPermissions?: SharingPermission[];
}

/**
 * Creates an advanced vault item share
 * Supports granular permissions and access controls
 */
export const createAdvancedShare = functions.https.onCall(
  async (data: CreateShareRequestData, context: functions.https.CallableContext) => {
    try {
      // Validate context
      const validation = validateFunctionContext(context);
      if (!validation.isValid) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          validation.error || "Authentication required",
        );
      }

      // Apply rate limiting
      if (context.auth?.uid) {
        await checkRateLimit(context.auth.uid, "sharing", 15);
      }

      const {
        itemId,
        recipientEmail,
        encryptedKeys,
        permissions = [SharingPermission.READ],
        config = {} as SharingConfig,
      } = data;

      // Validate required fields
      if (!itemId || !recipientEmail || !encryptedKeys?.itemKey) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing required sharing data",
        );
      }

      if (!isValidEmail(recipientEmail)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid recipient email format",
        );
      }

      // Validate permissions
      const validPermissions = permissions.every((p: string) =>
        Object.values(SharingPermission).includes(p as SharingPermission),
      );
      if (!validPermissions) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid permissions specified",
        );
      }

      // Get vault item to verify ownership
      const currentUserId = context.auth?.uid;
      if (!currentUserId) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User authentication required",
        );
      }

      const itemDoc = await db
        .collection("vaults")
        .doc(currentUserId)
        .collection("items")
        .doc(itemId)
        .get();

      if (!itemDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Vault item not found",
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

      // Prevent self-sharing
      if (recipientId === currentUserId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Cannot share with yourself",
        );
      }

      // Check for existing share
      const existingShareQuery = await db
        .collection("vaultShares")
        .where("itemId", "==", itemId)
        .where("ownerId", "==", currentUserId)
        .where("sharedWithUserId", "==", recipientId)
        .where("status", "in", [ShareStatus.PENDING, ShareStatus.ACCEPTED])
        .limit(1)
        .get();

      if (!existingShareQuery.empty) {
        throw new functions.https.HttpsError(
          "already-exists",
          "Item is already shared with this user",
        );
      }

      // Process sharing configuration
      const processedConfig: SharingConfig = {
        permissions,
        expiresAt: config.expiresAt ? new Date(config.expiresAt) : undefined,
        maxAccess: config.maxAccess || undefined,
        requiresAcceptance: config.requiresAcceptance !== false, // Default to true
        allowResharing: config.allowResharing || false,
        notifyOnAccess: config.notifyOnAccess !== false, // Default to true
        accessRestrictions: config.accessRestrictions || {},
      };

      // Create share record
      const shareData: Partial<VaultItemShare> = {
        itemId,
        ownerId: currentUserId,
        sharedWithUserId: recipientId,
        sharedWithEmail: recipientEmail.toLowerCase(),
        encryptedKeys,
        permissions,
        config: processedConfig,
        status: processedConfig.requiresAcceptance ?
          ShareStatus.PENDING :
          ShareStatus.ACCEPTED,
        metadata: {
          createdAt:
            admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
          updatedAt:
            admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
          accessCount: 0,
        },
      };

      const shareRef = await db.collection("vaultShares").add(shareData);

      // Create notification for recipient
      await createSharingNotification(recipientId, {
        type: "share_received",
        shareId: shareRef.id,
        fromUserId: currentUserId,
        itemId,
        permissions,
        requiresAcceptance: processedConfig.requiresAcceptance,
      });

      // Log audit event
      await logSharingAuditEvent(currentUserId, "share_created", {
        shareId: shareRef.id,
        itemId,
        recipientId,
        permissions,
      });

      return {
        success: true,
        shareId: shareRef.id,
        status: shareData.status,
        requiresAcceptance: processedConfig.requiresAcceptance,
      };
    } catch (error) {
      return handleError(error as import("../utils/error-handler").GenericError, "createAdvancedShare");
    }
  },
);

/**
 * Responds to a share invitation (accept/decline)
 */
export const respondToShareInvitation = functions.https.onCall(
  async (data: ShareResponseRequestData, context: functions.https.CallableContext) => {
    try {
      // Validate context
      const validation = validateFunctionContext(context);
      if (!validation.isValid) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          validation.error || "Authentication required",
        );
      }

      // Apply rate limiting
      if (context.auth?.uid) {
        await checkRateLimit(context.auth.uid, "sharing", 10);
      }

      const {shareId, response} = data; // response: 'accept' | 'decline'

      if (!shareId || !["accept", "decline"].includes(response)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Valid shareId and response required",
        );
      }

      // Get share record
      const shareDoc = await db.collection("vaultShares").doc(shareId).get();

      if (!shareDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Share invitation not found",
        );
      }

      const shareData = shareDoc.data() as VaultItemShare;
      const currentUserId = context.auth?.uid;

      // Verify user is the intended recipient
      if (shareData.sharedWithUserId !== currentUserId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You are not authorized to respond to this invitation",
        );
      }

      // Check if share is still pending
      if (shareData.status !== ShareStatus.PENDING) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Share invitation is no longer pending",
        );
      }

      // Check if share has expired
      if (
        shareData.config.expiresAt &&
        new Date() > shareData.config.expiresAt
      ) {
        await shareDoc.ref.update({
          "status": ShareStatus.EXPIRED,
          "metadata.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
        });
        throw new functions.https.HttpsError(
          "deadline-exceeded",
          "Share invitation has expired",
        );
      }

      // Update share status
      const newStatus =
        response === "accept" ? ShareStatus.ACCEPTED : ShareStatus.DECLINED;
      const updateData: Record<string, unknown> = {
        "status": newStatus,
        "metadata.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      };

      if (response === "accept") {
        updateData["metadata.acceptedAt"] =
          admin.firestore.FieldValue.serverTimestamp();
      }

      await shareDoc.ref.update(updateData);

      // Create notification for owner
      if (currentUserId) {
        await createSharingNotification(shareData.ownerId, {
          type: `share_${response}ed`,
          shareId,
          fromUserId: currentUserId,
          itemId: shareData.itemId,
        });

        // Log audit event
        await logSharingAuditEvent(currentUserId, `share_${response}ed`, {
          shareId,
          itemId: shareData.itemId,
          ownerId: shareData.ownerId,
        });
      }

      return {
        success: true,
        shareId,
        status: newStatus,
      };
    } catch (error) {
      return handleError(error as import("../utils/error-handler").GenericError, "respondToShareInvitation");
    }
  },
);

/**
 * Gets all shares for a user (sent and received)
 */
export const getUserShares = functions.https.onCall(
  async (data: GetSharesRequestData, context: functions.https.CallableContext) => {
    try {
      // Validate context
      const validation = validateFunctionContext(context);
      if (!validation.isValid) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          validation.error || "Authentication required",
        );
      }

      // Apply rate limiting
      if (context.auth?.uid) {
        await checkRateLimit(context.auth.uid, "sharing", 20);
      }

      const {
        type = "all", // 'sent' | 'received' | 'all'
        status = "all", // ShareStatus or 'all'
        limit = 50,
        offset = 0,
      } = data || {};

      const userId = context.auth?.uid;
      if (!userId) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User authentication required",
        );
      }

      const shares: Record<string, unknown>[] = [];

      // Get sent shares
      if (type === "sent" || type === "all") {
        let sentQuery = db
          .collection("vaultShares")
          .where("ownerId", "==", userId)
          .orderBy("metadata.createdAt", "desc");

        if (status !== "all") {
          sentQuery = sentQuery.where("status", "==", status);
        }

        const sentSnapshot = await sentQuery.limit(limit).offset(offset).get();

        for (const doc of sentSnapshot.docs) {
          const shareData = doc.data() as VaultItemShare;

          // Get recipient info
          const recipientDoc = await db
            .collection("users")
            .doc(shareData.sharedWithUserId)
            .get();
          const recipientData = recipientDoc.data();

          // Get item info (just metadata, not content)
          const itemDoc = await db
            .collection("vaults")
            .doc(userId)
            .collection("items")
            .doc(shareData.itemId)
            .get();

          const itemData = itemDoc.exists ? itemDoc.data() : null;

          shares.push({
            id: doc.id,
            type: "sent",
            itemId: shareData.itemId,
            itemType: itemData?.type,
            recipient: {
              userId: shareData.sharedWithUserId,
              email: shareData.sharedWithEmail,
              displayName:
                recipientData?.displayName || shareData.sharedWithEmail,
            },
            permissions: shareData.permissions,
            status: shareData.status,
            config: shareData.config,
            createdAt: shareData.metadata.createdAt?.toDate()?.toISOString(),
            acceptedAt: shareData.metadata.acceptedAt?.toDate()?.toISOString(),
            lastAccessedAt: shareData.metadata.lastAccessedAt
              ?.toDate()
              ?.toISOString(),
            accessCount: shareData.metadata.accessCount,
          });
        }
      }

      // Get received shares
      if (type === "received" || type === "all") {
        let receivedQuery = db
          .collection("vaultShares")
          .where("sharedWithUserId", "==", userId)
          .orderBy("metadata.createdAt", "desc");

        if (status !== "all") {
          receivedQuery = receivedQuery.where("status", "==", status);
        }

        const receivedSnapshot = await receivedQuery
          .limit(limit)
          .offset(offset)
          .get();

        for (const doc of receivedSnapshot.docs) {
          const shareData = doc.data() as VaultItemShare;

          // Get owner info
          const ownerDoc = await db
            .collection("users")
            .doc(shareData.ownerId)
            .get();
          const ownerData = ownerDoc.data();

          // Get item info from owner's vault
          const itemDoc = await db
            .collection("vaults")
            .doc(shareData.ownerId)
            .collection("items")
            .doc(shareData.itemId)
            .get();

          const itemData = itemDoc.exists ? itemDoc.data() : null;

          shares.push({
            id: doc.id,
            type: "received",
            itemId: shareData.itemId,
            itemType: itemData?.type,
            owner: {
              userId: shareData.ownerId,
              email: ownerData?.email,
              displayName: ownerData?.displayName || ownerData?.email,
            },
            encryptedKeys: shareData.encryptedKeys,
            permissions: shareData.permissions,
            status: shareData.status,
            config: shareData.config,
            createdAt: shareData.metadata.createdAt?.toDate()?.toISOString(),
            acceptedAt: shareData.metadata.acceptedAt?.toDate()?.toISOString(),
            lastAccessedAt: shareData.metadata.lastAccessedAt
              ?.toDate()
              ?.toISOString(),
            accessCount: shareData.metadata.accessCount,
          });
        }
      }

      // Sort by creation date
      shares.sort(
        (a, b) =>
          new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime(),
      );

      return {
        success: true,
        shares: shares.slice(0, limit),
        count: shares.length,
        hasMore: shares.length === limit,
      };
    } catch (error) {
      return handleError(error as import("../utils/error-handler").GenericError, "getUserShares");
    }
  },
);

/**
 * Updates permissions for an existing share
 */
export const updateSharePermissions = functions.https.onCall(
  async (data: UpdatePermissionsRequestData, context: functions.https.CallableContext) => {
    try {
      // Validate context
      const validation = validateFunctionContext(context);
      if (!validation.isValid) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          validation.error || "Authentication required",
        );
      }

      // Apply rate limiting
      if (context.auth?.uid) {
        await checkRateLimit(context.auth.uid, "sharing", 10);
      }

      const {shareId, permissions, config} = data;

      if (!shareId || !permissions || !Array.isArray(permissions)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Valid shareId and permissions required",
        );
      }

      // Validate permissions
      const validPermissions = permissions.every((p: string) =>
        Object.values(SharingPermission).includes(p as SharingPermission),
      );
      if (!validPermissions) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid permissions specified",
        );
      }

      // Get share record
      const shareDoc = await db.collection("vaultShares").doc(shareId).get();

      if (!shareDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Share not found");
      }

      const shareData = shareDoc.data() as VaultItemShare;
      const currentUserId = context.auth?.uid;

      // Verify user is the owner
      if (shareData.ownerId !== currentUserId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You are not authorized to modify this share",
        );
      }

      // Check if share is active
      if (
        ![ShareStatus.PENDING, ShareStatus.ACCEPTED].includes(shareData.status)
      ) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Cannot modify inactive share",
        );
      }

      // Update share
      const updateData: Record<string, unknown> = {
        permissions,
        "metadata.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      };

      if (config) {
        updateData.config = {...shareData.config, ...config};
      }

      await shareDoc.ref.update(updateData);

      // Create notification for recipient
      if (currentUserId) {
        await createSharingNotification(shareData.sharedWithUserId, {
          type: "share_updated",
          shareId,
          fromUserId: currentUserId,
          itemId: shareData.itemId,
          permissions,
        });

        // Log audit event
        await logSharingAuditEvent(currentUserId, "share_updated", {
          shareId,
          itemId: shareData.itemId,
          recipientId: shareData.sharedWithUserId,
          oldPermissions: shareData.permissions,
          newPermissions: permissions,
        });
      }

      return {
        success: true,
        shareId,
        permissions,
      };
    } catch (error) {
      return handleError(error as import("../utils/error-handler").GenericError, "updateSharePermissions");
    }
  },
);

/**
 * Revokes a vault item share
 */
export const revokeShare = functions.https.onCall(
  async (data: RevokeShareRequestData, context: functions.https.CallableContext) => {
    try {
      // Validate context
      const validation = validateFunctionContext(context);
      if (!validation.isValid) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          validation.error || "Authentication required",
        );
      }

      // Apply rate limiting
      if (context.auth?.uid) {
        await checkRateLimit(context.auth.uid, "sharing", 10);
      }

      const {shareId} = data;

      if (!shareId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "ShareId is required",
        );
      }

      // Get share record
      const shareDoc = await db.collection("vaultShares").doc(shareId).get();

      if (!shareDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Share not found");
      }

      const shareData = shareDoc.data() as VaultItemShare;
      const currentUserId = context.auth?.uid;

      // Verify user is the owner
      if (shareData.ownerId !== currentUserId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You are not authorized to revoke this share",
        );
      }

      // Check if share can be revoked
      if (shareData.status === ShareStatus.REVOKED) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Share is already revoked",
        );
      }

      // Revoke share
      await shareDoc.ref.update({
        "status": ShareStatus.REVOKED,
        "metadata.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      });

      // Create notification for recipient
      if (currentUserId) {
        await createSharingNotification(shareData.sharedWithUserId, {
          type: "share_revoked",
          shareId,
          fromUserId: currentUserId,
          itemId: shareData.itemId,
        });

        // Log audit event
        await logSharingAuditEvent(currentUserId, "share_revoked", {
          shareId,
          itemId: shareData.itemId,
          recipientId: shareData.sharedWithUserId,
        });
      }

      return {
        success: true,
        shareId,
      };
    } catch (error) {
      return handleError(error as import("../utils/error-handler").GenericError, "revokeShare");
    }
  },
);

/**
 * Tracks access to a shared vault item
 */
export const trackShareAccess = functions.https.onCall(
  async (data: TrackAccessRequestData, context: functions.https.CallableContext) => {
    try {
      // Validate context
      const validation = validateFunctionContext(context);
      if (!validation.isValid) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          validation.error || "Authentication required",
        );
      }

      const {shareId, accessType = "view"} = data;

      if (!shareId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "ShareId is required",
        );
      }

      // Get share record
      const shareDoc = await db.collection("vaultShares").doc(shareId).get();

      if (!shareDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Share not found");
      }

      const shareData = shareDoc.data() as VaultItemShare;
      const currentUserId = context.auth?.uid;

      // Verify user has access
      if (shareData.sharedWithUserId !== currentUserId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You do not have access to this share",
        );
      }

      // Check if share is active
      if (shareData.status !== ShareStatus.ACCEPTED) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Share is not active",
        );
      }

      // Check access limits
      if (
        shareData.config.maxAccess &&
        shareData.metadata.accessCount >= shareData.config.maxAccess
      ) {
        throw new functions.https.HttpsError(
          "resource-exhausted",
          "Maximum access limit reached",
        );
      }

      // Check expiration
      if (
        shareData.config.expiresAt &&
        new Date() > shareData.config.expiresAt
      ) {
        await shareDoc.ref.update({status: ShareStatus.EXPIRED});
        throw new functions.https.HttpsError(
          "deadline-exceeded",
          "Share has expired",
        );
      }

      // Update access tracking
      await shareDoc.ref.update({
        "metadata.lastAccessedAt": admin.firestore.FieldValue.serverTimestamp(),
        "metadata.accessCount": admin.firestore.FieldValue.increment(1),
        "metadata.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      });

      // Create access log
      if (currentUserId) {
        await db.collection("shareAccessLogs").add({
          shareId,
          userId: currentUserId,
          itemId: shareData.itemId,
          ownerId: shareData.ownerId,
          accessType,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          metadata: {
            userAgent: context.rawRequest?.get("user-agent"),
            ip: context.rawRequest?.ip,
          },
        });

        // Notify owner if configured
        if (shareData.config.notifyOnAccess) {
          await createSharingNotification(shareData.ownerId, {
            type: "share_accessed",
            shareId,
            fromUserId: currentUserId,
            itemId: shareData.itemId,
            accessType,
          });
        }
      }

      return {
        success: true,
        shareId,
        accessCount: shareData.metadata.accessCount + 1,
      };
    } catch (error) {
      return handleError(error as import("../utils/error-handler").GenericError, "trackShareAccess");
    }
  },
);

/**
 * Helper function to create sharing notifications
 */
async function createSharingNotification(
  userId: string,
  notificationData: NotificationData,
): Promise<void> {
  try {
    await db.collection("notifications").add({
      userId,
      type: notificationData.type,
      data: notificationData,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Error creating sharing notification:", error);
    // Don't throw error as this is a background operation
  }
}

/**
 * Helper function to log sharing audit events
 */
async function logSharingAuditEvent(
  userId: string,
  eventType: string,
  eventData: AuditEventData,
): Promise<void> {
  try {
    await db.collection("vaultAuditLogs").add({
      userId,
      eventType: `sharing_${eventType}`,
      itemId: eventData.itemId,
      targetUserId: eventData.recipientId || eventData.ownerId,
      metadata: {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        success: true,
        additionalData: eventData,
      },
    });
  } catch (error) {
    console.error("Error logging sharing audit event:", error);
    // Don't throw error as this is a background operation
  }
}

/**
 * Cleanup expired shares
 * Runs daily to clean up expired share invitations and access
 */
export const cleanupExpiredShares = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async () => {
    try {
      const now = admin.firestore.Timestamp.now();

      // Find shares with expiration dates that have passed
      const expiredSharesSnapshot = await db
        .collection("vaultShares")
        .where("config.expiresAt", "<", now.toDate())
        .where("status", "in", [ShareStatus.PENDING, ShareStatus.ACCEPTED])
        .limit(500)
        .get();

      if (expiredSharesSnapshot.empty) {
        console.log("No expired shares to clean up");
        return null;
      }

      // Update expired shares
      const batch = db.batch();
      expiredSharesSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          "status": ShareStatus.EXPIRED,
          "metadata.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();

      console.log(`Marked ${expiredSharesSnapshot.size} shares as expired`);
      return null;
    } catch (error) {
      console.error("Error cleaning up expired shares:", error);
      return null;
    }
  });
