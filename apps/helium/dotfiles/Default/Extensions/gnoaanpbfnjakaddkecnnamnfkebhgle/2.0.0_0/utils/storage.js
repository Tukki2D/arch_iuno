import { normalizeDomain } from './domains.js';

// Storage keys
const STORAGE_KEYS = {
  SETTINGS: 'settings',
  WHITELIST: 'whitelist',
  GREYLIST: 'greylist',
  PREMIUM: 'premium',
  STATS: 'stats',
  DAILY_STATS: 'dailyStats',
  REVIEW_BONUS: 'reviewBonus'
};

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,
  deleteOnTabClose: true,
  deleteOnDomainChange: false,
  deleteOnStartup: true,
  notifyOnDelete: false,
  keepSessionCookies: false,
  cleanDelay: 3,
  theme: 'system',
  // Greylist settings
  greylistAutoExpire: true,
  greylistExpireDays: 7,
  // Cookie aging settings
  enableCookieAging: false,
  cookieMaxAgeHours: 24,
  // Scheduled cleanup settings
  enableScheduledCleanup: false,
  scheduledCleanupInterval: 60, // minutes
  // Premium browsing data cleanup settings
  cleanLocalStorage: false,
  cleanIndexedDB: false,
  cleanCache: false,
  showBadgeCount: true
};

// Free tier limits
const MAX_FREE_WHITELIST_BASE = 10;
const REVIEW_BONUS_SLOTS = 5;
const MAX_FREE_WHITELIST = 10; // kept for backward compat

// Get settings with defaults
export async function getSettings() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...result.settings };
}

// Update settings
export async function updateSettings(updates) {
  const current = await getSettings();
  const merged = { ...current, ...updates };
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: merged });
  return merged;
}

// Get whitelist
export async function getWhitelist() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.WHITELIST);
  return result.whitelist || [];
}

// Get greylist
export async function getGreylist() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.GREYLIST);
  return result.greylist || [];
}

// Add to greylist
export async function addToGreylist(domain, options = {}) {
  domain = normalizeDomain(domain);
  const greylist = await getGreylist();
  const whitelist = await getWhitelist();

  // Check if already in whitelist (with subdomain awareness)
  const isInWhitelist = whitelist.some(item => {
    if (item.includeSubdomains) {
      return domain === item.domain || domain.endsWith('.' + item.domain);
    }
    return domain === item.domain;
  });
  if (isInWhitelist) {
    throw new Error('ALREADY_WHITELISTED');
  }

  // Check for duplicate in greylist
  if (greylist.some(item => item.domain === domain)) {
    throw new Error('ALREADY_EXISTS');
  }

  const newEntry = {
    id: crypto.randomUUID(),
    domain: domain,
    includeSubdomains: options.includeSubdomains ?? true,
    addedAt: Date.now(),
    lastAccessed: Date.now(),
    cookieNames: options.cookieNames ?? null
  };

  greylist.push(newEntry);
  await chrome.storage.local.set({ [STORAGE_KEYS.GREYLIST]: greylist });
  return newEntry;
}

// Remove from greylist
export async function removeFromGreylist(id) {
  const greylist = await getGreylist();
  const filtered = greylist.filter(item => item.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEYS.GREYLIST]: filtered });
}

// Promote from greylist to whitelist
export async function promoteToWhitelist(id) {
  const greylist = await getGreylist();
  const entry = greylist.find(item => item.id === id);

  if (!entry) {
    throw new Error('NOT_FOUND');
  }

  // Try to add to whitelist
  await addToWhitelist(entry.domain, {
    includeSubdomains: entry.includeSubdomains,
    cookieNames: entry.cookieNames
  });

  // Remove from greylist
  await removeFromGreylist(id);
}

// Update greylist entry's last accessed time
export async function updateGreylistAccess(domain) {
  domain = normalizeDomain(domain);
  const greylist = await getGreylist();
  const entry = greylist.find(item => {
    if (item.includeSubdomains) {
      return domain === item.domain || domain.endsWith('.' + item.domain);
    }
    return domain === item.domain;
  });

  if (entry) {
    entry.lastAccessed = Date.now();
    await chrome.storage.local.set({ [STORAGE_KEYS.GREYLIST]: greylist });
  }
}

// Clean expired greylist entries
export async function cleanExpiredGreylistEntries(expireDays = 7) {
  const greylist = await getGreylist();
  const cutoffTime = Date.now() - (expireDays * 24 * 60 * 60 * 1000);

  const filtered = greylist.filter(item => item.lastAccessed > cutoffTime);

  if (filtered.length !== greylist.length) {
    await chrome.storage.local.set({ [STORAGE_KEYS.GREYLIST]: filtered });
    return greylist.length - filtered.length; // Return count of removed entries
  }

  return 0;
}

// Add to whitelist
export async function addToWhitelist(domain, options = {}) {
  domain = normalizeDomain(domain);
  const whitelist = await getWhitelist();
  const effectiveLimit = await getEffectiveWhitelistLimit();

  // Check free tier limit
  if (whitelist.length >= effectiveLimit) {
    throw new Error('FREE_TIER_LIMIT');
  }

  // Check for duplicate
  if (whitelist.some(item => item.domain === domain)) {
    throw new Error('ALREADY_EXISTS');
  }

  const newEntry = {
    id: crypto.randomUUID(),
    domain: domain,
    includeSubdomains: options.includeSubdomains ?? true,
    addedAt: Date.now(),
    cookieNames: options.cookieNames ?? null
  };

  whitelist.push(newEntry);
  await chrome.storage.local.set({ [STORAGE_KEYS.WHITELIST]: whitelist });
  return newEntry;
}

// Remove from whitelist
export async function removeFromWhitelist(id) {
  const whitelist = await getWhitelist();
  const filtered = whitelist.filter(item => item.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEYS.WHITELIST]: filtered });
}

// Check if domain is whitelisted (with detailed matching)
export async function isDomainWhitelisted(domain) {
  domain = normalizeDomain(domain);
  const whitelist = await getWhitelist();
  const greylist = await getGreylist();

  const allLists = [...whitelist, ...greylist];

  for (const item of allLists) {
    if (item.includeSubdomains) {
      // Match exact domain OR any subdomain
      if (domain === item.domain || domain.endsWith('.' + item.domain)) {
        return true;
      }
    } else {
      // Exact match only
      if (domain === item.domain) {
        return true;
      }
    }
  }

  return false;
}

// Check if domain is specifically in the greylist (not whitelist)
export async function isDomainGreylisted(domain) {
  domain = normalizeDomain(domain);
  const greylist = await getGreylist();

  for (const item of greylist) {
    if (item.includeSubdomains) {
      if (domain === item.domain || domain.endsWith('.' + item.domain)) {
        return true;
      }
    } else {
      if (domain === item.domain) {
        return true;
      }
    }
  }

  return false;
}

// Debug function to check whitelist matching (for troubleshooting)
export async function checkWhitelistMatch(domain) {
  const whitelist = await getWhitelist();
  const greylist = await getGreylist();

  const result = {
    domain,
    isWhitelisted: false,
    matchedEntry: null,
    matchType: null,
    whitelistEntries: whitelist.map(w => ({ domain: w.domain, includeSubdomains: w.includeSubdomains })),
    greylistEntries: greylist.map(g => ({ domain: g.domain, includeSubdomains: g.includeSubdomains }))
  };

  const allLists = [...whitelist.map(w => ({ ...w, listType: 'whitelist' })), ...greylist.map(g => ({ ...g, listType: 'greylist' }))];

  for (const item of allLists) {
    if (item.includeSubdomains) {
      if (domain === item.domain) {
        result.isWhitelisted = true;
        result.matchedEntry = item.domain;
        result.matchType = `exact match (${item.listType})`;
        break;
      }
      if (domain.endsWith('.' + item.domain)) {
        result.isWhitelisted = true;
        result.matchedEntry = item.domain;
        result.matchType = `subdomain match (${item.listType})`;
        break;
      }
    } else {
      if (domain === item.domain) {
        result.isWhitelisted = true;
        result.matchedEntry = item.domain;
        result.matchType = `exact match only (${item.listType})`;
        break;
      }
    }
  }

  return result;
}

// Get premium status
export async function getPremiumStatus() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.PREMIUM);
  return result.premium || { isPremium: false };
}

// Set premium status
export async function setPremiumStatus(status) {
  await chrome.storage.local.set({ [STORAGE_KEYS.PREMIUM]: status });
}

// Get review bonus status
export async function getReviewBonus() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.REVIEW_BONUS);
  return result.reviewBonus || { granted: false };
}

// Grant review bonus (+5 whitelist slots)
export async function grantReviewBonus() {
  const current = await getReviewBonus();
  if (current.granted) return current;
  const bonus = { granted: true, grantedAt: Date.now() };
  await chrome.storage.local.set({ [STORAGE_KEYS.REVIEW_BONUS]: bonus });
  return bonus;
}

// Get effective whitelist limit (single source of truth)
export async function getEffectiveWhitelistLimit() {
  const premium = await getPremiumStatus();
  if (premium.isPremium) return Infinity;
  const bonus = await getReviewBonus();
  return bonus.granted ? MAX_FREE_WHITELIST_BASE + REVIEW_BONUS_SLOTS : MAX_FREE_WHITELIST_BASE;
}

// Get statistics
export async function getStats() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.STATS);
  return result.stats || { totalCookiesDeleted: 0, installDate: null, lastCleanupTime: null };
}

// Update statistics
export async function updateStats(deletedCount) {
  const stats = await getStats();
  stats.totalCookiesDeleted += deletedCount;
  stats.lastCleanupTime = Date.now();
  await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: stats });

  // Also record in daily stats
  await recordDailyDeletion(deletedCount);
}

// Initialize stats on install
export async function initializeStats() {
  await chrome.storage.local.set({
    [STORAGE_KEYS.STATS]: {
      totalCookiesDeleted: 0,
      installDate: Date.now(),
      lastCleanupTime: null
    }
  });
}

// Get daily statistics array
export async function getDailyStats() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.DAILY_STATS);
  return result.dailyStats || [];
}

// Record deletion in daily stats
export async function recordDailyDeletion(count) {
  const dailyStats = await getDailyStats();
  const today = getDateKey(new Date());

  let todayEntry = dailyStats.find(entry => entry.date === today);

  if (todayEntry) {
    todayEntry.count += count;
  } else {
    todayEntry = { date: today, count: count, timestamp: Date.now() };
    dailyStats.push(todayEntry);
  }

  // Keep only last 30 days
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);
  const cutoffKey = getDateKey(cutoffDate);

  const filtered = dailyStats
    .filter(entry => entry.date >= cutoffKey)
    .sort((a, b) => a.date.localeCompare(b.date));

  await chrome.storage.local.set({ [STORAGE_KEYS.DAILY_STATS]: filtered });
}

// Get stats for a date range
export async function getStatsForDateRange(startDate, endDate) {
  const dailyStats = await getDailyStats();
  const startKey = getDateKey(startDate);
  const endKey = getDateKey(endDate);

  return dailyStats.filter(entry => entry.date >= startKey && entry.date <= endKey);
}

// Get last 7 days for chart
export async function getLast7DaysStats() {
  const today = new Date();
  const dailyStats = await getDailyStats();
  const stats = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const dateKey = getDateKey(date);
    const dayEntry = dailyStats.find(entry => entry.date === dateKey);

    stats.push({
      date: dateKey,
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      count: dayEntry ? dayEntry.count : 0
    });
  }

  return stats;
}

// Calculate average daily deletions based on days with actual activity
export async function getAverageDailyDeletions() {
  const stats = await getStats();
  if (stats.totalCookiesDeleted === 0) return 0;

  const dailyStats = await getDailyStats();
  const daysWithActivity = dailyStats.filter(d => d.count > 0).length;

  if (daysWithActivity === 0) return 0;

  return Math.round(stats.totalCookiesDeleted / daysWithActivity);
}

// Helper function to get date key in YYYY-MM-DD format
function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get today's deletion count from persistent storage
export async function getTodayCount() {
  const dailyStats = await getDailyStats();
  const today = getDateKey(new Date());
  const todayEntry = dailyStats.find(entry => entry.date === today);
  return todayEntry ? todayEntry.count : 0;
}

// ============================================
// DELETION LOG
// ============================================

const MAX_DELETION_LOG_ENTRIES = 100;

export async function addToDeletionLog(entries) {
  const result = await chrome.storage.local.get('deletionLog');
  const log = result.deletionLog || [];

  // Add new entries at the beginning
  log.unshift(...entries);

  // Trim to max size
  if (log.length > MAX_DELETION_LOG_ENTRIES) {
    log.length = MAX_DELETION_LOG_ENTRIES;
  }

  await chrome.storage.local.set({ deletionLog: log });
}

export async function getDeletionLog() {
  const result = await chrome.storage.local.get('deletionLog');
  return result.deletionLog || [];
}

export async function clearDeletionLog() {
  await chrome.storage.local.set({ deletionLog: [] });
}

// Export for constants
export { MAX_FREE_WHITELIST, MAX_FREE_WHITELIST_BASE, REVIEW_BONUS_SLOTS, STORAGE_KEYS, DEFAULT_SETTINGS };
