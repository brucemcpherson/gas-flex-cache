import '@mcpher/gas-fakes'
import { Exports as unitExports } from '@mcpher/unit'
import { newCacheProxy } from '../src/cacheproxy.js'


(() => {
  // initialize test suite
  const unit = unitExports.newUnit({
    showErrorsOnly: true
  })

  // apps script can't get from parent without access to the getresource of the parent
  // this will only run if we're actually on apps script
  if (unitExports.CodeLocator.isGas) {
    // because a GAS library cant get its caller's code
    unitExports.CodeLocator.setGetResource(ScriptApp.getResource)
    // optional - generally not needed - only necessary if you are using multiple libraries and some files share the same ID
    unitExports.CodeLocator.setScriptId(ScriptApp.getScriptId())
  }

  if (ScriptApp.isFake) {
    console.log(`...we're testing on live apps script`)
  } else {
    console.log(`...we're testing on gas-fakes`)
  }

  // we modify the cacheservice by simply adding a new service to it
  // in order to avoid accidentally overwriting anything, precede the name with __
  // gas-fakes checks for this, but apps script will not.
  CacheService.__getUpstashCache = () => newCacheProxy({
    token: 'AVlrAAIncDFlMmJjOTY0MWIzNDA0NzU0OTNlNTI1ODllYTVkMjY5Y3AxMjI4OTE',
    url: 'https://generous-eft-22891.upstash.io',
    name: 'upstash'
  }, {})
   
  // now we can behave as if we we were using a normal service like CacheService.getScriptCache()
  unit.section('check that all the cacheservices now work', t => {

    t.is (typeof ScriptApp.getOAuthToken(), 'string', 'check auth all works before starting to ensure we can get a userId')

    const caches = ['getScriptCache',  'getUserCache', '__getUpstashCache']
    caches.forEach(c => {
      const cache = CacheService[c]()
      t.is(cache.put("foo", "bar"), null)
      t.is("bar", cache.get("foo"))
    })

  })

  unit.report()
})()