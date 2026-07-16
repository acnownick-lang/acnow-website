const CACHE_NAME = 'acnow-cache-v66'; // Bumped for Round 18 updates (geotargeting whitelist, contact simplify, maintenance pricing, and veteran badge update)
const DEBUG = true;

// Helper function for structured logging
function log(level, message, ...args) {
  if (DEBUG) {
    const prefix = `[Service Worker]`;
    if (level === 'info') console.log(prefix, message, ...args);
    else if (level === 'warn') console.warn(prefix, message, ...args);
    else if (level === 'error') console.error(prefix, message, ...args);
  }
  // Log warnings and errors to diagnostics database for troubleshooting
  if (level === 'warn' || level === 'error') {
    saveDiagnosticLog(level, message, args[0]);
  }
}

const STATIC_ASSETS = [
  'index.html',
  'pages/contact.html',
  'pages/about.html',
  'pages/services.html',
  'pages/ac-installation.html',
  'pages/ac-repair.html',
  'pages/ac-maintenance.html',
  'pages/pool-heating.html',
  'pages/areas.html',
  'assets/css/redesign.css',
  'assets/css/home.css',
  'assets/js/app.js',
  'assets/js/home-widgets.js',
  'assets/js/home-interactive.js',
  'assets/js/energy-game.js',
  'assets/js/diagnose-wizard.js',
  'assets/js/hvac-configurator.js',
  'assets/js/lifecycle-planner.js',
  'assets/js/rebate-estimator.js',
  'assets/js/humidity-planner.js',
  'assets/js/duct-simulator.js',
  'assets/js/pool-calculator.js',
  'assets/js/soundboard.js',
  'assets/js/error-logger.js',
  'pages/offline.html',
  'pages/diagnose.html',
  'pages/configurator.html',
  'pages/planner.html',
  'pages/storm-prep.html',
  'manifest.json',
  'assets/lib/three.min.js',
  'assets/lib/OrbitControls.js',
  'assets/images/mascot-logo.svg',
  'assets/images/pwa-icon-512.png',
  'assets/images/pwa-icon-512-maskable.png',
  'assets/images/pwa-icon-192.png',
  'assets/images/pwa-icon-192-maskable.png'
];

// Open Database & Upgrades (Unified Version 3)
function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('acnow-offline-db', 3);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;
      
      if (!db.objectStoreNames.contains('leads')) {
        db.createObjectStore('leads', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('logs')) {
        db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('specs')) {
        db.createObjectStore('specs', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('dead_letter')) {
        db.createObjectStore('dead_letter', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('diagnostics')) {
        db.createObjectStore('diagnostics', { keyPath: 'id', autoIncrement: true });
      }
      log('info', `Database upgraded from version ${oldVersion} to 3`);
    };
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(request.error);
  });
}

function saveDiagnosticLog(level, message, errorObj) {
  getDB().then(db => {
    const transaction = db.transaction('diagnostics', 'readwrite');
    const store = transaction.objectStore('diagnostics');
    store.add({
      level,
      message,
      details: errorObj ? (errorObj.message || String(errorObj)) : null,
      timestamp: Date.now()
    });
  }).catch(err => console.error('[Service Worker] Failed to save diagnostic log:', err));
}

// Install Event
self.addEventListener('install', event => {
  log('info', 'Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        log('info', 'Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', event => {
  log('info', 'Activating Service Worker...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            log('info', 'Deleting outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      log('info', 'Claiming active clients');
      return self.clients.claim();
    })
  );
});

// Fetch Event (Differentiating SWR for Code vs Cache-First for Assets)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass service worker on localhost for real-time development previews
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;

  // Bypass caching entirely for serverless function calls
  if (url.pathname.startsWith('/.netlify/')) return;

  const isMediaOrFont = url.pathname.endsWith('.woff') || 
                        url.pathname.endsWith('.woff2') || 
                        url.pathname.endsWith('.ttf') || 
                        url.pathname.endsWith('.svg') ||
                        url.pathname.includes('/downloaded_images/') || 
                        url.pathname.endsWith('.webp') || 
                        url.pathname.endsWith('.png') || 
                        url.pathname.endsWith('.jpg') || 
                        url.pathname.endsWith('.jpeg');

  const isCodeAsset = url.pathname.endsWith('.css') || 
                      url.pathname.endsWith('.js');

  // 1. Media & Fonts: Cache First with Network Fallback
  if (isMediaOrFont) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
        if (cachedResponse) {
          log('info', 'Cache hit (Media/Font):', url.pathname);
          return cachedResponse;
        }
        log('info', 'Cache miss, fetching asset:', url.pathname);
        return fetch(event.request)
          .then(networkResponse => {
            if (networkResponse.status === 200) {
              return caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse.clone());
                return networkResponse;
              });
            }
            return networkResponse;
          })
          .catch(err => {
            log('error', 'Fetch failed for asset:', url.pathname, err);
            return new Response('Asset Unavailable Offline', { status: 404 });
          });
      })
    );
    return;
  }

  // 2. CSS & JS Code Assets: Stale-While-Revalidate
  if (isCodeAsset) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            if (networkResponse.status === 200) {
              return caches.open(CACHE_NAME).then(cache => {
                return cache.put(event.request, networkResponse.clone()).then(() => networkResponse);
              });
            }
            return networkResponse;
          })
          .catch(err => {
            log('error', 'Fetch failed for code asset:', url.pathname, err);
            if (cachedResponse) return cachedResponse;
            return new Response('Asset Unavailable Offline', { status: 404 });
          });

        if (cachedResponse) {
          event.waitUntil(fetchPromise);
          log('info', 'Cache hit SWR (Code):', url.pathname);
          return cachedResponse;
        }
        log('info', 'Cache miss, fetching code:', url.pathname);
        return fetchPromise;
      })
    );
    return;
  }

  const isRestrictedPath = url.pathname.includes('members') || 
                           url.pathname.includes('team-portal') || 
                           url.pathname.includes('3d-airflow') || 
                           url.pathname.includes('corrosion-predictor');

  const isHTMLRequest = (event.request.mode === 'navigate' || 
                         url.pathname.endsWith('.html') || 
                         url.pathname === '/');

  if (isHTMLRequest) {
    if (isRestrictedPath) {
      event.respondWith(
        fetch(event.request)
          .catch(err => {
            log('warn', 'Network request failed for restricted HTML page:', url.pathname, err);
            return caches.match('pages/offline.html');
          })
      );
      return;
    }

    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse.status === 200) {
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          }
          return networkResponse;
        })
        .catch(err => {
          log('warn', 'Network request failed for HTML page, checking cache:', url.pathname, err);
          return caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
            if (cachedResponse) return cachedResponse;
            return caches.match('pages/offline.html');
          });
        })
    );
  }
});

// Background Sync Handler
self.addEventListener('sync', event => {
  log('info', 'Background Sync event triggered. Tag:', event.tag);
  if (event.tag === 'sync-leads') {
    event.waitUntil(syncLeads());
  } else if (event.tag === 'sync-logs') {
    event.waitUntil(syncLogs());
  } else if (event.tag === 'sync-specs') {
    event.waitUntil(syncSpecs());
  }
});

// Sync Helper with Dead-Letter and Retries
function attemptSyncItem(storeName, item, fetchUrl, authRequired = false) {
  const itemId = item.id;
  const payload = item.payload;
  const retries = item.retries || 0;

  const headers = { 'Content-Type': 'application/json' };
  if (authRequired) {
    headers['Authorization'] = 'Bearer ' + (item.token || '');
  }

  return fetch(fetchUrl, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(payload)
  })
  .then(async (res) => {
    let success = res.ok;
    // Special evaluation for submission functions
    if (res.ok && storeName === 'leads') {
      try {
        const result = await res.clone().json();
        success = result.success;
      } catch (e) {}
    }

    if (success) {
      log('info', `Sync success for ${storeName} #${itemId}. Removing from queue.`);
      return deleteItemFromStore(storeName, itemId).then(() => {
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: `${storeName.toUpperCase()}_SYNC_COMPLETE`, id: itemId, payload });
          });
        });
        if (storeName === 'leads') {
          showSyncCompletedNotification(payload);
        }
      });
    } else {
      // 4xx client errors (excluding network/timeout codes) are unrecoverable; move to dead_letter
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
        log('error', `Unrecoverable client error ${res.status} for ${storeName} #${itemId}. Discarding.`);
        return deleteItemFromStore(storeName, itemId).then(() => {
          return saveToDeadLetterQueue(storeName, item, `HTTP ${res.status}`);
        });
      } else {
        throw new Error(`Server returned temporary error: ${res.status}`);
      }
    }
  })
  .catch(err => {
    const nextRetry = retries + 1;
    log('warn', `Temporary sync failure for ${storeName} #${itemId}. Retry count: ${nextRetry}`, err);

    const updatedItem = { ...item, retries: nextRetry, lastError: err.message || String(err) };
    if (nextRetry >= 5) {
      log('error', `Max retries (5) exceeded for ${storeName} #${itemId}. Discarding to dead_letter queue.`);
      return deleteItemFromStore(storeName, itemId).then(() => {
        return saveToDeadLetterQueue(storeName, updatedItem, 'Max retries (5) exceeded');
      });
    } else {
      // Update item in DB with increased retry count
      return putItemInStore(storeName, updatedItem).then(() => {
        throw err; // Inform Background Sync manager to schedule a retry
      });
    }
  });
}

function syncLeads() {
  log('info', 'Initializing sync of queued leads...');
  return getItemsFromStore('leads').then(leads => {
    if (leads.length === 0) return Promise.resolve();
    return Promise.all(leads.map(lead => {
      return attemptSyncItem('leads', lead, '/.netlify/functions/submit-lead', false);
    }));
  });
}

function syncLogs() {
  log('info', 'Initializing sync of technician logs...');
  return getItemsFromStore('logs').then(logs => {
    if (logs.length === 0) return Promise.resolve();
    return Promise.all(logs.map(logItem => {
      return attemptSyncItem('logs', logItem, '/.netlify/functions/submit-log', true);
    }));
  });
}

function syncSpecs() {
  log('info', 'Initializing sync of equipment specs...');
  return getItemsFromStore('specs').then(specs => {
    if (specs.length === 0) return Promise.resolve();
    return Promise.all(specs.map(specItem => {
      return attemptSyncItem('specs', specItem, '/.netlify/functions/submit-specs', true);
    }));
  });
}

// Push Notifications (Enriched Options)
self.addEventListener('push', event => {
  log('info', 'Push event received.');
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'A/C Now Dispatch', body: event.data.text() };
    }
  }

  const title = data.title || 'A/C Now Dispatch';
  const options = {
    body: data.body || 'Technician dispatch status updated.',
    icon: '/downloaded_images/mascot-logo-transparent.png',
    badge: '/downloaded_images/Logo2.webp',
    image: data.image || null, // Display tech photos or maps if provided
    tag: data.tag || 'dispatch-update', // Collapses duplicate dispatches
    renotify: data.renotify !== undefined ? data.renotify : true,
    requireInteraction: data.requireInteraction || false,
    vibrate: data.vibrate || [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'view', title: 'View Dispatch 📋' },
      { action: 'call', title: 'Call Office 📞' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  log('info', 'Notification clicked. Action:', event.action);

  if (event.action === 'call') {
    event.waitUntil(clients.openWindow('tel:7725213568'));
  } else if (event.action === 'close') {
    return;
  } else {
    const targetUrl = event.notification.data?.url || '/';
    const urlToOpen = new URL(targetUrl, self.location.origin).href;
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(windowClients => {
          for (let client of windowClients) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Helper: Show offline transmission success
function showSyncCompletedNotification(payload) {
  const name = payload.fname ? ` ${payload.fname}` : '';
  const options = {
    body: `Hi${name}, your saved service request has been sent to our team successfully!`,
    icon: '/downloaded_images/mascot-logo-transparent.png',
    badge: '/downloaded_images/Logo2.webp',
    tag: 'sync-success-notification'
  };
  self.registration.showNotification('A/C Service Request Transmitted', options);
}

// Database Helpers
function getItemsFromStore(storeName) {
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

function putItemInStore(storeName, item) {
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

function deleteItemFromStore(storeName, id) {
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

function saveToDeadLetterQueue(storeName, item, errorMsg) {
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('dead_letter', 'readwrite');
      const store = transaction.objectStore('dead_letter');
      store.add({
        originalStore: storeName,
        item: item,
        error: errorMsg,
        timestamp: Date.now()
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  });
}
