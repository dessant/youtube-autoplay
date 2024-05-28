async function setPlaylistAutoplayScript(autoplay) {
  // boolean argument is passed as a string in MV2
  autoplay = autoplay === 'true' || autoplay === true;

  function _findNode(
    selector,
    {
      timeout = 60000,
      throwError = true,
      observerOptions = null,
      rootNode = null
    } = {}
  ) {
    return new Promise((resolve, reject) => {
      rootNode = rootNode || document;

      const el = rootNode.querySelector(selector);
      if (el) {
        resolve(el);
        return;
      }

      const observer = new MutationObserver(function (mutations, obs) {
        const el = rootNode.querySelector(selector);
        if (el) {
          obs.disconnect();
          window.clearTimeout(timeoutId);
          resolve(el);
        }
      });

      const options = {
        childList: true,
        subtree: true
      };
      if (observerOptions) {
        Object.assign(options, observerOptions);
      }

      observer.observe(rootNode, options);

      const timeoutId = window.setTimeout(function () {
        observer.disconnect();

        if (throwError) {
          reject(new Error(`DOM node not found: ${selector}`));
        } else {
          resolve();
        }
      }, timeout);
    });
  }

  const manager = await _findNode('yt-playlist-manager', {
    throwError: false
  });

  if (manager) {
    Object.defineProperty(manager, 'canAutoAdvance_', {
      get: function () {
        return autoplay;
      },
      set: function () {}
    });
  }
}

const scriptFunctions = {setPlaylistAutoplay: setPlaylistAutoplayScript};

function getScriptFunction(func) {
  return scriptFunctions[func];
}

export {getScriptFunction};
