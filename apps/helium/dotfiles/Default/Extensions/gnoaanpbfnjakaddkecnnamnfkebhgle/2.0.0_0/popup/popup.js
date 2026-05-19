import { getSettings, updateSettings, getWhitelist, addToWhitelist, removeFromWhitelist, isDomainWhitelisted, getGreylist, addToGreylist, removeFromGreylist, isDomainGreylisted, getPremiumStatus, getStats, MAX_FREE_WHITELIST, getReviewBonus, getEffectiveWhitelistLimit } from '../utils/storage.js';
import { extractDomain } from '../utils/domains.js';
import { getCookieCountForDomain, getCookiesForDomain, deleteCookie } from '../utils/cookies.js';

class PopupController {
  constructor() {
    this.currentDomain = null;
    this.cookies = [];
    this.cookieViewerOpen = false;
    this.confirmCallback = null;
    this.init();
  }

  async init() {
    await this.applyTheme();
    await this.loadCurrentTab();
    await this.loadStats();
    await this.loadTodayStats();
    await this.loadEnabledState();
    await this.checkPremiumStatus();
    this.bindEvents();
  }

  async applyTheme() {
    const settings = await getSettings();
    const theme = settings.theme || 'system';

    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  async loadCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url) {
      document.getElementById('currentDomain').textContent = 'N/A';
      return;
    }

    try {
      this.currentDomain = extractDomain(tab.url);
      document.getElementById('currentDomain').textContent = this.currentDomain;

      const count = await getCookieCountForDomain(this.currentDomain);
      document.getElementById('cookieCount').textContent =
        `${count} cookie${count !== 1 ? 's' : ''}`;

      await this.updateWhitelistButton();
      await this.updateGreylistButton();

    } catch (error) {
      document.getElementById('currentDomain').textContent = 'Internal Page';
      document.getElementById('cookieCount').textContent = 'N/A';
      document.querySelector('.site-actions').style.display = 'none';
    }
  }

  async loadEnabledState() {
    const settings = await getSettings();
    const toggle = document.getElementById('toggleEnabled');
    const container = document.querySelector('.popup-container');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const statusSubtext = document.getElementById('statusSubtext');

    toggle.classList.toggle('active', settings.enabled);
    toggle.setAttribute('aria-checked', String(settings.enabled));
    container.classList.toggle('disabled', !settings.enabled);

    if (settings.enabled) {
      statusIndicator.classList.add('protected');
      statusIndicator.classList.remove('disabled');
      statusText.textContent = 'Protected';
      statusSubtext.textContent = 'Cookie Guardian is active';
    } else {
      statusIndicator.classList.remove('protected');
      statusIndicator.classList.add('disabled');
      statusText.textContent = 'Disabled';
      statusSubtext.textContent = 'Cookie Guardian is paused';
    }
  }

  async updateWhitelistButton() {
    if (!this.currentDomain) return;

    const isWhitelisted = await isDomainWhitelisted(this.currentDomain);
    const button = document.getElementById('whitelistToggle');
    const iconContainer = button.querySelector('.btn-icon');

    if (isWhitelisted) {
      button.classList.add('active');
      button.querySelector('.btn-text').textContent = 'Whitelisted';
      iconContainer.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="icon-check">
          <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    } else {
      button.classList.remove('active');
      button.querySelector('.btn-text').textContent = 'Whitelist';
      iconContainer.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="icon-plus">
          <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    }
  }

  async updateGreylistButton() {
    if (!this.currentDomain) return;

    const isGreylisted = await isDomainGreylisted(this.currentDomain);
    const button = document.getElementById('greylistToggle');
    const iconContainer = button.querySelector('.btn-icon');

    if (isGreylisted) {
      button.classList.add('active');
      button.querySelector('.btn-text').textContent = 'Greylisted';
      iconContainer.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="icon-check">
          <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    } else {
      button.classList.remove('active');
      button.querySelector('.btn-text').textContent = 'Greylist';
      iconContainer.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="icon-clock">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
          <path d="M12 7V12L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    }
  }

  async loadStats() {
    const stats = await getStats();
    const whitelist = await getWhitelist();

    document.getElementById('totalDeleted').textContent =
      (stats.totalCookiesDeleted || 0).toLocaleString();
    document.getElementById('whitelistCount').textContent = whitelist.length;
  }

  async loadTodayStats() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getTodayCount' });
      const count = response?.count || 0;
      document.getElementById('todayDeleted').textContent = count.toLocaleString();
    } catch (error) {
      document.getElementById('todayDeleted').textContent = '0';
    }
  }

  async checkPremiumStatus() {
    const whitelist = await getWhitelist();
    const premiumLink = document.getElementById('upgradePremium');
    const premiumBadge = document.getElementById('premiumBadge');
    let isPaid = false;

    // Check ExtensionPay status first
    // Note: ExtPay is loaded as a regular script (global scope), popup.js is a module
    // Must access via window.ExtPay since module scope doesn't see global vars directly
    try {
      if (typeof window.ExtPay !== 'undefined') {
        const extpay = window.ExtPay('cookie-guardian');
        const user = await extpay.getUser();
        isPaid = user.paid;

        // Sync to local storage so whitelist limit check works
        if (isPaid) {
          await chrome.storage.local.set({
            premium: {
              isPremium: true,
              purchaseDate: user.paidAt ? user.paidAt.toISOString() : new Date().toISOString()
            }
          });
        }
      }
    } catch (error) {
      console.warn('[CookieGuardian] ExtensionPay check failed:', error);
    }

    // Also check local premium status as fallback
    if (!isPaid) {
      const premium = await getPremiumStatus();
      isPaid = premium.isPremium;
    }

    // Show/hide upgrade link and premium badge based on payment status
    if (isPaid) {
      premiumLink.classList.add('hidden');
      if (premiumBadge) premiumBadge.classList.remove('hidden');
      const reviewHint = document.getElementById('reviewBonusHint');
      if (reviewHint) reviewHint.classList.add('hidden');
    } else {
      premiumLink.classList.remove('hidden');
      if (premiumBadge) premiumBadge.classList.add('hidden');
      const effectiveLimit = await getEffectiveWhitelistLimit();
      document.getElementById('whitelistUsage').textContent =
        `${whitelist.length}/${effectiveLimit}`;

      // Show/hide review bonus hint
      const reviewHint = document.getElementById('reviewBonusHint');
      const bonus = await getReviewBonus();
      if (reviewHint) {
        if (bonus.granted) {
          reviewHint.classList.add('hidden');
        } else {
          reviewHint.classList.remove('hidden');
        }
      }
    }
  }

  bindEvents() {
    // Toggle extension
    document.getElementById('toggleEnabled').addEventListener('click', async () => {
      const settings = await getSettings();
      await updateSettings({ enabled: !settings.enabled });
      await this.loadEnabledState();
    });

    // Whitelist toggle
    document.getElementById('whitelistToggle').addEventListener('click', async () => {
      if (!this.currentDomain) return;

      try {
        const isWhitelisted = await isDomainWhitelisted(this.currentDomain);

        if (isWhitelisted) {
          const whitelist = await getWhitelist();
          const entry = whitelist.find(w => w.domain === this.currentDomain);
          if (entry) {
            await removeFromWhitelist(entry.id);
            this.showToast('Removed from whitelist');
          }
        } else {
          await addToWhitelist(this.currentDomain);
          this.showToast('Added to whitelist');
        }

        await this.updateWhitelistButton();
        await this.updateGreylistButton();
        await this.loadStats();
        await this.checkPremiumStatus();

      } catch (error) {
        if (error.message === 'FREE_TIER_LIMIT') {
          const bonus = await getReviewBonus();
          if (!bonus.granted) {
            this.showToast('Leave a review for +5 slots, or upgrade!');
          } else {
            this.showToast('Upgrade for unlimited whitelist');
          }
        } else if (error.message === 'ALREADY_EXISTS') {
          this.showToast('Already whitelisted');
        }
      }
    });

    // Greylist toggle
    document.getElementById('greylistToggle').addEventListener('click', async () => {
      if (!this.currentDomain) return;

      try {
        const isGreylisted = await isDomainGreylisted(this.currentDomain);

        if (isGreylisted) {
          const greylist = await getGreylist();
          const entry = greylist.find(g => g.domain === this.currentDomain);
          if (entry) {
            await removeFromGreylist(entry.id);
            this.showToast('Removed from greylist');
          }
        } else {
          await addToGreylist(this.currentDomain);
          this.showToast('Added to greylist (temporary protection)');
        }

        await this.updateWhitelistButton();
        await this.updateGreylistButton();

      } catch (error) {
        if (error.message === 'ALREADY_WHITELISTED') {
          this.showToast('Already in whitelist');
        } else if (error.message === 'ALREADY_EXISTS') {
          this.showToast('Already greylisted');
        }
      }
    });

    // Clean current site
    document.getElementById('cleanNow').addEventListener('click', async () => {
      if (!this.currentDomain) return;

      const btn = document.getElementById('cleanNow');
      btn.classList.add('cleaning');

      chrome.runtime.sendMessage(
        { action: 'deleteCookiesForDomain', domain: this.currentDomain },
        (response) => {
          btn.classList.remove('cleaning');

          if (response?.success && response.deletedCount > 0) {
            this.showSuccessAnimation();
            setTimeout(() => {
              this.showToast(`Deleted ${response.deletedCount} cookies`);
              this.loadCurrentTab();
              this.loadStats();
              this.loadTodayStats();
            }, 1200);
          } else {
            this.showToast('No cookies to delete');
          }
        }
      );
    });

    // Delete all cookies
    document.getElementById('deleteAll').addEventListener('click', async (e) => {
      e.preventDefault();
      this.showConfirmModal(
        'Delete All Cookies?',
        'This will delete ALL non-whitelisted cookies from your browser. This action cannot be undone.',
        () => {
          chrome.runtime.sendMessage({ action: 'deleteAllCookies' }, () => {
            this.showSuccessAnimation();
            setTimeout(() => {
              this.showToast('All cookies cleaned');
              this.loadCurrentTab();
              this.loadStats();
              this.loadTodayStats();
            }, 1200);
          });
        }
      );
    });

    // Open settings
    document.getElementById('openSettings').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });

    // Upgrade button - open payment page directly
    // Note: ExtPay is in global scope, must access via window in module context
    document.getElementById('upgradePremium')?.addEventListener('click', async (e) => {
      e.preventDefault();

      try {
        if (typeof window.ExtPay === 'function') {
          const extpay = window.ExtPay('cookie-guardian');
          await extpay.openPaymentPage();
        } else {
          chrome.runtime.openOptionsPage();
        }
      } catch (error) {
        chrome.runtime.openOptionsPage();
      }
    });

    // Review bonus hint - open CWS review page
    document.getElementById('reviewBonusHint')?.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://chromewebstore.google.com/detail/cookie-guardian-auto-dele/gnoaanpbfnjakaddkecnnamnfkebhgle/reviews' });
    });

    // Toggle cookie viewer
    document.getElementById('toggleCookieViewer')?.addEventListener('click', () => {
      this.toggleCookieViewer();
    });

    // Cookie search
    document.getElementById('cookieSearch')?.addEventListener('input', (e) => {
      this.filterCookies(e.target.value);
    });

    // Cookie list delete buttons (event delegation)
    document.getElementById('cookieList')?.addEventListener('click', async (e) => {
      if (e.target.classList.contains('cookie-delete')) {
        const cookieName = e.target.dataset.name;
        const cookieDomain = e.target.dataset.domain;
        const cookiePath = e.target.dataset.path;
        await this.deleteSingleCookie(cookieName, cookieDomain, cookiePath);
      }
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
  }

  async toggleCookieViewer() {
    const viewer = document.getElementById('cookieViewer');
    const toggleBtn = document.getElementById('toggleCookieViewer');

    this.cookieViewerOpen = !this.cookieViewerOpen;

    if (this.cookieViewerOpen) {
      viewer.classList.remove('hidden');
      toggleBtn.classList.add('expanded');
      await this.loadCookies();
    } else {
      viewer.classList.add('hidden');
      toggleBtn.classList.remove('expanded');
    }
  }

  async loadCookies() {
    if (!this.currentDomain) return;

    this.cookies = await getCookiesForDomain(this.currentDomain);
    this.renderCookies(this.cookies);
  }

  renderCookies(cookies) {
    const list = document.getElementById('cookieList');
    const countEl = document.getElementById('cookieViewerCount');

    if (cookies.length === 0) {
      list.innerHTML = '<div class="no-cookies">No cookies found</div>';
      countEl.textContent = '0 cookies shown';
      return;
    }

    list.innerHTML = cookies.map(cookie => `
      <div class="cookie-item">
        <div class="cookie-info">
          <span class="cookie-name" title="${this.escapeHtml(cookie.name)}">${this.escapeHtml(cookie.name)}</span>
          <span class="cookie-value" title="${this.escapeHtml(cookie.value)}">${this.escapeHtml(cookie.value.substring(0, 50))}${cookie.value.length > 50 ? '...' : ''}</span>
        </div>
        <button class="cookie-delete" data-name="${this.escapeHtml(cookie.name)}" data-domain="${this.escapeHtml(cookie.domain)}" data-path="${this.escapeHtml(cookie.path)}" title="Delete cookie">&times;</button>
      </div>
    `).join('');

    countEl.textContent = `${cookies.length} cookie${cookies.length !== 1 ? 's' : ''} shown`;
  }

  filterCookies(query) {
    const filtered = query
      ? this.cookies.filter(c =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.value.toLowerCase().includes(query.toLowerCase())
        )
      : this.cookies;

    this.renderCookies(filtered);
  }

  async deleteSingleCookie(name, domain, path) {
    const cookie = this.cookies.find(c => c.name === name && c.domain === domain && c.path === path);
    if (!cookie) return;

    try {
      await deleteCookie(cookie);
      this.cookies = this.cookies.filter(c => !(c.name === name && c.domain === domain && c.path === path));
      this.renderCookies(this.cookies);
      await this.loadCurrentTab();
      this.showToast('Cookie deleted');
    } catch (e) {
      this.showToast('Failed to delete cookie');
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showSuccessAnimation() {
    const overlay = document.getElementById('successOverlay');
    overlay.classList.remove('hidden');

    setTimeout(() => {
      overlay.classList.add('hidden');
    }, 1100);
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
new PopupController();
