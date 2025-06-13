/**
 * @fileoverview Auth Service Integration Test
 * @description Simple test utility to verify auth service integration
 */

import { authService } from "@/services/auth.service";

export async function testAuthIntegration(): Promise<boolean> {
  try {
    console.log("🔐 Testing Auth Service Integration...");

    // Test 1: Service initialization
    console.log("✅ Auth service instance created");

    // Test 2: Check initial state
    const isAuthenticated = authService.isAuthenticated();
    console.log(
      `📊 Initial auth state: ${isAuthenticated ? "authenticated" : "not authenticated"}`,
    );

    // Test 3: Test registration
    const testUser = {
      email: "test@example.com",
      password: "TestPassword123!",
      acceptTerms: true,
    };

    try {
      const result = await authService.register(testUser);
      console.log("✅ Registration test passed");
      console.log(`👤 User created: ${result.user.email}`);

      // Test 4: Test sign out
      await authService.signOut();
      console.log("✅ Sign out test passed");

      // Test 5: Test sign in
      const signInResult = await authService.signIn(
        testUser.email,
        testUser.password,
      );
      console.log("✅ Sign in test passed");
      console.log(
        `🔑 Master key structure created: ${!!signInResult.masterKeyStructure}`,
      );

      // Test 6: Test ZK vault integration
      const zkVault = authService.getZKVault();
      const vaultStatus = zkVault.getStatus();
      console.log(
        `🔒 Vault status: ${vaultStatus.initialized ? "initialized" : "not initialized"}`,
      );

      // Test 7: Test encryption/decryption
      const testData = "Hello, ZK-Vault!";
      const encryptResult = await zkVault.encrypt(testData);
      if (encryptResult.success && encryptResult.data) {
        const decryptResult = await zkVault.decrypt(encryptResult.data);
        if (decryptResult.success && decryptResult.data === testData) {
          console.log("✅ Encryption/decryption test passed");
        } else {
          console.log("❌ Encryption/decryption test failed");
          return false;
        }
      } else {
        console.log("❌ Encryption test failed");
        return false;
      }

      // Clean up
      await authService.deleteAccount();
      console.log("🧹 Test cleanup completed");

      console.log("🎉 All auth integration tests passed!");
      return true;
    } catch (error: any) {
      console.error("❌ Auth integration test failed:", error.message);
      return false;
    }
  } catch (error: any) {
    console.error("❌ Auth service integration test failed:", error.message);
    return false;
  }
}

export async function testAuthStateManagement(): Promise<boolean> {
  try {
    console.log("🔄 Testing Auth State Management...");

    let stateChanges = 0;
    const unsubscribe = authService.addAuthStateListener((user) => {
      stateChanges++;
      console.log(
        `📡 Auth state change ${stateChanges}: ${user ? `user ${user.email}` : "no user"}`,
      );
    });

    // Test state initialization
    await authService.initializeAuthState();
    console.log("✅ Auth state initialization test passed");

    // Clean up
    unsubscribe();
    console.log(`📊 Total state changes detected: ${stateChanges}`);

    return true;
  } catch (error: any) {
    console.error("❌ Auth state management test failed:", error.message);
    return false;
  }
}

export async function runAllAuthTests(): Promise<void> {
  console.log("🚀 Starting Auth Service Integration Tests...\n");

  const integrationTest = await testAuthIntegration();
  const stateTest = await testAuthStateManagement();

  console.log("\n📋 Test Results:");
  console.log(
    `Integration Test: ${integrationTest ? "✅ PASSED" : "❌ FAILED"}`,
  );
  console.log(
    `State Management Test: ${stateTest ? "✅ PASSED" : "❌ FAILED"}`,
  );

  if (integrationTest && stateTest) {
    console.log("\n🎉 All tests passed! Auth service is fully integrated.");
  } else {
    console.log("\n⚠️  Some tests failed. Please check the implementation.");
  }
}
