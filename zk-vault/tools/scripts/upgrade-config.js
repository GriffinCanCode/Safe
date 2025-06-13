#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { PACKAGES } = require("../config/paths.config");

/**
 * Configuration Upgrade Script
 * Helps implement new configurations and fix existing issues
 */

const UPGRADE_TASKS = {
  // Fix Vue/Vite configuration mismatch
  "fix-vue-config": {
    name: "Fix Vue/Vite Configuration",
    description: "Update web-app to use proper Vite configs instead of Webpack",
    packages: ["web-app"],
    async execute(packageName) {
      const packageDir = PACKAGES[packageName];

      // Create Vite config
      const viteConfig = `import { createViteConfig } from '../../tools/config/vite.config.js';

export default createViteConfig({
  rootDir: __dirname,
  alias: {
    '@components': './src/components',
    '@pages': './src/pages',
    '@hooks': './src/hooks',
    '@utils': './src/utils',
    '@services': './src/services',
    '@types': './src/types',
    '@assets': './src/assets',
  },
});`;

      fs.writeFileSync(path.resolve(packageDir, "vite.config.ts"), viteConfig);

      // Create Vitest config
      const vitestConfig = `import { createVitestConfig } from '../../tools/config/vitest.config.js';

export default createVitestConfig({
  rootDir: __dirname,
  packageName: 'web-app',
});`;

      fs.writeFileSync(
        path.resolve(packageDir, "vitest.config.ts"),
        vitestConfig,
      );

      // Create Vitest setup
      const vitestSetup = `import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Vue Router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
  }),
  useRoute: () => ({
    params: {},
    query: {},
    path: '/',
  }),
}));

// Mock Pinia
vi.mock('pinia', () => ({
  createPinia: vi.fn(),
  defineStore: vi.fn(),
}));

// Global test utils
global.testUtils = {
  // Add common test utilities here
};`;

      fs.writeFileSync(
        path.resolve(packageDir, "vitest.setup.ts"),
        vitestSetup,
      );

      console.log(`✓ Updated ${packageName} to use Vite/Vitest`);
    },
  },

  // Add Tailwind configuration
  "setup-tailwind": {
    name: "Setup Tailwind Configuration",
    description: "Create proper Tailwind config for packages that need it",
    packages: ["web-app", "browser-extension"],
    async execute(packageName) {
      const packageDir = PACKAGES[packageName];

      const tailwindConfig = `const { createTailwindConfig } = require('../../tools/config/tailwind.config.js');

module.exports = createTailwindConfig({
  packagePath: __dirname,
  content: [
    // Add any additional content paths specific to this package
  ],
  theme: {
    // Package-specific theme overrides
  },
});`;

      fs.writeFileSync(
        path.resolve(packageDir, "tailwind.config.js"),
        tailwindConfig,
      );

      console.log(`✓ Created Tailwind config for ${packageName}`);
    },
  },

  // Update package.json scripts
  "update-scripts": {
    name: "Update Package Scripts",
    description: "Add new development and quality scripts",
    packages: Object.keys(PACKAGES),
    async execute(packageName) {
      const packageDir = PACKAGES[packageName];
      const packageJsonPath = path.resolve(packageDir, "package.json");

      if (!fs.existsSync(packageJsonPath)) {
        console.log(`⚠️  No package.json found for ${packageName}`);
        return;
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      const { generateDevScripts } = require("../config/dev-utils.config");

      const newScripts = generateDevScripts(packageName);

      // Merge scripts without overwriting existing ones
      packageJson.scripts = {
        ...packageJson.scripts,
        ...Object.fromEntries(
          Object.entries(newScripts).filter(
            ([key]) => !packageJson.scripts[key],
          ),
        ),
      };

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log(`✓ Updated scripts for ${packageName}`);
    },
  },

  // Setup development environment
  "setup-dev-env": {
    name: "Setup Development Environment",
    description: "Initialize VS Code config, CI/CD, and other dev tools",
    packages: ["root"],
    async execute() {
      const {
        createVSCodeConfig,
        createGitHubActions,
      } = require("../config/dev-utils.config");

      // Create VS Code config
      createVSCodeConfig(path.resolve(__dirname, "../.."));
      console.log("✓ Created VS Code configuration");

      // Create GitHub Actions
      createGitHubActions(path.resolve(__dirname, "../.."));
      console.log("✓ Created GitHub Actions workflows");
    },
  },

  // Install missing dependencies
  "install-deps": {
    name: "Install Missing Dependencies",
    description: "Install new dependencies needed for the upgraded configs",
    packages: ["root"],
    async execute() {
      console.log("📦 Installing new dependencies...");

      const devDependencies = [
        "@tailwindcss/forms",
        "@tailwindcss/typography",
        "@tailwindcss/aspect-ratio",
        "@vue/test-utils",
        "vitest",
        "@vitest/ui",
        "rollup-plugin-visualizer",
        "webpack-bundle-analyzer",
        "cross-env",
        "npm-check-updates",
        "depcheck",
      ];

      try {
        execSync(`npm install --save-dev ${devDependencies.join(" ")}`, {
          cwd: path.resolve(__dirname, "../.."),
          stdio: "inherit",
        });
        console.log("✓ Dependencies installed successfully");
      } catch (error) {
        console.error("❌ Failed to install dependencies:", error.message);
      }
    },
  },
};

/**
 * Run upgrade tasks
 * @param {string[]} tasks Tasks to run
 * @param {Object} options Upgrade options
 */
async function runUpgrade(tasks = [], options = {}) {
  const { dryRun = false, verbose = false } = options;

  console.log("🚀 Starting configuration upgrade...\n");

  if (dryRun) {
    console.log("📋 DRY RUN - No changes will be made\n");
  }

  const tasksToRun =
    tasks.length > 0
      ? tasks.filter((task) => UPGRADE_TASKS[task])
      : Object.keys(UPGRADE_TASKS);

  for (const taskKey of tasksToRun) {
    const task = UPGRADE_TASKS[taskKey];

    console.log(`📝 ${task.name}`);
    console.log(`   ${task.description}`);

    if (task.packages.includes("root")) {
      if (!dryRun) {
        try {
          await task.execute();
        } catch (error) {
          console.error(`   ❌ Error: ${error.message}`);
        }
      } else {
        console.log("   📋 Would execute for root");
      }
    } else {
      for (const packageName of task.packages) {
        if (!PACKAGES[packageName]) {
          console.log(`   ⚠️  Unknown package: ${packageName}`);
          continue;
        }

        if (!dryRun) {
          try {
            await task.execute(packageName);
          } catch (error) {
            console.error(`   ❌ Error in ${packageName}: ${error.message}`);
          }
        } else {
          console.log(`   📋 Would execute for ${packageName}`);
        }
      }
    }

    console.log();
  }

  console.log("✅ Configuration upgrade completed!");

  if (!dryRun) {
    console.log(`
🎉 Next steps:
1. Run 'npm run config setup all' to apply base configs
2. Test your development workflow: 'npm run dev' in web-app
3. Try the new component generator: 'npm run config generate component web-app MyComponent'
4. Check the new development scripts in each package.json
5. Review VS Code settings and install recommended extensions
`);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const tasks = args.filter((arg) => !arg.startsWith("--"));
  const options = {
    dryRun: args.includes("--dry-run"),
    verbose: args.includes("--verbose"),
  };

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Configuration Upgrade Tool

Usage: node upgrade-config.js [tasks...] [options]

Available tasks:
${Object.entries(UPGRADE_TASKS)
  .map(([key, task]) => `  ${key.padEnd(20)} ${task.description}`)
  .join("\n")}

Options:
  --dry-run    Show what would be done without making changes
  --verbose    Show detailed output
  --help, -h   Show this help message

Examples:
  node upgrade-config.js                    # Run all upgrade tasks
  node upgrade-config.js fix-vue-config     # Fix only Vue configuration
  node upgrade-config.js --dry-run          # Preview changes
`);
    process.exit(0);
  }

  runUpgrade(tasks, options).catch((error) => {
    console.error("❌ Upgrade failed:", error.message);
    process.exit(1);
  });
}

module.exports = {
  runUpgrade,
  UPGRADE_TASKS,
};
