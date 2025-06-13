export * from './admin.service';
export * from './analytics.service';
export * from './auth.service';
export * from './backup.service';
export * from './breach-monitor.service';
export * from './crypto-vault.service';
export * from './firebase.service';
export * from './search.service';
export * from './vault-integration.service';
export * from './worker-manager.service';

export type {
  FileMetadata,
  FileShareSettings,
  FileUploadOptions,
  FileSearchFilters,
  PaginationOptions as FilePaginationOptions,
  FileSearchResult,
  FileUploadProgress,
  FileDownloadResult,
} from './file.service';

export { fileService } from './file.service';

export type {
  VaultItemType,
  StoredVaultItem,
  PasswordVaultItem,
  NoteVaultItem,
  CardVaultItem,
  IdentityVaultItem,
  DecryptedVaultItem,
  VaultItem,
  VaultStats,
  VaultSearchFilters,
  PaginationOptions as VaultPaginationOptions,
  VaultSearchResult,
} from './vault.service';

export { vaultService } from './vault.service'; 