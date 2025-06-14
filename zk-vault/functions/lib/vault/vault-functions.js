"use strict";
/**
 * Vault Operations Functions
 * Handles encrypted vault items while maintaining zero-knowledge architecture
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSharedItems = exports.shareVaultItem = exports.deleteVaultItem = exports.getVaultItems = exports.createVaultItem = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const error_handler_1 = require("../utils/error-handler");
/**
 * Creates or updates a vault item
 */
exports.createVaultItem = functions.https.onCall((0, error_handler_1.withErrorHandling)(async (data, context) => {
    // Ensure user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }
    // Validate request data
    if (!data.encrypted ||
        !data.encrypted.data ||
        !data.encrypted.iv ||
        !data.encrypted.algorithm) {
        throw new functions.https.HttpsError("invalid-argument", "Item must contain encrypted data with proper format");
    }
    const { type, metadata = {}, id = null } = data;
    try {
        const userId = context.auth.uid;
        const now = admin.firestore.FieldValue.serverTimestamp();
        let itemId = id;
        // Create item reference
        let itemRef;
        if (itemId) {
            // Update existing item
            itemRef = admin
                .firestore()
                .collection("vaults")
                .doc(userId)
                .collection("items")
                .doc(itemId);
            // Check if item exists and belongs to user
            const doc = await itemRef.get();
            if (!doc.exists) {
                throw new functions.https.HttpsError("not-found", "Item does not exist");
            }
        }
        else {
            // Create new item with generated ID
            itemRef = admin
                .firestore()
                .collection("vaults")
                .doc(userId)
                .collection("items")
                .doc();
            itemId = itemRef.id;
        }
        // Prepare item data
        const itemData = {
            id: itemId,
            type,
            encrypted: data.encrypted,
            metadata: {
                ...metadata,
                updatedAt: now,
            },
        };
        // Add created timestamp for new items
        if (!id) {
            itemData.metadata.createdAt = now;
        }
        // Write to Firestore
        await itemRef.set(itemData, { merge: true });
        // Update user's vault summary
        await updateVaultSummary(userId);
        return {
            id: itemId,
            success: true,
        };
    }
    catch (error) {
        console.error("Error creating vault item:", error);
        throw new functions.https.HttpsError("internal", "Failed to create vault item");
    }
}));
/**
 * Retrieves all vault items for the user
 */
exports.getVaultItems = functions.https.onCall((0, error_handler_1.withErrorHandling)(async (data, context) => {
    // Ensure user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }
    try {
        const userId = context.auth.uid;
        const { type, lastUpdated, limit = 100 } = data || {};
        // Create base query
        let query = admin
            .firestore()
            .collection("vaults")
            .doc(userId)
            .collection("items");
        // Add filters if provided
        if (type) {
            query = query.where("type", "==", type);
        }
        if (lastUpdated) {
            query = query.where("metadata.updatedAt", ">", new Date(lastUpdated));
        }
        // Execute query with pagination
        const snapshot = await query
            .orderBy("metadata.updatedAt", "desc")
            .limit(limit)
            .get();
        // Process results
        const items = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                type: data.type,
                encrypted: data.encrypted,
                metadata: data.metadata,
            };
        });
        return {
            items,
            count: items.length,
        };
    }
    catch (error) {
        console.error("Error getting vault items:", error);
        throw new functions.https.HttpsError("internal", "Failed to retrieve vault items");
    }
}));
/**
 * Deletes a vault item
 */
exports.deleteVaultItem = functions.https.onCall((0, error_handler_1.withErrorHandling)(async (data, context) => {
    // Ensure user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }
    // Validate request
    if (!data.id) {
        throw new functions.https.HttpsError("invalid-argument", "Item ID is required");
    }
    try {
        const userId = context.auth.uid;
        const itemId = data.id;
        // Get reference to item
        const itemRef = admin
            .firestore()
            .collection("vaults")
            .doc(userId)
            .collection("items")
            .doc(itemId);
        // Check if item exists and belongs to user
        const doc = await itemRef.get();
        if (!doc.exists) {
            throw new functions.https.HttpsError("not-found", "Item does not exist");
        }
        // Delete the item
        await itemRef.delete();
        // Update vault summary
        await updateVaultSummary(userId);
        return {
            success: true,
            id: itemId,
        };
    }
    catch (error) {
        console.error("Error deleting vault item:", error);
        throw new functions.https.HttpsError("internal", "Failed to delete vault item");
    }
}));
/**
 * Shares a vault item with another user
 */
exports.shareVaultItem = functions.https.onCall((0, error_handler_1.withErrorHandling)(async (data, context) => {
    // Ensure user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }
    // Validate request
    if (!data.itemId || !data.recipientEmail || !data.encryptedKey) {
        throw new functions.https.HttpsError("invalid-argument", "Item ID, recipient email, and encrypted key are required");
    }
    try {
        const senderId = context.auth.uid;
        const { itemId, recipientEmail, encryptedKey, metadata = {} } = data;
        // Verify that the sender owns the item
        const itemRef = admin
            .firestore()
            .collection("vaults")
            .doc(senderId)
            .collection("items")
            .doc(itemId);
        const itemDoc = await itemRef.get();
        if (!itemDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Item does not exist");
        }
        // Find recipient user
        const recipientQuery = await admin
            .firestore()
            .collection("users")
            .where("email", "==", recipientEmail.toLowerCase())
            .limit(1)
            .get();
        if (recipientQuery.empty) {
            throw new functions.https.HttpsError("not-found", "Recipient not found");
        }
        const recipientId = recipientQuery.docs[0].id;
        // Don't allow sharing with yourself
        if (recipientId === senderId) {
            throw new functions.https.HttpsError("invalid-argument", "Cannot share with yourself");
        }
        // Create share record
        const shareRef = admin.firestore().collection("shares").doc();
        await shareRef.set({
            id: shareRef.id,
            from: senderId,
            to: recipientId,
            itemId,
            encryptedKey,
            metadata: {
                ...metadata,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            },
        });
        return {
            success: true,
            shareId: shareRef.id,
        };
    }
    catch (error) {
        console.error("Error sharing vault item:", error);
        throw new functions.https.HttpsError("internal", "Failed to share vault item");
    }
}));
/**
 * Gets all items shared with the user
 */
exports.getSharedItems = functions.https.onCall((0, error_handler_1.withErrorHandling)(async (data, context) => {
    // Ensure user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }
    try {
        const userId = context.auth.uid;
        // Get items shared with the user
        const sharesQuery = await admin
            .firestore()
            .collection("shares")
            .where("to", "==", userId)
            .get();
        const sharedItems = [];
        for (const shareDoc of sharesQuery.docs) {
            const share = shareDoc.data();
            // Get the actual item data
            const itemRef = admin
                .firestore()
                .collection("vaults")
                .doc(share.from)
                .collection("items")
                .doc(share.itemId);
            const itemDoc = await itemRef.get();
            if (itemDoc.exists) {
                const itemData = itemDoc.data();
                sharedItems.push({
                    id: share.itemId,
                    shareId: share.id,
                    from: share.from,
                    type: itemData?.type,
                    encrypted: itemData?.encrypted,
                    encryptedKey: share.encryptedKey,
                    metadata: itemData?.metadata,
                    sharedAt: share.metadata?.createdAt,
                });
            }
        }
        return {
            items: sharedItems,
            count: sharedItems.length,
        };
    }
    catch (error) {
        console.error("Error getting shared items:", error);
        throw new functions.https.HttpsError("internal", "Failed to retrieve shared items");
    }
}));
/**
 * Updates the vault summary information
 * @param userId User ID
 */
async function updateVaultSummary(userId) {
    try {
        // Get all vault items for the user
        const snapshot = await admin
            .firestore()
            .collection("vaults")
            .doc(userId)
            .collection("items")
            .get();
        // Count by type
        const typeCounts = {};
        snapshot.docs.forEach((doc) => {
            const type = doc.data().type;
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        // Update vault summary
        await admin.firestore().collection("vaults").doc(userId).set({
            itemCount: snapshot.size,
            typeCounts,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    catch (error) {
        console.error("Error updating vault summary:", error);
    }
}
//# sourceMappingURL=vault-functions.js.map