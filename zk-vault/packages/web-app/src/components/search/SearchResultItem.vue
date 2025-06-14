<template>
  <div class="search-result-item" :class="itemClasses" @click="handleSelect">
    <!-- Item Icon -->
    <div class="item-icon">
      <component :is="getItemIcon()" class="icon" />
    </div>

    <!-- Item Content -->
    <div class="item-content">
      <!-- Header -->
      <div class="item-header">
        <h3 class="item-title" v-html="highlightMatches(item.name)"></h3>
        <div class="item-actions">
          <button
            class="action-button favorite"
            :class="{ active: item.favorite }"
            @click.stop="$emit('toggleFavorite', item)"
            :title="item.favorite ? 'Remove from favorites' : 'Add to favorites'"
          >
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
            </svg>
          </button>

          <div class="action-menu" v-if="viewMode === 'list'">
            <button class="action-button" @click.stop="showActions = !showActions">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 5v.01M12 12v.01M12 19v.01"
                />
              </svg>
            </button>

            <div v-if="showActions" class="actions-dropdown" @click.stop>
              <button class="dropdown-action" @click="$emit('edit', item)">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit
              </button>
              <button class="dropdown-action" @click="handleCopy('username')">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy Username
              </button>
              <button class="dropdown-action" @click="handleCopy('password')">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 14l-1 1-1 1H7v4H3v-4l4-4.257a6 6 0 017.743-7.743z"
                  />
                </svg>
                Copy Password
              </button>
              <button class="dropdown-action delete" @click="$emit('delete', item.id)">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Item Details -->
      <div class="item-details">
        <!-- Password Item -->
        <template v-if="item.type === 'password'">
          <div class="detail-row">
            <span class="detail-label">Username:</span>
            <span class="detail-value" v-html="highlightMatches(getPasswordUsername())"></span>
          </div>
          <div class="detail-row" v-if="getPasswordUrl()">
            <span class="detail-label">URL:</span>
            <span class="detail-value" v-html="highlightMatches(getPasswordUrl())"></span>
          </div>
          <div class="detail-row" v-if="item.notes">
            <span class="detail-label">Notes:</span>
            <span class="detail-value truncate" v-html="highlightMatches(item.notes)"></span>
          </div>
        </template>

        <!-- Note Item -->
        <template v-else-if="item.type === 'note'">
          <div class="detail-row">
            <span
              class="detail-value note-content"
              v-html="highlightMatches(getNotePreview())"
            ></span>
          </div>
        </template>

        <!-- Card Item -->
        <template v-else-if="item.type === 'card'">
          <div class="detail-row">
            <span class="detail-label">Card:</span>
            <span class="detail-value">**** **** **** {{ getCardLastFour() }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Holder:</span>
            <span class="detail-value" v-html="highlightMatches(getCardHolder())"></span>
          </div>
        </template>

        <!-- Identity Item -->
        <template v-else-if="item.type === 'identity'">
          <div class="detail-row">
            <span class="detail-label">Name:</span>
            <span class="detail-value" v-html="highlightMatches(getIdentityName())"></span>
          </div>
          <div class="detail-row" v-if="getIdentityEmail()">
            <span class="detail-label">Email:</span>
            <span class="detail-value" v-html="highlightMatches(getIdentityEmail())"></span>
          </div>
        </template>
      </div>

      <!-- Item Meta -->
      <div class="item-meta">
        <div class="meta-tags" v-if="item.tags.length > 0">
          <span
            v-for="tag in item.tags.slice(0, 3)"
            :key="tag"
            class="meta-tag"
            v-html="highlightMatches(tag)"
          ></span>
          <span v-if="item.tags.length > 3" class="meta-tag-more">
            +{{ item.tags.length - 3 }} more
          </span>
        </div>

        <div class="meta-info">
          <span class="meta-folder" v-if="item.folder">
            <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            {{ item.folder }}
          </span>
          <span class="meta-date"> Modified {{ formatDate(item.updatedAt) }} </span>
        </div>
      </div>
    </div>

    <!-- Grid View Quick Actions -->
    <div v-if="viewMode === 'grid'" class="grid-actions">
      <button class="grid-action" @click.stop="$emit('edit', item)" title="Edit">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </button>
      <button class="grid-action" @click.stop="handleCopy('username')" title="Copy Username">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </button>
      <button class="grid-action" @click.stop="handleCopy('password')" title="Copy Password">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 14l-1 1-1 1H7v4H3v-4l4-4.257a6 6 0 017.743-7.743z"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { DecryptedVaultItem } from '@/services/vault.service';

interface Props {
  item: DecryptedVaultItem;
  viewMode: 'list' | 'grid';
  searchQuery?: string;
  matches?: any[];
}

const props = withDefaults(defineProps<Props>(), {
  searchQuery: '',
  matches: () => [],
});

const emit = defineEmits<{
  select: [item: DecryptedVaultItem];
  edit: [item: DecryptedVaultItem];
  delete: [itemId: string];
  copy: [data: { field: string; value: string }];
  toggleFavorite: [item: DecryptedVaultItem];
}>();

// Local state
const showActions = ref(false);

// Computed
const itemClasses = computed(() => ({
  'search-result-list': props.viewMode === 'list',
  'search-result-grid': props.viewMode === 'grid',
  'is-favorite': props.item.favorite,
}));

// Methods
const handleSelect = () => {
  emit('select', props.item);
};

const handleCopy = (field: string) => {
  let value = '';

  switch (field) {
    case 'username':
      value = getPasswordUsername();
      break;
    case 'password':
      value = getPasswordPassword();
      break;
    default:
      return;
  }

  if (value) {
    emit('copy', { field, value });
  }

  showActions.value = false;
};

const getItemIcon = () => {
  // Return inline SVG for different item types
  switch (props.item.type) {
    case 'password':
      return {
        template: `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" /></svg>`,
      };
    case 'note':
      return {
        template: `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" /></svg>`,
      };
    case 'card':
      return {
        template: `<svg fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" /></svg>`,
      };
    case 'identity':
      return {
        template: `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" /></svg>`,
      };
    default:
      return {
        template: `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd" /></svg>`,
      };
  }
};

const getPasswordUsername = (): string => {
  return (props.item as any).username || '';
};

const getPasswordPassword = (): string => {
  return (props.item as any).password || '';
};

const getPasswordUrl = (): string => {
  return (props.item as any).website || (props.item as any).url || '';
};

const getNotePreview = (): string => {
  const content = (props.item as any).content || '';
  return content.length > 100 ? content.substring(0, 100) + '...' : content;
};

const getCardLastFour = (): string => {
  const number = (props.item as any).number || '';
  return number.slice(-4);
};

const getCardHolder = (): string => {
  return (props.item as any).cardholderName || '';
};

const getIdentityName = (): string => {
  const firstName = (props.item as any).firstName || '';
  const lastName = (props.item as any).lastName || '';
  return `${firstName} ${lastName}`.trim();
};

const getIdentityEmail = (): string => {
  return (props.item as any).email || '';
};

const highlightMatches = (text: string): string => {
  if (!props.searchQuery || !text) return text;

  const query = props.searchQuery.toLowerCase();
  const textLower = text.toLowerCase();

  if (!textLower.includes(query)) return text;

  // Simple highlighting - replace matched text with highlighted version
  const regex = new RegExp(`(${escapeRegExp(props.searchQuery)})`, 'gi');
  return text.replace(regex, '<mark class="search-highlight">$1</mark>');
};

const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const formatDate = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

// Close actions menu when clicking outside
const handleClickOutside = () => {
  showActions.value = false;
};

// Add event listener for click outside
if (typeof window !== 'undefined') {
  document.addEventListener('click', handleClickOutside);
}
</script>

<!-- CSS classes are now defined in /src/styles/components/search/search-result-item.css -->
