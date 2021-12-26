import browser from 'webextension-polyfill';

import {initStorage, migrateLegacyStorage} from 'storage/init';
import {isStorageReady} from 'storage/storage';
import storage from 'storage/storage';
import {executeCode, executeFile, updateCookie} from 'utils/common';
import {targetEnv} from 'utils/config';

async function syncState(autoplay) {
  if (!autoplay) {
    ({autoplay} = await storage.get('autoplay'));
  }

  const tabs = await browser.tabs.query({url: 'https://www.youtube.com/*'});
  for (const tab of tabs) {
    const tabId = tab.id;
    if (await executeCode(`typeof setSwitchState === 'undefined'`, tabId)) {
      await executeFile('/src/content/script.js', tabId);
    }
    await executeCode(`setSwitchState(${autoplay})`, tabId);
  }

  const stores = await browser.cookies.getAllCookieStores();
  for (const store of stores) {
    const params = {
      domain: 'youtube.com',
      name: 'PREF',
      storeId: store.id
    };
    if (targetEnv === 'firefox') {
      params.firstPartyDomain = null;
    }
    const cookies = await browser.cookies.getAll(params);

    for (const cookie of cookies) {
      const value = new URLSearchParams(cookie.value);
      const autoplayValue = value.get('f5');

      if (autoplay && ['30000', '30030'].includes(autoplayValue)) {
        value.set('f5', '20000');
        await updateCookie(cookie, 'https://www.youtube.com/', {
          value: value.toString()
        });
        continue;
      }

      if (!autoplay && [null, '20000', '30', '20030'].includes(autoplayValue)) {
        value.set('f5', '30000');
        await updateCookie(cookie, 'https://www.youtube.com/', {
          value: value.toString()
        });
      }
    }
  }
}

async function onCookieChange(changeInfo) {
  const cookie = changeInfo.cookie;
  if (
    cookie.domain === '.youtube.com' &&
    cookie.name === 'PREF' &&
    !changeInfo.removed
  ) {
    const {autoplay} = await storage.get('autoplay');

    // old layout values ('f5') - initial (on): 30, on: 20030, off: 30030
    // new layout values ('f5') - initial (on): none, on: 200(0|3)0, off: 300(0|3)0
    const value = new URLSearchParams(cookie.value);
    const autoplayValue = value.get('f5');

    if (autoplay && ['30000', '30030'].includes(autoplayValue)) {
      return await storage.set({autoplay: false});
    }

    if (!autoplay) {
      if ([null, '30'].includes(autoplayValue)) {
        value.set('f5', '30000');
        return await updateCookie(cookie, 'https://www.youtube.com/', {
          value: value.toString()
        });
      }

      if (['20000', '20030'].includes(autoplayValue)) {
        return await storage.set({autoplay: true});
      }
    }
  }
}

async function onStorageChange(changes, area) {
  if (area === 'local' && (await isStorageReady())) {
    if (changes.autoplay) {
      await syncState(changes.autoplay.newValue);
    }
  }
}

function addCookieListener() {
  browser.cookies.onChanged.addListener(onCookieChange);
}

function addStorageListener() {
  browser.storage.onChanged.addListener(onStorageChange);
}

async function setup() {
  if (!(await isStorageReady())) {
    await migrateLegacyStorage();
    await initStorage();
  }

  await syncState();
}

function init() {
  addStorageListener();
  addCookieListener();

  setup();
}

init();
