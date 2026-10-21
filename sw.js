const CACHE='neon-vault-v6.0';
const CORE=[
  './','./index.html','./style.css','./creator.css','./pro.css','./game-polish.css','./mobile.css','./v5.css','./v57.css','./cloud.css','./icon.svg','./manifest.webmanifest',
  './src/app.js','./src/core/utils.js','./src/core/random.js','./src/core/store.js','./src/core/rules.js','./src/core/baccarat.js','./src/core/poker.js','./src/core/strategy.js','./src/core/simulation.js',
  './src/ui/common.js','./src/ui/views.js','./src/ui/v5.js','./src/ui/records.js','./src/ui/cloud.js','./src/ui/rewards-views.js','./src/progression/progression.js','./src/progression/session.js','./src/progression/weekly.js','./src/progression/rewards.js',
  './src/data/trivia.js','./src/data/trivia-factory.js','./src/data/trivia-geography.js','./src/data/trivia-science.js','./src/data/trivia-sports.js','./src/data/trivia-math.js','./src/data/trivia-history.js','./src/data/trivia-technology.js','./src/games/trivia-selection.js','./src/games/blackjack.js','./src/games/roulette.js','./src/games/slots.js','./src/games/dice.js','./src/games/baccarat.js','./src/games/poker.js','./src/games/trivia.js'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

// Only cache known same-origin static files and navigation fallbacks.
// Never intercept authenticated API traffic, third-party resources, or private responses.
const STATIC_ASSETS=new Set(CORE.map(path=>new URL(path,self.registration.scope).href));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const requested=new URL(event.request.url);
  if(requested.origin!==self.location.origin)return;
  const isNavigation=event.request.mode==='navigate';
  if(!isNavigation&&!STATIC_ASSETS.has(requested.href))return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok&&response.type==='basic'&&!response.headers.get('Cache-Control')?.includes('no-store')){
      const copy=response.clone();
      event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));
    }
    return response;
  }).catch(async()=>{
    const hit=await caches.match(event.request);
    if(hit)return hit;
    if(isNavigation)return caches.match('./index.html');
    return Response.error();
  }));
});
