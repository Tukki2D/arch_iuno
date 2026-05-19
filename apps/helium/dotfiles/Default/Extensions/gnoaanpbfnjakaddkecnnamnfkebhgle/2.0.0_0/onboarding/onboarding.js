import { addToWhitelist, updateSettings, getEffectiveWhitelistLimit } from '../utils/storage.js';

let currentStep = 1;
let selectedSites = new Set(['google.com', 'youtube.com']);

document.addEventListener('DOMContentLoaded', () => {
  initializeEventListeners();
  updateProgressIndicator();
});

function initializeEventListeners() {
  // Step 1
  document.getElementById('step1Next').addEventListener('click', () => navigateToStep(2));
  document.getElementById('skipSetup').addEventListener('click', (e) => { e.preventDefault(); window.close(); });

  // Step 2
  document.getElementById('step2Back').addEventListener('click', () => navigateToStep(1));
  document.getElementById('step2Next').addEventListener('click', () => navigateToStep(3));

  // Step 3
  document.getElementById('step3Back').addEventListener('click', () => navigateToStep(2));
  document.getElementById('step3Next').addEventListener('click', handleWhitelistSubmit);
  document.getElementById('addCustomSite').addEventListener('click', handleAddCustomSite);
  document.getElementById('customSite').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddCustomSite();
  });

  // Whitelist checkboxes
  document.querySelectorAll('.site-option input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        selectedSites.add(e.target.value);
      } else {
        selectedSites.delete(e.target.value);
      }
    });
  });

  // Step 4
  document.getElementById('finishOnboarding').addEventListener('click', handleFinish);
}

function navigateToStep(targetStep) {
  const currentStepElement = document.querySelector(`.step[data-step="${currentStep}"]`);
  const targetStepElement = document.querySelector(`.step[data-step="${targetStep}"]`);

  if (!targetStepElement) return;

  currentStepElement.classList.remove('active');

  setTimeout(() => {
    targetStepElement.classList.add('active');
  }, 100);

  currentStep = targetStep;
  updateProgressIndicator();
}

function updateProgressIndicator() {
  const dots = document.querySelectorAll('.progress-dot');
  const lines = document.querySelectorAll('.progress-line');

  dots.forEach((dot, index) => {
    const step = index + 1;
    dot.classList.remove('active', 'completed');
    if (step < currentStep) {
      dot.classList.add('completed');
    } else if (step === currentStep) {
      dot.classList.add('active');
    }
  });

  lines.forEach((line, index) => {
    if (index + 1 < currentStep) {
      line.classList.add('completed');
    } else {
      line.classList.remove('completed');
    }
  });
}

async function handleAddCustomSite() {
  const input = document.getElementById('customSite');
  let domain = input.value.trim().toLowerCase();

  if (!domain) {
    showNotification('Please enter a domain name', 'error');
    return;
  }

  domain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].split(':')[0];

  const domainPattern = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
  if (!domainPattern.test(domain)) {
    showNotification('Please enter a valid domain (e.g., example.com)', 'error');
    return;
  }

  if (selectedSites.has(domain)) {
    showNotification('This site is already in your list', 'error');
    return;
  }

  const effectiveLimit = await getEffectiveWhitelistLimit();
  if (selectedSites.size >= effectiveLimit) {
    showNotification(`Free tier limit: ${effectiveLimit} sites maximum. Leave a review for +5!`, 'error');
    return;
  }

  selectedSites.add(domain);

  const option = document.createElement('div');
  option.className = 'site-option';
  option.innerHTML = `
    <label class="checkbox-container">
      <input type="checkbox" value="${domain}" checked>
      <span class="checkmark"></span>
      <span class="site-name">${domain}</span>
    </label>
  `;

  option.querySelector('input').addEventListener('change', (e) => {
    if (e.target.checked) {
      selectedSites.add(domain);
    } else {
      selectedSites.delete(domain);
    }
  });

  document.getElementById('whitelistOptions').appendChild(option);
  input.value = '';
  showNotification(`Added ${domain} to your whitelist`, 'success');
}

async function handleWhitelistSubmit() {
  const nextButton = document.getElementById('step3Next');
  nextButton.disabled = true;
  nextButton.textContent = 'Saving...';

  try {
    for (const domain of selectedSites) {
      try {
        await addToWhitelist(domain, { includeSubdomains: true });
      } catch (error) {
        console.log(`Note: ${domain} - ${error.message}`);
      }
    }

    await updateSettings({ onboardingCompleted: true });
    navigateToStep(4);
    document.getElementById('whitelistedCount').textContent = selectedSites.size;

  } catch (error) {
    console.error('Error saving whitelist:', error);
    showNotification('Error saving sites. Please try again.', 'error');
  } finally {
    nextButton.disabled = false;
    nextButton.textContent = 'Continue';
  }
}

async function handleFinish() {
  const finishButton = document.getElementById('finishOnboarding');
  finishButton.disabled = true;
  finishButton.textContent = 'Finishing...';

  try {
    await updateSettings({ onboardingCompleted: true });
    setTimeout(() => window.close(), 500);
  } catch (error) {
    console.error('Error finishing onboarding:', error);
    showNotification('Error completing setup. Please try again.', 'error');
    finishButton.disabled = false;
    finishButton.textContent = 'Start Protecting';
  }
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.textContent = message;
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '1rem 1.5rem',
    borderRadius: '0.5rem',
    backgroundColor: type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6',
    color: 'white',
    fontWeight: '500',
    fontSize: '0.875rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    zIndex: '9999',
    animation: 'slideIn 0.3s ease',
    maxWidth: '300px'
  });

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(100%); }
    to { opacity: 1; transform: translateX(0); }
  }
`;
document.head.appendChild(style);
