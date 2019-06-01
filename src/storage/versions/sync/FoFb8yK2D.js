import browser from 'webextension-polyfill';

const message = 'Add playlist autoplay option';

const revision = 'FoFb8yK2D';
const downRevision = 'HZQD8wqaz';

const storage = browser.storage.sync;

async function upgrade() {
  const changes = {installTime: new Date().getTime(), autoplayPlaylist: false};

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  const changes = {};
  await storage.remove(['installTime', 'autoplayPlaylist']);

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

export {message, revision, upgrade, downgrade};
