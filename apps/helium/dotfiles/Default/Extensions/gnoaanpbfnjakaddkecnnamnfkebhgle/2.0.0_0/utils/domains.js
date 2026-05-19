// Extract domain from URL
export function extractDomain(urlString) {
  if (!urlString ||
      urlString.startsWith('chrome://') ||
      urlString.startsWith('chrome-extension://') ||
      urlString.startsWith('about:') ||
      urlString.startsWith('edge://')) {
    throw new Error('Invalid URL for cookie tracking');
  }

  const url = new URL(urlString);
  return normalizeDomain(url.hostname);
}

// Get base domain (e.g., "sub.example.com" -> "example.com")
export function getBaseDomain(hostname) {
  const parts = hostname.split('.');

  // Handle special cases like co.uk, com.au
  const twoPartTLDs = ['co.uk', 'com.au', 'co.nz', 'co.jp', 'com.br', 'org.uk', 'net.au'];

  if (parts.length > 2) {
    const lastTwo = parts.slice(-2).join('.');
    if (twoPartTLDs.includes(lastTwo)) {
      return parts.slice(-3).join('.');
    }
  }

  if (parts.length > 1) {
    return parts.slice(-2).join('.');
  }

  return hostname;
}

// Normalize domain for storage
export function normalizeDomain(domain) {
  return domain.toLowerCase().replace(/^www\./, '');
}

// Validate domain input
export function validateDomain(input) {
  // Remove protocol if present
  let domain = input.replace(/^https?:\/\//, '');

  // Remove path
  domain = domain.split('/')[0];

  // Remove port
  domain = domain.split(':')[0];

  // Remove www prefix
  domain = domain.replace(/^www\./, '');

  // Basic domain pattern
  const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;

  if (!domainPattern.test(domain)) {
    throw new Error('Invalid domain format');
  }

  return domain.toLowerCase();
}
