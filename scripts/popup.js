document.addEventListener('DOMContentLoaded', function () {
  // Check for saved dark mode preference
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  const savedDarkMode = localStorage.getItem('youtubeEnhancerDarkMode') === 'true';

  if (savedDarkMode) {
    document.body.classList.add('dark-mode');
    darkModeToggle.checked = true;
  }

  // Toggle dark mode
  darkModeToggle.addEventListener('change', function () {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('youtubeEnhancerDarkMode', this.checked);
  });

  // Quality control buttons
  const qualityButtons = document.querySelectorAll('[data-quality]');
  qualityButtons.forEach(button => {
    button.addEventListener('click', function () {
      const quality = this.getAttribute('data-quality');

      // Remove active class from all buttons
      qualityButtons.forEach(btn => btn.classList.remove('active'));

      // Add active class to clicked button
      this.classList.add('active');

      // Use the new handler for quality changes
      handleQualityChange(quality);
    });
  });

  // Speed control buttons
  const speedButtons = document.querySelectorAll('[data-speed]');
  speedButtons.forEach(button => {
    button.addEventListener('click', function () {
      const speed = this.getAttribute('data-speed');

      // Remove active class from all buttons
      speedButtons.forEach(btn => btn.classList.remove('active'));

      // Add active class to clicked button
      this.classList.add('active');

      // Send message to content script to change speed
      sendMessageToContentScript('setSpeed', { speed: speed }, (response) => {
        if (!response?.success) {
          console.error('Failed to set speed:', speed);
        }
      });
    });
  });

  // Volume slider
  const volumeSlider = document.getElementById('volume-slider');
  const volumeValue = document.querySelector('.slider-value');

  // Load saved volume
  const savedVolume = localStorage.getItem('youtubeEnhancerVolume');
  if (savedVolume) {
    volumeSlider.value = savedVolume;
    volumeValue.textContent = `${savedVolume}%`;
  }

  volumeSlider.addEventListener('input', function () {
    const volume = this.value;
    volumeValue.textContent = `${volume}%`;
    localStorage.setItem('youtubeEnhancerVolume', volume);

    // Send message to content script to change volume
    sendMessageToContentScript('setVolume', { volume: volume }, (response) => {
      if (!response?.success) {
        console.error('Failed to set volume:', volume);
      }
    });
  });

  // Feature toggles
  const featureToggles = {
    'pip-switch': 'togglePip',
    'theater-switch': 'toggleTheater',
    'skip-ads-switch': 'toggleSkipAds',
    'auto-hd-switch': 'toggleAutoHD'
  };

  Object.entries(featureToggles).forEach(([id, action]) => {
    const toggle = document.getElementById(id);

    // Load saved toggle state
    const savedState = localStorage.getItem(`youtubeEnhancer${action}`);
    if (savedState === 'true') {
      toggle.checked = true;
    }

    toggle.addEventListener('change', function () {
      localStorage.setItem(`youtubeEnhancer${action}`, this.checked);

      sendMessageToContentScript(action, { value: this.checked }, (response) => {
        if (!response?.success) {
          console.error(`Failed to ${action}:`, this.checked);
        }
      });
    });
  });

  // Get current video state when popup opens
  ensureContentScript().then(() => {
    sendMessageToContentScript("getVideoState", {}, (response) => {
      if (response) {
        // Update quality button
        if (response.quality) {
          const qualityBtn = document.querySelector(`[data-quality="${response.quality}"]`);
          if (qualityBtn) {
            qualityButtons.forEach(btn => btn.classList.remove('active'));
            qualityBtn.classList.add('active');
          }
        }

        // Update speed button
        if (response.speed) {
          const speedBtn = document.querySelector(`[data-speed="${response.speed}"]`);
          if (speedBtn) {
            speedButtons.forEach(btn => btn.classList.remove('active'));
            speedBtn.classList.add('active');
          }
        }

        // Update volume slider
        if (response.volume) {
          volumeSlider.value = response.volume;
          volumeValue.textContent = `${response.volume}%`;
        }

        // Update feature toggles
        if (response.pipEnabled !== undefined) {
          document.getElementById('pip-switch').checked = response.pipEnabled;
        }
        if (response.theaterMode !== undefined) {
          document.getElementById('theater-switch').checked = response.theaterMode;
        }
      }
    });
  });
});

function handleQualityChange(quality) {
  sendMessageToContentScript('setQuality', { quality: quality }, (response) => {
    if (!response?.success) {
      console.error('Failed to set quality:', quality);
      // Revert UI state if quality change failed
      const activeBtn = document.querySelector('[data-quality].active');
      if (activeBtn && activeBtn.getAttribute('data-quality') === quality) {
        activeBtn.classList.remove('active');
      }
    }
  });
}

function sendMessageToContentScript(action, data, callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0] || !tabs[0].id) {
      console.error("No active YouTube tab found");
      return;
    }

    // Try sending the message
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action, ...data },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn("Content script not ready, retrying...", chrome.runtime.lastError);
          setTimeout(() => sendMessageToContentScript(action, data, callback), 300);
          return;
        }
        callback(response);
      }
    );
  });
}

async function ensureContentScript() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.url.includes("youtube.com")) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['scripts/content.js'],
    });
    console.log("Content script injected!");
  } catch (err) {
    console.error("Injection failed:", err);
  }
}