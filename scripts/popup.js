document.addEventListener('DOMContentLoaded', function() {
    // Check for saved dark mode preference
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const savedDarkMode = localStorage.getItem('youtubeEnhancerDarkMode') === 'true';
    
    if (savedDarkMode) {
      document.body.classList.add('dark-mode');
      darkModeToggle.checked = true;
    }
    
    // Toggle dark mode
    darkModeToggle.addEventListener('change', function() {
      document.body.classList.toggle('dark-mode');
      localStorage.setItem('youtubeEnhancerDarkMode', this.checked);
    });
    
    // Quality control buttons
    const qualityButtons = document.querySelectorAll('[data-quality]');
    qualityButtons.forEach(button => {
      button.addEventListener('click', function() {
        const quality = this.getAttribute('data-quality');
        
        // Remove active class from all buttons
        qualityButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        this.classList.add('active');
        
        // Send message to content script to change quality
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'setQuality',
            quality: quality
          });
        });
      });
    });
    
    // Speed control buttons
    const speedButtons = document.querySelectorAll('[data-speed]');
    speedButtons.forEach(button => {
      button.addEventListener('click', function() {
        const speed = this.getAttribute('data-speed');
        
        // Remove active class from all buttons
        speedButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        this.classList.add('active');
        
        // Send message to content script to change speed
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'setSpeed',
            speed: speed
          });
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
    
    volumeSlider.addEventListener('input', function() {
      const volume = this.value;
      volumeValue.textContent = `${volume}%`;
      localStorage.setItem('youtubeEnhancerVolume', volume);
      
      // Send message to content script to change volume
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'setVolume',
          volume: volume
        });
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
      
      toggle.addEventListener('change', function() {
        localStorage.setItem(`youtubeEnhancer${action}`, this.checked);
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: action,
            value: this.checked
          });
        }.bind(this));
      });
    });
    
    // Get current video state when popup opens
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'getVideoState'}, function(response) {
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
            setTimeout(() => sendMessageToContentScript(action, data, callback), 300); // Retry after 300ms
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
  
  // Call this when popup opens
  ensureContentScript().then(() => {
    // Now safely send messages
    sendMessageToContentScript("getVideoState", {}, updateUI);
  });