// Cookie Guardian - Background Service Worker
// Manifest V3 compliant

import { getSettings, updateSettings, isDomainWhitelisted, updateStats, initializeStats, getWhitelist, getGreylist, addToWhitelist, addToGreylist, getPremiumStatus, updateGreylistAccess, getTodayCount, addToDeletionLog, getDeletionLog, clearDeletionLog, checkWhitelistMatch, getReviewBonus, grantReviewBonus, getEffectiveWhitelistLimit, MAX_FREE_WHITELIST_BASE, REVIEW_BONUS_SLOTS } from './utils/storage.js';
import { extractDomain, normalizeDomain, getBaseDomain } from './utils/domains.js';
import { deleteCookiesForDomain, buildCookieUrl, getAllCookies, buildRemoveOptions } from './utils/cookies.js';
import ExtPay from './ExtPay-esm.js';

// Initialize ExtensionPay for payment processing
let extpay = null;
try {
  extpay = ExtPay('cookie-guardian');
  extpay.startBackground();
  console.log('[CookieGuardian] ExtensionPay initialized');
} catch (e) {
  console.warn('[CookieGuardian] ExtensionPay init failed:', e);
}

// ============================================
// EVENT LISTENERS (MUST be at top level for MV3)
// ============================================

chrome.tabs.onRemoved.addListener(handleTabRemoved);
chrome.tabs.onUpdated.addListener(handleTabUpdated);
chrome.tabs.onActivated.addListener(handleTabActivated);
chrome.runtime.onStartup.addListener(handleBrowserStartup);
chrome.runtime.onInstalled.addListener(handleInstall);
chrome.alarms.onAlarm.addListener(handleAlarm);
chrome.runtime.onMessage.addListener(handleMessage);
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
chrome.commands.onCommand.addListener(handleCommand);
chrome.notifications.onButtonClicked.addListener(handleNotificationButtonClick);

// Refresh the active tab's icon whenever whitelist, greylist, or enabled state changes
// (covers popup toggles, options-page edits, and context-menu additions that don't go through updateIconState directly).
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local' && area !== 'sync') return;
  if (!changes.whitelist && !changes.greylist && !changes.settings) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) await updateIconState(tab.id);
  } catch {}
});

// Initialize on service worker start
initializeServiceWorker();

async function initializeServiceWorker() {
  console.log('[CookieGuardian] Service worker initialized');
  await rebuildTabTracking();
  await initializeBadgeSystem();
  await initializeWeeklySummary();
  await setupContextMenus();
  await initializeCookieAging();
  await initializeScheduledCleanup();
}

// ============================================
// CONTEXT MENUS
// ============================================

async function setupContextMenus() {
  // Remove existing menus to avoid duplicates
  await chrome.contextMenus.removeAll();

  // Create parent menu
  chrome.contextMenus.create({
    id: 'cookieGuardian',
    title: 'Cookie Guardian',
    contexts: ['page']
  });

  // Add to whitelist option
  chrome.contextMenus.create({
    id: 'addToWhitelist',
    parentId: 'cookieGuardian',
    title: 'Add this site to whitelist',
    contexts: ['page']
  });

  // Add to greylist option
  chrome.contextMenus.create({
    id: 'addToGreylist',
    parentId: 'cookieGuardian',
    title: 'Add this site to greylist (temporary)',
    contexts: ['page']
  });

  // Separator
  chrome.contextMenus.create({
    id: 'separator1',
    parentId: 'cookieGuardian',
    type: 'separator',
    contexts: ['page']
  });

  // Clean cookies for this site
  chrome.contextMenus.create({
    id: 'cleanThisSite',
    parentId: 'cookieGuardian',
    title: 'Clean cookies for this site',
    contexts: ['page']
  });

  // Clean all cookies
  chrome.contextMenus.create({
    id: 'cleanAllCookies',
    parentId: 'cookieGuardian',
    title: 'Clean all non-whitelisted cookies',
    contexts: ['page']
  });

  console.log('[CookieGuardian] Context menus created');
}

async function handleContextMenuClick(info, tab) {
  if (!tab?.url) return;

  let domain;
  try {
    domain = extractDomain(tab.url);
  } catch (e) {
    console.log('[CookieGuardian] Cannot extract domain from URL');
    return;
  }

  switch (info.menuItemId) {
    case 'addToWhitelist':
      try {
        await addToWhitelist(domain);
        await showNotification('Added to Whitelist', `${domain} has been added to your whitelist.`);
      } catch (error) {
        if (error.message === 'FREE_TIER_LIMIT') {
          const bonus = await getReviewBonus();
          const msg = bonus.granted
            ? 'Upgrade to Premium for unlimited whitelist slots.'
            : 'Leave a review for +5 slots, or upgrade to Premium!';
          await showNotification('Whitelist Full', msg);
        } else if (error.message === 'ALREADY_EXISTS') {
          await showNotification('Already Whitelisted', `${domain} is already in your whitelist.`);
        } else {
          console.error('[CookieGuardian] Whitelist error:', error);
          await showNotification('Error', 'Could not add to whitelist.');
        }
      }
      break;

    case 'addToGreylist':
      try {
        await addToGreylist(domain);
        await showNotification('Added to Greylist', `${domain} has been temporarily protected.`);
      } catch (error) {
        if (error.message === 'ALREADY_WHITELISTED') {
          await showNotification('Already Protected', `${domain} is already in your whitelist.`);
        } else if (error.message === 'ALREADY_EXISTS') {
          await showNotification('Already in Greylist', `${domain} is already in your greylist.`);
        } else {
          console.error('[CookieGuardian] Greylist error:', error);
          await showNotification('Error', 'Could not add to greylist.');
        }
      }
      break;

    case 'cleanThisSite':
      const deletedCount = await deleteCookiesForDomain(domain);
      if (deletedCount > 0) {
        await updateStats(deletedCount);
        await updateBadgeAndMilestones(deletedCount);
        await showNotification('Cookies Cleaned', `Deleted ${deletedCount} cookies for ${domain}.`);
      } else {
        await showNotification('No Cookies', `No cookies found for ${domain}.`);
      }
      break;

    case 'cleanAllCookies':
      await deleteAllNonWhitelistedCookies();
      await showNotification('All Cookies Cleaned', 'All non-whitelisted cookies have been deleted.');
      break;
  }
}

async function showNotification(title, message) {
  try {
    await chrome.storage.session.set({ lastActionNotificationAt: Date.now() });
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: `Cookie Guardian: ${title}`,
      message: message,
      priority: 1
    });
  } catch (e) {
    console.warn('[CookieGuardian] Notification failed:', e);
  }
}

// Best-effort per-invocation guard only; resets on SW restart. Storage-based 24h rate limit is the real protection.
let gatedNotificationInFlight = false;

async function sendGatedNotification(id, options) {
  if (gatedNotificationInFlight) {
    console.log(`[CookieGuardian] Notification "${id}" suppressed: another gated notification in flight`);
    return false;
  }

  gatedNotificationInFlight = true;
  try {
    const now = Date.now();

    const sessionResult = await chrome.storage.session.get('lastActionNotificationAt');
    if (sessionResult.lastActionNotificationAt && now - sessionResult.lastActionNotificationAt < 5000) {
      console.log(`[CookieGuardian] Notification "${id}" suppressed: action notification sent recently`);
      return false;
    }

    const result = await chrome.storage.local.get('lastGatedNotificationAt');
    if (result.lastGatedNotificationAt && now - result.lastGatedNotificationAt < 24 * 60 * 60 * 1000) {
      console.log(`[CookieGuardian] Notification "${id}" suppressed: gated notification sent in last 24h`);
      return false;
    }

    await chrome.storage.local.set({ lastGatedNotificationAt: now });
    await chrome.notifications.create(id, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      ...options
    });
    console.log(`[CookieGuardian] Gated notification sent: ${id}`);
    return true;
  } catch (e) {
    console.warn(`[CookieGuardian] Gated notification "${id}" failed:`, e);
    return false;
  } finally {
    gatedNotificationInFlight = false;
  }
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

async function handleCommand(command) {
  // Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  switch (command) {
    case 'toggle-extension':
      await toggleExtension();
      break;

    case 'clean-current-site':
      if (tab?.url) {
        await cleanCurrentSite(tab);
      }
      break;

    case 'whitelist-current-site':
      if (tab?.url) {
        await whitelistCurrentSite(tab);
      }
      break;

    case 'clean-all-cookies':
      await deleteAllNonWhitelistedCookies();
      await showNotification('All Cookies Cleaned', 'All non-whitelisted cookies have been deleted.');
      break;
  }
}

async function toggleExtension() {
  const settings = await getSettings();
  const newState = !settings.enabled;
  await updateSettings({ enabled: newState });

  // Get active tab to update icon state
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    await updateIconState(tab.id);
  }

  await showNotification(
    newState ? 'Enabled' : 'Disabled',
    newState ? 'Cookie Guardian is now protecting you.' : 'Cookie Guardian has been paused.'
  );
}

async function cleanCurrentSite(tab) {
  try {
    const domain = extractDomain(tab.url);

    const deletedCount = await deleteCookiesForDomain(domain);

    if (deletedCount > 0) {
      await updateStats(deletedCount);
      await updateBadgeAndMilestones(deletedCount);
      await showNotification('Cookies Cleaned', `Deleted ${deletedCount} cookies for ${domain}.`);
    } else {
      await showNotification('No Cookies', `No cookies found for ${domain}.`);
    }
  } catch (e) {
    await showNotification('Error', 'Could not clean cookies for this page.');
  }
}

async function whitelistCurrentSite(tab) {
  try {
    const domain = extractDomain(tab.url);
    await addToWhitelist(domain);
    await updateIconState(tab.id);
    await showNotification('Added to Whitelist', `${domain} has been added to your whitelist.`);
  } catch (error) {
    if (error.message === 'FREE_TIER_LIMIT') {
      const bonus = await getReviewBonus();
      const msg = bonus.granted
        ? 'Upgrade to Premium for unlimited whitelist slots.'
        : 'Leave a review for +5 slots, or upgrade to Premium!';
      await showNotification('Whitelist Full', msg);
    } else if (error.message === 'ALREADY_EXISTS') {
      await showNotification('Already Whitelisted', 'This site is already in your whitelist.');
    }
  }
}

// ============================================
// COOKIE AGING
// ============================================

async function initializeCookieAging() {
  // Set up hourly alarm to check for aged cookies
  await chrome.alarms.create('cookie_aging_check', {
    periodInMinutes: 60, // Check every hour
    delayInMinutes: 5    // First check 5 minutes after startup
  });
  console.log('[CookieGuardian] Cookie aging initialized');
}

async function handleCookieAgingCheck() {
  const settings = await getSettings();

  if (!settings.enabled || !settings.enableCookieAging) {
    return;
  }

  const maxAgeMs = settings.cookieMaxAgeHours * 60 * 60 * 1000;
  const cutoffTime = Date.now() - maxAgeMs;

  const allCookies = await getAllCookies();
  let deletedCount = 0;

  const trackingResult = await chrome.storage.local.get('cookieTracker');
  const tracker = trackingResult.cookieTracker || {};
  let trackerDirty = false;

  for (const cookie of allCookies) {
    // Skip session cookies if setting is enabled
    if (settings.keepSessionCookies && cookie.session) {
      continue;
    }

    // Check if cookie domain is whitelisted
    const domain = cookie.domain.startsWith('.')
      ? cookie.domain.substring(1)
      : cookie.domain;

    const isWhitelisted = await isDomainWhitelisted(domain);
    if (isWhitelisted) {
      continue;
    }

    // Check cookie creation time
    // Chrome cookies have expirationDate but not creation time
    // We'll use a stored tracking of when we first saw each cookie
    // Using local storage instead of session to persist across service worker restarts
    const cookieKey = `${cookie.domain}:${cookie.name}`;

    if (!tracker[cookieKey]) {
      // First time seeing this cookie, start tracking
      tracker[cookieKey] = Date.now();
      trackerDirty = true;
      continue;
    }

    // Check if cookie is too old
    if (tracker[cookieKey] < cutoffTime) {
      try {
        await chrome.cookies.remove(buildRemoveOptions(cookie));
        deletedCount++;

        // Remove from tracker
        delete tracker[cookieKey];
        trackerDirty = true;
      } catch (e) {
        // Ignore individual cookie errors
      }
    }
  }

  if (trackerDirty) {
    await chrome.storage.local.set({ cookieTracker: tracker });
  }

  // Clean up stale entries from tracker (cookies that no longer exist)
  const finalTrackingResult = await chrome.storage.local.get('cookieTracker');
  const finalTracker = finalTrackingResult.cookieTracker || {};
  const existingCookieKeys = new Set(allCookies.map(c => `${c.domain}:${c.name}`));
  let cleanedEntries = 0;
  for (const key of Object.keys(finalTracker)) {
    if (!existingCookieKeys.has(key)) {
      delete finalTracker[key];
      cleanedEntries++;
    }
  }
  if (cleanedEntries > 0) {
    await chrome.storage.local.set({ cookieTracker: finalTracker });
    console.log(`[CookieGuardian] Cleaned ${cleanedEntries} stale cookie tracker entries`);
  }

  if (deletedCount > 0) {
    await updateStats(deletedCount);
    await updateBadgeAndMilestones(deletedCount);
    console.log(`[CookieGuardian] Cookie aging: deleted ${deletedCount} old cookies`);
  }
}

// ============================================
// BADGE SYSTEM & ICON STATES
// ============================================

// Icon state colors (used for the native count-badge background)
const ICON_STATES = {
  PROTECTED: '#00BFA6',    // Teal   - extension enabled, site unprotected by lists
  DISABLED: '#6b7280',      // Gray   - extension disabled
  WHITELISTED: '#3b82f6',   // Blue   - current site is whitelisted
  GREYLISTED: '#f59e0b'     // Orange - current site is greylisted
};

// Full shield-icon color swap per state (chrome.action.setIcon paths)
const ICON_PATHS = {
  PROTECTED:   { 16: 'icons/icon16.png',             48: 'icons/icon48.png',             128: 'icons/icon128.png' },
  DISABLED:    { 16: 'icons/icon-disabled-16.png',   48: 'icons/icon-disabled-48.png',   128: 'icons/icon-disabled-128.png' },
  WHITELISTED: { 16: 'icons/icon-whitelisted-16.png',48: 'icons/icon-whitelisted-48.png',128: 'icons/icon-whitelisted-128.png' },
  GREYLISTED:  { 16: 'icons/icon-greylisted-16.png', 48: 'icons/icon-greylisted-48.png', 128: 'icons/icon-greylisted-128.png' }
};

async function initializeBadgeSystem() {
  await chrome.action.setBadgeBackgroundColor({ color: ICON_STATES.PROTECTED });

  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const minutesUntilMidnight = (midnight - now) / 1000 / 60;

  await chrome.alarms.create('daily_badge_reset', {
    delayInMinutes: minutesUntilMidnight,
    periodInMinutes: 24 * 60
  });

  // Sync session storage with persistent storage on startup
  // This ensures badge shows correct count after service worker restarts
  const todayCount = await getTodayCount();
  await chrome.storage.session.set({ dailyCookieCount: todayCount });

  await updateBadgeDisplay();
  console.log(`[CookieGuardian] Badge system initialized (today: ${todayCount})`);
}

async function applyState(tabId, state, title) {
  try {
    await chrome.action.setIcon({ tabId, path: ICON_PATHS[state] });
  } catch (e) {
    // Tab closed between check and paint — fall through to global icon so toolbar isn't left mid-state.
    try { await chrome.action.setIcon({ path: ICON_PATHS[state] }); } catch {}
  }
  await chrome.action.setBadgeBackgroundColor({ color: ICON_STATES[state] });
  await chrome.action.setTitle({ title });
}

async function updateIconState(tabId) {
  const settings = await getSettings();

  if (!settings.enabled) {
    await applyState(tabId, 'DISABLED', 'Cookie Guardian (Disabled)');
    return;
  }

  let domain = null;
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab?.url) domain = extractDomain(tab.url);
  } catch (e) {
    // Tab might not exist or have a valid URL
  }

  if (domain) {
    const whitelist = await getWhitelist();
    const greylist = await getGreylist();

    const isWhitelisted = whitelist.some(item => item.includeSubdomains
      ? domain === item.domain || domain.endsWith('.' + item.domain)
      : domain === item.domain);

    const isGreylisted = greylist.some(item => item.includeSubdomains
      ? domain === item.domain || domain.endsWith('.' + item.domain)
      : domain === item.domain);

    if (isWhitelisted) {
      await applyState(tabId, 'WHITELISTED', `Cookie Guardian - ${domain} is whitelisted`);
      return;
    }

    if (isGreylisted) {
      await applyState(tabId, 'GREYLISTED', `Cookie Guardian - ${domain} is greylisted`);
      await updateGreylistAccess(domain);
      return;
    }
  }

  await applyState(tabId, 'PROTECTED', 'Cookie Guardian - Protected');
}

async function updateBadgeDisplay() {
  const settings = await getSettings();
  const result = await chrome.storage.session.get('dailyCookieCount');
  const count = result.dailyCookieCount || 0;

  if (!settings.showBadgeCount) {
    await chrome.action.setBadgeText({ text: ' ' });
    return;
  }

  if (count > 0) {
    const text = count > 999 ? '999+' : count.toString();
    await chrome.action.setBadgeText({ text });
  } else {
    await chrome.action.setBadgeText({ text: '' });
  }
}

async function incrementDailyCount(deletedCount) {
  const result = await chrome.storage.session.get('dailyCookieCount');
  const currentCount = result.dailyCookieCount || 0;
  const newCount = currentCount + deletedCount;

  await chrome.storage.session.set({ dailyCookieCount: newCount });
  await updateBadgeDisplay();
}

async function resetDailyCount() {
  await chrome.storage.session.set({ dailyCookieCount: 0 });
  const settings = await getSettings();
  await chrome.action.setBadgeText({ text: settings.showBadgeCount ? '' : ' ' });
  console.log('[CookieGuardian] Daily badge count reset');
}

// ============================================
// WEEKLY SUMMARY
// ============================================

async function initializeWeeklySummary() {
  const existing = await chrome.alarms.get('weekly_summary');
  if (!existing) {
    await chrome.alarms.create('weekly_summary', {
      periodInMinutes: 7 * 24 * 60,
      delayInMinutes: 7 * 24 * 60
    });
  }

  const result = await chrome.storage.local.get('weeklyStats');
  if (!result.weeklyStats) {
    await chrome.storage.local.set({
      weeklyStats: { count: 0, startDate: Date.now() }
    });
  }

  console.log('[CookieGuardian] Weekly summary initialized');
}

async function updateWeeklyStats(deletedCount) {
  const result = await chrome.storage.local.get('weeklyStats');
  const stats = result.weeklyStats || { count: 0, startDate: Date.now() };
  stats.count += deletedCount;
  await chrome.storage.local.set({ weeklyStats: stats });
}

async function showWeeklySummary() {
  const result = await chrome.storage.local.get('weeklyStats');
  const stats = result.weeklyStats || { count: 0, startDate: Date.now() };

  if (stats.count >= 10) {
    await sendGatedNotification('weekly_summary', {
      title: 'Cookie Guardian Weekly Summary',
      message: `Cookie Guardian protected you from ${stats.count.toLocaleString()} tracking cookies this week!`,
      priority: 1
    });
  }

  await chrome.storage.local.set({
    weeklyStats: { count: 0, startDate: Date.now() }
  });

  console.log(`[CookieGuardian] Weekly summary shown: ${stats.count} cookies`);
}

// ============================================
// MILESTONE CELEBRATIONS
// ============================================

const MILESTONES = [100, 500, 1000, 5000, 10000];

async function checkAndCelebrateMilestones(totalDeleted) {
  const result = await chrome.storage.local.get('achievedMilestones');
  const achieved = result.achievedMilestones || [];

  for (const milestone of MILESTONES) {
    if (totalDeleted >= milestone && !achieved.includes(milestone)) {
      const sent = await celebrateMilestone(milestone);
      if (sent) {
        achieved.push(milestone);
      }
    }
  }

  await chrome.storage.local.set({ achievedMilestones: achieved });
}

async function celebrateMilestone(milestone) {
  const messages = {
    100: "You've deleted 100 cookies! Your privacy journey has begun!",
    500: 'Impressive! 500 tracking cookies eliminated!',
    1000: "Wow! 1,000 cookies deleted! You're a privacy champion!",
    5000: 'Amazing! 5,000 tracking cookies blocked!',
    10000: "Incredible! 10,000 cookies deleted! You're a privacy legend!"
  };

  const sent = await sendGatedNotification(`milestone_${milestone}`, {
    title: 'Cookie Guardian Milestone!',
    message: messages[milestone] || `Milestone reached: ${milestone.toLocaleString()} cookies deleted!`,
    priority: 2
  });

  console.log(`[CookieGuardian] Milestone celebrated: ${milestone}`);
  return sent;
}

async function updateBadgeAndMilestones(deletedCount) {
  await incrementDailyCount(deletedCount);
  await updateWeeklyStats(deletedCount);

  const statsResult = await chrome.storage.local.get('stats');
  const stats = statsResult.stats || { totalCookiesDeleted: 0 };
  await checkAndCelebrateMilestones(stats.totalCookiesDeleted);

  // Check for review prompt at 500 cookies
  await checkAndShowReviewPrompt(stats.totalCookiesDeleted);
}

// ============================================
// REVIEW PROMPT SYSTEM
// ============================================

const REVIEW_PROMPT_MILESTONES = [2000, 10000, 20000, 30000];
const CHROME_STORE_REVIEW_URL = 'https://chromewebstore.google.com/detail/cookie-guardian-auto-dele/gnoaanpbfnjakaddkecnnamnfkebhgle/reviews';
const FEEDBACK_URL = 'https://github.com/ethancarlton-cyber/cookie-guardian/issues';

async function checkAndShowReviewPrompt(totalDeleted) {
  const result = await chrome.storage.local.get('reviewPromptState');
  const promptState = result.reviewPromptState || {};

  // If user clicked "Yes, leave a review!" - never prompt again
  if (promptState.reviewLeft) {
    return;
  }

  // Find which milestone we've reached
  const reachedMilestone = REVIEW_PROMPT_MILESTONES.find(m => totalDeleted >= m && !promptState.shownMilestones?.includes(m));

  if (!reachedMilestone) {
    return; // No new milestone reached
  }

  // Show the review prompt (may be suppressed by rate limiter)
  const sent = await showReviewPrompt(reachedMilestone);

  if (sent) {
    // Only mark as shown if notification actually sent
    const shownMilestones = promptState.shownMilestones || [];
    shownMilestones.push(reachedMilestone);

    await chrome.storage.local.set({
      reviewPromptState: {
        ...promptState,
        shownMilestones,
        lastShownAt: Date.now(),
        lastMilestone: reachedMilestone
      }
    });

    console.log('[CookieGuardian] Review prompt shown at', reachedMilestone, 'milestone (total:', totalDeleted, ')');
  }
}

async function showReviewPrompt(milestone) {
  const milestoneText = milestone >= 1000 ? `${milestone / 1000}K` : milestone;
  return sendGatedNotification('review_prompt', {
    title: `You've deleted ${milestoneText}+ cookies!`,
    message: 'Enjoying Cookie Guardian? A quick review helps others find us!',
    buttons: [
      { title: 'Yes, leave a review!' },
      { title: 'Not really...' }
    ],
    priority: 2,
    requireInteraction: true
  });
}

async function handleNotificationButtonClick(notificationId, buttonIndex) {
  if (notificationId === 'review_prompt') {
    const result = await chrome.storage.local.get('reviewPromptState');
    const promptState = result.reviewPromptState || {};

    if (buttonIndex === 0) {
      // User clicked "Yes, leave a review!" - never prompt again, grant bonus
      await chrome.tabs.create({ url: CHROME_STORE_REVIEW_URL });
      await grantReviewBonus();
      console.log('[CookieGuardian] User clicked to leave review, bonus granted');

      await chrome.storage.local.set({
        reviewPromptState: {
          ...promptState,
          reviewLeft: true,
          reviewLeftAt: Date.now()
        }
      });
    } else if (buttonIndex === 1) {
      // User clicked "Not really..." - will prompt at next milestone
      await chrome.tabs.create({ url: FEEDBACK_URL });
      console.log('[CookieGuardian] User clicked to leave feedback');

      await chrome.storage.local.set({
        reviewPromptState: {
          ...promptState,
          lastDeclinedAt: Date.now()
        }
      });
    }

    await chrome.notifications.clear(notificationId);
  }
}

// ============================================
// REVIEW PAGE DETECTION & BONUS
// ============================================

const CWS_EXTENSION_ID = 'gnoaanpbfnjakaddkecnnamnfkebhgle';

async function handleReviewPageVisit() {
  const bonus = await getReviewBonus();
  if (bonus.granted) return; // Already granted, no duplicate notification

  await grantReviewBonus();

  // Also mark reviewLeft in promptState so review prompts stop
  const result = await chrome.storage.local.get('reviewPromptState');
  const promptState = result.reviewPromptState || {};
  await chrome.storage.local.set({
    reviewPromptState: {
      ...promptState,
      reviewLeft: true,
      reviewLeftAt: Date.now()
    }
  });

  try {
    await chrome.notifications.create('review_bonus_thanks', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Thank you for your review!',
      message: `You've earned +${REVIEW_BONUS_SLOTS} bonus whitelist slots! You can now protect up to ${MAX_FREE_WHITELIST_BASE + REVIEW_BONUS_SLOTS} sites for free.`,
      priority: 2
    });
  } catch (e) {
    console.warn('[CookieGuardian] Thank-you notification failed:', e);
  }

  console.log('[CookieGuardian] Review bonus granted via page visit');
}

// ============================================
// TAB CLOSE HANDLER (Core Feature)
// ============================================

async function handleTabRemoved(tabId, removeInfo) {
  const settings = await getSettings();

  if (!settings.enabled || !settings.deleteOnTabClose) {
    return;
  }

  // Get tracked domains from both session (current) and local (persistent) storage
  const [sessionResult, localResult] = await Promise.all([
    chrome.storage.session.get('tabDomains'),
    chrome.storage.local.get('tabDomainsBackup')
  ]);

  const sessionTabDomains = sessionResult.tabDomains || {};
  const localTabDomains = localResult.tabDomainsBackup || {};

  // Try session first, fall back to local backup
  let tabInfo = sessionTabDomains[tabId] || localTabDomains[tabId];

  if (!tabInfo) {
    console.log(`[CookieGuardian] No domain info for tab ${tabId}`);
    return;
  }

  const domain = tabInfo.domain;

  // Clean up from both storages
  delete sessionTabDomains[tabId];
  delete localTabDomains[tabId];
  await Promise.all([
    chrome.storage.session.set({ tabDomains: sessionTabDomains }),
    chrome.storage.local.set({ tabDomainsBackup: localTabDomains })
  ]);

  const isStillOpen = await isDomainOpenInOtherTabs(domain, tabId);

  if (isStillOpen) {
    console.log(`[CookieGuardian] Domain ${domain} still open in other tabs`);
    return;
  }

  const isWhitelisted = await isDomainWhitelisted(domain);

  if (isWhitelisted) {
    console.log(`[CookieGuardian] Domain ${domain} is whitelisted, skipping`);
    return;
  }

  if (settings.cleanDelay > 0) {
    await scheduleDelayedDeletion(domain, settings.cleanDelay);
  } else {
    await performDeletion(domain, settings);
  }
}

async function isDomainOpenInOtherTabs(domain, excludeTabId) {
  const tabs = await chrome.tabs.query({});
  const closingBase = getBaseDomain(domain);
  for (const tab of tabs) {
    if (tab.id === excludeTabId) continue;
    try {
      const tabDomain = extractDomain(tab.url);
      const tabBase = getBaseDomain(tabDomain);
      if (tabBase === closingBase) return true;
    } catch (e) {}
  }
  return false;
}

async function scheduleDelayedDeletion(domain, delaySeconds) {
  const alarmName = `delete_${domain}_${Date.now()}`;

  // Create alarm first, then write to storage. If SW dies between these two
  // operations, a stale alarm that finds no pending entry is harmless.
  const delayMinutes = Math.max(delaySeconds / 60, 0.5);
  await chrome.alarms.create(alarmName, { delayInMinutes: delayMinutes });

  const pendingResult = await chrome.storage.session.get('pendingDeletions');
  const deletions = pendingResult.pendingDeletions || {};
  deletions[alarmName] = { domain, scheduledAt: Date.now() };
  await chrome.storage.session.set({ pendingDeletions: deletions });

  console.log(`[CookieGuardian] Scheduled deletion for ${domain} in ${delaySeconds}s`);
}

async function performDeletion(domain, settings) {
  const result = await deleteCookiesForDomain(domain, {
    keepSessionCookies: settings.keepSessionCookies,
    returnDetails: true
  });

  const deletedCount = result.count;

  if (deletedCount > 0) {
    await updateStats(deletedCount);
    await updateBadgeAndMilestones(deletedCount);

    // Log the deleted cookies
    const logEntries = result.deletedCookies.map(cookie => ({
      timestamp: Date.now(),
      domain: domain,
      cookieName: cookie.name,
      cookieDomain: cookie.domain,
      path: cookie.path,
      reason: 'tab_close'
    }));
    await addToDeletionLog(logEntries);
  }
}

// ============================================
// ALARM HANDLER
// ============================================

async function handleAlarm(alarm) {
  if (alarm.name.startsWith('delete_')) {
    await handleDelayedDeletion(alarm.name);
  } else if (alarm.name === 'scheduled_cleanup') {
    await handleScheduledCleanup();
  } else if (alarm.name === 'daily_badge_reset') {
    await resetDailyCount();
  } else if (alarm.name === 'weekly_summary') {
    await showWeeklySummary();
  } else if (alarm.name === 'cookie_aging_check') {
    await handleCookieAgingCheck();
  }
}

async function handleDelayedDeletion(alarmName) {
  const pendingResult = await chrome.storage.session.get('pendingDeletions');
  const pending = pendingResult.pendingDeletions || {};
  const deletionInfo = pending[alarmName];

  if (!deletionInfo) return;

  const { domain } = deletionInfo;

  const isOpen = await isDomainOpenInOtherTabs(domain, -1);

  if (!isOpen) {
    const isWhitelisted = await isDomainWhitelisted(domain);
    if (!isWhitelisted) {
      const settings = await getSettings();
      await performDeletion(domain, settings);
    } else {
      console.log(`[CookieGuardian] Skipping delayed deletion for ${domain}: whitelisted during delay`);
    }
  }

  delete pending[alarmName];
  await chrome.storage.session.set({ pendingDeletions: pending });
}

// ============================================
// TAB TRACKING
// ============================================

async function handleTabActivated(activeInfo) {
  // Update icon state when switching tabs
  await updateIconState(activeInfo.tabId);
}

async function handleTabUpdated(tabId, changeInfo, tab) {
  if (changeInfo.status !== 'complete' || !tab.url) return;

  try {
    const domain = extractDomain(tab.url);

    const result = await chrome.storage.session.get('tabDomains');
    const tabDomains = result.tabDomains || {};

    const previousDomain = tabDomains[tabId]?.domain;

    const tabInfo = {
      domain: domain,
      timestamp: Date.now()
    };

    tabDomains[tabId] = tabInfo;

    // Save to both session and local storage for persistence
    // Get local backup first, then save both in parallel
    const localResult = await chrome.storage.local.get('tabDomainsBackup');
    const localTabDomains = localResult.tabDomainsBackup || {};
    localTabDomains[tabId] = tabInfo;

    await Promise.all([
      chrome.storage.session.set({ tabDomains }),
      chrome.storage.local.set({ tabDomainsBackup: localTabDomains })
    ]);

    // Update icon state for the current tab
    await updateIconState(tabId);

    // Detect visit to our Chrome Web Store review page
    if (tab.url && tab.url.includes('chromewebstore.google.com') && tab.url.includes(CWS_EXTENSION_ID)) {
      await handleReviewPageVisit();
    }

    const settings = await getSettings();
    if (settings.deleteOnDomainChange && previousDomain && previousDomain !== domain) {
      await handleDomainChange(previousDomain, tabId);
    }

  } catch (error) {
    // Invalid URL (chrome://, etc.), ignore
  }
}

async function handleDomainChange(oldDomain, tabId) {
  const isStillOpen = await isDomainOpenInOtherTabs(oldDomain, tabId);

  if (!isStillOpen) {
    const isWhitelisted = await isDomainWhitelisted(oldDomain);
    if (!isWhitelisted) {
      const settings = await getSettings();
      await performDeletion(oldDomain, settings);
    }
  }
}

async function rebuildTabTracking() {
  const tabs = await chrome.tabs.query({});
  const tabDomains = {};

  for (const tab of tabs) {
    try {
      const domain = extractDomain(tab.url);
      tabDomains[tab.id] = {
        domain: domain,
        timestamp: Date.now()
      };
    } catch (e) {
      // Invalid URL, skip
    }
  }

  // Sync both session and local storage to prevent bloat
  // This ensures local backup only contains currently open tabs
  await Promise.all([
    chrome.storage.session.set({ tabDomains }),
    chrome.storage.local.set({ tabDomainsBackup: tabDomains })
  ]);
  console.log(`[CookieGuardian] Rebuilt tracking for ${Object.keys(tabDomains).length} tabs`);
}

// ============================================
// BROWSER STARTUP
// ============================================

async function handleBrowserStartup() {
  const settings = await getSettings();

  if (settings.deleteOnStartup) {
    await deleteAllNonWhitelistedCookies();
  }
}

async function deleteAllNonWhitelistedCookies() {
  const allCookies = await getAllCookies();
  const settings = await getSettings();
  let deletedCount = 0;

  const cookiesByDomain = {};
  for (const cookie of allCookies) {
    const domain = cookie.domain.startsWith('.')
      ? cookie.domain.substring(1)
      : cookie.domain;

    if (!cookiesByDomain[domain]) {
      cookiesByDomain[domain] = [];
    }
    cookiesByDomain[domain].push(cookie);
  }

  for (const [domain, cookies] of Object.entries(cookiesByDomain)) {
    const isWhitelisted = await isDomainWhitelisted(domain);

    if (!isWhitelisted) {
      for (const cookie of cookies) {
        if (settings.keepSessionCookies && cookie.session) {
          continue;
        }

        try {
          await chrome.cookies.remove(buildRemoveOptions(cookie));
          deletedCount++;
        } catch (e) {
          // Ignore individual cookie errors
        }
      }
    }
  }

  if (deletedCount > 0) {
    await updateStats(deletedCount);
    await updateBadgeAndMilestones(deletedCount);
  }

  console.log(`[CookieGuardian] Startup cleanup: ${deletedCount} cookies deleted`);
}

// ============================================
// SCHEDULED CLEANUP
// ============================================

async function initializeScheduledCleanup() {
  await updateScheduledCleanupAlarm();
  console.log('[CookieGuardian] Scheduled cleanup initialized');
}

async function updateScheduledCleanupAlarm() {
  const settings = await getSettings();

  // Clear existing alarm
  await chrome.alarms.clear('scheduled_cleanup');

  if (settings.enableScheduledCleanup) {
    const intervalMinutes = settings.scheduledCleanupInterval || 60;
    await chrome.alarms.create('scheduled_cleanup', {
      periodInMinutes: intervalMinutes,
      delayInMinutes: intervalMinutes
    });
    console.log(`[CookieGuardian] Scheduled cleanup set for every ${intervalMinutes} minutes`);
  } else {
    console.log('[CookieGuardian] Scheduled cleanup disabled');
  }
}

async function handleScheduledCleanup() {
  const settings = await getSettings();

  if (!settings.enabled || !settings.enableScheduledCleanup) {
    return;
  }

  console.log('[CookieGuardian] Running scheduled cleanup');
  await deleteAllNonWhitelistedCookies();
}

// ============================================
// MESSAGE HANDLER
// ============================================

function handleMessage(request, sender, sendResponse) {
  // Wrap all handlers in async IIFE with error handling
  (async () => {
    try {
      switch (request.action) {
        case 'deleteAllCookies':
          await deleteAllNonWhitelistedCookies();
          sendResponse({ success: true });
          break;

        case 'getStats':
          const statsResult = await chrome.storage.local.get('stats');
          sendResponse(statsResult.stats || { totalCookiesDeleted: 0 });
          break;

        case 'getTodayCount':
          const count = await getTodayCount();
          sendResponse({ count });
          break;

        case 'deleteCookiesForDomain':
          if (!request.domain) {
            sendResponse({ success: false, error: 'Domain is required' });
            break;
          }
          const deletedCount = await deleteCookiesForDomain(request.domain);
          await updateStats(deletedCount);
          await updateBadgeAndMilestones(deletedCount);
          sendResponse({ success: true, deletedCount });
          break;

        case 'updateScheduledCleanup':
          await updateScheduledCleanupAlarm();
          sendResponse({ success: true });
          break;

        case 'getDeletionLog':
          const log = await getDeletionLog();
          sendResponse({ log });
          break;

        case 'clearDeletionLog':
          await clearDeletionLog();
          sendResponse({ success: true });
          break;

        case 'checkWhitelistMatch':
          const matchResult = await checkWhitelistMatch(request.domain);
          console.log('[CookieGuardian] Whitelist check:', matchResult);
          sendResponse(matchResult);
          break;

        case 'getEffectiveWhitelistLimit':
          const limit = await getEffectiveWhitelistLimit();
          sendResponse({ limit });
          break;

        case 'updateBadgeDisplay':
          await updateBadgeDisplay();
          sendResponse({ success: true });
          break;

        default:
          console.warn('[CookieGuardian] Unknown message action:', request.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('[CookieGuardian] Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  // Return true to indicate async response
  return true;
}

// ============================================
// INSTALLATION
// ============================================

async function handleInstall(details) {
  if (details.reason === 'install') {
    await updateSettings({});
    await initializeStats();

    await chrome.storage.local.set({
      achievedMilestones: [],
      weeklyStats: { count: 0, startDate: Date.now() }
    });

    // Open onboarding page
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/onboarding.html') });

    console.log('[CookieGuardian] Extension installed');

  } else if (details.reason === 'update') {
    console.log(`[CookieGuardian] Updated from ${details.previousVersion}`);

    const result = await chrome.storage.local.get(['achievedMilestones', 'weeklyStats']);
    if (!result.achievedMilestones) {
      await chrome.storage.local.set({ achievedMilestones: [] });
    }
    if (!result.weeklyStats) {
      await chrome.storage.local.set({
        weeklyStats: { count: 0, startDate: Date.now() }
      });
    }

    // Migration: grandfather users with >10 whitelist entries or reviewLeft=true
    const bonusResult = await chrome.storage.local.get(['reviewBonus', 'reviewPromptState']);
    if (!bonusResult.reviewBonus) {
      const whitelist = await getWhitelist();
      const reviewPromptState = bonusResult.reviewPromptState || {};
      if (whitelist.length > 10 || reviewPromptState.reviewLeft === true) {
        await grantReviewBonus();
        console.log(`[CookieGuardian] Migration: review bonus auto-granted (whitelist: ${whitelist.length}, reviewLeft: ${reviewPromptState.reviewLeft})`);
      }
    }

    // Migration: normalize existing whitelist/greylist domains
    const wl = await getWhitelist();
    const gl = await getGreylist();
    let domainMigrated = false;
    for (const entry of wl) {
      const normalized = normalizeDomain(entry.domain);
      if (normalized !== entry.domain) { entry.domain = normalized; domainMigrated = true; }
    }
    for (const entry of gl) {
      const normalized = normalizeDomain(entry.domain);
      if (normalized !== entry.domain) { entry.domain = normalized; domainMigrated = true; }
    }
    if (domainMigrated) {
      const dedupWl = wl.filter((e, i, arr) => arr.findIndex(x => x.domain === e.domain) === i);
      const dedupGl = gl.filter((e, i, arr) => arr.findIndex(x => x.domain === e.domain) === i);
      await chrome.storage.local.set({ whitelist: dedupWl, greylist: dedupGl });
      console.log('[CookieGuardian] Migration: normalized whitelist/greylist domains');
    }
  }
}
