import {initStorage, migrateLegacyStorage} from 'storage/init';
import {isStorageReady} from 'storage/storage';
import storage from 'storage/storage';
import {
  executeCode,
  executeFile,
  updateCookie,
  getPlatform
} from 'utils/common';
import {
  showPage,
  showOptionsPage,
  processAppUse,
  processMessageResponse
} from 'utils/app';
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

async function processMessage(request, sender) {
  // Samsung Internet 13: extension messages are sometimes also dispatched
  // to the sender frame.
  if (sender.url === document.URL) {
    return;
  }

  if (targetEnv === 'samsung') {
    if (
      /^internet-extension:\/\/.*\/src\/action\/index.html/.test(
        sender.tab?.url
      )
    ) {
      // Samsung Internet 18: runtime.onMessage provides sender.tab
      // when the message is sent from the browser action,
      // and tab.id refers to a nonexistent tab.
      sender.tab = null;
    }

    if (sender.tab && sender.tab.id !== browser.tabs.TAB_ID_NONE) {
      // Samsung Internet 13: runtime.onMessage provides wrong tab index.
      sender.tab = await browser.tabs.get(sender.tab.id);
    }
  }

  if (request.id === 'getPlatform') {
    return getPlatform({fallback: false});
  } else if (request.id === 'optionChange') {
    await onOptionChange();
  } else if (request.id === 'showPage') {
    await showPage({url: request.url});
  } else if (request.id === 'appUse') {
    await processAppUse();
  }
}

function onMessage(request, sender, sendResponse) {
  const response = processMessage(request, sender);

  return processMessageResponse(response, sendResponse);
}

async function onOptionChange() {
  await syncState();
}

async function onActionButtonClick(tab) {
  await showOptionsPage({activeTab: tab});
}

function addBrowserActionListener() {
  browser.browserAction.onClicked.addListener(onActionButtonClick);
}

function addMessageListener() {
  browser.runtime.onMessage.addListener(onMessage);
}

function addCookieListener() {
  browser.cookies.onChanged.addListener(onCookieChange);
}

async function setup() {
  if (!(await isStorageReady())) {
    await migrateLegacyStorage();
    await initStorage();
  }

  await syncState();
}

function init() {
  addBrowserActionListener();
  addMessageListener();
  addCookieListener();

  setup();
}

init();
