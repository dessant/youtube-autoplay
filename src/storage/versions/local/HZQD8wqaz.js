import browser from 'webextension-polyfill';

const message = 'Initial version';

const revision = 'HZQD8wqaz';
const downRevision = null;

const storage = browser.storage.local;

async function upgrade() {
  const changes = {
    autoplay: false
  };

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  return storage.clear();
}

module.exports = {
  message,
  revision,
  upgrade,
  downgrade
};
