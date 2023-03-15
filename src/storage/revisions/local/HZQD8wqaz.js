const message = 'Initial version';

const revision = 'HZQD8wqaz';

async function upgrade() {
  const changes = {
    autoplay: false
  };

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
