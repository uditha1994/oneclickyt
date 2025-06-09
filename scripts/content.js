// function init() {
//     const video = document.querySelector('video');
//     if (!video) {
//       setTimeout(init, 500); // Retry until video loads
//       return;
//     }
// }
// init();
// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    const video = document.querySelector('video');
    if (!video) {
      sendResponse({error: 'No video found'});
      return;
    }
    
    switch (request.action) {
      case 'setQuality':
        setQuality(video, request.quality);
        sendResponse({success: true});
        break;
        
      case 'setSpeed':
        video.playbackRate = parseFloat(request.speed);
        sendResponse({success: true});
        break;
        
      case 'setVolume':
        video.volume = parseInt(request.volume) / 100;
        sendResponse({success: true});
        break;
        
      case 'togglePip':
        togglePictureInPicture(video, request.value);
        sendResponse({success: true});
        break;
        
      case 'toggleTheater':
        toggleTheaterMode(request.value);
        sendResponse({success: true});
        break;
        
      case 'toggleSkipAds':
        // Skip ads implementation would go here
        sendResponse({success: true});
        break;
        
      case 'toggleAutoHD':
        // Auto HD implementation would go here
        sendResponse({success: true});
        break;
        
      case 'getVideoState':
        getVideoState(video).then(state => sendResponse(state));
        return true; // Indicates we want to send response asynchronously
        
      default:
        sendResponse({error: 'Unknown action'});
    }
  });
  
  // Set video quality (simplified - actual implementation would vary)
  function setQuality(video, quality) {
    // Map user-friendly names to YouTube's quality codes
    const qualityMap = {
      '144p': 'tiny',
      '240p': 'small',
      '360p': 'medium',
      '480p': 'large',
      '720p': 'hd720',
      '1080p': 'hd1080',
      '1440p': 'hd1440',
      '2160p': 'hd2160'
    };
  
    const qualityCode = qualityMap[quality];
    if (!qualityCode) {
      console.error('Unsupported quality:', quality);
      return;
    }
  
    // Method 1: Use YouTube's player API (if available)
    if (window.ytplayer && window.ytplayer.config && window.ytplayer.config.args) {
      const player = window.ytplayer.config.args.raw_player_response;
      if (player && player.streamingData) {
        const formats = [...player.streamingData.formats, ...player.streamingData.adaptiveFormats];
        const targetFormat = formats.find(f => f.qualityLabel === quality);
        if (targetFormat) {
          video.src = targetFormat.url;
          video.load();
          console.log('Quality changed to:', quality);
          return;
        }
      }
    }
  
    // Method 2: Click YouTube's quality button (fallback)
    const qualityButton = document.querySelector('.ytp-settings-button');
    if (qualityButton) {
      qualityButton.click();
      setTimeout(() => {
        const qualityOption = document.querySelector(`.ytp-menuitem[data-value="${qualityCode}"]`);
        if (qualityOption) {
          qualityOption.click();
          console.log('Quality changed via UI:', quality);
        } else {
          console.error('Quality option not found:', qualityCode);
        }
      }, 300);
    } else {
      console.error('YouTube quality button not found');
    }
  }
  
  // Toggle Picture-in-Picture mode
  async function togglePictureInPicture(video, enable) {
    try {
      if (enable && !document.pictureInPictureElement) {
        await video.requestPictureInPicture();
      } else if (!enable && document.pictureInPictureElement === video) {
        await document.exitPictureInPicture();
      }
    } catch (error) {
      console.error('Picture-in-Picture error:', error);
    }
  }
  
  // Toggle Theater mode
  function toggleTheaterMode(enable) {
    const theaterButton = document.querySelector('.ytp-size-button');
    if (theaterButton) {
      const isTheater = theaterButton.getAttribute('title')?.includes('Theater');
      if ((enable && !isTheater) || (!enable && isTheater)) {
        theaterButton.click();
      }
    }
  }
  
  // Get current video state
  async function getVideoState(video) {
    return {
      quality: getCurrentQuality(),
      speed: video.playbackRate,
      volume: Math.round(video.volume * 100),
      pipEnabled: document.pictureInPictureElement === video,
      theaterMode: isTheaterModeEnabled()
    };
  }
  
  // Helper function to get current quality
  function getCurrentQuality() {
    const qualityButtons = document.querySelectorAll('.ytp-menuitem[data-value]');
    for (const button of qualityButtons) {
      if (button.getAttribute('aria-checked') === 'true') {
        const value = button.getAttribute('data-value');
        const qualityMap = {
          'tiny': '144p',
          'small': '240p',
          'medium': '360p',
          'large': '480p',
          'hd720': '720p',
          'hd1080': '1080p'
        };
        return qualityMap[value] || value;
      }
    }
    return null;
  }
  
  // Helper function to check theater mode
  function isTheaterModeEnabled() {
    const theaterButton = document.querySelector('.ytp-size-button');
    if (theaterButton) {
      return theaterButton.getAttribute('title')?.includes('Theater');
    }
    return false;
  }
  
  // Skip ads automatically if enabled
  function handleAds() {
    const skipButton = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern');
    if (skipButton) {
      skipButton.click();
    }
    
    const ad = document.querySelector('.ad-showing, .ad-interrupting');
    if (ad && localStorage.getItem('youtubeEnhancerToggleSkipAds') === 'true') {
      const video = document.querySelector('video');
      if (video) {
        video.currentTime = video.duration;
      }
    }
  }
  
  // Observe for ad elements
  const observer = new MutationObserver(handleAds);
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Initial check
  handleAds();