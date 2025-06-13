/**
 * @fileoverview Crypto Integration Test
 * @description Comprehensive test suite for validating crypto package integration
 */

import { cryptoVaultService } from "@/services/crypto-vault.service";
import type { EncryptionContext, DecryptionContext } from "@zk-vault/shared";

export interface CryptoIntegrationTestResult {
  success: boolean;
  results: {
    initialization: boolean;
    encryption: boolean;
    decryption: boolean;
    keyDerivation: boolean;
    algorithmSelection: boolean;
    memoryManagement: boolean;
    errorHandling: boolean;
    performance: boolean;
  };
  metrics: {
    initializationTime: number;
    encryptionTime: number;
    decryptionTime: number;
    keyDerivationTime: number;
    memoryUsage: number;
  };
  errors: string[];
  recommendations: string[];
}

export class CryptoIntegrationTester {
  private errors: string[] = [];
  private recommendations: string[] = [];

  async runComprehensiveTest(
    testEmail: string = "test@example.com",
    testPassword: string = "TestPassword123!@#",
  ): Promise<CryptoIntegrationTestResult> {
    const results = {
      initialization: false,
      encryption: false,
      decryption: false,
      keyDerivation: false,
      algorithmSelection: false,
      memoryManagement: false,
      errorHandling: false,
      performance: false,
    };

    const metrics = {
      initializationTime: 0,
      encryptionTime: 0,
      decryptionTime: 0,
      keyDerivationTime: 0,
      memoryUsage: 0,
    };

    try {
      // Test 1: Initialization
      console.log("🔧 Testing vault initialization...");
      const initStart = performance.now();
      results.initialization = await this.testInitialization(
        testEmail,
        testPassword,
      );
      metrics.initializationTime = performance.now() - initStart;

      if (!results.initialization) {
        this.errors.push("Vault initialization failed");
        return this.buildResult(false, results, metrics);
      }

      // Test 2: Algorithm Selection
      console.log("🎯 Testing algorithm selection...");
      results.algorithmSelection = await this.testAlgorithmSelection();

      // Test 3: Encryption
      console.log("🔒 Testing encryption...");
      const encStart = performance.now();
      const { success: encSuccess, encryptedData } =
        await this.testEncryption();
      results.encryption = encSuccess;
      metrics.encryptionTime = performance.now() - encStart;

      // Test 4: Decryption
      if (encryptedData) {
        console.log("🔓 Testing decryption...");
        const decStart = performance.now();
        results.decryption = await this.testDecryption(encryptedData);
        metrics.decryptionTime = performance.now() - decStart;
      }

      // Test 5: Key Derivation
      console.log("🔑 Testing key derivation...");
      const keyStart = performance.now();
      results.keyDerivation = await this.testKeyDerivation();
      metrics.keyDerivationTime = performance.now() - keyStart;

      // Test 6: Memory Management
      console.log("🧠 Testing memory management...");
      results.memoryManagement = await this.testMemoryManagement();

      // Test 7: Error Handling
      console.log("⚠️ Testing error handling...");
      results.errorHandling = await this.testErrorHandling();

      // Test 8: Performance
      console.log("⚡ Testing performance...");
      results.performance = await this.testPerformance();

      // Calculate memory usage (approximate)
      metrics.memoryUsage = this.estimateMemoryUsage();

      const overallSuccess = Object.values(results).every((result) => result);
      return this.buildResult(overallSuccess, results, metrics);
    } catch (error) {
      this.errors.push(
        `Test suite failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return this.buildResult(false, results, metrics);
    }
  }

  private async testInitialization(
    email: string,
    password: string,
  ): Promise<boolean> {
    try {
      // Test fresh initialization
      const success = await cryptoVaultService.initialize(password, email);

      if (!success) {
        this.errors.push("Initial vault initialization failed");
        return false;
      }

      // Verify vault is initialized
      if (!cryptoVaultService.isInitialized()) {
        this.errors.push(
          "Vault reports as not initialized after successful init",
        );
        return false;
      }

      // Test status retrieval
      const status = cryptoVaultService.getStatus();
      if (!status.initialized) {
        this.errors.push("Vault status reports as not initialized");
        return false;
      }

      console.log("✅ Initialization successful");
      return true;
    } catch (error) {
      this.errors.push(
        `Initialization error: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      return false;
    }
  }

  private async testAlgorithmSelection(): Promise<boolean> {
    try {
      const status = cryptoVaultService.getStatus();

      if (!status.algorithm) {
        this.errors.push("No algorithm selected");
        return false;
      }

      const validAlgorithms = ["AES-256-GCM", "XChaCha20-Poly1305"];
      if (!validAlgorithms.includes(status.algorithm)) {
        this.errors.push(`Invalid algorithm selected: ${status.algorithm}`);
        return false;
      }

      if (status.hardwareAccelerated !== undefined) {
        console.log(
          `✅ Algorithm: ${status.algorithm} (HW Accelerated: ${status.hardwareAccelerated})`,
        );
      } else {
        console.log(`✅ Algorithm: ${status.algorithm}`);
      }

      return true;
    } catch (error) {
      this.errors.push(
        `Algorithm selection test error: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      return false;
    }
  }

  private async testEncryption(): Promise<{
    success: boolean;
    encryptedData?: any;
  }> {
    try {
      const testData =
        "This is sensitive test data that should be encrypted securely! 🔒";
      const context: EncryptionContext = {
        purpose: "vault-item",
        additionalData: new TextEncoder().encode("test-context"),
      };

      const result = await cryptoVaultService.encryptItemData(
        testData,
        context,
      );

      if (!result.success || !result.encryptedData) {
        this.errors.push(
          `Encryption failed: ${result.error || "Unknown error"}`,
        );
        return { success: false };
      }

      // Validate encrypted data structure
      const encrypted = result.encryptedData;
      if (!encrypted.ciphertext || !encrypted.nonce || !encrypted.algorithm) {
        this.errors.push("Encrypted data missing required fields");
        return { success: false };
      }

      console.log("✅ Encryption successful");
      return { success: true, encryptedData: encrypted };
    } catch (error) {
      this.errors.push(
        `Encryption test error: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      return { success: false };
    }
  }

  private async testDecryption(encryptedData: any): Promise<boolean> {
    try {
      const context: DecryptionContext = {
        expectedPurpose: "vault-item",
        verifyAdditionalData: new TextEncoder().encode("test-context"),
      };

      const result = await cryptoVaultService.decryptItemData(
        encryptedData,
        context,
      );

      if (!result.success || !result.data) {
        this.errors.push(
          `Decryption failed: ${result.error || "Unknown error"}`,
        );
        return false;
      }

      const expectedData =
        "This is sensitive test data that should be encrypted securely! 🔒";
      if (result.data !== expectedData) {
        this.errors.push("Decrypted data does not match original");
        return false;
      }

      console.log("✅ Decryption successful");
      return true;
    } catch (error) {
      this.errors.push(
        `Decryption test error: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      return false;
    }
  }

  private async testKeyDerivation(): Promise<boolean> {
    try {
      const testItemId = "test-item-12345";
      const result = await cryptoVaultService.deriveItemKey(testItemId);

      if (!result.success || !result.key) {
        this.errors.push(
          `Key derivation failed: ${result.error || "Unknown error"}`,
        );
        return false;
      }

      // Validate key properties
      if (!(result.key instanceof Uint8Array)) {
        this.errors.push("Derived key is not a Uint8Array");
        return false;
      }

      if (result.key.length !== 32) {
        this.errors.push(
          `Invalid key length: ${result.key.length} (expected 32)`,
        );
        return false;
      }

      // Test key determinism
      const result2 = await cryptoVaultService.deriveItemKey(testItemId);
      if (!result2.success || !result2.key) {
        this.errors.push("Second key derivation failed");
        return false;
      }

      // Keys should be identical for same item ID
      if (!this.arraysEqual(result.key, result2.key)) {
        this.errors.push("Key derivation is not deterministic");
        return false;
      }

      console.log("✅ Key derivation successful");
      return true;
    } catch (error) {
      this.errors.push(
        `Key derivation test error: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      return false;
    }
  }

  private async testMemoryManagement(): Promise<boolean> {
    try {
      // Test vault locking
      const initialStatus = cryptoVaultService.getStatus();
      if (!initialStatus.initialized) {
        this.errors.push("Vault not initialized before memory test");
        return false;
      }

      cryptoVaultService.lock();

      const lockedStatus = cryptoVaultService.getStatus();
      if (lockedStatus.initialized) {
        this.errors.push("Vault still reports as initialized after lock");
        return false;
      }

      if (cryptoVaultService.isInitialized()) {
        this.errors.push(
          "Vault service still reports as initialized after lock",
        );
        return false;
      }

      console.log("✅ Memory management successful");
      return true;
    } catch (error) {
      this.errors.push(
        `Memory management test error: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      return false;
    }
  }

  private async testErrorHandling(): Promise<boolean> {
    try {
      // Test operations on locked vault
      const encResult = await cryptoVaultService.encryptItemData("test");
      if (encResult.success) {
        this.errors.push("Encryption succeeded on locked vault");
        return false;
      }

      const decResult = await cryptoVaultService.decryptItemData({} as any);
      if (decResult.success) {
        this.errors.push("Decryption succeeded on locked vault");
        return false;
      }

      const keyResult = await cryptoVaultService.deriveItemKey("test");
      if (keyResult.success) {
        this.errors.push("Key derivation succeeded on locked vault");
        return false;
      }

      console.log("✅ Error handling successful");
      return true;
    } catch (error) {
      this.errors.push(
        `Error handling test error: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      return false;
    }
  }

  private async testPerformance(): Promise<boolean> {
    try {
      // Re-initialize for performance test
      await cryptoVaultService.initialize(
        "TestPassword123!@#",
        "test@example.com",
      );

      const iterations = 10;
      const testData = "Performance test data";

      // Test encryption performance
      const encStart = performance.now();
      const encryptedItems = [];

      for (let i = 0; i < iterations; i++) {
        const result = await cryptoVaultService.encryptItemData(
          `${testData}-${i}`,
        );
        if (result.success && result.encryptedData) {
          encryptedItems.push(result.encryptedData);
        }
      }

      const encTime = performance.now() - encStart;
      const avgEncTime = encTime / iterations;

      // Test decryption performance
      const decStart = performance.now();
      let successfulDecryptions = 0;

      for (const encrypted of encryptedItems) {
        const result = await cryptoVaultService.decryptItemData(encrypted);
        if (result.success) {
          successfulDecryptions++;
        }
      }

      const decTime = performance.now() - decStart;
      const avgDecTime = decTime / iterations;

      // Performance thresholds (adjust based on requirements)
      const maxEncTime = 100; // 100ms per encryption
      const maxDecTime = 100; // 100ms per decryption

      if (avgEncTime > maxEncTime) {
        this.recommendations.push(
          `Encryption performance: ${avgEncTime.toFixed(2)}ms (threshold: ${maxEncTime}ms)`,
        );
      }

      if (avgDecTime > maxDecTime) {
        this.recommendations.push(
          `Decryption performance: ${avgDecTime.toFixed(2)}ms (threshold: ${maxDecTime}ms)`,
        );
      }

      if (successfulDecryptions !== iterations) {
        this.errors.push(
          `Performance test: ${successfulDecryptions}/${iterations} decryptions successful`,
        );
        return false;
      }

      console.log(
        `✅ Performance: Enc ${avgEncTime.toFixed(2)}ms, Dec ${avgDecTime.toFixed(2)}ms`,
      );
      return true;
    } catch (error) {
      this.errors.push(
        `Performance test error: ${error instanceof Error ? error.message : "Unknown"}`,
      );
      return false;
    }
  }

  private estimateMemoryUsage(): number {
    // Rough estimation - in production, you'd use more sophisticated memory profiling
    return (
      Math.round((performance as any).memory?.usedJSHeapSize / 1024 / 1024) || 0
    );
  }

  private arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  private buildResult(
    success: boolean,
    results: any,
    metrics: any,
  ): CryptoIntegrationTestResult {
    // Add general recommendations
    if (success) {
      this.recommendations.push("✅ All crypto integration tests passed");
    } else {
      this.recommendations.push(
        "❌ Some crypto integration tests failed - review errors",
      );
    }

    const status = cryptoVaultService.getStatus();
    if (status.algorithm === "AES-256-GCM" && !status.hardwareAccelerated) {
      this.recommendations.push(
        "💡 Consider XChaCha20-Poly1305 for better software performance",
      );
    }

    if (metrics.initializationTime > 1000) {
      this.recommendations.push(
        "⚠️ Slow initialization - consider caching master key structure",
      );
    }

    return {
      success,
      results,
      metrics,
      errors: this.errors,
      recommendations: this.recommendations,
    };
  }
}

// Export singleton instance
export const cryptoIntegrationTester = new CryptoIntegrationTester();
