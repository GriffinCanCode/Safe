/**
 * ZK-Vault Firebase Functions
 * Main entry point for all cloud functions
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export all function modules
export * from './auth/auth-functions';
export * from './vault/vault-functions';
export * from './files/file-functions';
export * from './security/security-monitoring';

// Scheduled cleanup functions
export const scheduledCleanup = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (_context) => {
    const now = Date.now();
    const cutoff = now - 14 * 24 * 60 * 60 * 1000; // 2 weeks ago

    try {
      // Clean up expired temporary uploads
      const uploadsSnapshot = await admin.firestore()
        .collection('uploads')
        .where('expires', '<=', new Date(now))
        .get();
      
      const batch = admin.firestore().batch();
      let count = 0;

      uploadsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        count++;
      });

      if (count > 0) {
        await batch.commit();
        console.log(`Cleaned up ${count} expired upload records`);
      }

      // Clean up old audit logs (but keep important ones)
      const auditLogsSnapshot = await admin.firestore()
        .collection('auditLogs')
        .where('severity', '==', 'info')
        .where('timestamp', '<=', new Date(cutoff))
        .get();

      const logsBatch = admin.firestore().batch();
      let logsCount = 0;

      auditLogsSnapshot.docs.forEach(doc => {
        logsBatch.delete(doc.ref);
        logsCount++;
      });

      if (logsCount > 0) {
        await logsBatch.commit();
        console.log(`Cleaned up ${logsCount} old audit log entries`);
      }

      return null;
    } catch (error) {
      console.error('Error during scheduled cleanup:', error);
      return null;
    }
  });
