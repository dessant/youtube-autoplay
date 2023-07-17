import storage from 'storage/storage';
import {
  getText,
  createTab,
  getActiveTab,
  getPlatform,
  getDayPrecisionEpoch,
  getDarkColorSchemeQuery
} from 'utils/common';
import {targetEnv, enableContributions} from 'utils/config';

function getListItems(data, {scope = '', shortScope = ''} = {}) {
  const results = {};

  for (const [group, items] of Object.entries(data)) {
    results[group] = [];

    items.forEach(function (item) {
      if (item.value === undefined) {
        item = {value: item};
      }

      item.title = getText(`${scope ? scope + '_' : ''}${item.value}`);

      if (shortScope) {
        item.shortTitle = getText(`${shortScope}_${item.value}`);
      }

      results[group].push(item);
    });
  }

  return results;
}

async function loadFonts(fonts) {
  await Promise.allSettled(fonts.map(font => document.fonts.load(font)));
}

async function configApp(app) {
  const platform = await getPlatform();

  const classes = [platform.targetEnv, platform.os];
  document.documentElement.classList.add(...classes);

  if (app) {
    app.config.globalProperties.$env = platform;
  }
}

function processMessageResponse(response, sendResponse) {
  if (targetEnv === 'safari') {
    response.then(function (result) {
      // Safari 15: undefined response will cause sendMessage to never resolve.
      if (result === undefined) {
        result = null;
      }
      sendResponse(result);
    });

    return true;
  } else {
    return response;
  }
}

async function getOpenerTabId(openerTab) {
  if (isValidTab(openerTab) && !(await getPlatform()).isMobile) {
    return openerTab.id;
  }

  return null;
}

function isValidTab(tab) {
  if (tab && tab.id !== browser.tabs.TAB_ID_NONE) {
    return true;
  }
}

async function showPage({
  url = '',
  setOpenerTab = true,
  getTab = false,
  activeTab = null
} = {}) {
  if (!activeTab) {
    activeTab = await getActiveTab();
  }

  const props = {url, index: activeTab.index + 1, active: true, getTab};

  if (setOpenerTab) {
    props.openerTabId = await getOpenerTabId(activeTab);
  }

  return createTab(props);
}

async function autoShowContributePage({
  minUseCount = 0, // 0-1000
  minInstallDays = 0,
  minLastOpenDays = 0,
  minLastAutoOpenDays = 0,
  action = 'auto',
  activeTab = null
} = {}) {
  if (enableContributions) {
    const options = await storage.get([
      'showContribPage',
      'useCount',
      'installTime',
      'contribPageLastOpen',
      'contribPageLastAutoOpen'
    ]);

    const epoch = getDayPrecisionEpoch();

    if (
      options.showContribPage &&
      options.useCount >= minUseCount &&
      epoch - options.installTime >= minInstallDays * 86400000 &&
      epoch - options.contribPageLastOpen >= minLastOpenDays * 86400000 &&
      epoch - options.contribPageLastAutoOpen >= minLastAutoOpenDays * 86400000
    ) {
      await storage.set({
        contribPageLastOpen: epoch,
        contribPageLastAutoOpen: epoch
      });

      return showContributePage({
        action,
        updateStats: false,
        activeTab,
        getTab: true
      });
    }
  }
}

let useCountLastUpdate = 0;
async function updateUseCount({
  valueChange = 1,
  maxUseCount = Infinity,
  minInterval = 0
} = {}) {
  if (Date.now() - useCountLastUpdate >= minInterval) {
    useCountLastUpdate = Date.now();

    const {useCount} = await storage.get('useCount');

    if (useCount < maxUseCount) {
      await storage.set({useCount: useCount + valueChange});
    } else if (useCount > maxUseCount) {
      await storage.set({useCount: maxUseCount});
    }
  }
}

async function processAppUse({
  action = 'auto',
  activeTab = null,
  showContribPage = true
} = {}) {
  await updateUseCount({
    valueChange: 1,
    maxUseCount: 1000,
    minInterval: 60000
  });

  if (showContribPage) {
    return autoShowContributePage({
      minUseCount: 1,
      minInstallDays: 14,
      minLastOpenDays: 14,
      minLastAutoOpenDays: 365,
      activeTab,
      action
    });
  }
}

async function showContributePage({
  action = '',
  updateStats = true,
  getTab = false,
  activeTab = null
} = {}) {
  if (updateStats) {
    await storage.set({contribPageLastOpen: getDayPrecisionEpoch()});
  }

  let url = browser.runtime.getURL('/src/contribute/index.html');
  if (action) {
    url = `${url}?action=${action}`;
  }

  return showPage({url, getTab, activeTab});
}

async function showOptionsPage({getTab = false, activeTab = null} = {}) {
  // Samsung Internet 13: runtime.openOptionsPage fails.
  // runtime.openOptionsPage adds new tab at the end of the tab list.
  return showPage({
    url: browser.runtime.getURL('/src/options/index.html'),
    getTab,
    activeTab
  });
}

async function getAppTheme(theme) {
  if (!theme) {
    ({appTheme: theme} = await storage.get('appTheme'));
  }

  if (theme === 'auto') {
    theme = getDarkColorSchemeQuery().matches ? 'dark' : 'light';
  }

  return theme;
}

function addSystemThemeListener(callback) {
  getDarkColorSchemeQuery().addEventListener('change', function () {
    callback();
  });
}

function addAppThemeListener(callback) {
  browser.storage.onChanged.addListener(function (changes, area) {
    if (area === 'local' && changes.appTheme) {
      callback();
    }
  });
}

function addThemeListener(callback) {
  addSystemThemeListener(callback);
  addAppThemeListener(callback);
}

async function insertBaseModule({
  activeTab = false,
  url = null,
  allFrames = true
} = {}) {
  const tabs = [];
  if (activeTab) {
    const tab = await getActiveTab();
    if (tab) {
      tabs.push(tab);
    }
  } else {
    tabs.push(
      ...(await browser.tabs.query({
        url: url || ['http://*/*', 'https://*/*'],
        windowType: 'normal'
      }))
    );
  }

  for (const tab of tabs) {
    browser.tabs.executeScript(tab.id, {
      allFrames,
      runAt: 'document_start',
      file: '/src/base/script.js'
    });
  }
}

export {
  getListItems,
  configApp,
  loadFonts,
  processMessageResponse,
  showContributePage,
  autoShowContributePage,
  updateUseCount,
  processAppUse,
  showOptionsPage,
  getOpenerTabId,
  isValidTab,
  showPage,
  getAppTheme,
  addSystemThemeListener,
  addAppThemeListener,
  addThemeListener,
  insertBaseModule
};
