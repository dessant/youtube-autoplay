import browser from 'webextension-polyfill';
import Cookies from 'js-cookie';

import storage from 'storage/storage';
import {waitForElement} from 'utils/common';

function onStorageChange(changes, area) {
  if (changes.autoplayPlaylist) {
    syncPlaylistAutoplay(changes.autoplayPlaylist.newValue);
  }
}

function syncPlaylistAutoplay(autoplay) {
  const script = document.createElement('script');
  script.textContent = `(async function() {
    const manager = await ${waitForElement.toString()}('yt-playlist-manager', {
      timeout: 60000
    });
    if (manager) {
      Object.defineProperty(manager, 'canAutoAdvance_', {
        get: function() {
          return ${autoplay};
        },
        set: function() {}
      });
    }
  })()`;
  document.documentElement.appendChild(script);
  script.remove();
}

async function initSync() {
  browser.storage.onChanged.addListener(onStorageChange);

  const {autoplayPlaylist} = await storage.get('autoplayPlaylist', 'sync');
  if (!autoplayPlaylist) {
    syncPlaylistAutoplay(autoplayPlaylist);
  }
}

if (!Cookies.get('PREF')) {
  Cookies.set('PREF', '', {domain: '.youtube.com', expires: 730});
}

initSync();
