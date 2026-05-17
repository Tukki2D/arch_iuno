import {
  getSettings,
  updateSettings,
  getWhitelist,
  addToWhitelist,
  removeFromWhitelist,
  getGreylist,
  addToGreylist,
  removeFromGreylist,
  promoteToWhitelist,
  getPremiumStatus,
  getStats,
  MAX_FREE_WHITELIST,
  getLast7DaysStats,
  getAverageDailyDeletions,
  getReviewBonus,
  getEffectiveWhitelistLimit
} from '../utils/storage.js';
import { validateDomain } from '../utils/domains.js';

// Popular sites that users commonly want to whitelist
const SUGGESTED_SITES = [
  { domain: 'google.com', name: 'Google', icon: '🔍' },
  { domain: 'youtube.com', name: 'YouTube', icon: '▶️' },
  { domain: 'github.com', name: 'GitHub', icon: '💻' },
  { domain: 'amazon.com', name: 'Amazon', icon: '📦' },
  { domain: 'reddit.com', name: 'Reddit', icon: '🤖' },
  { domain: 'twitter.com', name: 'Twitter/X', icon: '🐦' },
  { domain: 'facebook.com', name: 'Facebook', icon: '👥' },
  { domain: 'linkedin.com', name: 'LinkedIn', icon: '💼' },
  { domain: 'netflix.com', name: 'Netflix', icon: '🎬' },
  { domain: 'spotify.com', name: 'Spotify', icon: '🎵' },
  { domain: 'discord.com', name: 'Discord', icon: '💬' },
  { domain: 'twitch.tv', name: 'Twitch', icon: '🎮' },
  { domain: 'microsoft.com', name: 'Microsoft', icon: '🪟' },
  { domain: 'apple.com', name: 'Apple', icon: '🍎' },
  { domain: 'paypal.com', name: 'PayPal', icon: '💳' },
  { domain: 'ebay.com', name: 'eBay', icon: '🛒' },
  { domain: 'notion.so', name: 'Notion', icon: '📝' },
  { domain: 'slack.com', name: 'Slack', icon: '💬' },
  { domain: 'dropbox.com', name: 'Dropbox', icon: '📁' },
  { domain: 'trello.com', name: 'Trello', icon: '📋' },
];

class OptionsController {
  constructor() {
    this.confirmCallback = null;
    this.init();
  }

  async init() {
    await this.applyTheme();
    await this.loadSettings();
    await this.loadWhitelist();
    await this.loadGreylist();
    await this.loadSuggestedSites();
    await this.loadStats();
    await this.loadWeeklyChart();
    await this.loadDeletionLog();
    await this.checkPremiumStatus();
    this.bindEvents();
  }

  async applyTheme() {
    const settings = await getSettings();
    const theme = settings.theme || 'system';
    const themeSelect = document.getElementById('themeSelect');

    if (themeSelect) {
      themeSelect.value = theme;
    }

    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  async loadSettings() {
    const settings = await getSettings();

    document.getElementById('deleteOnTabClose').checked = settings.deleteOnTabClose;
    document.getElementById('deleteOnStartup').checked = settings.deleteOnStartup;
    document.getElementById('deleteOnDomainChange').checked = settings.deleteOnDomainChange;
    document.getElementById('cleanDelay').value = settings.cleanDelay;
    document.getElementById('keepSessionCookies').checked = settings.keepSessionCookies;
    document.getElementById('showBadgeCount').checked = settings.showBadgeCount ?? true;
    document.getElementById('themeSelect').value = settings.theme || 'system';

    // Premium features
    document.getElementById('cleanLocalStorage').checked = settings.cleanLocalStorage || false;
    document.getElementById('cleanIndexedDB').checked = settings.cleanIndexedDB || false;
    document.getElementById('cleanCache').checked = settings.cleanCache || false;

    // Greylist settings
    document.getElementById('greylistAutoExpire').checked = settings.greylistAutoExpire ?? true;
    document.getElementById('greylistExpireDays').value = settings.greylistExpireDays || 7;

    // Cookie aging settings
    document.getElementById('enableCookieAging').checked = settings.enableCookieAging || false;
    document.getElementById('cookieMaxAgeHours').value = settings.cookieMaxAgeHours || 24;

    // Scheduled cleanup settings
    document.getElementById('enableScheduledCleanup').checked = settings.enableScheduledCleanup || false;
    document.getElementById('scheduledCleanupInterval').value = settings.scheduledCleanupInterval || 60;
  }

  async loadWhitelist() {
    const whitelist = await getWhitelist();
    const premium = await getPremiumStatus();
    const container = document.getElementById('whitelistItems');
    const emptyMsg = document.getElementById('whitelistEmpty');
    const limitSpan = document.getElementById('whitelistLimit');

    container.innerHTML = '';

    if (whitelist.length === 0) {
      emptyMsg.classList.remove('hidden');
    } else {
      emptyMsg.classList.add('hidden');

      for (const item of whitelist) {
        const div = document.createElement('div');
        div.className = 'whitelist-item';
        div.innerHTML = `
          <div>
            <span class="whitelist-domain">${item.domain}</span>
            <span class="whitelist-date">Added ${this.formatDate(item.addedAt)}</span>
          </div>
          <button class="whitelist-remove" data-id="${item.id}">&times;</button>
        `;
        container.appendChild(div);
      }
    }

    // Update limit display
    if (premium.isPremium) {
      limitSpan.textContent = `${whitelist.length} sites`;
      document.getElementById('premiumCallout').classList.add('hidden');
    } else {
      const effectiveLimit = await getEffectiveWhitelistLimit();
      limitSpan.textContent = `${whitelist.length}/${effectiveLimit}`;
      if (whitelist.length >= effectiveLimit) {
        document.getElementById('addDomainBtn').disabled = true;
      } else {
        document.getElementById('addDomainBtn').disabled = false;
      }

      // Show review bonus callout if bonus not yet earned
      const reviewCallout = document.getElementById('reviewBonusCallout');
      if (reviewCallout) {
        const bonus = await getReviewBonus();
        if (bonus.granted) {
          reviewCallout.classList.add('hidden');
        } else {
          reviewCallout.classList.remove('hidden');
        }
      }
    }

    // Update stats tab
    const statWhitelistCount = document.getElementById('statWhitelistCount');
    if (statWhitelistCount) {
      statWhitelistCount.textContent = whitelist.length;
    }

    // Refresh suggested sites to show which are already added
    await this.loadSuggestedSites();
  }

  async loadGreylist() {
    const greylist = await getGreylist();
    const container = document.getElementById('greylistItems');
    const emptyMsg = document.getElementById('greylistEmpty');

    if (!container) return;

    container.innerHTML = '';

    if (greylist.length === 0) {
      emptyMsg.classList.remove('hidden');
    } else {
      emptyMsg.classList.add('hidden');

      for (const item of greylist) {
        const div = document.createElement('div');
        div.className = 'greylist-item';
        div.innerHTML = `
          <div>
            <span class="greylist-domain">${item.domain}</span>
            <span class="greylist-date">Last accessed ${this.formatDate(item.lastAccessed || item.addedAt)}</span>
          </div>
          <div class="greylist-actions">
            <button class="greylist-promote" data-id="${item.id}" title="Promote to whitelist">Whitelist</button>
            <button class="greylist-remove" data-id="${item.id}">&times;</button>
          </div>
        `;
        container.appendChild(div);
      }
    }
  }

  async loadSuggestedSites() {
    const whitelist = await getWhitelist();
    const whitelistedDomains = whitelist.map(w => w.domain);
    const container = document.getElementById('suggestedSites');

    container.innerHTML = '';

    for (const site of SUGGESTED_SITES) {
      const isAdded = whitelistedDomains.includes(site.domain);
      const chip = document.createElement('button');
      chip.className = `suggested-chip${isAdded ? ' added' : ''}`;
      chip.dataset.domain = site.domain;
      chip.innerHTML = `
        <span class="chip-icon">${site.icon}</span>
        <span class="chip-name">${site.name}</span>
        <span class="chip-add">${isAdded ? '✓' : '+'}</span>
      `;

      if (!isAdded) {
        chip.addEventListener('click', async () => {
          await this.addSuggestedSite(site.domain, site.name);
        });
      }

      container.appendChild(chip);
    }
  }

  async addSuggestedSite(domain, name) {
    try {
      await addToWhitelist(domain);
      await this.loadWhitelist();
      this.showToast(`${name} whitelisted`);
    } catch (error) {
      if (error.message === 'FREE_TIER_LIMIT') {
        const bonus = await getReviewBonus();
        this.showToast(bonus.granted ? 'Upgrade for unlimited whitelist' : 'Leave a review for +5 slots, or upgrade!');
      } else if (error.message === 'ALREADY_EXISTS') {
        this.showToast('Already whitelisted');
      }
    }
  }

  async loadStats() {
    const stats = await getStats();
    const whitelist = await getWhitelist();

    document.getElementById('statTotalDeleted').textContent =
      (stats.totalCookiesDeleted || 0).toLocaleString();

    if (stats.installDate) {
      const date = new Date(stats.installDate);
      document.getElementById('statInstallDate').textContent =
        date.toLocaleDateString();
    }

    // Today's count
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getTodayCount' });
      document.getElementById('statTodayDeleted').textContent =
        (response?.count || 0).toLocaleString();
    } catch (e) {
      document.getElementById('statTodayDeleted').textContent = '0';
    }

    // Average daily
    try {
      const avg = await getAverageDailyDeletions();
      document.getElementById('statAvgDaily').textContent = Math.round(avg).toLocaleString();
    } catch (e) {
      document.getElementById('statAvgDaily').textContent = '0';
    }

    // Whitelist count
    document.getElementById('statWhitelistCount').textContent = whitelist.length;
  }

  async loadWeeklyChart() {
    const container = document.getElementById('weeklyChart');
    if (!container) return;

    try {
      const weeklyData = await getLast7DaysStats();
      const maxValue = Math.max(...weeklyData.map(d => d.count), 1);

      container.innerHTML = '';

      for (const day of weeklyData) {
        // Use the pre-calculated dayName to avoid timezone issues
        // (new Date("YYYY-MM-DD") parses as UTC, causing off-by-one errors)
        const dayLabel = day.dayName;
        const height = (day.count / maxValue) * 100;

        const barDiv = document.createElement('div');
        barDiv.className = 'chart-bar';
        barDiv.innerHTML = `
          <span class="bar-value">${day.count}</span>
          <div class="bar-container">
            <div class="bar" style="height: ${height}%"></div>
          </div>
          <span class="bar-label">${dayLabel}</span>
        `;
        container.appendChild(barDiv);
      }
    } catch (e) {
      container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No data available</p>';
    }
  }

  async loadDeletionLog() {
    const container = document.getElementById('deletionLogContainer');
    const emptyMsg = document.getElementById('deletionLogEmpty');
    if (!container) return;

    try {
      const response = await chrome.runtime.sendMessage({ action: 'getDeletionLog' });
      const log = response?.log || [];

      if (log.length === 0) {
        emptyMsg.classList.remove('hidden');
        container.innerHTML = '';
        container.appendChild(emptyMsg);
        return;
      }

      emptyMsg.classList.add('hidden');
      container.innerHTML = '';

      for (const entry of log) {
        const div = document.createElement('div');
        div.className = 'deletion-log-item';

        const time = new Date(entry.timestamp);
        const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = time.toLocaleDateString([], { month: 'short', day: 'numeric' });

        div.innerHTML = `
          <div class="deletion-log-info">
            <span class="deletion-log-cookie">${entry.cookieName}</span>
            <span class="deletion-log-domain">${entry.cookieDomain || entry.domain}</span>
          </div>
          <span class="deletion-log-time">${dateStr}, ${timeStr}</span>
        `;
        container.appendChild(div);
      }
    } catch (e) {
      console.error('Failed to load deletion log:', e);
      emptyMsg.classList.remove('hidden');
    }
  }

  async checkPremiumStatus() {
    // Check ExtensionPay status first
    try {
      const extpay = window.ExtPay('cookie-guardian');
      const user = await extpay.getUser();

      if (user.paid) {
        // User has paid via ExtensionPay - update local storage and UI
        await chrome.storage.local.set({
          premium: {
            isPremium: true,
            purchaseDate: user.paidAt ? user.paidAt.toISOString() : new Date().toISOString()
          }
        });

        document.getElementById('premiumCallout').classList.add('hidden');
        document.getElementById('premiumUnlockHint').classList.add('hidden');
        document.getElementById('cleanLocalStorage').disabled = false;
        document.getElementById('cleanIndexedDB').disabled = false;
        document.getElementById('cleanCache').disabled = false;
        return;
      }
    } catch (error) {
      console.log('ExtensionPay check:', error);
    }

    // Fallback to local premium status check
    const premium = await getPremiumStatus();

    if (premium.isPremium) {
      document.getElementById('premiumCallout').classList.add('hidden');
      document.getElementById('premiumUnlockHint').classList.add('hidden');

      // Enable premium features
      document.getElementById('cleanLocalStorage').disabled = false;
      document.getElementById('cleanIndexedDB').disabled = false;
      document.getElementById('cleanCache').disabled = false;
    }
  }

  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }

  bindEvents() {
    // Tab navigation
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
      });
    });

    // Theme change
    document.getElementById('themeSelect').addEventListener('change', async (e) => {
      const theme = e.target.value;
      await updateSettings({ theme });

      if (theme === 'system') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', theme);
      }

      this.showToast('Theme updated');
    });

    // Settings changes
    const settingInputs = [
      'deleteOnTabClose',
      'deleteOnStartup',
      'deleteOnDomainChange',
      'keepSessionCookies',
      'showBadgeCount'
    ];

    settingInputs.forEach(id => {
      document.getElementById(id).addEventListener('change', async (e) => {
        await updateSettings({ [id]: e.target.checked });
        if (id === 'showBadgeCount') {
          chrome.runtime.sendMessage({ action: 'updateBadgeDisplay' });
        }
        this.showToast('Setting saved');
      });
    });

    // Premium settings
    const premiumInputs = ['cleanLocalStorage', 'cleanIndexedDB', 'cleanCache'];
    premiumInputs.forEach(id => {
      document.getElementById(id).addEventListener('change', async (e) => {
        await updateSettings({ [id]: e.target.checked });
        this.showToast('Setting saved');
      });
    });

    document.getElementById('cleanDelay').addEventListener('change', async (e) => {
      const value = Math.min(60, Math.max(0, parseInt(e.target.value) || 0));
      e.target.value = value;
      await updateSettings({ cleanDelay: value });
      this.showToast('Setting saved');
    });

    // Cookie aging settings
    document.getElementById('enableCookieAging')?.addEventListener('change', async (e) => {
      await updateSettings({ enableCookieAging: e.target.checked });
      this.showToast('Setting saved');
    });

    document.getElementById('cookieMaxAgeHours')?.addEventListener('change', async (e) => {
      const value = Math.min(720, Math.max(1, parseInt(e.target.value) || 24));
      e.target.value = value;
      await updateSettings({ cookieMaxAgeHours: value });
      this.showToast('Setting saved');
    });

    // Scheduled cleanup settings
    document.getElementById('enableScheduledCleanup')?.addEventListener('change', async (e) => {
      await updateSettings({ enableScheduledCleanup: e.target.checked });
      // Notify background to update alarm
      chrome.runtime.sendMessage({ action: 'updateScheduledCleanup' });
      this.showToast('Setting saved');
    });

    document.getElementById('scheduledCleanupInterval')?.addEventListener('change', async (e) => {
      const value = parseInt(e.target.value) || 60;
      await updateSettings({ scheduledCleanupInterval: value });
      // Notify background to update alarm
      chrome.runtime.sendMessage({ action: 'updateScheduledCleanup' });
      this.showToast('Setting saved');
    });

    // Add to whitelist
    document.getElementById('addDomainBtn').addEventListener('click', async () => {
      await this.addDomain();
    });

    document.getElementById('addDomainInput').addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        await this.addDomain();
      }
    });

    // Remove from whitelist (event delegation)
    document.getElementById('whitelistItems').addEventListener('click', async (e) => {
      if (e.target.classList.contains('whitelist-remove')) {
        const id = e.target.dataset.id;
        await removeFromWhitelist(id);
        await this.loadWhitelist();
        this.showToast('Site removed');
      }
    });

    // Greylist events
    document.getElementById('addGreylistBtn')?.addEventListener('click', async () => {
      await this.addToGreylistHandler();
    });

    document.getElementById('addGreylistInput')?.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        await this.addToGreylistHandler();
      }
    });

    // Greylist item actions (event delegation)
    document.getElementById('greylistItems')?.addEventListener('click', async (e) => {
      if (e.target.classList.contains('greylist-remove')) {
        const id = e.target.dataset.id;
        await removeFromGreylist(id);
        await this.loadGreylist();
        this.showToast('Removed from greylist');
      } else if (e.target.classList.contains('greylist-promote')) {
        const id = e.target.dataset.id;
        try {
          await promoteToWhitelist(id);
          await this.loadGreylist();
          await this.loadWhitelist();
          this.showToast('Promoted to whitelist');
        } catch (error) {
          if (error.message === 'FREE_TIER_LIMIT') {
            const bonus = await getReviewBonus();
            this.showToast(bonus.granted ? 'Upgrade for unlimited whitelist' : 'Leave a review for +5 slots, or upgrade!');
          } else {
            this.showToast('Unable to promote');
          }
        }
      }
    });

    // Greylist settings
    document.getElementById('greylistAutoExpire')?.addEventListener('change', async (e) => {
      await updateSettings({ greylistAutoExpire: e.target.checked });
      this.showToast('Setting saved');
    });

    document.getElementById('greylistExpireDays')?.addEventListener('change', async (e) => {
      const value = Math.min(90, Math.max(1, parseInt(e.target.value) || 7));
      e.target.value = value;
      await updateSettings({ greylistExpireDays: value });
      this.showToast('Setting saved');
    });

    // Export settings
    document.getElementById('exportSettings').addEventListener('click', async () => {
      const data = await chrome.storage.local.get(null);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'cookie-guardian-settings.json';
      a.click();

      URL.revokeObjectURL(url);
      this.showToast('Settings exported');
    });

    // Import settings
    document.getElementById('importSettings').addEventListener('click', () => {
      document.getElementById('importFile').click();
    });

    document.getElementById('importFile').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        delete data.premium;

        await chrome.storage.local.set(data);
        await this.loadSettings();
        await this.loadWhitelist();
        await this.loadStats();
        this.showToast('Settings imported');
      } catch (error) {
        this.showToast('Invalid file format');
      }

      e.target.value = '';
    });

    // Reset settings
    document.getElementById('resetSettings').addEventListener('click', async () => {
      this.showConfirmModal(
        'Reset All Settings?',
        'This will reset all settings to defaults and clear your whitelist. This action cannot be undone.',
        async () => {
          await chrome.storage.local.clear();
          await updateSettings({});
          await this.loadSettings();
          await this.loadWhitelist();
          this.showToast('Settings reset');
        }
      );
    });

    // Confirmation modal events
    document.getElementById('confirmModalCancel')?.addEventListener('click', () => {
      this.hideConfirmModal();
    });

    document.getElementById('confirmModalConfirm')?.addEventListener('click', () => {
      if (this.confirmCallback) {
        this.confirmCallback();
      }
      this.hideConfirmModal();
    });

    // Close modal on backdrop click
    document.querySelector('.confirm-modal-backdrop')?.addEventListener('click', () => {
      this.hideConfirmModal();
    });

    // Premium upgrade with ExtensionPay
    document.getElementById('upgradePremiumBtn')?.addEventListener('click', async () => {
      try {
        if (typeof window.ExtPay === 'undefined') {
          this.showToast('Payment system unavailable. Please try again later.', 'error');
          return;
        }
        const extpay = window.ExtPay('cookie-guardian');
        extpay.openPaymentPage();
      } catch (error) {
        console.error('Payment error:', error);
        this.showToast('Unable to open payment page');
      }
    });

    // Review bonus CTA
    document.getElementById('reviewBonusBtn')?.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://chromewebstore.google.com/detail/cookie-guardian-auto-dele/gnoaanpbfnjakaddkecnnamnfkebhgle/reviews' });
    });

    // Run onboarding
    document.getElementById('runOnboarding')?.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/onboarding.html') });
    });

    // Clear deletion log
    document.getElementById('clearDeletionLogBtn')?.addEventListener('click', async () => {
      await chrome.runtime.sendMessage({ action: 'clearDeletionLog' });
      await this.loadDeletionLog();
      this.showToast('Deletion log cleared');
    });
  }

  async addDomain() {
    const input = document.getElementById('addDomainInput');
    const value = input.value.trim();

    if (!value) return;

    try {
      const domain = validateDomain(value);
      await addToWhitelist(domain);
      input.value = '';
      await this.loadWhitelist();
      this.showToast(`${domain} whitelisted`);
    } catch (error) {
      if (error.message === 'FREE_TIER_LIMIT') {
        const bonus = await getReviewBonus();
        this.showToast(bonus.granted ? 'Upgrade for unlimited whitelist' : 'Leave a review for +5 slots, or upgrade!');
      } else if (error.message === 'ALREADY_EXISTS') {
        this.showToast('Already whitelisted');
      } else {
        this.showToast('Invalid domain');
      }
    }
  }

  async addToGreylistHandler() {
    const input = document.getElementById('addGreylistInput');
    const value = input.value.trim();

    if (!value) return;

    try {
      const domain = validateDomain(value);
      await addToGreylist(domain);
      input.value = '';
      await this.loadGreylist();
      this.showToast(`${domain} added to greylist`);
    } catch (error) {
      if (error.message === 'ALREADY_WHITELISTED') {
        this.showToast('Already in whitelist');
      } else if (error.message === 'ALREADY_EXISTS') {
        this.showToast('Already in greylist');
      } else {
        this.showToast('Invalid domain');
      }
    }
  }

  showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2000);
  }

  showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmModalTitle');
    const messageEl = document.getElementById('confirmModalMessage');

    titleEl.textContent = title;
    messageEl.textContent = message;
    this.confirmCallback = onConfirm;

    modal.classList.remove('hidden');
  }

  hideConfirmModal() {
    const modal = document.getElementById('confirmModal');
    modal.classList.add('hidden');
    this.confirmCallback = null;
  }
}

// Initialize
new OptionsController();
