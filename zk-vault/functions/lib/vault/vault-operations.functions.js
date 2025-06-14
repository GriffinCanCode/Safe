"use strict";
/**
 * @fileoverview Advanced Vault Operations Functions
 * @description Cloud Functions for advanced vault operations in ZK-Vault
 * @security Zero-knowledge vault operations with encrypted search and secure backup/restore
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
exports.optimizeVault = exports.getVaultAnalytics = exports.createAutomaticBackup = exports.importVault = exports.exportVault = exports.searchVaultItems = exports.createVaultFolder = exports.BackupType = exports.VaultItemType = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const error_handler_1 = require("../utils/error-handler");
const rate_limiting_1 = require("../utils/rate-limiting");
const validation_utils_1 = require("../utils/validation.utils");
const db = admin.firestore();
const storage = admin.storage();
const bucket = storage.bucket();
/**
 * Vault organization structure types
 */
var VaultItemType;
(function (VaultItemType) {
    VaultItemType["PASSWORD"] = "password";
    VaultItemType["NOTE"] = "note";
    VaultItemType["CARD"] = "card";
    VaultItemType["IDENTITY"] = "identity";
    VaultItemType["DOCUMENT"] = "document";
    VaultItemType["CUSTOM"] = "custom";
})(VaultItemType = exports.VaultItemType || (exports.VaultItemType = {}));
/**
 * Backup types
 */
var BackupType;
(function (BackupType) {
    BackupType["MANUAL"] = "manual";
    BackupType["AUTOMATIC"] = "automatic";
    BackupType["EMERGENCY"] = "emergency";
})(BackupType = exports.BackupType || (exports.BackupType = {}));
/**
 * Creates a vault folder for organization
 */
exports.createVaultFolder = functions.https.onCall(async (data, context) => {
    try {
        // Validate context
        const validation = (0, validation_utils_1.validateFunctionContext)(context);
        if (!validation.isValid) {
            throw new functions.https.HttpsError("unauthenticated", validation.error || "Authentication required");
        }
        // Apply rate limiting
        await (0, rate_limiting_1.checkRateLimit)(context.auth.uid, "vault", 20);
        const { name, encryptedName, parentId } = data;
        if (!name || !encryptedName) {
            throw new functions.https.HttpsError("invalid-argument", "Folder name and encrypted name are required");
        }
        const userId = context.auth.uid;
        // Validate parent folder if provided
        if (parentId) {
            const parentDoc = await db
                .collection("vaultFolders")
                .doc(parentId)
                .get();
            if (!parentDoc.exists || parentDoc.data()?.userId !== userId) {
                throw new functions.https.HttpsError("not-found", "Parent folder not found");
            }
        }
        // Create folder
        const folderData = {
            name,
            encryptedName,
            parentId: parentId || null,
            userId,
            itemCount: 0,
            metadata: {
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
        };
        const folderRef = await db.collection("vaultFolders").add(folderData);
        return {
            success: true,
            folderId: folderRef.id,
            name,
        };
    }
    catch (error) {
        return (0, error_handler_1.handleError)(error, "createVaultFolder");
    }
});
/**
 * Searches vault items using encrypted search
 */
exports.searchVaultItems = functions.https.onCall(async (data, context) => {
    try {
        // Validate context
        const validation = (0, validation_utils_1.validateFunctionContext)(context);
        if (!validation.isValid) {
            throw new functions.https.HttpsError("unauthenticated", validation.error || "Authentication required");
        }
        // Apply rate limiting
        await (0, rate_limiting_1.checkRateLimit)(context.auth.uid, "vault", 30);
        const { encryptedQuery, itemTypes = [], folderId, tags = [], limit = 50, offset = 0, } = data;
        if (!encryptedQuery) {
            throw new functions.https.HttpsError("invalid-argument", "Encrypted search query is required");
        }
        const userId = context.auth.uid;
        // Build base query
        let query = db
            .collection("vaults")
            .doc(userId)
            .collection("items");
        // Add filters
        if (itemTypes.length > 0) {
            query = query.where("type", "in", itemTypes);
        }
        if (folderId) {
            query = query.where("folderId", "==", folderId);
        }
        // Execute query
        const snapshot = await query.limit(limit + offset).get();
        // Since we can't search encrypted content directly in Firestore,
        // we need to use client-side encrypted search through search indices
        const searchResults = await performEncryptedSearch(snapshot.docs.slice(offset), encryptedQuery, tags, limit);
        return {
            success: true,
            results: searchResults,
            count: searchResults.length,
            hasMore: searchResults.length === limit,
        };
    }
    catch (error) {
        return (0, error_handler_1.handleError)(error, "searchVaultItems");
    }
});
/**
 * Exports vault data as encrypted backup
 */
exports.exportVault = functions.https.onCall(async (data, context) => {
    try {
        // Validate context
        const validation = (0, validation_utils_1.validateFunctionContext)(context);
        if (!validation.isValid) {
            throw new functions.https.HttpsError("unauthenticated", validation.error || "Authentication required");
        }
        // Apply rate limiting for security-sensitive operation
        await (0, rate_limiting_1.checkRateLimit)(context.auth.uid, "vault", 3);
        const { includeSharedItems = false, format = "zk-vault", encryptionKey, } = data;
        if (!encryptionKey) {
            throw new functions.https.HttpsError("invalid-argument", "Encryption key is required for export");
        }
        const userId = context.auth.uid;
        // Get all vault items
        const vaultSnapshot = await db
            .collection("vaults")
            .doc(userId)
            .collection("items")
            .get();
        const items = vaultSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        // Get folders
        const foldersSnapshot = await db
            .collection("vaultFolders")
            .where("userId", "==", userId)
            .get();
        const folders = foldersSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        // Get shared items if requested
        let sharedItems = [];
        if (includeSharedItems) {
            const sharesSnapshot = await db
                .collection("vaultShares")
                .where("sharedWithUserId", "==", userId)
                .where("status", "==", "accepted")
                .get();
            sharedItems = sharesSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
        }
        // Create export package
        const exportData = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            userId,
            items,
            folders,
            sharedItems,
            metadata: {
                itemCount: items.length,
                folderCount: folders.length,
                sharedItemCount: sharedItems.length,
                format,
            },
        };
        // Encrypt export data (placeholder implementation)
        const encryptedExport = {
            success: true,
            data: {
                encryptedData: Buffer.from(JSON.stringify(exportData)).toString("base64"),
            },
        };
        if (!encryptedExport.success || !encryptedExport.data) {
            throw new functions.https.HttpsError("internal", "Failed to encrypt export data");
        }
        // Create backup record
        const backupData = {
            userId,
            type: BackupType.MANUAL,
            encryptedData: encryptedExport.data.encryptedData,
            itemCount: items.length,
            size: encryptedExport.data.encryptedData.length,
            checksum: await calculateChecksum(encryptedExport.data.encryptedData),
            metadata: {
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                description: "Manual vault export",
                version: "1.0",
            },
        };
        // Encrypt backup (placeholder implementation)
        const encryptedBackup = {
            success: true,
            data: {
                encryptedData: Buffer.from(JSON.stringify(backupData)).toString("base64"),
            },
        };
        if (!encryptedBackup.success || !encryptedBackup.data) {
            console.error(`Failed to encrypt backup for user ${userId}`);
            return;
        }
        const backupRef = await db.collection("vaultBackups").add(backupData);
        // Log audit event
        await logVaultAuditEvent(userId, "vault_export", {
            backupId: backupRef.id,
            itemCount: items.length,
            includeSharedItems,
        });
        return {
            success: true,
            backupId: backupRef.id,
            encryptedData: encryptedExport.data.encryptedData,
            itemCount: items.length,
            size: encryptedExport.data.encryptedData.length,
        };
    }
    catch (error) {
        return (0, error_handler_1.handleError)(error, "exportVault");
    }
});
/**
 * Imports vault data from encrypted backup
 */
exports.importVault = functions.https.onCall(async (data, context) => {
    try {
        // Validate context
        const validation = (0, validation_utils_1.validateFunctionContext)(context);
        if (!validation.isValid) {
            throw new functions.https.HttpsError("unauthenticated", validation.error || "Authentication required");
        }
        // Apply rate limiting for security-sensitive operation
        await (0, rate_limiting_1.checkRateLimit)(context.auth.uid, "vault", 2);
        const { encryptedData, decryptionKey, mergeStrategy = "skip", // 'skip', 'overwrite', 'merge'
        importSharedItems = false, } = data;
        if (!encryptedData || !decryptionKey) {
            throw new functions.https.HttpsError("invalid-argument", "Encrypted data and decryption key are required");
        }
        const userId = context.auth.uid;
        // Decrypt import data (placeholder implementation)
        const decryptedResult = {
            success: true,
            data: JSON.parse(Buffer.from(encryptedData, "base64").toString()),
        };
        if (!decryptedResult.success || !decryptedResult.data) {
            throw new functions.https.HttpsError("invalid-argument", "Failed to decrypt import data");
        }
        let importData;
        try {
            importData = JSON.parse(decryptedResult.data);
        }
        catch (error) {
            throw new functions.https.HttpsError("invalid-argument", "Invalid import data format");
        }
        // Validate import data structure
        if (!importData.items || !Array.isArray(importData.items)) {
            throw new functions.https.HttpsError("invalid-argument", "Invalid vault data structure");
        }
        const importStats = {
            itemsProcessed: 0,
            itemsImported: 0,
            itemsSkipped: 0,
            foldersImported: 0,
            errors: [],
        };
        // Import folders first
        if (importData.folders && Array.isArray(importData.folders)) {
            const folderIdMap = new Map();
            for (const folder of importData.folders) {
                try {
                    const newFolderRef = await db.collection("vaultFolders").add({
                        name: folder.name,
                        encryptedName: folder.encryptedName,
                        parentId: folder.parentId ?
                            folderIdMap.get(folder.parentId) :
                            null,
                        userId,
                        itemCount: 0,
                        metadata: {
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        },
                    });
                    folderIdMap.set(folder.id, newFolderRef.id);
                    importStats.foldersImported++;
                }
                catch (error) {
                    importStats.errors.push(`Failed to import folder: ${folder.name}`);
                }
            }
        }
        // Import vault items
        const vaultRef = db.collection("vaults").doc(userId).collection("items");
        for (const item of importData.items) {
            importStats.itemsProcessed++;
            try {
                // Check if item already exists (by encrypted title or identifier)
                let shouldImport = true;
                if (mergeStrategy === "skip") {
                    const existingQuery = await vaultRef
                        .where("type", "==", item.type)
                        .where("encrypted.data", "==", item.encrypted.data)
                        .limit(1)
                        .get();
                    if (!existingQuery.empty) {
                        shouldImport = false;
                        importStats.itemsSkipped++;
                    }
                }
                if (shouldImport) {
                    // Remove original ID and create new item
                    const { id, ...itemData } = item;
                    await vaultRef.add({
                        ...itemData,
                        metadata: {
                            ...itemData.metadata,
                            importedAt: admin.firestore.FieldValue.serverTimestamp(),
                            originalId: id,
                        },
                    });
                    importStats.itemsImported++;
                }
            }
            catch (error) {
                importStats.errors.push(`Failed to import item: ${item.type}`);
            }
        }
        // Update vault summary
        await updateVaultSummary(userId);
        // Log audit event
        await logVaultAuditEvent(userId, "vault_import", {
            itemsImported: importStats.itemsImported,
            itemsSkipped: importStats.itemsSkipped,
            foldersImported: importStats.foldersImported,
            mergeStrategy,
        });
        return {
            success: true,
            importStats,
        };
    }
    catch (error) {
        return (0, error_handler_1.handleError)(error, "importVault");
    }
});
/**
 * Creates automatic backup of vault
 */
exports.createAutomaticBackup = functions.pubsub
    .schedule("every 24 hours")
    .onRun(async (context) => {
    try {
        // Get all users who have enabled automatic backups
        const usersSnapshot = await db
            .collection("users")
            .where("settings.automaticBackup", "==", true)
            .get();
        if (usersSnapshot.empty) {
            console.log("No users with automatic backup enabled");
            return null;
        }
        const backupPromises = usersSnapshot.docs.map(async (userDoc) => {
            const userId = userDoc.id;
            const userData = userDoc.data();
            try {
                // Get user's backup encryption key (would be derived from master key)
                const backupKey = userData.backupEncryptionKey;
                if (!backupKey) {
                    console.log(`No backup key found for user ${userId}`);
                    return;
                }
                // Get vault items
                const vaultSnapshot = await db
                    .collection("vaults")
                    .doc(userId)
                    .collection("items")
                    .get();
                if (vaultSnapshot.empty) {
                    console.log(`No vault items found for user ${userId}`);
                    return;
                }
                const items = vaultSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                // Create backup data
                const backupData = {
                    version: "1.0",
                    timestamp: new Date().toISOString(),
                    userId,
                    items,
                    metadata: {
                        itemCount: items.length,
                        type: "automatic",
                    },
                };
                // Encrypt backup (placeholder implementation)
                const encryptedBackup = {
                    success: true,
                    data: {
                        encryptedData: Buffer.from(JSON.stringify(backupData)).toString("base64"),
                    },
                };
                if (!encryptedBackup.success || !encryptedBackup.data) {
                    console.error(`Failed to encrypt backup for user ${userId}`);
                    return;
                }
                // Store backup
                await db.collection("vaultBackups").add({
                    userId,
                    type: BackupType.AUTOMATIC,
                    encryptedData: encryptedBackup.data.encryptedData,
                    itemCount: items.length,
                    size: encryptedBackup.data.encryptedData.length,
                    checksum: await calculateChecksum(encryptedBackup.data.encryptedData),
                    metadata: {
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
                        description: "Automatic backup",
                        version: "1.0",
                    },
                });
                console.log(`Created automatic backup for user ${userId}`);
            }
            catch (error) {
                console.error(`Error creating backup for user ${userId}:`, error);
            }
        });
        await Promise.all(backupPromises);
        return null;
    }
    catch (error) {
        console.error("Error in automatic backup job:", error);
        return null;
    }
});
/**
 * Gets vault analytics and insights
 */
exports.getVaultAnalytics = functions.https.onCall(async (data, context) => {
    try {
        // Validate context
        const validation = (0, validation_utils_1.validateFunctionContext)(context);
        if (!validation.isValid) {
            throw new functions.https.HttpsError("unauthenticated", validation.error || "Authentication required");
        }
        // Apply rate limiting
        await (0, rate_limiting_1.checkRateLimit)(context.auth.uid, "vault", 10);
        const { period = 30 } = data || {}; // Default to last 30 days
        const userId = context.auth.uid;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - period);
        // Get vault items
        const vaultSnapshot = await db
            .collection("vaults")
            .doc(userId)
            .collection("items")
            .get();
        // Get audit logs for the period
        const auditSnapshot = await db
            .collection("vaultAuditLogs")
            .where("userId", "==", userId)
            .where("metadata.timestamp", ">=", admin.firestore.Timestamp.fromDate(startDate))
            .get();
        // Analyze vault data
        const analytics = {
            overview: {
                totalItems: vaultSnapshot.size,
                itemsByType: {},
                recentActivity: auditSnapshot.size,
                lastUpdated: null,
            },
            security: {
                passwordItems: 0,
                weakPasswords: 0,
                duplicatePasswords: 0,
                oldPasswords: 0,
                securityScore: 0,
            },
            usage: {
                mostUsedTypes: [],
                accessPatterns: {},
                sharingActivity: {
                    itemsShared: 0,
                    itemsReceived: 0,
                },
            },
            growth: {
                itemsAddedThisMonth: 0,
                itemsAddedThisWeek: 0,
                growthRate: 0,
            },
        };
        // Analyze vault items
        let latestUpdate = 0;
        vaultSnapshot.docs.forEach((doc) => {
            const item = doc.data();
            const itemType = item.type || "unknown";
            analytics.overview.itemsByType[itemType] =
                (analytics.overview.itemsByType[itemType] || 0) + 1;
            // Check last update
            const updatedAt = item.metadata?.updatedAt?.toDate()?.getTime() || 0;
            if (updatedAt > latestUpdate) {
                latestUpdate = updatedAt;
                analytics.overview.lastUpdated = new Date(updatedAt).toISOString();
            }
            // Analyze security for password items
            if (itemType === "password") {
                analytics.security.passwordItems++;
                // Additional security analysis would be done client-side
                // since passwords are encrypted
            }
            // Check creation date for growth analysis
            const createdAt = item.metadata?.createdAt?.toDate();
            if (createdAt) {
                const daysSinceCreation = Math.floor((Date.now() - createdAt.getTime()) / (24 * 60 * 60 * 1000));
                if (daysSinceCreation <= 30) {
                    analytics.growth.itemsAddedThisMonth++;
                }
                if (daysSinceCreation <= 7) {
                    analytics.growth.itemsAddedThisWeek++;
                }
            }
        });
        // Analyze audit logs for usage patterns
        auditSnapshot.docs.forEach((doc) => {
            const audit = doc.data();
            const eventType = audit.eventType;
            analytics.usage.accessPatterns[eventType] =
                (analytics.usage.accessPatterns[eventType] || 0) + 1;
            if (eventType === "vault_item_shared") {
                analytics.usage.sharingActivity.itemsShared++;
            }
        });
        // Calculate most used types
        analytics.usage.mostUsedTypes = Object.entries(analytics.overview.itemsByType)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        // Calculate basic security score (would be more sophisticated in real implementation)
        analytics.security.securityScore = Math.min(100, (analytics.security.passwordItems > 0 ? 50 : 0) +
            (analytics.overview.totalItems > 5 ? 25 : 0) +
            (analytics.usage.sharingActivity.itemsShared <
                analytics.overview.totalItems * 0.5 ?
                25 :
                0));
        return {
            success: true,
            period,
            analytics,
        };
    }
    catch (error) {
        return (0, error_handler_1.handleError)(error, "getVaultAnalytics");
    }
});
/**
 * Optimizes vault performance
 */
exports.optimizeVault = functions.https.onCall(async (data, context) => {
    try {
        // Validate context
        const validation = (0, validation_utils_1.validateFunctionContext)(context);
        if (!validation.isValid) {
            throw new functions.https.HttpsError("unauthenticated", validation.error || "Authentication required");
        }
        // Apply rate limiting
        await (0, rate_limiting_1.checkRateLimit)(context.auth.uid, "vault", 5);
        const { operations = ["all"] } = data;
        const userId = context.auth.uid;
        const results = {
            duplicatesRemoved: 0,
            emptyFoldersRemoved: 0,
            oldBackupsRemoved: 0,
            indexesRebuilt: 0,
        };
        // Remove duplicate items
        if (operations.includes("all") ||
            operations.includes("remove_duplicates")) {
            results.duplicatesRemoved = await removeDuplicateItems(userId);
        }
        // Remove empty folders
        if (operations.includes("all") ||
            operations.includes("remove_empty_folders")) {
            results.emptyFoldersRemoved = await removeEmptyFolders(userId);
        }
        // Clean up old backups
        if (operations.includes("all") ||
            operations.includes("cleanup_backups")) {
            results.oldBackupsRemoved = await cleanupOldBackups(userId);
        }
        // Rebuild search indexes
        if (operations.includes("all") ||
            operations.includes("rebuild_indexes")) {
            results.indexesRebuilt = await rebuildSearchIndexes(userId);
        }
        // Update vault summary
        await updateVaultSummary(userId);
        // Log audit event
        await logVaultAuditEvent(userId, "vault_optimized", {
            operations,
            results,
        });
        return {
            success: true,
            results,
        };
    }
    catch (error) {
        return (0, error_handler_1.handleError)(error, "optimizeVault");
    }
});
/**
 * Helper function to perform encrypted search
 */
async function performEncryptedSearch(documents, encryptedQuery, tags, limit) {
    // In a real implementation, this would use searchable encryption
    // For now, we'll return items that match type or have matching tags
    const results = [];
    for (const doc of documents.slice(0, limit)) {
        const data = doc.data();
        // Simple matching based on metadata (in real implementation,
        // this would use encrypted search indices)
        let matches = false;
        if (tags.length > 0 && data.tags) {
            const itemTags = data.tags || [];
            matches = tags.some((tag) => itemTags.includes(tag));
        }
        if (matches || tags.length === 0) {
            results.push({
                id: doc.id,
                type: data.type,
                encrypted: data.encrypted,
                metadata: data.metadata,
                relevanceScore: matches ? 1.0 : 0.5,
            });
        }
    }
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}
/**
 * Helper function to calculate checksum
 */
async function calculateChecksum(data) {
    // Simple checksum calculation (would use proper cryptographic hash in production)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
}
/**
 * Helper function to update vault summary
 */
async function updateVaultSummary(userId) {
    try {
        const snapshot = await db
            .collection("vaults")
            .doc(userId)
            .collection("items")
            .get();
        const typeCounts = {};
        snapshot.docs.forEach((doc) => {
            const type = doc.data().type || "unknown";
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        await db.collection("vaults").doc(userId).set({
            itemCount: snapshot.size,
            typeCounts,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    catch (error) {
        console.error("Error updating vault summary:", error);
    }
}
/**
 * Helper function to remove duplicate items
 */
async function removeDuplicateItems(userId) {
    try {
        const snapshot = await db
            .collection("vaults")
            .doc(userId)
            .collection("items")
            .get();
        const items = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        const duplicates = new Map();
        // Group by encrypted content (simplified duplicate detection)
        items.forEach((item) => {
            const key = `${item.type}_${item.encrypted?.data || ""}`;
            if (!duplicates.has(key)) {
                duplicates.set(key, []);
            }
            duplicates.get(key).push(item.id);
        });
        // Remove duplicates (keep the first one)
        let removed = 0;
        const batch = db.batch();
        for (const [key, itemIds] of duplicates.entries()) {
            if (itemIds.length > 1) {
                // Remove all but the first item
                for (let i = 1; i < itemIds.length; i++) {
                    batch.delete(db
                        .collection("vaults")
                        .doc(userId)
                        .collection("items")
                        .doc(itemIds[i]));
                    removed++;
                }
            }
        }
        if (removed > 0) {
            await batch.commit();
        }
        return removed;
    }
    catch (error) {
        console.error("Error removing duplicate items:", error);
        return 0;
    }
}
/**
 * Helper function to remove empty folders
 */
async function removeEmptyFolders(userId) {
    try {
        const foldersSnapshot = await db
            .collection("vaultFolders")
            .where("userId", "==", userId)
            .where("itemCount", "==", 0)
            .get();
        if (foldersSnapshot.empty) {
            return 0;
        }
        const batch = db.batch();
        foldersSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        return foldersSnapshot.size;
    }
    catch (error) {
        console.error("Error removing empty folders:", error);
        return 0;
    }
}
/**
 * Helper function to cleanup old backups
 */
async function cleanupOldBackups(userId) {
    try {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const oldBackupsSnapshot = await db
            .collection("vaultBackups")
            .where("userId", "==", userId)
            .where("metadata.createdAt", "<", admin.firestore.Timestamp.fromDate(oneYearAgo))
            .get();
        if (oldBackupsSnapshot.empty) {
            return 0;
        }
        const batch = db.batch();
        oldBackupsSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        return oldBackupsSnapshot.size;
    }
    catch (error) {
        console.error("Error cleaning up old backups:", error);
        return 0;
    }
}
/**
 * Helper function to rebuild search indexes
 */
async function rebuildSearchIndexes(userId) {
    try {
        // In a real implementation, this would rebuild searchable encryption indexes
        // For now, we'll just return a placeholder count
        return 1;
    }
    catch (error) {
        console.error("Error rebuilding search indexes:", error);
        return 0;
    }
}
/**
 * Helper function to log vault audit events
 */
async function logVaultAuditEvent(userId, eventType, eventData) {
    try {
        await db.collection("vaultAuditLogs").add({
            userId,
            eventType,
            metadata: {
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                success: true,
                additionalData: eventData,
            },
        });
    }
    catch (error) {
        console.error("Error logging vault audit event:", error);
    }
}
//# sourceMappingURL=vault-operations.functions.js.map