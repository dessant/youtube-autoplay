import storage from 'storage/storage';
import {findNode} from 'utils/common';

const contentStorage = {
  autoplay: false,
  videoNodes: []
};

function addVideo(video) {
  if (!contentStorage.videoNodes.includes(video)) {
    contentStorage.videoNodes.push(video);

    const events = ['play', 'progress', 'ended'];
    for (const event of events) {
      video.addEventListener(event, setAutoplay);
    }
  }
}

function removeVideo(video) {
  const index = contentStorage.videoNodes.indexOf(video);

  if (index !== -1) {
    contentStorage.videoNodes.splice(index, 1);

    const events = ['play', 'progress', 'ended'];
    for (const event of events) {
      video.removeEventListener(event, setAutoplay);
    }
  }
}

async function onAutoplayButtonClick(ev) {
  const targetNode = ev.target;

  let autoplay;
  if (targetNode.nodeName.toLowerCase() === 'button') {
    autoplay = targetNode.querySelector('[aria-checked="true"]') !== null;
  } else {
    autoplay = targetNode.getAttribute('aria-checked') === 'true';
  }

  await storage.set({autoplay});
  await browser.runtime.sendMessage({id: 'optionChange'});
}

async function setAutoplay() {
  const button = await findNode(
    '.ytp-right-controls button[data-tooltip-target-id="ytp-autonav-toggle-button"]',
    {throwError: false}
  );

  if (button) {
    button.removeEventListener('click', onAutoplayButtonClick);

    const isOn = button.querySelector('[aria-checked="true"]') !== null;
    if (contentStorage.autoplay !== isOn) {
      button.click();
    }

    button.addEventListener('click', onAutoplayButtonClick);
  }
}

function syncAutoplay(autoplay) {
  contentStorage.autoplay = autoplay;

  setAutoplay();
}

function syncPlaylistAutoplay(autoplay) {
  const script = document.createElement('script');
  script.textContent = `(async function() {
    const manager = await ${findNode.toString()}('yt-playlist-manager', {
      throwError: false
    });
    if (manager) {
      Object.defineProperty(manager, 'canAutoAdvance_', {
        get: function() {
          return ${autoplay};
        },
        set: function() {}
      });
    }
  })()`;
  document.documentElement.appendChild(script);
  script.remove();
}

async function syncState() {
  const {autoplay, autoplayPlaylist} = await storage.get([
    'autoplay',
    'autoplayPlaylist'
  ]);

  syncAutoplay(autoplay);
  syncPlaylistAutoplay(autoplayPlaylist);
}

function onMessage(request, sender) {
  // Samsung Internet 13: extension messages are sometimes also dispatched
  // to the sender frame.
  if (sender.url === document.URL) {
    return;
  }

  if (request.id === 'syncState') {
    syncState();
  }
}

function setup() {
  const videos = document.getElementsByTagName('video');
  for (const video of videos) {
    addVideo(video);
  }

  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeName.toLowerCase() === 'video') {
          addVideo(node);
        }
      });

      mutation.removedNodes.forEach(function (node) {
        if (node.nodeName.toLowerCase() === 'video') {
          removeVideo(node);
        }
      });
    });
  });

  observer.observe(document, {childList: true, subtree: true});

  syncState();
}

function init() {
  browser.runtime.onMessage.addListener(onMessage);

  setup();
}

init();
