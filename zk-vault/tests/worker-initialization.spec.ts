/**
 * @fileoverview Worker Initialization Tests
 * @responsibility Test worker initialization behavior and prevent multiple initializations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { vaultIntegration } from "../packages/web-app/src/services/vault-integration.service";
import { workerManager } from "../packages/web-app/src/services/worker-manager.service";

// Mock the worker manager
vi.mock("../services/worker-manager.service", () => ({
  workerManager: {
    initializeWorker: vi.fn(),
    isWorkerHealthy: vi.fn(),
    terminateAllWorkers: vi.fn(),
  },
}));

describe("Worker Initialization", () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset the vault integration service
    (vaultIntegration as any).isInitialized = false;
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      await vaultIntegration.shutdown();
    } catch (error) {
      // Ignore shutdown errors in tests
    }
  });

  describe("VaultIntegrationService", () => {
    it("should track initialization state correctly", () => {
      // Initially not initialized
      expect(vaultIntegration.isServiceInitialized()).toBe(false);

      // Set as initialized (simulating successful initialization)
      (vaultIntegration as any).isInitialized = true;

      // Should now be initialized
      expect(vaultIntegration.isServiceInitialized()).toBe(true);
    });

    it("should prevent multiple initializations", async () => {
      // Set as already initialized
      (vaultIntegration as any).isInitialized = true;

      // Create a spy on console.log to verify the skip message
      const consoleSpy = vi.spyOn(console, "log");

      // Try to initialize - this should be skipped
      await vaultIntegration.initialize({
        searchWorker: false, // Disable workers to avoid actual initialization
        encryptionWorker: false,
        fileProcessingWorker: false,
      });

      // Verify the skip message was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        "Vault integration service already initialized, skipping...",
      );

      consoleSpy.mockRestore();
    });

    it("should have proper configuration defaults", () => {
      const config = (vaultIntegration as any).config;

      expect(config).toBeDefined();
      expect(config.batchSize).toBe(50);
      expect(config.workerThresholds).toBeDefined();
      expect(config.workerThresholds.encryption).toBe(1024);
      expect(config.workerThresholds.fileProcessing).toBe(1024 * 1024);
      expect(config.workerThresholds.search).toBe(10);
    });

    it("should initialize workers only once", async () => {
      // Mock worker manager methods
      (workerManager.initializeWorker as any).mockResolvedValue(undefined);
      (workerManager.isWorkerHealthy as any).mockReturnValue(false);

      // First initialization
      await vaultIntegration.initialize({
        searchWorker: true,
        encryptionWorker: true,
        fileProcessingWorker: true,
      });

      // Verify workers were initialized
      expect(workerManager.initializeWorker).toHaveBeenCalledTimes(3);
      expect(workerManager.initializeWorker).toHaveBeenCalledWith("search");
      expect(workerManager.initializeWorker).toHaveBeenCalledWith("encryption");
      expect(workerManager.initializeWorker).toHaveBeenCalledWith(
        "fileProcessing",
      );

      // Reset mock call count
      vi.clearAllMocks();

      // Second initialization attempt
      await vaultIntegration.initialize({
        searchWorker: true,
        encryptionWorker: true,
        fileProcessingWorker: true,
      });

      // Verify workers were NOT initialized again
      expect(workerManager.initializeWorker).not.toHaveBeenCalled();
    });

    it("should check if service is initialized", async () => {
      // Initially not initialized
      expect(vaultIntegration.isServiceInitialized()).toBe(false);

      // Mock worker manager methods
      (workerManager.initializeWorker as any).mockResolvedValue(undefined);
      (workerManager.isWorkerHealthy as any).mockReturnValue(false);

      // Initialize the service
      await vaultIntegration.initialize();

      // Should now be initialized
      expect(vaultIntegration.isServiceInitialized()).toBe(true);
    });

    it("should only initialize enabled workers", async () => {
      // Mock worker manager methods
      (workerManager.initializeWorker as any).mockResolvedValue(undefined);
      (workerManager.isWorkerHealthy as any).mockReturnValue(false);

      // Initialize with only search worker enabled
      await vaultIntegration.initialize({
        searchWorker: true,
        encryptionWorker: false,
        fileProcessingWorker: false,
      });

      // Verify only search worker was initialized
      expect(workerManager.initializeWorker).toHaveBeenCalledTimes(1);
      expect(workerManager.initializeWorker).toHaveBeenCalledWith("search");
    });

    it("should handle worker initialization failures gracefully", async () => {
      // Mock worker manager to fail for encryption worker
      (workerManager.initializeWorker as any).mockImplementation(
        (type: string) => {
          if (type === "encryption") {
            throw new Error("Failed to initialize encryption worker");
          }
          return Promise.resolve();
        },
      );
      (workerManager.isWorkerHealthy as any).mockReturnValue(false);

      // Initialize should not throw even if one worker fails
      await expect(
        vaultIntegration.initialize({
          searchWorker: true,
          encryptionWorker: true,
          fileProcessingWorker: true,
        }),
      ).resolves.not.toThrow();

      // Verify all workers were attempted
      expect(workerManager.initializeWorker).toHaveBeenCalledTimes(3);
    });
  });

  describe("WorkerManager", () => {
    it("should skip initialization if worker is already healthy", async () => {
      // Mock a healthy worker
      (workerManager.isWorkerHealthy as any).mockReturnValue(true);

      // Create a spy on console.log to verify the skip message
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Try to initialize - this should be skipped
      await workerManager.initializeWorker("search");

      // Verify the skip message was logged (this tests our updated logic)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("already initialized and healthy"),
      );

      consoleSpy.mockRestore();
    });
  });
});
