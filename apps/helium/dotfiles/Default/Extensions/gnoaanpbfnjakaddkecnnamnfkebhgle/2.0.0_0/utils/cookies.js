// Build URL for cookie removal
export function buildCookieUrl(cookie) {
  if (!cookie || typeof cookie !== 'object' || !cookie.domain) {
    console.warn('[CookieGuardian] buildCookieUrl called with invalid cookie:', cookie);
    return '';
  }
  const protocol = cookie.secure ? 'https' : 'http';
  const domain = cookie.domain.startsWith('.')
    ? cookie.domain.substring(1)
    : cookie.domain;
  return `${protocol}://${domain}${cookie.path || '/'}`;
}

// Build remove options with partitionKey support for CHIPS cookies
export function buildRemoveOptions(cookie) {
  const url = buildCookieUrl(cookie);
  const options = { url, name: cookie.name, storeId: cookie.storeId };
  if (cookie.partitionKey) {
    options.partitionKey = cookie.partitionKey;
  }
  return options;
}

function deduplicateCookies(cookies) {
  const seen = new Set();
  return cookies.filter(c => {
    const key = `${c.name}|${c.domain}|${c.path}|${JSON.stringify(c.partitionKey || null)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Delete all cookies for a domain
// Returns { count, deletedCookies } when returnDetails is true, otherwise just count
export async function deleteCookiesForDomain(domain, options = {}) {
  const { keepSessionCookies = false, returnDetails = false } = options;

  // Validate domain parameter
  if (!domain || typeof domain !== 'string' || domain.trim() === '') {
    console.warn('[CookieGuardian] deleteCookiesForDomain called with invalid domain:', domain);
    return returnDetails ? { count: 0, deletedCookies: [] } : 0;
  }

  try {
    // Get all cookies for this domain (including partitioned/CHIPS cookies)
    const cookies = await chrome.cookies.getAll({ domain: domain });
    const subdomainCookies = await chrome.cookies.getAll({ domain: '.' + domain });
    const partCookies = await chrome.cookies.getAll({ domain: domain, partitionKey: {} });
    const partSubCookies = await chrome.cookies.getAll({ domain: '.' + domain, partitionKey: {} });
    const wwwCookies = await chrome.cookies.getAll({ domain: 'www.' + domain });
    const wwwPartCookies = await chrome.cookies.getAll({ domain: 'www.' + domain, partitionKey: {} });

    const allCookies = [...cookies, ...subdomainCookies, ...partCookies, ...partSubCookies, ...wwwCookies, ...wwwPartCookies];
    const uniqueCookies = deduplicateCookies(allCookies);

    // Filter session cookies if setting enabled
    const cookiesToDelete = keepSessionCookies
      ? uniqueCookies.filter(c => !c.session)
      : uniqueCookies;

    // Delete each cookie
    let deletedCount = 0;
    const deletedCookies = [];

    for (const cookie of cookiesToDelete) {
      try {
        await chrome.cookies.remove(buildRemoveOptions(cookie));
        deletedCount++;

        if (returnDetails) {
          deletedCookies.push({
            name: cookie.name,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            session: cookie.session
          });
        }
      } catch (e) {
        console.warn(`[CookieGuardian] Failed to delete cookie ${cookie.name}:`, e);
      }
    }

    console.log(`[CookieGuardian] Deleted ${deletedCount} cookies for ${domain}`);

    if (returnDetails) {
      return { count: deletedCount, deletedCookies };
    }
    return deletedCount;

  } catch (error) {
    console.error(`[CookieGuardian] Error deleting cookies for ${domain}:`, error);
    return returnDetails ? { count: 0, deletedCookies: [] } : 0;
  }
}

// Get cookie count for a domain
export async function getCookieCountForDomain(domain) {
  if (!domain || typeof domain !== 'string' || domain.trim() === '') {
    return 0;
  }

  const cookies = await chrome.cookies.getAll({ domain: domain });
  const subdomainCookies = await chrome.cookies.getAll({ domain: '.' + domain });
  const partCookies = await chrome.cookies.getAll({ domain: domain, partitionKey: {} });
  const partSubCookies = await chrome.cookies.getAll({ domain: '.' + domain, partitionKey: {} });
  const wwwCookies = await chrome.cookies.getAll({ domain: 'www.' + domain });
  const wwwPartCookies = await chrome.cookies.getAll({ domain: 'www.' + domain, partitionKey: {} });

  const allCookies = [...cookies, ...subdomainCookies, ...partCookies, ...partSubCookies, ...wwwCookies, ...wwwPartCookies];
  const uniqueCookies = deduplicateCookies(allCookies);

  return uniqueCookies.length;
}

// Get all cookies (for cleanup)
export async function getAllCookies() {
  const regular = await chrome.cookies.getAll({});
  const partitioned = await chrome.cookies.getAll({ partitionKey: {} });
  return deduplicateCookies([...regular, ...partitioned]);
}

// Get cookies for a domain (for cookie viewer)
export async function getCookiesForDomain(domain) {
  if (!domain || typeof domain !== 'string' || domain.trim() === '') {
    return [];
  }

  const cookies = await chrome.cookies.getAll({ domain: domain });
  const subdomainCookies = await chrome.cookies.getAll({ domain: '.' + domain });
  const partCookies = await chrome.cookies.getAll({ domain: domain, partitionKey: {} });
  const partSubCookies = await chrome.cookies.getAll({ domain: '.' + domain, partitionKey: {} });
  const wwwCookies = await chrome.cookies.getAll({ domain: 'www.' + domain });
  const wwwPartCookies = await chrome.cookies.getAll({ domain: 'www.' + domain, partitionKey: {} });

  const allCookies = [...cookies, ...subdomainCookies, ...partCookies, ...partSubCookies, ...wwwCookies, ...wwwPartCookies];
  const uniqueCookies = deduplicateCookies(allCookies);

  return uniqueCookies.sort((a, b) => a.name.localeCompare(b.name));
}

// Delete a single cookie
export async function deleteCookie(cookie) {
  if (!cookie || typeof cookie !== 'object' || !cookie.domain || !cookie.name) {
    console.warn('[CookieGuardian] deleteCookie called with invalid cookie:', cookie);
    return;
  }

  const url = buildCookieUrl(cookie);
  if (!url) {
    return;
  }

  await chrome.cookies.remove(buildRemoveOptions(cookie));
}
