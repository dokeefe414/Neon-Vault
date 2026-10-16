const CACHE='neon-vault-v4';
const CORE=[
  './','./index.html','./style.css','./creator.css','./pro.css','./icon.svg','./manifest.webmanifest',
  './src/app.js','./src/core/utils.js','./src/core/random.js','./src/core/store.js',
  './src/ui/common.js','./src/ui/views.js','./src/progression/progression.js','./src/progression/session.js',
  './src/data/trivia.js','./src/games/blackjack.js','./src/games/roulette.js','./src/games/slots.js','./src/games/dice.js','./src/games/trivia.js'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(
    fetch(event.request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      return response;
    }).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('./index.html')))
  );
});
