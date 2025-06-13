/**
 * @fileoverview Web App Crypto Integration Test
 * @description Tests the actual integration of crypto package with web app components and services
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

// Import the actual services and composables that use crypto
import { cryptoVaultService } from "@/services/crypto-vault.service";
import { useEncryption } from "@/composables/useEncryption";
import { vaultService } from "@/services/vault.service";
import { fileService } from "@/services/file.service";
import type { PasswordVaultItem } from "@/services/vault.service";

// Import Vue components that use crypto
import EncryptionSettings from "@/components/settings/EncryptionSettings.vue";

describe("Web App Crypto Integration", () => {
  beforeEach(() => {
    // Setup Pinia for state management
    const pinia = createPinia();
    setActivePinia(pinia);

    // Reset crypto service state
    cryptoVaultService.lock();
    vi.clearAllMocks();
  });

  describe("Service Layer Integration", () => {
    it("should integrate crypto service with vault service", async () => {
      console.log("🔧 Testing vault service crypto integration...");

      // Initialize crypto vault
      const initSuccess = await cryptoVaultService.initialize(
        "TestPassword123!",
        "test@example.com",
      );
      expect(initSuccess).toBe(true);
      expect(cryptoVaultService.isInitialized()).toBe(true);

      // Test vault service can use crypto for password encryption
      const testPassword: Omit<
        PasswordVaultItem,
        "id" | "createdAt" | "updatedAt" | "version"
      > = {
        type: "password",
        name: "Test Login",
        username: "testuser",
        password: "secretpassword123",
        website: "https://example.com",
        notes: "Test notes",
        favorite: false,
        tags: [],
        metadata: {
          strength: 80,
          compromised: false,
          autoFill: true,
        },
      };

      // This should use cryptoVaultService internally
      const savedItem = await vaultService.createItem(testPassword);
      expect(savedItem.id).toBeDefined();
      expect(savedItem.name).toBe("Test Login");

      // Verify we can retrieve and decrypt the password
      const searchResult = await vaultService.searchItems({ type: "password" });
      expect(searchResult.items.length).toBe(1);
      const retrievedItem = searchResult.items[0] as PasswordVaultItem;
      expect(retrievedItem.name).toBe("Test Login");
      expect(retrievedItem.username).toBe("testuser");
      expect(retrievedItem.password).toBe("secretpassword123");

      console.log("✅ Vault service crypto integration working");
    });

    it("should integrate crypto service with file service", async () => {
      console.log("🔧 Testing file service crypto integration...");

      // Initialize crypto vault
      const initSuccess = await cryptoVaultService.initialize(
        "TestPassword123!",
        "test@example.com",
      );
      expect(initSuccess).toBe(true);

      // Test file encryption/decryption
      const testFileContent =
        "This is sensitive file content that should be encrypted";
      const testFile = new File([testFileContent], "test.txt", {
        type: "text/plain",
      });

      // Upload and encrypt file
      const uploadResult = await fileService.uploadFile(testFile, {
        folder: "documents",
      });
      expect(uploadResult.id).toBeDefined();
      expect(uploadResult.name).toBe("test.txt");

      // Download and decrypt file
      const downloadResult = await fileService.downloadFile(uploadResult.id);
      expect(downloadResult.blob).toBeDefined();
      expect(downloadResult.filename).toBe("test.txt");

      // Verify file content was properly encrypted/decrypted
      const downloadedContent = await downloadResult.blob.text();
      expect(downloadedContent).toBe(testFileContent);

      console.log("✅ File service crypto integration working");
    });
  });

  describe("Composable Integration", () => {
    it("should integrate crypto through useEncryption composable", async () => {
      console.log("🔧 Testing useEncryption composable integration...");

      const {
        isInitialized,
        initializeVault,
        encryptData,
        decryptData,
        generateSecurePassword,
        getVaultStatus,
      } = useEncryption();

      // Initially not initialized
      expect(isInitialized.value).toBe(false);

      // Initialize through composable
      const initResult = await initializeVault(
        "TestPassword123!",
        "test@example.com",
      );
      expect(initResult).toBe(true);
      expect(isInitialized.value).toBe(true);

      // Test encryption through composable
      const testData = "Sensitive composable test data";
      const encryptResult = await encryptData(testData);
      expect(encryptResult.success).toBe(true);
      expect(encryptResult.data).toBeDefined();

      // Test decryption through composable
      const decryptResult = await decryptData(encryptResult.data!);
      expect(decryptResult.success).toBe(true);
      expect(decryptResult.data).toBe(testData);

      // Test password generation
      const password = generateSecurePassword({
        length: 16,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true,
      });
      expect(password).toHaveLength(16);
      expect(password).toMatch(/[A-Z]/); // Has uppercase
      expect(password).toMatch(/[a-z]/); // Has lowercase
      expect(password).toMatch(/[0-9]/); // Has numbers
      expect(password).toMatch(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/); // Has symbols

      // Test status retrieval
      const status = getVaultStatus();
      expect(status).toBeDefined();
      expect(status?.initialized).toBe(true);
      expect(status?.algorithm).toBeDefined();

      console.log("✅ useEncryption composable integration working");
    });
  });

  describe("Component Integration", () => {
    it("should integrate crypto with EncryptionSettings component", async () => {
      console.log("🔧 Testing EncryptionSettings component integration...");

      // Mock auth service for component
      vi.mock("@/services/auth.service", () => ({
        authService: {
          getCurrentUser: () => ({ email: "test@example.com" }),
        },
      }));

      // Mount component
      const wrapper = mount(EncryptionSettings, {
        global: {
          plugins: [createPinia()],
        },
      });

      // Component should render without errors
      expect(wrapper.exists()).toBe(true);

      // Should have some form of encryption status display
      const text = wrapper.text();
      expect(text.length).toBeGreaterThan(0);

      console.log("✅ EncryptionSettings component integration working");
    });
  });

  describe("End-to-End Integration Flow", () => {
    it("should handle complete user workflow with crypto", async () => {
      console.log("🔧 Testing complete user workflow...");

      // 1. User initializes vault (like during registration/login)
      const initSuccess = await cryptoVaultService.initialize(
        "UserMasterPassword123!",
        "user@example.com",
      );
      expect(initSuccess).toBe(true);

      // 2. User saves a password (through vault service)
      const userPassword: Omit<
        PasswordVaultItem,
        "id" | "createdAt" | "updatedAt" | "version"
      > = {
        type: "password",
        name: "My Bank Account",
        username: "user@bank.com",
        password: "MySecretBankPassword123!",
        website: "https://mybank.com",
        notes: "Primary checking account",
        favorite: false,
        tags: [],
        metadata: {
          strength: 90,
          compromised: false,
          autoFill: true,
        },
      };

      const savedItem = await vaultService.createItem(userPassword);
      expect(savedItem.id).toBeDefined();

      // 3. User uploads a sensitive file
      const sensitiveDocument =
        "CONFIDENTIAL: Account numbers and sensitive information";
      const file = new File([sensitiveDocument], "bank-info.txt", {
        type: "text/plain",
      });

      const uploadResult = await fileService.uploadFile(file, {
        folder: "documents",
      });
      expect(uploadResult.id).toBeDefined();

      // 4. User locks vault (simulating app close/timeout)
      cryptoVaultService.lock();
      expect(cryptoVaultService.isInitialized()).toBe(false);

      // 5. User unlocks vault again (simulating app reopen/login)
      const unlockSuccess = await cryptoVaultService.initialize(
        "UserMasterPassword123!",
        "user@example.com",
      );
      expect(unlockSuccess).toBe(true);

      // 6. User retrieves their password (should be decrypted)
      const searchResult = await vaultService.searchItems({ type: "password" });
      expect(searchResult.items.length).toBe(1);
      const retrievedItem = searchResult.items[0] as PasswordVaultItem;
      expect(retrievedItem.name).toBe("My Bank Account");
      expect(retrievedItem.password).toBe("MySecretBankPassword123!");

      // 7. User downloads their file (should be decrypted)
      const downloadResult = await fileService.downloadFile(uploadResult.id);
      expect(downloadResult.blob).toBeDefined();

      const downloadedContent = await downloadResult.blob.text();
      expect(downloadedContent).toBe(sensitiveDocument);

      console.log("✅ Complete user workflow integration working");
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle crypto errors gracefully across services", async () => {
      console.log("🔧 Testing error handling integration...");

      // Test vault service without crypto initialization
      try {
        await vaultService.createItem({
          type: "password",
          name: "Test",
          username: "test",
          password: "test",
          favorite: false,
          tags: [],
          metadata: {
            strength: 50,
            compromised: false,
            autoFill: false,
          },
        } as any);
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toContain("not initialized");
      }

      // Test file service without crypto initialization
      const testFile = new File(["test"], "test.txt");
      try {
        await fileService.uploadFile(testFile);
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toContain("not initialized");
      }

      // Test composable error handling
      const { encryptData } = useEncryption();
      const encryptResult = await encryptData("test data");
      expect(encryptResult.success).toBe(false);
      expect(encryptResult.error).toContain("not initialized");

      console.log("✅ Error handling integration working");
    });
  });

  describe("Performance Integration", () => {
    it("should maintain acceptable performance in web app context", async () => {
      console.log("🔧 Testing performance integration...");

      const startTime = performance.now();

      // Initialize vault
      const initSuccess = await cryptoVaultService.initialize(
        "TestPassword123!",
        "test@example.com",
      );
      expect(initSuccess).toBe(true);

      const initTime = performance.now() - startTime;
      expect(initTime).toBeLessThan(5000); // Should initialize within 5 seconds

      // Test bulk operations performance
      const bulkStartTime = performance.now();

      // Save multiple passwords
      const passwords = Array.from(
        { length: 5 },
        (_, i) =>
          ({
            type: "password" as const,
            name: `Test Password ${i}`,
            username: `user${i}`,
            password: `password${i}`,
            website: `https://example${i}.com`,
            notes: `Notes for password ${i}`,
            favorite: false,
            tags: [],
            metadata: {
              strength: 70,
              compromised: false,
              autoFill: true,
            },
          }) as any,
      );

      const savedItems = [];
      for (const password of passwords) {
        const result = await vaultService.createItem(password);
        savedItems.push(result);
        expect(result.id).toBeDefined();
      }

      const bulkSaveTime = performance.now() - bulkStartTime;
      expect(bulkSaveTime).toBeLessThan(10000); // Should save 5 passwords within 10 seconds

      // Test bulk retrieval
      const retrievalStartTime = performance.now();
      const searchResult = await vaultService.searchItems({ type: "password" });
      const retrievalTime = performance.now() - retrievalStartTime;

      expect(searchResult.items.length).toBe(5);
      expect(retrievalTime).toBeLessThan(2000); // Should retrieve within 2 seconds

      console.log(`✅ Performance integration acceptable:`);
      console.log(`  - Initialization: ${initTime.toFixed(2)}ms`);
      console.log(`  - Bulk save (5 items): ${bulkSaveTime.toFixed(2)}ms`);
      console.log(
        `  - Bulk retrieval (5 items): ${retrievalTime.toFixed(2)}ms`,
      );
    });
  });
});
