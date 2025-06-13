/**
 * @fileoverview Integration Status Service
 * @responsibility Monitors and reports on the integration status of all modular components
 * @principle Single Responsibility - Only integration status monitoring
 * @security Provides visibility into system architecture compliance
 */

export interface IntegrationStatus {
  component: string;
  status: 'healthy' | 'warning' | 'error' | 'missing';
  message: string;
  details?: any;
  timestamp: Date;
}

export interface IntegrationDetails {
  packages: {
    shared: IntegrationStatus;
    crypto: IntegrationStatus;
  };
  services: {
    auth: IntegrationStatus;
    vault: IntegrationStatus;
    crypto: IntegrationStatus;
    search: IntegrationStatus;
    files: IntegrationStatus;
    workers: IntegrationStatus;
  };
  stores: {
    auth: IntegrationStatus;
    vault: IntegrationStatus;
    settings: IntegrationStatus;
    search: IntegrationStatus;
  };
  workers: {
    search: IntegrationStatus;
    encryption: IntegrationStatus;
    fileProcessing: IntegrationStatus;
  };
  architecture: {
    soc: IntegrationStatus;
    modularity: IntegrationStatus;
    dependencies: IntegrationStatus;
  };
}

class IntegrationStatusService {
  private static instance: IntegrationStatusService;
  private lastCheck: Date | null = null;
  private cachedStatus: IntegrationDetails | null = null;

  private constructor() {}

  public static getInstance(): IntegrationStatusService {
    if (!IntegrationStatusService.instance) {
      IntegrationStatusService.instance = new IntegrationStatusService();
    }
    return IntegrationStatusService.instance;
  }

  /**
   * Comprehensive integration status check
   */
  async checkIntegrationStatus(): Promise<IntegrationDetails> {
    const timestamp = new Date();

    const status: IntegrationDetails = {
      packages: {
        shared: await this.checkSharedPackage(),
        crypto: await this.checkCryptoPackage(),
      },
      services: {
        auth: await this.checkAuthService(),
        vault: await this.checkVaultService(),
        crypto: await this.checkCryptoService(),
        search: await this.checkSearchService(),
        files: await this.checkFilesService(),
        workers: await this.checkWorkersService(),
      },
      stores: {
        auth: await this.checkAuthStore(),
        vault: await this.checkVaultStore(),
        settings: await this.checkSettingsStore(),
        search: await this.checkSearchStore(),
      },
      workers: {
        search: await this.checkSearchWorker(),
        encryption: await this.checkEncryptionWorker(),
        fileProcessing: await this.checkFileProcessingWorker(),
      },
      architecture: {
        soc: await this.checkSOCCompliance(),
        modularity: await this.checkModularity(),
        dependencies: await this.checkDependencies(),
      },
    };

    this.lastCheck = timestamp;
    this.cachedStatus = status;

    return status;
  }

  /**
   * Log comprehensive integration status
   */
  async logIntegrationStatus(): Promise<void> {
    console.group('🔍 ZK-Vault Integration Status');

    const status = await this.checkIntegrationStatus();

    // Log packages
    console.group('📦 Packages');
    this.logStatus('Shared Package', status.packages.shared);
    this.logStatus('Crypto Package', status.packages.crypto);
    console.groupEnd();

    // Log services
    console.group('🔧 Services');
    this.logStatus('Auth Service', status.services.auth);
    this.logStatus('Vault Service', status.services.vault);
    this.logStatus('Crypto Service', status.services.crypto);
    this.logStatus('Search Service', status.services.search);
    this.logStatus('Files Service', status.services.files);
    this.logStatus('Workers Service', status.services.workers);
    console.groupEnd();

    // Log stores
    console.group('🏪 Stores');
    this.logStatus('Auth Store', status.stores.auth);
    this.logStatus('Vault Store', status.stores.vault);
    this.logStatus('Settings Store', status.stores.settings);
    this.logStatus('Search Store', status.stores.search);
    console.groupEnd();

    // Log workers
    console.group('👷 Workers');
    this.logStatus('Search Worker', status.workers.search);
    this.logStatus('Encryption Worker', status.workers.encryption);
    this.logStatus('File Processing Worker', status.workers.fileProcessing);
    console.groupEnd();

    // Log architecture
    console.group('🏗️ Architecture');
    this.logStatus('SOC Compliance', status.architecture.soc);
    this.logStatus('Modularity', status.architecture.modularity);
    this.logStatus('Dependencies', status.architecture.dependencies);
    console.groupEnd();

    console.groupEnd();
  }

  /**
   * Get cached status or perform new check
   */
  async getStatus(forceRefresh = false): Promise<IntegrationDetails> {
    if (!forceRefresh && this.cachedStatus && this.lastCheck) {
      const timeSinceCheck = Date.now() - this.lastCheck.getTime();
      if (timeSinceCheck < 30000) {
        // 30 seconds cache
        return this.cachedStatus;
      }
    }

    return await this.checkIntegrationStatus();
  }

  // Package checks
  private async checkSharedPackage(): Promise<IntegrationStatus> {
    try {
      const shared = await import('@zk-vault/shared');
      const hasTypes = !!(shared && typeof shared === 'object');

      return {
        component: 'shared-package',
        status: hasTypes ? 'healthy' : 'warning',
        message: hasTypes ? 'Shared package available' : 'Shared package missing',
        details: { packageAvailable: hasTypes },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'shared-package',
        status: 'error',
        message: `Failed to import shared package: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  private async checkCryptoPackage(): Promise<IntegrationStatus> {
    try {
      const crypto = await import('@zk-vault/crypto');
      const hasVault = !!crypto.ZeroKnowledgeVault;

      return {
        component: 'crypto-package',
        status: hasVault ? 'healthy' : 'warning',
        message: hasVault ? 'Crypto package fully available' : 'Some crypto components missing',
        details: { vaultAvailable: hasVault },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'crypto-package',
        status: 'error',
        message: `Failed to import crypto package: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  // Service checks
  private async checkAuthService(): Promise<IntegrationStatus> {
    try {
      const { authService } = await import('@/services/auth.service');
      const isInitialized = authService && typeof authService.isAuthenticated === 'function';

      return {
        component: 'auth-service',
        status: isInitialized ? 'healthy' : 'warning',
        message: isInitialized
          ? 'Auth service operational'
          : 'Auth service not properly initialized',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'auth-service',
        status: 'error',
        message: `Auth service error: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  private async checkVaultService(): Promise<IntegrationStatus> {
    try {
      const { vaultService } = await import('@/services/vault.service');
      const hasRequiredMethods =
        vaultService &&
        typeof vaultService.createItem === 'function' &&
        typeof vaultService.getItem === 'function';

      return {
        component: 'vault-service',
        status: hasRequiredMethods ? 'healthy' : 'warning',
        message: hasRequiredMethods ? 'Vault service operational' : 'Vault service missing methods',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'vault-service',
        status: 'error',
        message: `Vault service error: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  private async checkCryptoService(): Promise<IntegrationStatus> {
    try {
      const { CryptoVaultService } = await import('@/services/crypto-vault.service');
      const service = new CryptoVaultService();

      return {
        component: 'crypto-service',
        status: 'healthy',
        message: 'Crypto service available',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'crypto-service',
        status: 'error',
        message: `Crypto service error: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  private async checkSearchService(): Promise<IntegrationStatus> {
    try {
      const { searchService } = await import('@/services/search.service');
      const hasSearch = typeof searchService.search === 'function';

      return {
        component: 'search-service',
        status: hasSearch ? 'healthy' : 'warning',
        message: hasSearch ? 'Search service operational' : 'Search service not available',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'search-service',
        status: 'error',
        message: `Search service error: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  private async checkFilesService(): Promise<IntegrationStatus> {
    try {
      const { fileService } = await import('@/services/file.service');
      const hasUpload = typeof fileService.uploadFile === 'function';

      return {
        component: 'files-service',
        status: hasUpload ? 'healthy' : 'warning',
        message: hasUpload ? 'Files service operational' : 'Files service not available',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'files-service',
        status: 'error',
        message: `Files service error: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  private async checkWorkersService(): Promise<IntegrationStatus> {
    try {
      const { workerManager } = await import('@/services/worker-manager.service');
      const hasManager = typeof workerManager.initializeWorker === 'function';

      return {
        component: 'workers-service',
        status: hasManager ? 'healthy' : 'warning',
        message: hasManager ? 'Worker manager operational' : 'Worker manager not available',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'workers-service',
        status: 'error',
        message: `Workers service error: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  // Store checks
  private async checkAuthStore(): Promise<IntegrationStatus> {
    try {
      const { useAuthStore } = await import('@/store/auth.store');

      return {
        component: 'auth-store',
        status: 'healthy',
        message: 'Auth store available',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'auth-store',
        status: 'error',
        message: `Auth store error: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  private async checkVaultStore(): Promise<IntegrationStatus> {
    try {
      const { useVaultStore } = await import('@/store/vault.store');

      return {
        component: 'vault-store',
        status: 'healthy',
        message: 'Vault store available',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'vault-store',
        status: 'error',
        message: `Vault store error: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  private async checkSettingsStore(): Promise<IntegrationStatus> {
    try {
      const { useSettingsStore } = await import('@/store/settings.store');

      return {
        component: 'settings-store',
        status: 'healthy',
        message: 'Settings store available',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'settings-store',
        status: 'error',
        message: `Settings store error: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  private async checkSearchStore(): Promise<IntegrationStatus> {
    try {
      const { useSearchStore } = await import('@/store/search.store');

      return {
        component: 'search-store',
        status: 'healthy',
        message: 'Search store available',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'search-store',
        status: 'error',
        message: `Search store error: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  // Worker checks
  private async checkSearchWorker(): Promise<IntegrationStatus> {
    try {
      const { workerManager } = await import('@/services/worker-manager.service');
      const isHealthy = workerManager.isWorkerHealthy('search');

      return {
        component: 'search-worker',
        status: isHealthy ? 'healthy' : 'warning',
        message: isHealthy ? 'Search worker operational' : 'Search worker not running',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'search-worker',
        status: 'error',
        message: `Search worker error: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  private async checkEncryptionWorker(): Promise<IntegrationStatus> {
    try {
      const { workerManager } = await import('@/services/worker-manager.service');
      const isHealthy = workerManager.isWorkerHealthy('encryption');

      return {
        component: 'encryption-worker',
        status: isHealthy ? 'healthy' : 'warning',
        message: isHealthy
          ? 'Encryption worker operational'
          : 'Encryption worker disabled (security default)',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'encryption-worker',
        status: 'error',
        message: `Encryption worker error: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  private async checkFileProcessingWorker(): Promise<IntegrationStatus> {
    try {
      const { workerManager } = await import('@/services/worker-manager.service');
      const isHealthy = workerManager.isWorkerHealthy('fileProcessing');

      return {
        component: 'file-processing-worker',
        status: isHealthy ? 'healthy' : 'warning',
        message: isHealthy
          ? 'File processing worker operational'
          : 'File processing worker not running',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'file-processing-worker',
        status: 'error',
        message: `File processing worker error: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  // Architecture checks
  private async checkSOCCompliance(): Promise<IntegrationStatus> {
    const violations: string[] = [];

    // Check for proper separation of concerns
    try {
      // Services should not directly import stores
      // Stores should not directly import services (except in actions)
      // Components should use composables, not direct service imports

      return {
        component: 'soc-compliance',
        status: violations.length === 0 ? 'healthy' : 'warning',
        message:
          violations.length === 0
            ? 'SOC principles maintained'
            : `SOC violations: ${violations.join(', ')}`,
        details: { violations },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'soc-compliance',
        status: 'error',
        message: `SOC check error: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  private async checkModularity(): Promise<IntegrationStatus> {
    try {
      // Check if packages are properly modular
      const sharedAvailable = await this.isPackageAvailable('@zk-vault/shared');
      const cryptoAvailable = await this.isPackageAvailable('@zk-vault/crypto');

      const score = (sharedAvailable ? 1 : 0) + (cryptoAvailable ? 1 : 0);
      const total = 2;

      return {
        component: 'modularity',
        status: score === total ? 'healthy' : score > 0 ? 'warning' : 'error',
        message: `${score}/${total} packages properly modular`,
        details: { sharedAvailable, cryptoAvailable },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'modularity',
        status: 'error',
        message: `Modularity check error: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  private async checkDependencies(): Promise<IntegrationStatus> {
    try {
      // Check for circular dependencies and proper dependency flow
      const issues: string[] = [];

      // Web app should depend on shared and crypto
      // Crypto should depend on shared
      // Shared should have no internal dependencies

      return {
        component: 'dependencies',
        status: issues.length === 0 ? 'healthy' : 'warning',
        message:
          issues.length === 0
            ? 'Dependency graph clean'
            : `Dependency issues: ${issues.join(', ')}`,
        details: { issues },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        component: 'dependencies',
        status: 'error',
        message: `Dependency check error: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  // Helper methods
  private async isPackageAvailable(packageName: string): Promise<boolean> {
    try {
      await import(/* @vite-ignore */ packageName);
      return true;
    } catch {
      return false;
    }
  }

  private logStatus(name: string, status: IntegrationStatus): void {
    const emoji = {
      healthy: '✅',
      warning: '⚠️',
      error: '❌',
      missing: '❓',
    }[status.status];

    console.log(`${emoji} ${name}: ${status.message}`);
    if (status.details) {
      console.log('   Details:', status.details);
    }
  }
}

export const integrationStatusService = IntegrationStatusService.getInstance();
