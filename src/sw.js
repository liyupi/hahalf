/*
 Copyright 2014 Google Inc. All Rights Reserved.
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

// While overkill for this specific sample in which there is only one cache,
// this is one best practice that can be followed in general to keep track of
// multiple caches used by a given service worker, and keep them all versioned.
// It maps a shorthand identifier for a cache to a specific, versioned cache name.

// Note that since global state is discarded in between service worker restarts, these
// variables will be reinitialized each time the service worker handles an event, and you
// should not attempt to change their values inside an event handler. (Treat them as constants.)

// If at any point you want to force pages that use this service worker to start using a fresh
// cache, then increment the CACHE_VERSION value. It will kick off the service worker update
// flow and the old cache(s) will be purged as part of the activate event handler when the
// updated service worker is activated.
var CACHE_VERSION = '_BUILD_VERSION_';
var CURRENT_CACHES = {
  prefetch: 'prefetch-cache-v' + CACHE_VERSION
};

var INCLUDED = [_INCLUDED_];

var CACHE_ONLY = [_CACHE_ONLY_];

var NETWORK_ONLY = [_NETWORK_ONLY_];

var EXCLUDED = [_EXCLUDED_];

function matchLocation(url, caches) {
  return caches.find(function (l) {
    return url.indexOf(l) !== -1;
  });
}

self.addEventListener('install', function (event) {
  self.skipWaiting(); // make new service worker activate ASAP
  var now = Date.now();

  var urlsToPrefetch = [_FILES_];

  // All of these logging statements should be visible via the "Inspect" interface
  // for the relevant SW accessed via chrome://serviceworker-internals
  console.log('Handling install event. Resources to prefetch:', urlsToPrefetch);

  event.waitUntil(
    caches.open(CURRENT_CACHES.prefetch).then(function (cache) {
      var cachePromises = urlsToPrefetch.map(function (urlToPrefetch) {
        // This constructs a new URL object using the service worker's script location as the base
        // for relative URLs.
        var url = new URL(urlToPrefetch, location.href);
        // Append a cache-bust=TIMESTAMP URL parameter to each URL's query string.
        // This is particularly important when precaching resources that are later used in the
        // fetch handler as responses directly, without consulting the network (i.e. cache-first).
        // If we were to get back a response from the HTTP browser cache for this precaching request
        // then that stale response would be used indefinitely, or at least until the next time
        // the service worker script changes triggering the install flow.
        url.search += (url.search ? '&' : '?') + 'cache-bust=' + now;

        // It's very important to use {mode: 'no-cors'} if there is any chance that
        // the resources being fetched are served off of a server that doesn't support
        // CORS (http://en.wikipedia.org/wiki/Cross-origin_resource_sharing).
        // In this example, www.chromium.org doesn't support CORS, and the fetch()
        // would fail if the default mode of 'cors' was used for the fetch() request.
        // The drawback of hardcoding {mode: 'no-cors'} is that the response from all
        // cross-origin hosts will always be opaque
        // (https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#cross-origin-resources)
        // and it is not possible to determine whether an opaque response represents a success or failure
        // (https://github.com/whatwg/fetch/issues/14).
        var request = new Request(url, { mode: 'no-cors' });
        return fetch(request).then(function (response) {
          if (response.status >= 400) {
            throw new Error('request for ' + urlToPrefetch +
              ' failed with status ' + response.statusText);
          }

          // Use the original URL without the cache-busting parameter as the key for cache.put().
          return cache.put(urlToPrefetch, response);
        }).catch(function (error) {
          console.error('Not caching ' + urlToPrefetch + ' due to ' + error);
        });
      });

      return Promise.all(cachePromises).then(function () {
        console.log('Pre-fetching complete.');
      });
    }).catch(function (error) {
      console.error('Pre-fetching failed:', error);
    })
  );
});

self.addEventListener('activate', function (event) {
  // Delete all caches that aren't named in CURRENT_CACHES.
  // While there is only one cache in this example, the same logic will handle the case where
  // there are multiple versioned caches.
  var expectedCacheNames = Object.keys(CURRENT_CACHES).map(function (key) {
    return CURRENT_CACHES[key];
  });

  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (expectedCacheNames.indexOf(cacheName) === -1) {
            // If this cache name isn't present in the array of "expected" cache names, then delete it.
            console.log('Deleting out of date cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', function (event) {
  console.log('Handling fetch event for', event.request.url);
  var requestURL = new URL(event.request.url);
  // https://developers.google.com/web/fundamentals/primers/service-workers/high-performance-loading
  if (event.request.mode === 'navigate') {
    console.log('request mode:', event.request.mode);
    // See /web/fundamentals/getting-started/primers/async-functions
    // for an async/await primer.
    event.respondWith(async function () {
      // Optional: Normalize the incoming URL by removing query parameters.
      // Instead of https://example.com/page?key=value,
      // use https://example.com/page when reading and writing to the cache.
      // For static HTML documents, it's unlikely your query parameters will
      // affect the HTML returned. But if you do use query parameters that
      // uniquely determine your HTML, modify this code to retain them.
      const normalizedUrl = requestURL;
      normalizedUrl.search = '';

      // Create promises for both the network response,
      // and a copy of the response that can be used in the cache.
      const fetchResponseP = fetch(normalizedUrl);
      const fetchResponseCloneP = fetchResponseP.then(r => r.clone());

      // event.waitUntil() ensures that the service worker is kept alive
      // long enough to complete the cache update.
      event.waitUntil(async function () {
        const cache = await caches.open(CURRENT_CACHES.prefetch);
        await cache.put(normalizedUrl, await fetchResponseCloneP);
      }());

      // Prefer the cached response, falling back to the fetch response.
      return (await caches.match(normalizedUrl)) || fetchResponseP;
    }());
  } else if (
    matchLocation(requestURL.href, INCLUDED)
    && !matchLocation(requestURL.href, EXCLUDED)
    && /get/i.test(event.request.method)
  ) {
    if (matchLocation(requestURL.href, NETWORK_ONLY)) {
      console.log('network-falling-back-to-caches:', event.request.url);
      // https://developers.google.com/web/fundamentals/instant-and-offline/offline-cookbook/#network-falling-back-to-cache
      event.respondWith(
        caches.open(CURRENT_CACHES.prefetch).then(function (cache) {
          return fetch(event.request).then(function (networkResponse) {
            // save to cache
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }).catch(function () {
            return cache.match(event.request).then(function (response) {
              return response;
            });
          });
        })
      );
    } else if (matchLocation(requestURL.href, CACHE_ONLY)) {
      console.log('cache-falling-back-to-network:', event.request.url);
      // https://developers.google.com/web/fundamentals/instant-and-offline/offline-cookbook/#cache-falling-back-to-network
      event.respondWith(
        caches.open(CURRENT_CACHES.prefetch).then(function (cache) {
          return cache.match(event.request).then(function (response) {
            return response || fetch(event.request).then(function (networkResponse) {
              // save to cache
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          });
        })
      );
    } else {
      console.log('cache-then-network:', event.request.url);
      // https://developers.google.com/web/fundamentals/instant-and-offline/offline-cookbook/#cache-then-network
      event.respondWith(
        caches.open(CURRENT_CACHES.prefetch).then(function (cache) {
          return cache.match(event.request).then(function (response) {
            var fetchPromise = fetch(event.request).then(function (networkResponse) {
              // save to cache
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
            return response || fetchPromise;
          });
        })
      );
    }
  } else if (requestURL.origin == location.origin) {
    console.log('request origin:', requestURL.origin);
    event.respondWith(
      // caches.match() will look for a cache entry in all of the caches available to the service worker.
      // It's an alternative to first opening a specific named cache and then matching on that.
      caches.match(event.request).then(function (response) {
        if (response) {
          console.log('Found response in cache:', response);

          return response;
        }

        console.log('No response found in cache. About to fetch from network...');

        // event.request will always have the proper mode set ('cors, 'no-cors', etc.) so we don't
        // have to hardcode 'no-cors' like we do when fetch()ing in the install handler.
        return fetch(event.request).then(function (response) {
          console.log('Response from network is:', response);

          return response;
        }).catch(function (error) {
          // This catch() will handle exceptions thrown from the fetch() operation.
          // Note that a HTTP error response (e.g. 404) will NOT trigger an exception.
          // It will return a normal response object that has the appropriate error code set.
          console.error('Fetching failed:', error);

          throw error;
        });
      })
    );
  }
});
if ('storage' in navigator && 'estimate' in navigator.storage) {
  navigator.storage.estimate().then(estimate => {
    console.log(`Using ${estimate.usage} out of ${estimate.quota} bytes.`);
  });
}

// debug with chrome
// /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --user-data-dir=/tmp/foo --ignore-certificate-errors --unsafely-treat-insecure-origin-as-secure=https://localhost:1123
