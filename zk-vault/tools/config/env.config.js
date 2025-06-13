const path = require('path');
const fs = require('fs');

/**
 * Environment configuration utility for the ZK-Vault monorepo
 * Handles loading and validation of environment variables across different environments
 */

// Default environment values
const DEFAULT_ENV = {
  NODE_ENV: 'development',
  DEBUG: 'false',
  LOG_LEVEL: 'info',
};

// Required environment variables for different environments
const REQUIRED_ENV_VARS = {
  development: ['FIREBASE_API_KEY', 'FIREBASE_PROJECT_ID'],
  test: ['FIREBASE_PROJECT_ID'],
  production: [
    'FIREBASE_API_KEY',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
  ],
};

// Environment variable validation rules
const ENV_VALIDATION_RULES = {
  NODE_ENV: {
    required: true,
    values: ['development', 'test', 'production'],
  },
  LOG_LEVEL: {
    required: false,
    values: ['error', 'warn', 'info', 'debug'],
    default: 'info',
  },
  DEBUG: {
    required: false,
    type: 'boolean',
    default: false,
  },
  PORT: {
    required: false,
    type: 'number',
    default: 3000,
  },
};

/**
 * Load environment variables from .env files
 * @param {string} rootDir Root directory to search for .env files
 * @param {string} environment Current environment (development, test, production)
 * @returns {Object} Loaded environment variables
 */
function loadEnvironment(rootDir, environment = process.env.NODE_ENV || 'development') {
  const envFiles = [`.env.${environment}.local`, `.env.${environment}`, '.env.local', '.env'];

  const env = { ...DEFAULT_ENV, ...process.env };

  // Load environment files in order of precedence
  envFiles.forEach(file => {
    const filePath = path.resolve(rootDir, file);
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const parsed = parseEnvFile(fileContent);
        Object.assign(env, parsed);
      } catch (error) {
        console.warn(`Warning: Failed to load ${file}:`, error.message);
      }
    }
  });

  return env;
}

/**
 * Parse .env file content
 * @param {string} content File content
 * @returns {Object} Parsed environment variables
 */
function parseEnvFile(content) {
  const env = {};
  const lines = content.split('\n');

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        let value = valueParts.join('=').trim();

        // Remove quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        env[key.trim()] = value;
      }
    }
  });

  return env;
}

/**
 * Validate environment variables
 * @param {Object} env Environment variables
 * @param {string} environment Current environment
 * @returns {Object} Validation result with errors if any
 */
function validateEnvironment(env, environment = env.NODE_ENV || 'development') {
  const errors = [];
  const warnings = [];

  // Check required variables for the environment
  const requiredVars = REQUIRED_ENV_VARS[environment] || [];
  requiredVars.forEach(varName => {
    if (!env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  });

  // Validate individual variables
  Object.entries(ENV_VALIDATION_RULES).forEach(([varName, rules]) => {
    const value = env[varName];

    if (rules.required && !value) {
      errors.push(`Missing required environment variable: ${varName}`);
      return;
    }

    if (value) {
      // Type validation
      if (rules.type === 'boolean' && !['true', 'false'].includes(value.toLowerCase())) {
        errors.push(`${varName} must be a boolean (true/false)`);
      }

      if (rules.type === 'number' && isNaN(Number(value))) {
        errors.push(`${varName} must be a number`);
      }

      // Value validation
      if (rules.values && !rules.values.includes(value)) {
        errors.push(`${varName} must be one of: ${rules.values.join(', ')}`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get typed and validated environment configuration
 * @param {string} rootDir Root directory
 * @param {string} environment Environment name
 * @returns {Object} Environment configuration
 */
function getEnvironmentConfig(rootDir, environment) {
  const env = loadEnvironment(rootDir, environment);
  const validation = validateEnvironment(env, environment);

  if (!validation.isValid) {
    console.error('Environment validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }

  if (validation.warnings.length > 0) {
    console.warn('Environment warnings:');
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  // Type conversion
  const config = { ...env };

  // Convert boolean strings
  Object.entries(config).forEach(([key, value]) => {
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') config[key] = true;
      else if (value.toLowerCase() === 'false') config[key] = false;
      else if (!isNaN(Number(value)) && value.trim() !== '') {
        config[key] = Number(value);
      }
    }
  });

  return config;
}

/**
 * Create environment-specific configuration for packages
 * @param {string} packageName Package name
 * @param {Object} env Environment variables
 * @returns {Object} Package-specific configuration
 */
function createPackageConfig(packageName, env) {
  const baseConfig = {
    NODE_ENV: env.NODE_ENV,
    DEBUG: env.DEBUG,
    LOG_LEVEL: env.LOG_LEVEL,
  };

  // Package-specific configurations
  const packageConfigs = {
    'web-app': {
      ...baseConfig,
      FIREBASE_CONFIG: {
        apiKey: env.FIREBASE_API_KEY,
        authDomain: env.FIREBASE_AUTH_DOMAIN,
        projectId: env.FIREBASE_PROJECT_ID,
        storageBucket: env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
        appId: env.FIREBASE_APP_ID,
      },
      API_BASE_URL: env.API_BASE_URL,
    },
    'mobile-app': {
      ...baseConfig,
      FIREBASE_CONFIG: {
        apiKey: env.FIREBASE_API_KEY,
        authDomain: env.FIREBASE_AUTH_DOMAIN,
        projectId: env.FIREBASE_PROJECT_ID,
        storageBucket: env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
        appId: env.FIREBASE_APP_ID,
      },
    },
    'browser-extension': {
      ...baseConfig,
      FIREBASE_CONFIG: {
        apiKey: env.FIREBASE_API_KEY,
        projectId: env.FIREBASE_PROJECT_ID,
      },
    },
    functions: {
      ...baseConfig,
      FIREBASE_PROJECT_ID: env.FIREBASE_PROJECT_ID,
      ENCRYPTION_KEY: env.ENCRYPTION_KEY,
    },
  };

  return packageConfigs[packageName] || baseConfig;
}

module.exports = {
  loadEnvironment,
  validateEnvironment,
  getEnvironmentConfig,
  createPackageConfig,
  DEFAULT_ENV,
  REQUIRED_ENV_VARS,
  ENV_VALIDATION_RULES,
};
