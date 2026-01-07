<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { sendMessage } from '~/utils/message';
import type { CodeContext, Expert } from '~/types';

// State
const loading = ref(false);
const capturing = ref(false);
const experts = ref<Expert[]>([]);
const selectedExpert = ref<Expert | null>(null);
const currentContext = ref<CodeContext | null>(null);
const error = ref<string | null>(null);
const isAuthenticated = ref(false);

// Computed
const displayRate = (expert: Expert): string => {
  return `$${(expert.rate / 100).toFixed(0)}/hr`;
};

// API calls
async function checkAuth(): Promise<void> {
  try {
    const response = await sendMessage<{ success: boolean; token?: string }>(
      'AUTH_REQUEST',
      { action: 'getToken' }
    );
    isAuthenticated.value = response.success && !!response.token;
  } catch {
    isAuthenticated.value = false;
  }
}

async function loadExperts(): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    const response = await sendMessage<{ status: number; data: { experts: Expert[] } }>(
      'API_REQUEST',
      { url: '/api/experts', method: 'GET' }
    );

    if (response.status === 200 && response.data.experts) {
      experts.value = response.data.experts;
    } else {
      // Use mock data for development
      experts.value = getMockExperts();
    }
  } catch (e) {
    console.error('Failed to load experts:', e);
    error.value = 'Failed to load experts';
    // Use mock data for development
    experts.value = getMockExperts();
  } finally {
    loading.value = false;
  }
}

async function captureContext(): Promise<void> {
  capturing.value = true;
  error.value = null;

  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      throw new Error('No active tab found');
    }

    // Send message to content script to capture context
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_CONTEXT' });

    if (response.success) {
      currentContext.value = response;

      // Send context to backend for matching
      await sendMessage(
        'API_REQUEST',
        {
          url: '/api/sessions/request',
          method: 'POST',
          body: { context: response }
        }
      );
    }
  } catch (e) {
    console.error('Capture failed:', e);
    error.value = 'Failed to capture context';
  } finally {
    capturing.value = false;
  }
}

async function selectExpert(expert: Expert): Promise<void> {
  selectedExpert.value = expert;

  // Create session request
  if (currentContext.value) {
    try {
      await sendMessage(
        'API_REQUEST',
        {
          url: '/api/sessions/create',
          method: 'POST',
          body: {
            expertId: expert.id,
            context: currentContext.value
          }
        }
      );
    } catch (e) {
      console.error('Failed to create session:', e);
    }
  }
}

function getMockExperts(): Expert[] {
  return [
    {
      id: '1',
      name: 'Alex Chen',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
      skills: ['React', 'TypeScript', 'Node.js', 'Supabase'],
      rate: 7500, // $75/hr
      rating: 4.9,
      available: true
    },
    {
      id: '2',
      name: 'Sarah Miller',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
      skills: ['Python', 'AI', 'LLM', 'OpenAI'],
      rate: 10000, // $100/hr
      rating: 4.8,
      available: true
    },
    {
      id: '3',
      name: 'Jordan Kim',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan',
      skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform'],
      rate: 9000, // $90/hr
      rating: 4.7,
      available: false
    }
  ];
}

function resetSelection(): void {
  selectedExpert.value = null;
}

// Lifecycle
onMounted(() => {
  checkAuth();
  loadExperts();
});
</script>

<template>
  <div class="popup">
    <header class="header">
      <h1>Call an Expert</h1>
      <p class="subtitle">Get help from AI experts in 1-hour sessions</p>
    </header>

    <main class="main">
      <!-- Error state -->
      <div v-if="error" class="error">
        {{ error }}
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="loading">
        Loading experts...
      </div>

      <!-- Main content -->
      <template v-else>
        <!-- Context capture section -->
        <section class="capture-section">
          <button
            class="capture-btn"
            :disabled="capturing || !isAuthenticated"
            @click="captureContext"
          >
            {{ capturing ? 'Capturing...' : 'Capture Context' }}
          </button>

          <div v-if="currentContext" class="context-preview">
            <span class="context-icon">✓</span>
            <span>Captured from {{ currentContext.ide }}</span>
          </div>
        </section>

        <!-- Expert selection -->
        <section v-if="!selectedExpert" class="experts-section">
          <h2>Available Experts</h2>

          <div class="expert-list">
            <div
              v-for="expert in experts"
              :key="expert.id"
              class="expert-card"
              :class="{ unavailable: !expert.available }"
              @click="expert.available && selectExpert(expert)"
            >
              <img
                :src="expert.avatar"
                :alt="expert.name"
                class="expert-avatar"
              />
              <div class="expert-info">
                <h3>{{ expert.name }}</h3>
                <p class="skills">{{ expert.skills.join(', ') }}</p>
                <div class="expert-meta">
                  <span class="rating">★ {{ expert.rating }}</span>
                  <span class="rate">{{ displayRate(expert) }}</span>
                </div>
                <span v-if="!expert.available" class="unavailable-badge">
                  Busy
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- Selected expert confirmation -->
        <section v-else class="confirmation-section">
          <h2>Session Requested</h2>
          <div class="selected-expert">
            <img
              :src="selectedExpert.avatar"
              :alt="selectedExpert.name"
              class="expert-avatar large"
            />
            <h3>{{ selectedExpert.name }}</h3>
            <p>{{ displayRate(selectedExpert) }}/hr · 1 hour minimum</p>
          </div>
          <p class="confirmation-text">
            You'll be connected via video call shortly.
          </p>
          <button class="secondary-btn" @click="resetSelection">
            Choose Different Expert
          </button>
        </section>
      </template>
    </main>

    <footer class="footer">
      <a href="#" @click.prevent="$emit('openSettings')">Settings</a>
      <span>·</span>
      <a href="#" @click.prevent="$emit('openHelp')">Help</a>
    </footer>
  </div>
</template>

<style scoped>
.popup {
  width: 360px;
  min-height: 400px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #fff;
}

.header {
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  opacity: 0.9;
}

.main {
  padding: 16px;
}

.capture-section {
  margin-bottom: 20px;
}

.capture-btn {
  width: 100%;
  padding: 12px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.capture-btn:hover:not(:disabled) {
  background: #5568d3;
}

.capture-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.context-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 8px 12px;
  background: #f0fdf4;
  border-radius: 6px;
  font-size: 12px;
  color: #166534;
}

.context-icon {
  color: #22c55e;
}

.experts-section h2 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #374151;
}

.expert-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.expert-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.expert-card:hover:not(.unavailable) {
  border-color: #667eea;
  background: #f5f3ff;
}

.expert-card.unavailable {
  opacity: 0.6;
  cursor: not-allowed;
}

.expert-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #e5e7eb;
}

.expert-avatar.large {
  width: 64px;
  height: 64px;
}

.expert-info {
  flex: 1;
  min-width: 0;
}

.expert-info h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

.skills {
  margin: 4px 0;
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.expert-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
}

.rating {
  color: #f59e0b;
}

.rate {
  font-weight: 500;
  color: #667eea;
}

.unavailable-badge {
  display: inline-block;
  padding: 2px 6px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  margin-top: 4px;
}

.error {
  padding: 12px;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 6px;
  font-size: 12px;
}

.loading {
  text-align: center;
  padding: 24px;
  color: #6b7280;
}

.confirmation-section {
  text-align: center;
}

.confirmation-section h2 {
  color: #166534;
}

.selected-expert {
  padding: 20px;
  background: #f0fdf4;
  border-radius: 12px;
  margin-bottom: 16px;
}

.confirmation-text {
  font-size: 14px;
  color: #374151;
  margin-bottom: 16px;
}

.secondary-btn {
  padding: 10px 20px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.secondary-btn:hover {
  background: #e5e7eb;
}

.footer {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #e5e7eb;
  font-size: 11px;
}

.footer a {
  color: #6b7280;
  text-decoration: none;
}

.footer a:hover {
  color: #374151;
}
</style>
