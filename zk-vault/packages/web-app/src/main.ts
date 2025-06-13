import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { vaultIntegration } from './services/vault-integration.service';

// Import styles
import '@/styles/main.css';
import '@/styles/variables.css';
import '@/styles/components.css';
import '@/styles/utilities.css';

const app = createApp(App);

// Install plugins
app.use(createPinia());
app.use(router);

// Initialize worker services
async function initializeApp() {
  try {
    // Initialize vault integration service with workers
    await vaultIntegration.initialize({
      autoIndexing: true,
      searchWorker: true,
      encryptionWorker: false, // Keep disabled for security by default
      fileProcessingWorker: true,
      backgroundSync: true,
    });
    
    console.log('Worker services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize worker services:', error);
    // Continue without workers if initialization fails
  }

  // Mount the app
  app.mount('#app');
}

// Initialize the application
initializeApp();
