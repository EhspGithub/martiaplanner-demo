/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "430e7fad9c3904dad2c92f3f3c890876"
  }, {
    "url": "pwa-512x512.png",
    "revision": "430e7fad9c3904dad2c92f3f3c890876"
  }, {
    "url": "pwa-192x192.png",
    "revision": "ee69aab270bede5c7b6ca7be1859ac3d"
  }, {
    "url": "index.html",
    "revision": "b4111cf5ad1e1f496b37bd11d23a16dd"
  }, {
    "url": "icon.svg",
    "revision": "88802281a383f8771bbebc8d88f0b8d9"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "cd7abdd59f38fbe38f866b84c2f6c6f3"
  }, {
    "url": "MartiaPlanner-v1.7.0.html",
    "revision": "349c714a12a39e042aad7d1cb7afbe18"
  }, {
    "url": "assets/index-i_tQmKR9.js",
    "revision": null
  }, {
    "url": "assets/index-CmgOYbBq.css",
    "revision": null
  }, {
    "url": "assets/aistudio/image_ead8f0ff.png",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "cd7abdd59f38fbe38f866b84c2f6c6f3"
  }, {
    "url": "icon.svg",
    "revision": "88802281a383f8771bbebc8d88f0b8d9"
  }, {
    "url": "pwa-192x192.png",
    "revision": "ee69aab270bede5c7b6ca7be1859ac3d"
  }, {
    "url": "pwa-512x512.png",
    "revision": "430e7fad9c3904dad2c92f3f3c890876"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "430e7fad9c3904dad2c92f3f3c890876"
  }, {
    "url": "manifest.webmanifest",
    "revision": "ed8ba8bdccdd9dc296c7744b9cfd3510"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/cdn\.jsdelivr\.net\/.*/i, new workbox.CacheFirst({
    "cacheName": "vazirmatn-font-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
