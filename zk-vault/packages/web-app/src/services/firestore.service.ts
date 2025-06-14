/**
 * @fileoverview Firestore Service
 * @description Manages Firestore operations for ZK-Vault with zero-knowledge architecture
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  runTransaction,
  type DocumentData,
  type QueryConstraint,
  type Unsubscribe,
  type Timestamp
} from 'firebase/firestore';
import { firebaseService } from './firebase.service';
import type { 
  VaultItemType,
  StoredVaultItem,
  DecryptedVaultItem 
} from './vault.service';

// Firestore document interfaces
export interface FirestoreDocument {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface FirestoreVaultItem extends FirestoreDocument {
  name: string;
  type: VaultItemType;
  folder?: string;
  favorite: boolean;
  tags: string[];
  notes?: string;
  encryptedData: string; // Base64 encoded encrypted data
  metadata: {
    algorithm: string;
    version: number;
    checksum: string;
  };
  lastAccessed?: Date;
  version: number;
}

export interface FirestoreUserSettings extends FirestoreDocument {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    securityAlerts: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    biometricEnabled: boolean;
    sessionTimeout: number;
    autoLockEnabled: boolean;
  };
  backup: {
    autoBackupEnabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    lastBackup?: Date;
  };
}

export interface FirestoreSecurityEvent extends FirestoreDocument {
  userId: string;
  type: 'login' | 'logout' | 'password_change' | 'failed_login' | 'account_locked' | 'vault_access' | 'item_created' | 'item_updated' | 'item_deleted';
  ipAddress: string;
  userAgent: string;
  location?: {
    country: string;
    region: string;
    city: string;
  };
  metadata?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface FirestoreFileReference extends FirestoreDocument {
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageRef: string;
  encryptedMetadata: string;
  checksum: string;
  uploadedBy: string;
}

// Service class
class FirestoreService {
  private static instance: FirestoreService;
  private db = firebaseService.db;

  private constructor() {}

  public static getInstance(): FirestoreService {
    if (!FirestoreService.instance) {
      FirestoreService.instance = new FirestoreService();
    }
    return FirestoreService.instance;
  }

  // Vault Items Operations
  async createVaultItem(item: Omit<FirestoreVaultItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreVaultItem> {
    try {
      const docRef = doc(collection(this.db, 'vaults', item.createdBy, 'items'));
      const now = new Date();
      
      const itemData: Omit<FirestoreVaultItem, 'id'> = {
        ...item,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(docRef, {
        ...itemData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        id: docRef.id,
        ...itemData,
      };
    } catch (error) {
      console.error('Error creating vault item:', error);
      throw new Error(`Failed to create vault item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getVaultItem(userId: string, itemId: string): Promise<FirestoreVaultItem | null> {
    try {
      const docRef = doc(this.db, 'vaults', userId, 'items', itemId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: this.timestampToDate(data.createdAt),
        updatedAt: this.timestampToDate(data.updatedAt),
        lastAccessed: data.lastAccessed ? this.timestampToDate(data.lastAccessed) : undefined,
      } as FirestoreVaultItem;
    } catch (error) {
      console.error('Error getting vault item:', error);
      throw new Error(`Failed to get vault item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserVaultItems(userId: string): Promise<FirestoreVaultItem[]> {
    try {
      const q = query(
        collection(this.db, 'vaults', userId, 'items'),
        orderBy('updatedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: this.timestampToDate(data.createdAt),
          updatedAt: this.timestampToDate(data.updatedAt),
          lastAccessed: data.lastAccessed ? this.timestampToDate(data.lastAccessed) : undefined,
        } as FirestoreVaultItem;
      });
    } catch (error) {
      console.error('Error fetching vault items:', error);
      throw new Error(`Failed to fetch vault items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateVaultItem(
    userId: string, 
    itemId: string, 
    updates: Partial<Omit<FirestoreVaultItem, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<void> {
    try {
      const docRef = doc(this.db, 'vaults', userId, 'items', itemId);
      
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating vault item:', error);
      throw new Error(`Failed to update vault item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteVaultItem(userId: string, itemId: string): Promise<void> {
    try {
      const docRef = doc(this.db, 'vaults', userId, 'items', itemId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting vault item:', error);
      throw new Error(`Failed to delete vault item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  onVaultItemsChange(
    userId: string,
    callback: (items: FirestoreVaultItem[]) => void
  ): Unsubscribe {
    const q = query(
      collection(this.db, 'vaults', userId, 'items'),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: this.timestampToDate(data.createdAt),
          updatedAt: this.timestampToDate(data.updatedAt),
          lastAccessed: data.lastAccessed ? this.timestampToDate(data.lastAccessed) : undefined,
        } as FirestoreVaultItem;
      });
      
      callback(items);
    });
  }

  // User Settings Operations
  async getUserSettings(userId: string): Promise<FirestoreUserSettings | null> {
    try {
      const docRef = doc(this.db, 'users', userId, 'settings', 'preferences');
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: this.timestampToDate(data.createdAt),
        updatedAt: this.timestampToDate(data.updatedAt),
        backup: {
          ...data.backup,
          lastBackup: data.backup?.lastBackup ? this.timestampToDate(data.backup.lastBackup) : undefined,
        },
      } as FirestoreUserSettings;
    } catch (error) {
      console.error('Error getting user settings:', error);
      throw new Error(`Failed to get user settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateUserSettings(
    userId: string, 
    settings: Partial<Omit<FirestoreUserSettings, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>
  ): Promise<void> {
    try {
      const docRef = doc(this.db, 'users', userId, 'settings', 'preferences');
      
      await setDoc(docRef, {
        ...settings,
        userId,
        createdBy: userId,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw new Error(`Failed to update user settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Security Events Operations
  async logSecurityEvent(
    event: Omit<FirestoreSecurityEvent, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    try {
      const docRef = doc(collection(this.db, 'security', event.userId, 'events'));
      
      await setDoc(docRef, {
        ...event,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error logging security event:', error);
      // Don't throw - security logging should be non-blocking
    }
  }

  async getUserSecurityEvents(
    userId: string,
    limitCount: number = 50
  ): Promise<FirestoreSecurityEvent[]> {
    try {
      const q = query(
        collection(this.db, 'security', userId, 'events'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: this.timestampToDate(data.createdAt),
          updatedAt: this.timestampToDate(data.updatedAt),
        } as FirestoreSecurityEvent;
      });
    } catch (error) {
      console.error('Error fetching security events:', error);
      throw new Error(`Failed to fetch security events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // File References Operations
  async createFileReference(
    fileRef: Omit<FirestoreFileReference, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<FirestoreFileReference> {
    try {
      const docRef = doc(collection(this.db, 'files', fileRef.createdBy, 'refs'));
      const now = new Date();
      
      const fileData: Omit<FirestoreFileReference, 'id'> = {
        ...fileRef,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(docRef, {
        ...fileData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        id: docRef.id,
        ...fileData,
      };
    } catch (error) {
      console.error('Error creating file reference:', error);
      throw new Error(`Failed to create file reference: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserFileReferences(userId: string): Promise<FirestoreFileReference[]> {
    try {
      const q = query(
        collection(this.db, 'files', userId, 'refs'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: this.timestampToDate(data.createdAt),
          updatedAt: this.timestampToDate(data.updatedAt),
        } as FirestoreFileReference;
      });
    } catch (error) {
      console.error('Error fetching file references:', error);
      throw new Error(`Failed to fetch file references: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFileReference(userId: string, fileId: string): Promise<void> {
    try {
      const docRef = doc(this.db, 'files', userId, 'refs', fileId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting file reference:', error);
      throw new Error(`Failed to delete file reference: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Batch Operations
  async batchUpdateVaultItems(
    userId: string,
    updates: Array<{ id: string; data: Partial<FirestoreVaultItem> }>
  ): Promise<void> {
    try {
      const batch = writeBatch(this.db);
      
      updates.forEach(({ id, data }) => {
        const docRef = doc(this.db, 'vaults', userId, 'items', id);
        batch.update(docRef, {
          ...data,
          updatedAt: serverTimestamp(),
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error batch updating vault items:', error);
      throw new Error(`Failed to batch update vault items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async batchDeleteVaultItems(userId: string, itemIds: string[]): Promise<void> {
    try {
      const batch = writeBatch(this.db);
      
      itemIds.forEach(id => {
        const docRef = doc(this.db, 'vaults', userId, 'items', id);
        batch.delete(docRef);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error batch deleting vault items:', error);
      throw new Error(`Failed to batch delete vault items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Transaction Operations
  async transferVaultItem(
    fromUserId: string,
    toUserId: string,
    itemId: string
  ): Promise<void> {
    try {
      await runTransaction(this.db, async (transaction) => {
        const fromDocRef = doc(this.db, 'vaults', fromUserId, 'items', itemId);
        const fromDoc = await transaction.get(fromDocRef);

        if (!fromDoc.exists()) {
          throw new Error('Source item does not exist');
        }

        const itemData = fromDoc.data();
        const toDocRef = doc(this.db, 'vaults', toUserId, 'items', itemId);

        // Update ownership
        transaction.set(toDocRef, {
          ...itemData,
          createdBy: toUserId,
          updatedAt: serverTimestamp(),
        });

        // Delete from source
        transaction.delete(fromDocRef);
      });
    } catch (error) {
      console.error('Error transferring vault item:', error);
      throw new Error(`Failed to transfer vault item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Utility Methods
  private timestampToDate(timestamp: any): Date {
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    return new Date();
  }

  // Search and Query Operations
  async searchVaultItems(
    userId: string,
    filters: {
      type?: VaultItemType;
      folder?: string;
      favorite?: boolean;
      tags?: string[];
    } = {}
  ): Promise<FirestoreVaultItem[]> {
    try {
      let q = query(collection(this.db, 'vaults', userId, 'items'));

      if (filters.type) {
        q = query(q, where('type', '==', filters.type));
      }

      if (filters.folder) {
        q = query(q, where('folder', '==', filters.folder));
      }

      if (filters.favorite !== undefined) {
        q = query(q, where('favorite', '==', filters.favorite));
      }

      if (filters.tags && filters.tags.length > 0) {
        q = query(q, where('tags', 'array-contains-any', filters.tags));
      }

      q = query(q, orderBy('updatedAt', 'desc'));

      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: this.timestampToDate(data.createdAt),
          updatedAt: this.timestampToDate(data.updatedAt),
          lastAccessed: data.lastAccessed ? this.timestampToDate(data.lastAccessed) : undefined,
        } as FirestoreVaultItem;
      });
    } catch (error) {
      console.error('Error searching vault items:', error);
      throw new Error(`Failed to search vault items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Health Check
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
    try {
      // Try to read from a test collection
      const testRef = doc(this.db, 'health', 'check');
      await getDoc(testRef);
      
      return { status: 'healthy', message: 'Firestore connection is healthy' };
    } catch (error) {
      console.error('Firestore health check failed:', error);
      return { 
        status: 'unhealthy', 
        message: `Firestore connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}

// Export singleton instance
export const firestoreService = FirestoreService.getInstance();
export default firestoreService; 