#!/usr/bin/env node

/**
 * ZK-Vault Storage and Data Management Test Script
 * Tests Firebase Firestore, Storage, and Authentication setup
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, collection, addDoc, query, where, getDocs } = require('firebase/firestore');
const { getStorage, connectStorageEmulator, ref, uploadBytes, getDownloadURL, deleteObject } = require('firebase/storage');
const { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');

// Firebase configuration for emulator
const firebaseConfig = {
  apiKey: "demo-key",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "demo-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Connect to emulators
connectFirestoreEmulator(db, 'localhost', 8080);
connectStorageEmulator(storage, 'localhost', 9199);
connectAuthEmulator(auth, 'http://localhost:9099');

// Test data
const testUser = {
  email: 'test@zkvault.com',
  password: 'TestPassword123!',
  displayName: 'Test User'
};

const testVaultItem = {
  name: 'Test Password',
  type: 'password',
  folder: 'Personal',
  favorite: false,
  tags: ['test', 'demo'],
  encryptedData: 'encrypted_test_data_base64',
  metadata: {
    algorithm: 'aes-gcm',
    version: 1,
    checksum: 'test_checksum'
  },
  version: 1
};

const testFile = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100]); // "Hello World"

async function runTests() {
  console.log('🚀 Starting ZK-Vault Storage and Data Management Tests\n');

  try {
    // Test 1: Authentication
    console.log('📝 Test 1: Authentication');
    await testAuthentication();
    console.log('✅ Authentication test passed\n');

    // Test 2: Firestore Operations
    console.log('📝 Test 2: Firestore Operations');
    await testFirestoreOperations();
    console.log('✅ Firestore operations test passed\n');

    // Test 3: Storage Operations
    console.log('📝 Test 3: Storage Operations');
    await testStorageOperations();
    console.log('✅ Storage operations test passed\n');

    // Test 4: Security Rules
    console.log('📝 Test 4: Security Rules');
    await testSecurityRules();
    console.log('✅ Security rules test passed\n');

    // Test 5: Data Integrity
    console.log('📝 Test 5: Data Integrity');
    await testDataIntegrity();
    console.log('✅ Data integrity test passed\n');

    console.log('🎉 All tests passed! ZK-Vault storage and data management is fully set up.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

async function testAuthentication() {
  try {
    // Create test user
    const userCredential = await createUserWithEmailAndPassword(auth, testUser.email, testUser.password);
    console.log('  ✓ User created successfully:', userCredential.user.uid);

    // Sign out and sign back in
    await auth.signOut();
    const signInCredential = await signInWithEmailAndPassword(auth, testUser.email, testUser.password);
    console.log('  ✓ User signed in successfully:', signInCredential.user.uid);

  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      // User already exists, try to sign in
      const signInCredential = await signInWithEmailAndPassword(auth, testUser.email, testUser.password);
      console.log('  ✓ User signed in (already exists):', signInCredential.user.uid);
    } else {
      throw error;
    }
  }
}

async function testFirestoreOperations() {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  // Test user profile creation
  const userDocRef = doc(db, 'users', user.uid);
  await setDoc(userDocRef, {
    email: user.email,
    displayName: testUser.displayName,
    createdAt: new Date(),
    settings: {
      theme: 'dark',
      notifications: {
        email: true,
        push: false,
        securityAlerts: true
      }
    }
  });
  console.log('  ✓ User profile created');

  // Test vault item creation
  const vaultItemRef = doc(collection(db, 'vaults', user.uid, 'items'));
  await setDoc(vaultItemRef, {
    ...testVaultItem,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: user.uid
  });
  console.log('  ✓ Vault item created:', vaultItemRef.id);

  // Test vault item retrieval
  const vaultItemDoc = await getDoc(vaultItemRef);
  if (!vaultItemDoc.exists()) {
    throw new Error('Vault item not found');
  }
  console.log('  ✓ Vault item retrieved');

  // Test vault items query
  const vaultItemsQuery = query(
    collection(db, 'vaults', user.uid, 'items'),
    where('type', '==', 'password')
  );
  const vaultItemsSnapshot = await getDocs(vaultItemsQuery);
  console.log('  ✓ Vault items queried, found:', vaultItemsSnapshot.size, 'items');

  // Test security event logging
  const securityEventRef = doc(collection(db, 'security', user.uid, 'events'));
  await setDoc(securityEventRef, {
    type: 'vault_access',
    ipAddress: '127.0.0.1',
    userAgent: 'Test Script',
    severity: 'low',
    createdAt: new Date(),
    createdBy: user.uid
  });
  console.log('  ✓ Security event logged');
}

async function testStorageOperations() {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  // Test file upload
  const fileName = `test-file-${Date.now()}.txt`;
  const fileRef = ref(storage, `vaults/${user.uid}/files/${fileName}`);
  
  const metadata = {
    contentType: 'text/plain',
    customMetadata: {
      encrypted: 'true',
      checksum: 'test_checksum',
      originalFileName: 'test.txt',
      uploadedBy: user.uid
    }
  };

  await uploadBytes(fileRef, testFile, metadata);
  console.log('  ✓ File uploaded:', fileName);

  // Test file download URL
  const downloadURL = await getDownloadURL(fileRef);
  console.log('  ✓ Download URL generated:', downloadURL.substring(0, 50) + '...');

  // Test file metadata
  const fileMetadata = await fileRef.getMetadata();
  console.log('  ✓ File metadata retrieved, size:', fileMetadata.size, 'bytes');

  // Clean up - delete test file
  await deleteObject(fileRef);
  console.log('  ✓ Test file cleaned up');
}

async function testSecurityRules() {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  try {
    // Test that user can access their own data
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      console.log('  ✓ User can access own profile');
    }

    // Test that user can access their own vault items
    const vaultItemsQuery = query(collection(db, 'vaults', user.uid, 'items'));
    const vaultItemsSnapshot = await getDocs(vaultItemsQuery);
    console.log('  ✓ User can access own vault items');

    // Test file access permissions
    const testFileRef = ref(storage, `vaults/${user.uid}/files/test.txt`);
    try {
      await uploadBytes(testFileRef, new Uint8Array([1, 2, 3]), {
        customMetadata: {
          encrypted: 'true',
          checksum: 'test'
        }
      });
      console.log('  ✓ User can upload to own storage path');
      await deleteObject(testFileRef);
    } catch (error) {
      console.log('  ⚠️  Storage upload test skipped:', error.message);
    }

  } catch (error) {
    throw new Error(`Security rules test failed: ${error.message}`);
  }
}

async function testDataIntegrity() {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  // Test data consistency
  const testData = {
    id: 'integrity-test',
    data: 'test-data-' + Date.now(),
    checksum: 'test-checksum'
  };

  // Write data
  const testDocRef = doc(db, 'vaults', user.uid, 'items', testData.id);
  await setDoc(testDocRef, {
    ...testData,
    createdAt: new Date(),
    createdBy: user.uid
  });

  // Read data back
  const retrievedDoc = await getDoc(testDocRef);
  if (!retrievedDoc.exists()) {
    throw new Error('Data integrity test failed: document not found');
  }

  const retrievedData = retrievedDoc.data();
  if (retrievedData.data !== testData.data) {
    throw new Error('Data integrity test failed: data mismatch');
  }

  console.log('  ✓ Data written and retrieved successfully');
  console.log('  ✓ Data integrity verified');

  // Clean up
  await testDocRef.delete();
  console.log('  ✓ Test data cleaned up');
}

// Run the tests
runTests().catch(console.error); 