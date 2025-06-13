#!/usr/bin/env node

/**
 * Installation script for optional crypto dependencies
 * This script helps install the crypto libraries needed for production use
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔐 Installing ZK-Vault crypto dependencies...\n');

const dependencies = [
  {
    name: 'argon2',
    description: 'Password hashing with Argon2id',
    required: false,
    install: 'npm install argon2',
  },
  {
    name: 'libsodium-wrappers',
    description: 'Comprehensive crypto library (XChaCha20-Poly1305, etc.)',
    required: false,
    install: 'npm install libsodium-wrappers',
  },
  {
    name: '@stablelib/xchacha20poly1305',
    description: 'XChaCha20-Poly1305 implementation',
    required: false,
    install:
      'npm install @stablelib/xchacha20poly1305 @stablelib/hkdf @stablelib/sha256 @stablelib/hmac @stablelib/pbkdf2',
  },
  {
    name: '@types/libsodium-wrappers',
    description: 'TypeScript types for libsodium',
    required: false,
    install: 'npm install --save-dev @types/libsodium-wrappers',
  },
];

function isInstalled(packageName) {
  try {
    require.resolve(packageName);
    return true;
  } catch (e) {
    return false;
  }
}

function installDependency(dep) {
  console.log(`📦 Installing ${dep.name}...`);
  try {
    execSync(dep.install, { stdio: 'inherit' });
    console.log(`✅ ${dep.name} installed successfully\n`);
    return true;
  } catch (error) {
    console.log(`❌ Failed to install ${dep.name}: ${error.message}\n`);
    return false;
  }
}

function main() {
  let installed = 0;
  let failed = 0;

  for (const dep of dependencies) {
    if (isInstalled(dep.name)) {
      console.log(`✅ ${dep.name} is already installed`);
      installed++;
    } else {
      console.log(`⚠️  ${dep.name} is not installed - ${dep.description}`);

      if (process.argv.includes('--install') || process.argv.includes('-i')) {
        if (installDependency(dep)) {
          installed++;
        } else {
          failed++;
        }
      }
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Installed: ${installed}`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}`);
  }

  if (!process.argv.includes('--install') && !process.argv.includes('-i')) {
    console.log('\n💡 To install missing dependencies, run:');
    console.log('   node install-crypto-deps.js --install');
    console.log('\n📚 Or install manually:');
    dependencies.forEach(dep => {
      if (!isInstalled(dep.name)) {
        console.log(`   ${dep.install}`);
      }
    });
  }

  console.log('\n🔒 Note: These are optional dependencies. The crypto package will');
  console.log('   use fallback implementations if they are not available.');
}

if (require.main === module) {
  main();
}

module.exports = { dependencies, isInstalled, installDependency };
