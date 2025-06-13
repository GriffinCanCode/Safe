import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { vaultIntegration } from './services/vault-integration.service';
import { integrationStatusService } from './services/integration-status';

// Import comprehensive CSS architecture
import '@/styles/index.css';

const app = createApp(App);

// Install plugins
const pinia = createPinia();
app.use(pinia);
app.use(router);

// Initialize application services
async function initializeApp() {
  try {
    console.log('🚀 Initializing ZK-Vault Web App...');

    // Initialize vault integration service with workers
    await vaultIntegration.initialize({
      autoIndexing: true,
      searchWorker: true,
      encryptionWorker: false, // Keep disabled for security by default
      fileProcessingWorker: true,
    });

    console.log('✅ Worker services initialized successfully');

    // Check integration status in development
    if (import.meta.env.DEV) {
      await integrationStatusService.logIntegrationStatus();
      console.log('🔍 Integration status logged');
    }

    // Verify crypto package integration
    try {
      const { ZeroKnowledgeVault } = await import('@zk-vault/crypto');
      console.log('✅ Crypto package integration verified');
    } catch (error) {
      console.warn('⚠️ Crypto package not available, using fallback:', error);
    }

    // Verify shared package integration
    try {
      const sharedTypes = await import('@zk-vault/shared');
      console.log('✅ Shared package integration verified');
    } catch (error) {
      console.warn('⚠️ Shared package not available:', error);
    }

    console.log('🎉 ZK-Vault initialization complete');
  } catch (error) {
    console.error('❌ Failed to initialize application services:', error);

    // Show user-friendly error message
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #f3f4f6;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: system-ui, -apple-system, sans-serif;
        z-index: 9999;
      ">
        <div style="
          background: white;
          padding: 2rem;
          border-radius: 0.5rem;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          max-width: 400px;
          text-align: center;
        ">
          <h2 style="color: #dc2626; margin-bottom: 1rem;">Initialization Error</h2>
          <p style="color: #6b7280; margin-bottom: 1.5rem;">
            Failed to initialize the application. Please refresh the page or contact support.
          </p>
          <button onclick="window.location.reload()" style="
            background: #3b82f6;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 0.25rem;
            cursor: pointer;
          ">
            Refresh Page
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(errorDiv);

    // Continue with basic app mount for debugging
  }

  // Mount the app
  app.mount('#app');
}

// Initialize the application
initializeApp();
