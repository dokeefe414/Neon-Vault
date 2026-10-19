const CACHE='neon-vault-v5.3';
const CORE=[
  './','./index.html','./style.css','./creator.css','./pro.css','./game-polish.css','./mobile.css','./v5.css','./icon.svg','./manifest.webmanifest',
  './src/app.js','./src/core/utils.js','./src/core/random.js','./src/core/store.js','./src/core/rules.js','./src/core/strategy.js','./src/core/simulation.js',
  './src/ui/common.js','./src/ui/views.js','./src/ui/v5.js','./src/progression/progression.js','./src/progression/session.js','./src/progression/weekly.js',
  './src/data/trivia.js','./src/data/trivia-factory.js','./src/data/trivia-geography.js','./src/data/trivia-science.js','./src/data/trivia-sports.js','./src/data/trivia-math.js','./src/data/trivia-history.js','./src/data/trivia-technology.js','./src/games/trivia-selection.js','./src/games/blackjack.js','./src/games/roulette.js','./src/games/slots.js','./src/games/dice.js','./src/games/trivia.js'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy));
    return response;
  }).catch(async()=>{
    const hit=await caches.match(event.request);
    if(hit)return hit;
    if(event.request.mode==='navigate')return caches.match('./index.html');
    return Response.error();
  }));
});
