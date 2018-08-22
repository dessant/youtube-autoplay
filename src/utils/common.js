import browser from 'webextension-polyfill';

const getText = browser.i18n.getMessage;

function executeCode(string, tabId, frameId = 0, runAt = 'document_start') {
  return browser.tabs.executeScript(tabId, {
    frameId: frameId,
    runAt: runAt,
    code: string
  });
}

function executeFile(file, tabId, frameId = 0, runAt = 'document_start') {
  return browser.tabs.executeScript(tabId, {
    frameId: frameId,
    runAt: runAt,
    file: file
  });
}

async function updateCookie(cookie, url, changes) {
  const newCookie = {
    url,
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    storeId: cookie.storeId
  };

  if (cookie.hasOwnProperty('expirationDate')) {
    newCookie.expirationDate = cookie.expirationDate;
  }

  // Chrome
  if (cookie.hasOwnProperty('sameSite')) {
    newCookie.sameSite = cookie.sameSite;
  }

  // Firefox >= 58
  if (cookie.hasOwnProperty('firstPartyDomain')) {
    newCookie.firstPartyDomain = cookie.firstPartyDomain;
  }

  Object.assign(newCookie, changes);

  await browser.cookies.set(newCookie);
}

export {getText, executeCode, executeFile, updateCookie};
