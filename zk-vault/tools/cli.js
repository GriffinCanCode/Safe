#!/usr/bin/env node

const { program } = require("commander");
const {
  setupPackageConfig,
  setupAllPackagesConfig,
} = require("./scripts/setup-package-config");
const { PACKAGES } = require("./config/paths.config");
const { getEnvironmentConfig } = require("./config/env.config");
const packageJson = require("../package.json");

/**
 * ZK-Vault Configuration CLI
 * A simple command-line interface for managing configurations across the monorepo
 */

program
  .name("zk-vault-config")
  .description("ZK-Vault Configuration Management CLI")
  .version(packageJson.version);

// Setup configuration command
program
  .command("setup")
  .description("Set up configuration files for packages")
  .argument(
    "[package]",
    'Package name to configure (or "all" for all packages)',
    "all",
  )
  .option("-f, --force", "Overwrite existing configuration files", false)
  .option(
    "-c, --configs <configs>",
    "Comma-separated list of configs to create",
    "all",
  )
  .option("-v, --verbose", "Show verbose output", false)
  .action(async (packageName, options) => {
    const { force, configs, verbose } = options;

    if (verbose) {
      console.log("Setup options:", { packageName, force, configs });
    }

    try {
      const configList = configs === "all" ? ["all"] : configs.split(",");

      if (packageName === "all") {
        await setupAllPackagesConfig({ force, configs: configList });
      } else if (PACKAGES[packageName]) {
        await setupPackageConfig(packageName, { force, configs: configList });
      } else {
        console.error(`❌ Unknown package: ${packageName}`);
        console.log(`Available packages: ${Object.keys(PACKAGES).join(", ")}`);
        process.exit(1);
      }

      console.log("✅ Configuration setup completed successfully!");
    } catch (error) {
      console.error("❌ Error setting up configuration:", error.message);
      if (verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// List packages command
program
  .command("list")
  .description("List all available packages")
  .option("-v, --verbose", "Show detailed package information", false)
  .action((options) => {
    const { verbose } = options;

    console.log("📦 Available packages:\n");

    Object.keys(PACKAGES).forEach((packageName) => {
      if (verbose) {
        const packagePath = PACKAGES[packageName];
        console.log(`  ${packageName}`);
        console.log(`    Path: ${packagePath}`);
        console.log("");
      } else {
        console.log(`  • ${packageName}`);
      }
    });

    if (!verbose) {
      console.log("\nUse --verbose for more details");
    }
  });

// Validate environment command
program
  .command("validate-env")
  .description("Validate environment configuration")
  .option("-e, --env <environment>", "Environment to validate", "development")
  .option("-p, --package <package>", "Validate for specific package")
  .action((options) => {
    const { env, package: packageName } = options;

    try {
      console.log(`🔍 Validating environment configuration for ${env}...`);

      const config = getEnvironmentConfig(process.cwd(), env);

      console.log("✅ Environment validation passed!");
      console.log(`Environment: ${env}`);
      console.log(`Node Environment: ${config.NODE_ENV}`);
      console.log(`Debug Mode: ${config.DEBUG}`);

      if (packageName && PACKAGES[packageName]) {
        console.log(`Package: ${packageName}`);
        // Additional package-specific validation could go here
      }
    } catch (error) {
      console.error("❌ Environment validation failed:", error.message);
      process.exit(1);
    }
  });

// Check configuration command
program
  .command("check")
  .description("Check configuration status for packages")
  .argument(
    "[package]",
    'Package name to check (or "all" for all packages)',
    "all",
  )
  .option("-v, --verbose", "Show detailed information", false)
  .action((packageName, options) => {
    const { verbose } = options;

    const packagesToCheck =
      packageName === "all" ? Object.keys(PACKAGES) : [packageName];

    console.log("🔍 Checking configuration status...\n");

    packagesToCheck.forEach((pkg) => {
      if (!PACKAGES[pkg]) {
        console.log(`❌ Unknown package: ${pkg}`);
        return;
      }

      const packagePath = PACKAGES[pkg];
      const fs = require("fs");
      const path = require("path");

      console.log(`📦 ${pkg}:`);

      // Check if package uses ES modules
      const packageJsonPath = path.resolve(packagePath, "package.json");
      let isESModule = false;

      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(
            fs.readFileSync(packageJsonPath, "utf8"),
          );
          isESModule = packageJson.type === "module";
        } catch (error) {
          // Ignore parsing errors
        }
      }

      const configFiles = [
        isESModule ? ".eslintrc.cjs" : ".eslintrc.js",
        isESModule ? ".prettierrc.cjs" : ".prettierrc.js",
        "jest.config.js",
        "tsconfig.json",
        "package.json",
      ];

      configFiles.forEach((file) => {
        const filePath = path.resolve(packagePath, file);
        const exists = fs.existsSync(filePath);
        const status = exists ? "✅" : "❌";
        console.log(`  ${status} ${file}`);

        if (verbose && exists) {
          const stats = fs.statSync(filePath);
          console.log(`      Modified: ${stats.mtime.toISOString()}`);
        }
      });

      console.log("");
    });
  });

// Clean command
program
  .command("clean")
  .description("Clean generated files and caches")
  .argument(
    "[package]",
    'Package name to clean (or "all" for all packages)',
    "all",
  )
  .option("--dist", "Clean distribution files", false)
  .option("--coverage", "Clean coverage reports", false)
  .option("--cache", "Clean various caches", false)
  .option("--all", "Clean everything", false)
  .action((packageName, options) => {
    const { dist, coverage, cache, all } = options;
    const fs = require("fs");
    const path = require("path");

    const packagesToClean =
      packageName === "all" ? Object.keys(PACKAGES) : [packageName];

    console.log("🧹 Cleaning files...\n");

    packagesToClean.forEach((pkg) => {
      if (!PACKAGES[pkg]) {
        console.log(`❌ Unknown package: ${pkg}`);
        return;
      }

      const packagePath = PACKAGES[pkg];
      console.log(`📦 Cleaning ${pkg}...`);

      const dirsToClean = [];

      if (dist || all) dirsToClean.push("dist", "build");
      if (coverage || all) dirsToClean.push("coverage");
      if (cache || all) dirsToClean.push(".eslintcache", "node_modules/.cache");

      dirsToClean.forEach((dir) => {
        const dirPath = path.resolve(packagePath, dir);
        if (fs.existsSync(dirPath)) {
          fs.rmSync(dirPath, { recursive: true, force: true });
          console.log(`  ✅ Removed ${dir}`);
        }
      });
    });

    console.log("\n✅ Cleaning completed!");
  });

// Generate command
program
  .command("generate")
  .alias("g")
  .description("Generate components, services, or other code templates")
  .argument("<type>", "Type of template to generate (component, service, test)")
  .argument("<package>", "Package name where template should be created")
  .argument("<name>", "Name of the item to generate")
  .option("--props <props>", "Component props in format: name:type:default", "")
  .option("--no-test", "Skip test file generation")
  .option("--no-story", "Skip story file generation")
  .option("--dir <path>", "Custom output directory")
  .action((type, packageName, name, options) => {
    try {
      const { generateComponent } = require("./generators/component.generator");

      if (type === "component") {
        const props = options.props
          ? options.props.split(",").map((prop) => {
              const [propName, propType = "string", defaultValue] =
                prop.split(":");
              return { name: propName, type: propType, default: defaultValue };
            })
          : [];

        generateComponent(packageName, name, {
          props,
          withTest: options.test !== false,
          withStory: options.story !== false,
          outputDir: options.dir || "src/components",
        });
      } else {
        console.error(`❌ Unknown template type: ${type}`);
        console.log("Available types: component");
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Error generating template:", error.message);
      process.exit(1);
    }
  });

// Init command - generates essential configs only
program
  .command("init")
  .description("Initialize clean, essential configurations for all packages")
  .option("--minimal", "Generate only the most essential configs", false)
  .option("--clean", "Remove redundant configuration files", false)
  .action(async (options) => {
    try {
      const {
        setupMinimalConfig,
        cleanRedundantConfigs,
      } = require("./scripts/minimal-setup");

      console.log("🚀 Initializing clean ZK-Vault configurations...\n");

      if (options.clean) {
        console.log("🧹 Cleaning redundant configuration files...");
        await cleanRedundantConfigs();
      }

      console.log("⚙️  Setting up essential configurations...");
      await setupMinimalConfig(options.minimal);

      console.log(`
✅ Clean configuration initialization complete!

📁 What was created:
   • Essential configs in tools/config/ (shared logic)
   • Minimal package configs (just extend base configs)
   • Modern tooling setup (Vite, Vitest, Tailwind)

🎯 No architecture pollution:
   • Packages only have small config files that reference tools/
   • All logic stays centralized in tools/config/
   • Easy to maintain and update

🚀 Ready to use:
   • npm run dev           (in any package)
   • npm run config generate component web-app MyComponent
   • npm run build:analyze (bundle analysis)
`);
    } catch (error) {
      console.error("❌ Error during initialization:", error.message);
      process.exit(1);
    }
  });

// Dev utilities command
program
  .command("dev")
  .description("Development utilities and tools")
  .option("--init", "Initialize development environment")
  .option("--vscode", "Generate VS Code configuration")
  .option("--ci", "Generate CI/CD configuration")
  .option("--analyze [package]", "Run bundle analysis")
  .action((options) => {
    try {
      const {
        createVSCodeConfig,
        createGitHubActions,
        generateDevScripts,
      } = require("./config/dev-utils.config");

      if (options.init) {
        console.log("🚀 Initializing development environment...");
        createVSCodeConfig(process.cwd());
        createGitHubActions(process.cwd());
        console.log("✅ Development environment initialized!");
      }

      if (options.vscode) {
        createVSCodeConfig(process.cwd());
        console.log("✅ VS Code configuration created!");
      }

      if (options.ci) {
        createGitHubActions(process.cwd());
        console.log("✅ CI/CD configuration created!");
      }

      if (options.analyze) {
        const packageName = options.analyze === true ? "all" : options.analyze;
        console.log(`🔍 Running bundle analysis for ${packageName}...`);
        // Would run bundle analysis here
        console.log("Run 'npm run build:analyze' in the package directory");
      }

      if (!Object.keys(options).some((key) => options[key])) {
        console.log(`
🛠️  Development Utilities

Commands:
  --init      Initialize complete development environment
  --vscode    Generate VS Code configuration
  --ci        Generate GitHub Actions workflows
  --analyze   Run bundle analysis

Examples:
  npm run config dev --init
  npm run config dev --vscode
  npm run config dev --analyze web-app
`);
      }
    } catch (error) {
      console.error("❌ Error running dev utilities:", error.message);
      process.exit(1);
    }
  });

// Info command
program
  .command("info")
  .description("Show information about the configuration setup")
  .action(() => {
    console.log(`
📋 ZK-Vault Configuration Info

🏗️  Project Structure:
   • Monorepo with ${Object.keys(PACKAGES).length} packages
   • Lerna for workspace management
   • Shared configurations in tools/config/

🔧 Available Configurations:
   • ESLint (code linting)
   • Prettier (code formatting)
   • Stylelint (CSS linting)
   • Jest/Vitest (testing)
   • TypeScript (type checking)
   • Webpack/Vite (bundling)
   • Commitlint (commit message validation)

📦 Packages:
${Object.keys(PACKAGES)
  .map((pkg) => `   • ${pkg}`)
  .join("\n")}

🚀 Quick Commands:
   • npm run config setup all       - Set up all packages
   • npm run config generate component web-app Button
   • npm run config dev --init      - Initialize dev environment
   • npm run lint:fix               - Lint and fix all packages
   • npm run lint:css:fix           - Lint and fix CSS files
   • npm run test:coverage          - Run tests with coverage
   • npm run validate               - Run full validation

For more detailed information, see: tools/config/README.md
`);
  });

// Parse CLI arguments
program.parse();

// If no command is provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
