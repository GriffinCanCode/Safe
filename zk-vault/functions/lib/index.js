"use strict";
/**
 * ZK-Vault Firebase Functions
 * Main entry point for all cloud functions
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin SDK
admin.initializeApp();
// Authentication Functions
__exportStar(require("./auth/auth-functions"), exports);
__exportStar(require("./auth/session-management.functions"), exports);
__exportStar(require("./auth/user-management.functions"), exports);
__exportStar(require("./auth/srp-auth.functions"), exports);
// Vault Functions
__exportStar(require("./vault/vault-functions"), exports);
__exportStar(require("./vault/audit.functions"), exports);
__exportStar(require("./vault/sharing.functions"), exports);
__exportStar(require("./vault/vault-operations.functions"), exports);
// File Management Functions
__exportStar(require("./files/file-management.functions"), exports);
__exportStar(require("./files/chunk-processing.functions"), exports);
__exportStar(require("./files/deduplication.functions"), exports);
// Security Functions
__exportStar(require("./security/anomaly-detection.functions"), exports);
__exportStar(require("./security/breach-monitor.functions"), exports);
__exportStar(require("./security/rate-limiting.functions"), exports);
// Admin Functions
__exportStar(require("./admin/maintenance.functions"), exports);
__exportStar(require("./admin/system-health.functions"), exports);
__exportStar(require("./admin/user-analytics.functions"), exports);
// Note: All functions are exported via wildcard exports above
//# sourceMappingURL=index.js.map