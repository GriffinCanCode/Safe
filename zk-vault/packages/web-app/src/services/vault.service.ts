/**
 * @fileoverview Vault Service
 * @description Manages encrypted vault items using zero-knowledge encryption
 */

import { authService } from './auth.service';
import { cryptoVaultService } from './crypto-vault.service';

// Vault item types
export type VaultItemType = 'password' | 'note' | 'card' | 'identity';

// Base vault item interface (for internal storage)
export interface StoredVaultItem {
  id: string;
  userId: string;
  type: VaultItemType;
  name: string;
  folder?: string | undefined;
  favorite: boolean;
  tags: string[];
  notes?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
  lastAccessed?: Date | undefined;
  version: number;
  encryptedData: string; // Base64 encoded encrypted data
}

// Password vault item (decrypted)
export interface PasswordVaultItem {
  id: string;
  type: 'password';
  name: string;
  username: string;
  password: string;
  website?: string;
  notes?: string;
  totpSecret?: string;
  customFields?: Record<string, string>;
  folder?: string;
  favorite: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  lastAccessed?: Date;
  version: number;
  metadata: {
    strength: number;
    compromised: boolean;
    lastPasswordChange?: Date;
    autoFill: boolean;
  };
}

// Note vault item (decrypted)
export interface NoteVaultItem {
  id: string;
  type: 'note';
  name: string;
  content: string;
  notes?: string;
  folder?: string;
  favorite: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  lastAccessed?: Date;
  version: number;
}

// Card vault item (decrypted)
export interface CardVaultItem {
  id: string;
  type: 'card';
  name: string;
  cardholderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  folder?: string;
  favorite: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  lastAccessed?: Date;
  version: number;
  metadata: {
    brand: string;
    expired: boolean;
  };
}

// Identity vault item (decrypted)
export interface IdentityVaultItem {
  id: string;
  type: 'identity';
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  folder?: string;
  favorite: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  lastAccessed?: Date;
  version: number;
}

// Union type for all vault items
export type DecryptedVaultItem =
  | PasswordVaultItem
  | NoteVaultItem
  | CardVaultItem
  | IdentityVaultItem;

// Alias for compatibility with store imports
export type VaultItem = DecryptedVaultItem;

// Vault statistics
export interface VaultStats {
  totalItems: number;
  itemsByType: Record<VaultItemType, number>;
  compromisedPasswords: number;
  weakPasswords: number;
  reusedPasswords: number;
  averagePasswordStrength: number;
  lastBackup?: Date;
}

// Search filters
export interface VaultSearchFilters {
  query?: string;
  type?: VaultItemType;
  folder?: string;
  tags?: string[];
  favorite?: boolean;
  compromised?: boolean;
  weak?: boolean;
}

// Pagination options
export interface PaginationOptions {
  limit: number;
  cursor?: string;
}

// Vault search result
export interface VaultSearchResult {
  items: DecryptedVaultItem[];
  total: number;
  hasMore: boolean;
  nextCursor?: string | undefined;
}

class VaultService {
  private static instance: VaultService;
  private readonly STORAGE_KEY = 'zk-vault-items';

  private constructor() {}

  public static getInstance(): VaultService {
    if (!VaultService.instance) {
      VaultService.instance = new VaultService();
    }
    return VaultService.instance;
  }

  /**
   * Create a new vault item
   */
  async createItem(
    item: Omit<DecryptedVaultItem, 'id' | 'createdAt' | 'updatedAt' | 'version'>
  ): Promise<DecryptedVaultItem> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Ensure crypto vault is initialized
      if (!cryptoVaultService.isInitialized()) {
        throw new Error('Vault not initialized');
      }

      const now = new Date();
      const itemId = this.generateItemId();

      const newItem: DecryptedVaultItem = {
        ...item,
        id: itemId,
        createdAt: now,
        updatedAt: now,
        version: 1,
      } as DecryptedVaultItem;

      // Encrypt the item data
      const sensitiveData = this.extractSensitiveData(newItem);
      const encryptResult = await cryptoVaultService.encryptItemData(JSON.stringify(sensitiveData));

      if (!encryptResult.success || !encryptResult.encryptedData) {
        throw new Error(encryptResult.error || 'Failed to encrypt item');
      }

      // Create stored item
      const storedItem: StoredVaultItem = {
        id: itemId,
        userId: user.uid,
        type: item.type,
        name: item.name,
        folder: item.folder || undefined,
        favorite: item.favorite,
        tags: item.tags,
        notes: 'notes' in item && typeof item.notes === 'string' ? item.notes : undefined,
        createdAt: now,
        updatedAt: now,
        version: 1,
        encryptedData: btoa(JSON.stringify(encryptResult.encryptedData)),
      };

      // Save to storage
      const items = this.getStoredItems(user.uid);
      items.push(storedItem);
      this.saveStoredItems(user.uid, items);

      return newItem;
    } catch (error: any) {
      console.error('Failed to create vault item:', error);
      throw new Error(`Failed to create vault item: ${error.message}`);
    }
  }

  /**
   * Get vault item by ID
   */
  async getItem(id: string): Promise<DecryptedVaultItem | null> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!cryptoVaultService.isInitialized()) {
        throw new Error('Vault not initialized');
      }

      const items = this.getStoredItems(user.uid);
      const storedItem = items.find(item => item.id === id && item.userId === user.uid);

      if (!storedItem) {
        return null;
      }

      // Update last accessed timestamp
      await this.updateLastAccessed(id);

      // Decrypt and return item
      return await this.decryptStoredItem(storedItem);
    } catch (error: any) {
      console.error('Failed to get vault item:', error);
      throw new Error(`Failed to get vault item: ${error.message}`);
    }
  }

  /**
   * Update vault item
   */
  async updateItem(id: string, updates: Partial<DecryptedVaultItem>): Promise<DecryptedVaultItem> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!cryptoVaultService.isInitialized()) {
        throw new Error('Vault not initialized');
      }

      const items = this.getStoredItems(user.uid);
      const itemIndex = items.findIndex(item => item.id === id && item.userId === user.uid);

      if (itemIndex === -1) {
        throw new Error('Vault item not found');
      }

      const storedItem = items[itemIndex];

      // Decrypt current item
      const currentItem = await this.decryptStoredItem(storedItem);

      // Apply updates
      const updatedItem: DecryptedVaultItem = {
        ...currentItem,
        ...updates,
        id: currentItem.id, // Ensure ID doesn't change
        updatedAt: new Date(),
        version: currentItem.version + 1,
      } as DecryptedVaultItem;

      // Encrypt updated data
      const sensitiveData = this.extractSensitiveData(updatedItem);
      const encryptResult = await cryptoVaultService.encryptItemData(JSON.stringify(sensitiveData));

      if (!encryptResult.success || !encryptResult.encryptedData) {
        throw new Error(encryptResult.error || 'Failed to encrypt item');
      }

      // Update stored item
      const updatedStoredItem: StoredVaultItem = {
        ...storedItem,
        name: updatedItem.name,
        folder: updatedItem.folder,
        favorite: updatedItem.favorite,
        tags: updatedItem.tags,
        notes: 'notes' in updatedItem ? updatedItem.notes : undefined,
        updatedAt: updatedItem.updatedAt,
        version: updatedItem.version,
        encryptedData: btoa(JSON.stringify(encryptResult.encryptedData)),
      };

      items[itemIndex] = updatedStoredItem;
      this.saveStoredItems(user.uid, items);

      return updatedItem;
    } catch (error: any) {
      console.error('Failed to update vault item:', error);
      throw new Error(`Failed to update vault item: ${error.message}`);
    }
  }

  /**
   * Delete vault item
   */
  async deleteItem(id: string): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const items = this.getStoredItems(user.uid);
      const filteredItems = items.filter(item => !(item.id === id && item.userId === user.uid));

      if (filteredItems.length === items.length) {
        throw new Error('Vault item not found');
      }

      this.saveStoredItems(user.uid, filteredItems);
    } catch (error: any) {
      console.error('Failed to delete vault item:', error);
      throw new Error(`Failed to delete vault item: ${error.message}`);
    }
  }

  /**
   * Search vault items with filters and pagination
   */
  async searchItems(
    filters: VaultSearchFilters = {},
    pagination: PaginationOptions = { limit: 50 }
  ): Promise<VaultSearchResult> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!cryptoVaultService.isInitialized()) {
        throw new Error('Vault not initialized');
      }

      const storedItems = this.getStoredItems(user.uid);

      // Decrypt all items for searching
      const decryptedItems: DecryptedVaultItem[] = [];
      for (const storedItem of storedItems) {
        try {
          const decryptedItem = await this.decryptStoredItem(storedItem);
          decryptedItems.push(decryptedItem);
        } catch (error) {
          console.warn(`Failed to decrypt item ${storedItem.id}:`, error);
          // Skip corrupted items
        }
      }

      // Apply filters
      let filteredItems = decryptedItems;

      if (filters.type) {
        filteredItems = filteredItems.filter(item => item.type === filters.type);
      }

      if (filters.folder) {
        filteredItems = filteredItems.filter(item => item.folder === filters.folder);
      }

      if (filters.favorite !== undefined) {
        filteredItems = filteredItems.filter(item => item.favorite === filters.favorite);
      }

      if (filters.tags?.length) {
        filteredItems = filteredItems.filter(item =>
          filters.tags!.some(tag => item.tags.includes(tag))
        );
      }

      if (filters.query) {
        const searchTerm = filters.query.toLowerCase();
        filteredItems = filteredItems.filter(item => {
          const searchableText = [
            item.name,
            ...(item.tags || []),
            'notes' in item ? item.notes : '',
            item.type === 'password' ? (item as PasswordVaultItem).username : '',
            item.type === 'password' ? (item as PasswordVaultItem).website : '',
          ]
            .join(' ')
            .toLowerCase();

          return searchableText.includes(searchTerm);
        });
      }

      if (filters.compromised !== undefined) {
        filteredItems = filteredItems.filter(item => {
          if (item.type === 'password') {
            return (item as PasswordVaultItem).metadata.compromised === filters.compromised;
          }
          return false;
        });
      }

      if (filters.weak !== undefined) {
        filteredItems = filteredItems.filter(item => {
          if (item.type === 'password') {
            return (item as PasswordVaultItem).metadata.strength < 3 === filters.weak;
          }
          return false;
        });
      }

      // Sort by updated date (most recent first)
      filteredItems.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      // Apply pagination
      const startIndex = 0;
      const endIndex = Math.min(pagination.limit, filteredItems.length);
      const paginatedItems = filteredItems.slice(startIndex, endIndex);

      return {
        items: paginatedItems,
        total: filteredItems.length,
        hasMore: endIndex < filteredItems.length,
        nextCursor: endIndex < filteredItems.length ? endIndex.toString() : undefined,
      };
    } catch (error: any) {
      console.error('Failed to search vault items:', error);
      throw new Error(`Failed to search vault items: ${error.message}`);
    }
  }

  /**
   * Get vault statistics
   */
  async getVaultStats(): Promise<VaultStats> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const result = await this.searchItems({}, { limit: 1000 });
      const items = result.items;

      const stats: VaultStats = {
        totalItems: items.length,
        itemsByType: {
          password: 0,
          note: 0,
          card: 0,
          identity: 0,
        },
        compromisedPasswords: 0,
        weakPasswords: 0,
        reusedPasswords: 0,
        averagePasswordStrength: 0,
      };

      let totalPasswordStrength = 0;
      let passwordCount = 0;
      const passwords: string[] = [];

      items.forEach(item => {
        stats.itemsByType[item.type]++;

        if (item.type === 'password') {
          const passwordItem = item as PasswordVaultItem;
          passwordCount++;
          totalPasswordStrength += passwordItem.metadata.strength;

          if (passwordItem.metadata.compromised) {
            stats.compromisedPasswords++;
          }

          if (passwordItem.metadata.strength < 3) {
            stats.weakPasswords++;
          }

          // Check for password reuse
          if (passwords.includes(passwordItem.password)) {
            stats.reusedPasswords++;
          } else {
            passwords.push(passwordItem.password);
          }
        }
      });

      if (passwordCount > 0) {
        stats.averagePasswordStrength = totalPasswordStrength / passwordCount;
      }

      return stats;
    } catch (error: any) {
      console.error('Failed to get vault stats:', error);
      throw new Error(`Failed to get vault stats: ${error.message}`);
    }
  }

  /**
   * Get unique folders
   */
  async getFolders(): Promise<string[]> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const items = this.getStoredItems(user.uid);
      const folders = new Set<string>();

      items.forEach(item => {
        if (item.folder) {
          folders.add(item.folder);
        }
      });

      return Array.from(folders).sort();
    } catch (error: any) {
      console.error('Failed to get folders:', error);
      throw new Error(`Failed to get folders: ${error.message}`);
    }
  }

  /**
   * Get unique tags
   */
  async getTags(): Promise<string[]> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const items = this.getStoredItems(user.uid);
      const tags = new Set<string>();

      items.forEach(item => {
        if (item.tags && Array.isArray(item.tags)) {
          item.tags.forEach(tag => tags.add(tag));
        }
      });

      return Array.from(tags).sort();
    } catch (error: any) {
      console.error('Failed to get tags:', error);
      throw new Error(`Failed to get tags: ${error.message}`);
    }
  }

  /**
   * Generate password with specified criteria
   */
  generatePassword(options: {
    length: number;
    includeUppercase: boolean;
    includeLowercase: boolean;
    includeNumbers: boolean;
    includeSymbols: boolean;
    excludeSimilar: boolean;
    excludeAmbiguous: boolean;
  }): string {
    let charset = '';

    if (options.includeLowercase) {
      charset += options.excludeSimilar ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
    }

    if (options.includeUppercase) {
      charset += options.excludeSimilar ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    }

    if (options.includeNumbers) {
      charset += options.excludeSimilar ? '23456789' : '0123456789';
    }

    if (options.includeSymbols) {
      charset += options.excludeAmbiguous
        ? '!@#$%^&*()_+-=[]{}|;:,.<>?'
        : '!@#$%^&*()_+-=[]{}|;:,.<>?`~';
    }

    if (!charset) {
      throw new Error('At least one character type must be selected');
    }

    let password = '';
    const array = new Uint8Array(options.length);
    crypto.getRandomValues(array);

    for (let i = 0; i < options.length; i++) {
      password += charset[array[i] % charset.length];
    }

    return password;
  }

  /**
   * Calculate password strength (0-4 scale)
   */
  calculatePasswordStrength(password: string): number {
    if (!password) return 0;

    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[^a-zA-Z0-9]/.test(password),
      longLength: password.length >= 12,
      veryLongLength: password.length >= 16,
    };

    // Basic requirements
    if (checks.length) score++;
    if (checks.lowercase) score++;
    if (checks.uppercase) score++;
    if (checks.numbers) score++;
    if (checks.symbols) score++;

    // Length bonuses
    if (checks.longLength) score++;
    if (checks.veryLongLength) score++;

    // Entropy check
    const entropy = this.calculateEntropy(password);
    if (entropy > 50) score++;
    if (entropy > 75) score++;

    return Math.min(Math.floor(score / 2), 4);
  }

  // Private helper methods

  private generateItemId(): string {
    return (
      'item_' +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  private async updateLastAccessed(id: string): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      const items = this.getStoredItems(user.uid);
      const itemIndex = items.findIndex(item => item.id === id);

      if (itemIndex !== -1) {
        items[itemIndex].lastAccessed = new Date();
        this.saveStoredItems(user.uid, items);
      }
    } catch (error) {
      console.warn('Failed to update last accessed:', error);
    }
  }

  private async decryptStoredItem(storedItem: StoredVaultItem): Promise<DecryptedVaultItem> {
    try {
      // Decode and decrypt the data
      const encryptedData = JSON.parse(atob(storedItem.encryptedData));
      const decryptResult = await cryptoVaultService.decryptItemData(encryptedData);

      if (!decryptResult.success || !decryptResult.data) {
        throw new Error(decryptResult.error || 'Failed to decrypt item');
      }

      const sensitiveData = JSON.parse(decryptResult.data);

      // Reconstruct the decrypted item
      const baseItem = {
        id: storedItem.id,
        type: storedItem.type,
        name: storedItem.name,
        folder: storedItem.folder,
        favorite: storedItem.favorite,
        tags: storedItem.tags,
        createdAt: this.parseDate(storedItem.createdAt),
        updatedAt: this.parseDate(storedItem.updatedAt),
        lastAccessed: storedItem.lastAccessed ? this.parseDate(storedItem.lastAccessed) : undefined,
        version: storedItem.version,
      };

      // Add sensitive data based on type
      switch (storedItem.type) {
        case 'password':
          return {
            ...baseItem,
            type: 'password',
            username: sensitiveData.username || '',
            password: sensitiveData.password || '',
            website: sensitiveData.website,
            notes: sensitiveData.notes || storedItem.notes,
            totpSecret: sensitiveData.totpSecret,
            customFields: sensitiveData.customFields || {},
            metadata: {
              strength: sensitiveData.metadata?.strength || 0,
              compromised: sensitiveData.metadata?.compromised || false,
              lastPasswordChange: sensitiveData.metadata?.lastPasswordChange
                ? new Date(sensitiveData.metadata.lastPasswordChange)
                : undefined,
              autoFill: sensitiveData.metadata?.autoFill || false,
            },
          } as PasswordVaultItem;

        case 'note':
          return {
            ...baseItem,
            type: 'note',
            content: sensitiveData.content || '',
            notes: sensitiveData.notes || storedItem.notes,
          } as NoteVaultItem;

        case 'card':
          return {
            ...baseItem,
            type: 'card',
            cardholderName: sensitiveData.cardholderName || '',
            number: sensitiveData.number || '',
            expiryMonth: sensitiveData.expiryMonth || '',
            expiryYear: sensitiveData.expiryYear || '',
            cvv: sensitiveData.cvv || '',
            metadata: {
              brand: sensitiveData.metadata?.brand || 'unknown',
              expired: sensitiveData.metadata?.expired || false,
            },
          } as CardVaultItem;

        case 'identity':
          return {
            ...baseItem,
            type: 'identity',
            firstName: sensitiveData.firstName || '',
            lastName: sensitiveData.lastName || '',
            email: sensitiveData.email || '',
            phone: sensitiveData.phone,
            address: sensitiveData.address,
          } as IdentityVaultItem;

        default:
          throw new Error(`Unknown item type: ${storedItem.type}`);
      }
    } catch (error) {
      console.error('Failed to decrypt stored item:', error);
      throw error;
    }
  }

  private extractSensitiveData(item: DecryptedVaultItem): any {
    switch (item.type) {
      case 'password':
        const passwordItem = item as PasswordVaultItem;
        return {
          username: passwordItem.username,
          password: passwordItem.password,
          website: passwordItem.website,
          notes: passwordItem.notes,
          totpSecret: passwordItem.totpSecret,
          customFields: passwordItem.customFields,
          metadata: passwordItem.metadata,
        };

      case 'note':
        const noteItem = item as NoteVaultItem;
        return {
          content: noteItem.content,
          notes: noteItem.notes,
        };

      case 'card':
        const cardItem = item as CardVaultItem;
        return {
          cardholderName: cardItem.cardholderName,
          number: cardItem.number,
          expiryMonth: cardItem.expiryMonth,
          expiryYear: cardItem.expiryYear,
          cvv: cardItem.cvv,
          metadata: cardItem.metadata,
        };

      case 'identity':
        const identityItem = item as IdentityVaultItem;
        return {
          firstName: identityItem.firstName,
          lastName: identityItem.lastName,
          email: identityItem.email,
          phone: identityItem.phone,
          address: identityItem.address,
        };

      default:
        throw new Error(`Unknown item type: ${(item as any).type}`);
    }
  }

  private getStoredItems(userId: string): StoredVaultItem[] {
    try {
      const data = localStorage.getItem(`${this.STORAGE_KEY}-${userId}`);
      if (!data) return [];

      const items = JSON.parse(data);
      return items.map((item: any) => ({
        ...item,
        createdAt: this.parseDate(item.createdAt),
        updatedAt: this.parseDate(item.updatedAt),
        lastAccessed: item.lastAccessed ? this.parseDate(item.lastAccessed) : undefined,
      }));
    } catch (error) {
      console.error('Failed to get stored items:', error);
      return [];
    }
  }

  private saveStoredItems(userId: string, items: StoredVaultItem[]): void {
    try {
      localStorage.setItem(`${this.STORAGE_KEY}-${userId}`, JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save stored items:', error);
      throw error;
    }
  }

  private parseDate(date: any): Date {
    if (date instanceof Date) return date;
    if (typeof date === 'string' || typeof date === 'number') return new Date(date);
    return new Date();
  }

  private calculateEntropy(password: string): number {
    const charset = {
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[^a-zA-Z0-9]/.test(password),
    };

    let charsetSize = 0;
    if (charset.lowercase) charsetSize += 26;
    if (charset.uppercase) charsetSize += 26;
    if (charset.numbers) charsetSize += 10;
    if (charset.symbols) charsetSize += 32;

    return password.length * Math.log2(charsetSize);
  }
}

export const vaultService = VaultService.getInstance();
