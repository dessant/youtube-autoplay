import {initStorage, migrateLegacyStorage} from 'storage/init';
import {isStorageReady} from 'storage/storage';
import {getPlatform} from 'utils/common';
import {
  showPage,
  showOptionsPage,
  processAppUse,
  processMessageResponse,
  insertBaseModule
} from 'utils/app';
import {targetEnv} from 'utils/config';

async function syncState() {
  const tabs = await browser.tabs.query({url: 'https://www.youtube.com/*'});
  for (const tab of tabs) {
    browser.tabs
      .sendMessage(tab.id, {id: 'syncState'}, {frameId: 0})
      .catch(err => null);
  }

  await processAppUse();
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

async function onInstall(details) {
  if (
    ['install', 'update'].includes(details.reason) &&
    ['chrome', 'edge', 'opera', 'samsung'].includes(targetEnv)
  ) {
    await insertBaseModule({
      url: 'https://www.youtube.com/*',
      allFrames: false
    });
  }
}

function addBrowserActionListener() {
  browser.browserAction.onClicked.addListener(onActionButtonClick);
}

function addMessageListener() {
  browser.runtime.onMessage.addListener(onMessage);
}

function addInstallListener() {
  browser.runtime.onInstalled.addListener(onInstall);
}

async function setup() {
  if (!(await isStorageReady())) {
    await migrateLegacyStorage();
    await initStorage();
  }
}

function init() {
  addBrowserActionListener();
  addMessageListener();
  addInstallListener();

  setup();
}

init();
