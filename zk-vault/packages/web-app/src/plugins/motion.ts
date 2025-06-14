/**
 * Motion Plugin
 * Configures VueUse Motion for the entire application
 */

import { MotionPlugin } from '@vueuse/motion';
import type { App } from 'vue';

export default {
  install(app: App) {
    // Register VueUse Motion with default configuration
    app.use(MotionPlugin);
  },
};
