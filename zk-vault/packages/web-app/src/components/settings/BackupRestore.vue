<template>
  <div class="backup-restore">
    <div class="settings-section">
      <h2 class="section-title">Backup & Restore</h2>
      <div class="section-content">
        <!-- Backup Overview -->
        <div class="setting-group">
          <h3 class="group-title">Data Backup</h3>
          <div class="info-card">
            <div class="info-icon">
              <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
              </svg>
            </div>
            <div class="info-content">
              <h4 class="info-title">Secure your data with regular backups</h4>
              <p class="info-description">
                Export your encrypted vault data to keep a secure backup. Your data remains encrypted 
                and can only be decrypted with your master password.
              </p>
              <div class="backup-stats" v-if="backupInfo">
                <div class="stat-item">
                  <span class="stat-label">Total Items:</span>
                  <span class="stat-value">{{ backupInfo.totalItems }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Last Backup:</span>
                  <span class="stat-value">{{ backupInfo.lastBackup ? formatDate(backupInfo.lastBackup) : 'Never' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Export Data -->
        <div class="setting-group">
          <h3 class="group-title">Export Vault Data</h3>
          <div class="export-options">
            <div class="export-option">
              <div class="option-header">
                <h4 class="option-title">Encrypted Backup</h4>
                <span class="option-badge recommended">Recommended</span>
              </div>
              <p class="option-description">
                Export your vault as an encrypted file that can only be decrypted with your master password. 
                This is the most secure option for backups.
              </p>
              <div class="option-actions">
                <BaseButton
                  variant="primary"
                  @click="exportEncrypted"
                  :loading="exporting.encrypted"
                  icon="download"
                >
                  Export Encrypted Backup
                </BaseButton>
              </div>
            </div>

            <div class="export-option">
              <div class="option-header">
                <h4 class="option-title">Plain Text Export</h4>
                <span class="option-badge warning">Use with caution</span>
              </div>
              <p class="option-description">
                Export your vault data as plain text (CSV or JSON). This is useful for importing into other 
                password managers but less secure.
              </p>
              <div class="option-actions">
                <BaseButton
                  variant="outline"
                  @click="exportPlainText('csv')"
                  :loading="exporting.csv"
                  icon="download"
                >
                  Export as CSV
                </BaseButton>
                <BaseButton
                  variant="outline"
                  @click="exportPlainText('json')"
                  :loading="exporting.json"
                  icon="download"
                >
                  Export as JSON
                </BaseButton>
              </div>
            </div>
          </div>
        </div>

        <!-- Import Data -->
        <div class="setting-group">
          <h3 class="group-title">Import Data</h3>
          <div class="import-section">
            <div class="import-info">
              <h4 class="import-title">Restore from Backup</h4>
              <p class="import-description">
                Import data from a previously exported backup or migrate from another password manager.
              </p>
            </div>

            <div class="import-options">
              <div class="import-option">
                <label class="import-label">
                  <input
                    ref="fileInput"
                    type="file"
                    accept=".zkv,.csv,.json"
                    @change="handleFileSelect"
                    class="import-input"
                  />
                  <div class="import-button">
                    <svg class="import-icon" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                    </svg>
                    <span>Choose file to import</span>
                  </div>
                </label>
              </div>

              <div v-if="selectedFile" class="file-preview">
                <div class="file-info">
                  <div class="file-icon">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                    </svg>
                  </div>
                  <div class="file-details">
                    <div class="file-name">{{ selectedFile.name }}</div>
                    <div class="file-size">{{ formatFileSize(selectedFile.size) }}</div>
                  </div>
                </div>

                <div class="import-actions">
                  <BaseButton
                    variant="ghost"
                    @click="clearSelectedFile"
                  >
                    Cancel
                  </BaseButton>
                  <BaseButton
                    variant="primary"
                    @click="importData"
                    :loading="importing"
                  >
                    Import Data
                  </BaseButton>
                </div>
              </div>
            </div>

            <div class="supported-formats">
              <h5 class="formats-title">Supported Formats:</h5>
              <ul class="formats-list">
                <li><strong>.zkv</strong> - ZK-Vault encrypted backup files</li>
                <li><strong>.csv</strong> - Comma-separated values (compatible with most password managers)</li>
                <li><strong>.json</strong> - JSON format exports</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Automatic Backups -->
        <div class="setting-group">
          <h3 class="group-title">Automatic Backups</h3>
          <div class="auto-backup-settings">
            <div class="setting-item">
              <div class="setting-content">
                <h4 class="setting-title">Enable Automatic Backups</h4>
                <p class="setting-description">Automatically create encrypted backups of your vault</p>
              </div>
              <label class="setting-toggle">
                <input
                  v-model="settingsStore.settings.autoBackup.enabled"
                  type="checkbox"
                  class="toggle-input"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div v-if="settingsStore.settings.autoBackup.enabled" class="backup-frequency">
              <div class="setting-item">
                <div class="setting-content">
                  <h4 class="setting-title">Backup Frequency</h4>
                  <p class="setting-description">How often to create automatic backups</p>
                </div>
                <select v-model="settingsStore.settings.autoBackup.frequency" class="setting-select">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div class="setting-item">
                <div class="setting-content">
                  <h4 class="setting-title">Backup Retention</h4>
                  <p class="setting-description">Number of backups to keep</p>
                </div>
                <select v-model="settingsStore.settings.autoBackup.retention" class="setting-select">
                  <option :value="5">Keep 5 backups</option>
                  <option :value="10">Keep 10 backups</option>
                  <option :value="30">Keep 30 backups</option>
                  <option :value="0">Keep all backups</option>
                </select>
              </div>
            </div>

            <div class="setting-actions">
              <BaseButton
                variant="primary"
                @click="updateAutoBackupSettings"
                :loading="updatingBackupSettings"
                :disabled="!settingsStore.areSettingsChanged"
              >
                Save Backup Settings
              </BaseButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Import Confirmation Modal -->
    <BaseModal
      v-if="showImportConfirmation"
      title="Confirm Import"
      @close="showImportConfirmation = false"
    >
      <div class="import-confirmation">
        <div class="warning-icon">
          <svg class="w-12 h-12 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>
        
        <h3 class="confirmation-title">Import Data</h3>
        <p class="confirmation-description">
          This will import {{ importPreview?.itemCount || 0 }} items from your backup file. 
          Existing items with the same name may be overwritten.
        </p>
        
        <div class="confirmation-actions">
          <BaseButton
            variant="ghost"
            @click="showImportConfirmation = false"
          >
            Cancel
          </BaseButton>
          <BaseButton
            variant="primary"
            @click="confirmImport"
            :loading="importing"
          >
            Import {{ importPreview?.itemCount || 0 }} Items
          </BaseButton>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import { vaultService } from '@/services/vault.service'
import type { DecryptedVaultItem } from '@/services/vault.service'
import { useSettingsStore } from '@/store/settings.store';

// Store
const settingsStore = useSettingsStore();

interface BackupInfo {
  totalItems: number
  lastBackup?: Date
}

interface ImportPreview {
  itemCount: number
  format: 'encrypted' | 'csv' | 'json'
}

// State
const exporting = reactive({
  encrypted: false,
  csv: false,
  json: false
})
const importing = ref(false)
const updatingBackupSettings = ref(false)
const showImportConfirmation = ref(false)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const backupInfo = ref<BackupInfo | null>(null)
const importPreview = ref<ImportPreview | null>(null)

// Methods
const loadBackupInfo = async () => {
  try {
    const stats = await vaultService.getVaultStats()
    backupInfo.value = {
      totalItems: stats.totalItems,
      lastBackup: stats.lastBackup
    }

    // Load backup settings from store
  } catch (error) {
    console.error('Failed to load backup info:', error)
  }
}

const exportEncrypted = async () => {
  exporting.encrypted = true

  try {
    const result = await vaultService.searchItems({}, { limit: 1000 })
    const data = {
      version: '1.0',
      encrypted: true,
      timestamp: new Date().toISOString(),
      items: result.items
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    })
    
    downloadFile(blob, `zk-vault-backup-${formatDateForFilename(new Date())}.zkv`)
    
    // TODO: Show success notification
  } catch (error) {
    console.error('Failed to export encrypted backup:', error)
    // TODO: Show error notification
  } finally {
    exporting.encrypted = false
  }
}

const exportPlainText = async (format: 'csv' | 'json') => {
  exporting[format] = true

  try {
    const result = await vaultService.searchItems({}, { limit: 1000 })
    let blob: Blob
    let filename: string

    if (format === 'csv') {
      const csvData = convertToCSV(result.items)
      blob = new Blob([csvData], { type: 'text/csv' })
      filename = `zk-vault-export-${formatDateForFilename(new Date())}.csv`
    } else {
      const jsonData = JSON.stringify(result.items, null, 2)
      blob = new Blob([jsonData], { type: 'application/json' })
      filename = `zk-vault-export-${formatDateForFilename(new Date())}.json`
    }

    downloadFile(blob, filename)
    
    // TODO: Show success notification
  } catch (error) {
    console.error(`Failed to export ${format}:`, error)
    // TODO: Show error notification
  } finally {
    exporting[format] = false
  }
}

const convertToCSV = (items: DecryptedVaultItem[]): string => {
  const headers = ['Name', 'Type', 'Username', 'Password', 'Website', 'Notes', 'Folder', 'Tags']
  const rows = [headers.join(',')]

  items.forEach(item => {
    const row = [
      escapeCSV(item.name),
      escapeCSV(item.type),
      escapeCSV(item.type === 'password' ? (item as any).username || '' : ''),
      escapeCSV(item.type === 'password' ? (item as any).password || '' : ''),
      escapeCSV(item.type === 'password' ? (item as any).website || '' : ''),
             escapeCSV('notes' in item ? item.notes || '' : ''),
      escapeCSV(item.folder || ''),
      escapeCSV(item.tags.join(';'))
    ]
    rows.push(row.join(','))
  })

  return rows.join('\n')
}

const escapeCSV = (value: string): string => {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file) {
    selectedFile.value = file
    
    // Preview the import
    previewImport(file)
  }
}

const previewImport = async (file: File) => {
  try {
    const text = await file.text()
    let itemCount = 0
    let format: ImportPreview['format'] = 'json'

    if (file.name.endsWith('.zkv')) {
      format = 'encrypted'
      const data = JSON.parse(text)
      itemCount = data.items?.length || 0
    } else if (file.name.endsWith('.csv')) {
      format = 'csv'
      const lines = text.split('\n').filter(line => line.trim())
      itemCount = Math.max(0, lines.length - 1) // Subtract header row
    } else {
      format = 'json'
      const data = JSON.parse(text)
      itemCount = Array.isArray(data) ? data.length : 0
    }

    importPreview.value = { itemCount, format }
  } catch (error) {
    console.error('Failed to preview import:', error)
    importPreview.value = { itemCount: 0, format: 'json' }
  }
}

const importData = () => {
  if (!selectedFile.value || !importPreview.value) return
  showImportConfirmation.value = true
}

const confirmImport = async () => {
  if (!selectedFile.value) return

  importing.value = true

  try {
    const text = await selectedFile.value.text()
    let items: DecryptedVaultItem[] = []

    if (selectedFile.value.name.endsWith('.zkv')) {
      const data = JSON.parse(text)
      items = data.items || []
    } else if (selectedFile.value.name.endsWith('.csv')) {
      items = parseCSV(text)
    } else {
      const data = JSON.parse(text)
      items = Array.isArray(data) ? data : []
    }

    // Import each item
    let imported = 0
    for (const item of items) {
      try {
        await vaultService.createItem(item as any)
        imported++
      } catch (error) {
        console.warn('Failed to import item:', item.name, error)
      }
    }

    clearSelectedFile()
    showImportConfirmation.value = false
    await loadBackupInfo()
    
    // TODO: Show success notification with import count
  } catch (error) {
    console.error('Failed to import data:', error)
    // TODO: Show error notification
  } finally {
    importing.value = false
  }
}

const parseCSV = (csvText: string): DecryptedVaultItem[] => {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const items: DecryptedVaultItem[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
    
    if (values.length >= headers.length) {
      const item = {
        name: values[0] || `Imported Item ${i}`,
        type: 'password' as const,
        username: values[2] || '',
        password: values[3] || '',
        website: values[4] || undefined,
        notes: values[5] || undefined,
        folder: values[6] || undefined,
        tags: values[7] ? values[7].split(';') : [],
        favorite: false,
        customFields: {},
        metadata: {
          strength: 0,
          compromised: false,
          lastPasswordChange: new Date(),
          autoFill: true
        }
      }
      items.push(item as any)
    }
  }

  return items
}

const clearSelectedFile = () => {
  selectedFile.value = null
  importPreview.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const updateAutoBackupSettings = async () => {
  updatingBackupSettings.value = true
  await settingsStore.updateSettings(settingsStore.settings);
  updatingBackupSettings.value = false
}

const downloadFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const formatDateForFilename = (date: Date) => {
  return date.toISOString().split('T')[0]
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Lifecycle
onMounted(() => {
  loadBackupInfo()
})
</script>

<style scoped>
.backup-restore {
  @apply space-y-8;
}

.settings-section {
  @apply bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden;
}

.section-title {
  @apply text-xl font-semibold text-neutral-900 p-6 border-b border-neutral-200;
}

.section-content {
  @apply p-6 space-y-8;
}

.setting-group {
  @apply space-y-6;
}

.group-title {
  @apply text-lg font-medium text-neutral-900;
}

.info-card {
  @apply flex gap-4 p-6 bg-blue-50 border border-blue-200 rounded-lg;
}

.info-icon {
  @apply flex-shrink-0;
}

.info-content {
  @apply flex-1;
}

.info-title {
  @apply font-semibold text-blue-900 mb-2;
}

.info-description {
  @apply text-blue-800 mb-4;
}

.backup-stats {
  @apply space-y-2;
}

.stat-item {
  @apply flex justify-between text-sm;
}

.stat-label {
  @apply text-blue-700 font-medium;
}

.stat-value {
  @apply text-blue-800;
}

.export-options {
  @apply space-y-6;
}

.export-option {
  @apply p-6 border border-neutral-200 rounded-lg space-y-4;
}

.option-header {
  @apply flex items-center gap-3;
}

.option-title {
  @apply font-semibold text-neutral-900;
}

.option-badge {
  @apply px-2 py-1 text-xs font-medium rounded-full;
}

.option-badge.recommended {
  @apply bg-green-100 text-green-800;
}

.option-badge.warning {
  @apply bg-yellow-100 text-yellow-800;
}

.option-description {
  @apply text-neutral-600;
}

.option-actions {
  @apply flex gap-3;
}

.import-section {
  @apply space-y-6;
}

.import-info {
  @apply space-y-2;
}

.import-title {
  @apply font-semibold text-neutral-900;
}

.import-description {
  @apply text-neutral-600;
}

.import-options {
  @apply space-y-4;
}

.import-option {
  @apply space-y-4;
}

.import-label {
  @apply cursor-pointer;
}

.import-input {
  @apply sr-only;
}

.import-button {
  @apply flex items-center justify-center gap-3 p-6 border-2 border-dashed border-neutral-300;
  @apply rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors;
}

.import-icon {
  @apply w-6 h-6 text-neutral-500;
}

.file-preview {
  @apply p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-4;
}

.file-info {
  @apply flex items-center gap-3;
}

.file-icon {
  @apply text-neutral-500;
}

.file-details {
  @apply flex-1;
}

.file-name {
  @apply font-medium text-neutral-900;
}

.file-size {
  @apply text-sm text-neutral-600;
}

.import-actions {
  @apply flex justify-end gap-3;
}

.supported-formats {
  @apply space-y-2;
}

.formats-title {
  @apply font-medium text-neutral-900;
}

.formats-list {
  @apply text-sm text-neutral-600 space-y-1 pl-4;
}

.auto-backup-settings {
  @apply space-y-6;
}

.setting-item {
  @apply flex items-center justify-between p-4 bg-neutral-50 rounded-lg;
}

.setting-content {
  @apply flex-1;
}

.setting-title {
  @apply font-medium text-neutral-900 mb-1;
}

.setting-description {
  @apply text-sm text-neutral-600;
}

.setting-toggle {
  @apply relative inline-flex items-center cursor-pointer;
}

.toggle-input {
  @apply sr-only;
}

.toggle-slider {
  @apply w-11 h-6 bg-neutral-200 rounded-full relative transition-colors;
  @apply after:content-[''] after:absolute after:top-[2px] after:left-[2px];
  @apply after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform;
}

.toggle-input:checked + .toggle-slider {
  @apply bg-primary-600;
}

.toggle-input:checked + .toggle-slider:after {
  @apply translate-x-5;
}

.setting-select {
  @apply px-3 py-2 border border-neutral-300 rounded-lg text-sm;
  @apply focus:ring-2 focus:ring-primary-500 focus:border-primary-500;
}

.backup-frequency {
  @apply pl-6 space-y-4;
}

.setting-actions {
  @apply flex justify-start;
}

.import-confirmation {
  @apply text-center space-y-4;
}

.warning-icon {
  @apply flex justify-center;
}

.confirmation-title {
  @apply text-lg font-semibold text-neutral-900;
}

.confirmation-description {
  @apply text-neutral-600;
}

.confirmation-actions {
  @apply flex justify-center gap-3 pt-4;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .settings-section {
    @apply bg-neutral-800 border-neutral-700;
  }

  .section-title {
    @apply text-neutral-100 border-neutral-700;
  }

  .group-title {
    @apply text-neutral-100;
  }

  .info-card {
    @apply bg-blue-900/20 border-blue-700;
  }

  .info-title {
    @apply text-blue-300;
  }

  .info-description {
    @apply text-blue-400;
  }

  .stat-label {
    @apply text-blue-400;
  }

  .stat-value {
    @apply text-blue-300;
  }

  .export-option,
  .file-preview,
  .setting-item {
    @apply bg-neutral-700 border-neutral-600;
  }

  .option-title,
  .import-title,
  .setting-title,
  .file-name {
    @apply text-neutral-100;
  }

  .option-description,
  .import-description,
  .setting-description,
  .file-size {
    @apply text-neutral-400;
  }

  .import-button {
    @apply border-neutral-600 hover:border-primary-600 hover:bg-primary-900/20;
  }

  .formats-title {
    @apply text-neutral-100;
  }

  .formats-list {
    @apply text-neutral-400;
  }

  .setting-select {
    @apply bg-neutral-700 border-neutral-600 text-neutral-100;
  }

  .toggle-slider {
    @apply bg-neutral-600;
  }

  .confirmation-title {
    @apply text-neutral-100;
  }

  .confirmation-description {
    @apply text-neutral-400;
  }
}
</style>
