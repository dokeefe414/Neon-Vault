import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'./tests/e2e',
  fullyParallel:true,
  forbidOnly:!!process.env.CI,
  retries:process.env.CI?1:0,
  workers:process.env.CI?2:undefined,
  timeout:30_000,
  expect:{timeout:7_500},
  reporter:process.env.CI
    ?[['line'],['html',{outputFolder:'playwright-report',open:'never'}]]
    :'list',
  use:{
    baseURL:'http://127.0.0.1:4173',
    browserName:'chromium',
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
    video:'retain-on-failure'
  },
  projects:[
    {name:'desktop-chromium',use:{viewport:{width:1440,height:900}}},
    {name:'mobile-chromium',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}
  ],
  webServer:{
    command:'python3 -m http.server 4173 --bind 127.0.0.1',
    url:'http://127.0.0.1:4173',
    reuseExistingServer:!process.env.CI,
    timeout:120_000,
    stdout:'ignore',
    stderr:'ignore'
  }
});
