/**
 * @fileoverview Vault Types
 * @responsibility Defines all vault-related type interfaces and data structures
 * @principle Single Responsibility - Only vault item and metadata type definitions
 * @security Zero-knowledge vault architecture types
 */

import { EncryptedData } from './encryption.types';

/**
 * Base vault item interface - foundation for all vault entries
 * @responsibility Core structure for all vault items regardless of type
 */
export interface VaultItem {
  /** Unique identifier for the vault item */
  id: string;
  /** Type of vault item */
  type: 'password' | 'note' | 'card' | 'identity' | 'file';
  /** Encrypted data payload */
  encrypted: EncryptedData;
  /** Item metadata (non-sensitive) */
  metadata: VaultItemMetadata;
  /** Creation timestamp */
  created: Date;
  /** Last modification timestamp */
  modified: Date;
  /** Optional folder organization */
  folder?: string;
  /** User favorite status */
  favorite?: boolean;
  /** Sharing information if item is shared */
  shared?: SharedItemInfo;
  /** Soft delete timestamp */
  deletedAt?: Date;
  /** Item version for conflict resolution */
  version: number;
}

/**
 * Metadata for vault items (non-encrypted, searchable)
 * @responsibility Non-sensitive information for organization and search
 */
export interface VaultItemMetadata {
  /** Display name/title (encrypted separately for search) */
  title: string;
  /** Item tags for organization */
  tags: string[];
  /** Last accessed timestamp */
  lastAccessed?: Date;
  /** Access count for usage analytics */
  accessCount: number;
  /** Item strength/security score */
  securityScore?: number;
  /** Custom icon identifier */
  icon?: string;
  /** Item notes (encrypted separately) */
  hasNotes: boolean;
  /** Attachments count */
  attachmentCount: number;
}

/**
 * Password vault entry with decrypted structure
 * @responsibility Password-specific vault item with credential data
 */
export interface PasswordEntry extends VaultItem {
  type: 'password';
  /** Decrypted password data (only available client-side) */
  decrypted?: {
    /** Website/service title */
    title: string;
    /** Username or email */
    username: string;
    /** The actual password */
    password: string;
    /** Associated website URL */
    url?: string;
    /** Additional notes */
    notes?: string;
    /** TOTP secret for 2FA */
    totp?: string;
    /** Custom fields */
    customFields?: Record<string, string>;
    /** Password history */
    passwordHistory?: PasswordHistoryEntry[];
  };
}

/**
 * Secure note vault entry
 * @responsibility Note-specific vault item for text storage
 */
export interface NoteEntry extends VaultItem {
  type: 'note';
  /** Decrypted note data */
  decrypted?: {
    /** Note title */
    title: string;
    /** Note content */
    content: string;
    /** Note format */
    format: 'plain' | 'markdown' | 'rich';
    /** Attachments */
    attachments?: FileAttachment[];
  };
}

/**
 * Credit card vault entry
 * @responsibility Payment card information storage
 */
export interface CardEntry extends VaultItem {
  type: 'card';
  /** Decrypted card data */
  decrypted?: {
    /** Cardholder name */
    cardholderName: string;
    /** Card number */
    number: string;
    /** Expiration month */
    expiryMonth: string;
    /** Expiration year */
    expiryYear: string;
    /** Security code (CVV) */
    securityCode: string;
    /** Card brand */
    brand?: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';
    /** Billing address */
    billingAddress?: Address;
  };
}

/**
 * Identity vault entry
 * @responsibility Personal identity information storage
 */
export interface IdentityEntry extends VaultItem {
  type: 'identity';
  /** Decrypted identity data */
  decrypted?: {
    /** Full name */
    name: PersonName;
    /** Email addresses */
    emails: string[];
    /** Phone numbers */
    phones: PhoneNumber[];
    /** Addresses */
    addresses: Address[];
    /** Date of birth */
    dateOfBirth?: Date;
    /** Social security number */
    ssn?: string;
    /** Passport information */
    passport?: PassportInfo;
    /** Driver's license */
    license?: LicenseInfo;
  };
}

/**
 * File vault entry
 * @responsibility Encrypted file storage reference
 */
export interface FileEntry extends VaultItem {
  type: 'file';
  /** Decrypted file metadata */
  decrypted?: {
    /** Original filename */
    filename: string;
    /** File size in bytes */
    size: number;
    /** MIME type */
    mimeType: string;
    /** File hash for integrity */
    hash: string;
    /** Storage reference */
    storageRef: string;
    /** Thumbnail reference if applicable */
    thumbnailRef?: string;
  };
}

/**
 * Password history entry
 * @responsibility Track password changes for security
 */
export interface PasswordHistoryEntry {
  /** Previous password */
  password: string;
  /** When password was changed */
  changedAt: Date;
  /** Reason for change */
  reason?: 'manual' | 'breach' | 'expiry' | 'weak';
}

/**
 * File attachment reference
 * @responsibility Reference to encrypted file attachments
 */
export interface FileAttachment {
  /** Attachment ID */
  id: string;
  /** Original filename */
  filename: string;
  /** File size */
  size: number;
  /** MIME type */
  mimeType: string;
  /** Storage reference */
  storageRef: string;
  /** Upload timestamp */
  uploadedAt: Date;
}

/**
 * Person name structure
 * @responsibility Structured name information
 */
export interface PersonName {
  /** First name */
  first: string;
  /** Middle name */
  middle?: string;
  /** Last name */
  last: string;
  /** Name prefix (Mr., Dr., etc.) */
  prefix?: string;
  /** Name suffix (Jr., Sr., etc.) */
  suffix?: string;
}

/**
 * Phone number structure
 * @responsibility Structured phone information
 */
export interface PhoneNumber {
  /** Phone number */
  number: string;
  /** Phone type */
  type: 'mobile' | 'home' | 'work' | 'other';
  /** Country code */
  countryCode?: string;
}

/**
 * Address structure
 * @responsibility Structured address information
 */
export interface Address {
  /** Street address line 1 */
  street1: string;
  /** Street address line 2 */
  street2?: string;
  /** City */
  city: string;
  /** State/Province */
  state: string;
  /** Postal/ZIP code */
  postalCode: string;
  /** Country */
  country: string;
  /** Address type */
  type?: 'home' | 'work' | 'billing' | 'shipping' | 'other';
}

/**
 * Passport information
 * @responsibility Passport document details
 */
export interface PassportInfo {
  /** Passport number */
  number: string;
  /** Issuing country */
  country: string;
  /** Issue date */
  issueDate: Date;
  /** Expiration date */
  expiryDate: Date;
}

/**
 * Driver's license information
 * @responsibility License document details
 */
export interface LicenseInfo {
  /** License number */
  number: string;
  /** Issuing state/province */
  state: string;
  /** License class */
  class?: string;
  /** Issue date */
  issueDate: Date;
  /** Expiration date */
  expiryDate: Date;
}

/**
 * Shared item information
 * @responsibility Information about item sharing
 */
export interface SharedItemInfo {
  /** Who shared the item */
  sharedBy: string;
  /** When item was shared */
  sharedAt: Date;
  /** Sharing permissions */
  permissions: SharePermissions;
  /** Expiration date for sharing */
  expiresAt?: Date;
  /** Sharing message */
  message?: string;
}

/**
 * Share permissions
 * @responsibility Define what actions are allowed on shared items
 */
export interface SharePermissions {
  /** Can view the item */
  read: boolean;
  /** Can modify the item */
  write: boolean;
  /** Can share with others */
  share: boolean;
  /** Can delete the item */
  delete: boolean;
}

/**
 * Vault folder structure
 * @responsibility Organization of vault items into folders
 */
export interface VaultFolder {
  /** Folder ID */
  id: string;
  /** Folder name */
  name: string;
  /** Parent folder ID */
  parentId?: string;
  /** Creation timestamp */
  created: Date;
  /** Modification timestamp */
  modified: Date;
  /** Item count in folder */
  itemCount: number;
  /** Folder color/icon */
  appearance?: {
    color: string;
    icon: string;
  };
}

/**
 * Vault search criteria
 * @responsibility Define search parameters for vault items
 */
export interface VaultSearchCriteria {
  /** Search query */
  query?: string;
  /** Item types to include */
  types?: VaultItem['type'][];
  /** Folders to search in */
  folders?: string[];
  /** Tags to filter by */
  tags?: string[];
  /** Date range */
  dateRange?: {
    from: Date;
    to: Date;
  };
  /** Favorites only */
  favoritesOnly?: boolean;
  /** Include deleted items */
  includeDeleted?: boolean;
}

/**
 * Vault statistics
 * @responsibility Vault usage and security statistics
 */
export interface VaultStatistics {
  /** Total items count */
  totalItems: number;
  /** Items by type */
  itemsByType: Record<VaultItem['type'], number>;
  /** Weak passwords count */
  weakPasswords: number;
  /** Reused passwords count */
  reusedPasswords: number;
  /** Compromised passwords count */
  compromisedPasswords: number;
  /** Average security score */
  averageSecurityScore: number;
  /** Last security audit */
  lastSecurityAudit?: Date;
}
