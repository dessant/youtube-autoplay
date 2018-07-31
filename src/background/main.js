import browser from 'webextension-polyfill';

import storage from 'storage/storage';
import {executeCode, executeFile, updateCookie} from 'utils/common';
import {targetEnv} from 'utils/config';

async function onCookie(changeInfo) {
  const cookie = changeInfo.cookie;
  if (
    cookie.domain === '.youtube.com' &&
    cookie.name === 'PREF' &&
    changeInfo.cause === 'explicit' &&
    !changeInfo.removed
  ) {
    const {autoplay} = await storage.get('autoplay', 'sync');

    // old layout values ('f5') - initial (on): 30, on: 20030, off: 30030
    // new layout values ('f5') - initial (on): none, on: 200(0|3)0, off: 300(0|3)0
    const value = new URLSearchParams(cookie.value);
    const autoplayValue = value.get('f5');

    if (autoplay && ['30000', '30030'].includes(autoplayValue)) {
      return await storage.set({autoplay: false}, 'sync');
    }

    if (!autoplay) {
      if ([null, '30'].includes(autoplayValue)) {
        value.set('f5', '30000');
        return await updateCookie(cookie, 'https://www.youtube.com/', {
          value: value.toString()
        });
      }

      if (['20000', '20030'].includes(autoplayValue)) {
        return await storage.set({autoplay: true}, 'sync');
      }
    }
  }
}

async function syncState(autoplay) {
  if (!autoplay) {
    var {autoplay} = await storage.get('autoplay', 'sync');
  }

  const tabs = await browser.tabs.query({url: 'https://*.youtube.com/*'});
  for (const tab of tabs) {
    const tabId = tab.id;
    if (await executeCode(`typeof setSwitchState === 'undefined'`, tabId)) {
      await executeFile('/src/content/autoplay-switch.js', tabId);
    }
    await executeCode(`setSwitchState(${autoplay})`, tabId);
  }

  let firstPartySupport;
  if (targetEnv === 'firefox') {
    const {version} = await browser.runtime.getBrowserInfo();
    if (parseInt(version.slice(0, 2), 10) >= 58) {
      firstPartySupport = true;
    }
  }

  const stores = await browser.cookies.getAllCookieStores();
  for (const store of stores) {
    const params = {
      url: 'https://www.youtube.com/',
      domain: '.youtube.com',
      name: 'PREF',
      storeId: store.id
    };
    if (firstPartySupport) {
      params.firstPartyDomain = null;
    }
    const cookies = await browser.cookies.getAll(params);
    params.url = 'https://m.youtube.com/';
    cookies.push(...(await browser.cookies.getAll(params)));

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

async function onStorageChange(changes, area) {
  if (changes.autoplay) {
    await syncState(changes.autoplay.newValue);
  }
}

function addCookieListener() {
  browser.cookies.onChanged.addListener(onCookie);
}

function addStorageListener() {
  browser.storage.onChanged.addListener(onStorageChange);
}

async function onLoad() {
  await storage.init('sync');
  await syncState();
  addStorageListener();
  addCookieListener();
}

document.addEventListener('DOMContentLoaded', onLoad);
