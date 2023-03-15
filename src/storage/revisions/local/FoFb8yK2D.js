const message = 'Add playlist autoplay option';

const revision = 'FoFb8yK2D';

async function upgrade() {
  const changes = {installTime: new Date().getTime(), autoplayPlaylist: false};

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
