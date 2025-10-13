//import '@mcpher/gas-fakes'
//import { Exports as unitExports } from '@mcpher/unit'
//import { newCacheDropin , getUserIdFromToken } from '../../gasflex/src/cachedropin.js'
//import is from '@sindresorhus/is';

const test = () => {
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
    console.log(`...we're testing on gas-fakes`)
    // 'check auth all works before starting to ensure we can get a userId'
    ScriptApp.getOAuthToken()
  } else {
    console.log(`...we're testing on live apps script`)
  }

  // these are held in property service in both gas-fakes and live apps script
  const upstashKey = "dropin_upstash_credentials"
  const crs = PropertiesService.getScriptProperties().getProperty(upstashKey)
  if (!crs) {
    throw new Error('failed to find ${upstashKey} in properties}')
  }
  const creds = JSON.parse(crs)

  // test the fetcher options too
  const fetcher = UrlFetchApp.fetch

  // we can either modify the cacheservice by simply adding a new service to it
  // in order to avoid accidentally overwriting anything, precede the name with __
  // gas-fakes checks for this, but apps script will not.
  // alternatively you can make some new service
  CacheService.__getUpstashCache = () => newCacheDropin({ creds, fetcher })

  const caches = ['getScriptCache', 'getUserCache', '__getUpstashCache'].map(c => CacheService[c]())
  const cup = caches[2]

  const cheeses = {
    "english": "cheese",
    "french": "fromage",
    "spanish": "queso",
    "italian": "formaggio",
    "dutch": "kaas",
    "welsh": "caws",
    "hindu": "paneer",
    "danish": "ost"
  }

  // now we can behave as if we we were using a normal service like CacheService.getScriptCache()
  unit.section('check that all the cacheservices work', t => {
    const okeys = Reflect.ownKeys(cheeses)
    caches.forEach(cache => {
      okeys.forEach(language => {
        t.is(cache.put(language, cheeses[language]), null)
      })
      okeys.forEach(language => {
        t.is(cache.get(language), cheeses[language])
      })
    })

    // check upstash returns all the right values
    t.deepEqual(cup.getAll(okeys), cheeses)

    // delete them all
    caches.forEach(cache => {
      okeys.forEach(language => {
        t.is(cache.remove(language), null)
      })
      okeys.forEach(language => {
        t.is(cache.get(language), null)
      })
    })

    // lets do a putall and removeall
    t.is(cup.putAll(cheeses), null)
    t.deepEqual(cup.getAll(okeys), cheeses)
    t.is(cup.removeAll(okeys), null)
    t.deepEqual(cup.getAll(okeys), {})

    // lets get some unknown keys
    t.is(cup.putAll(cheeses), null)
    t.deepEqual(cup.getAll(okeys), cheeses)
    t.is(cup.get('french'), 'fromage')
    t.is(cup.remove('french'), null)
    t.is(cup.get('french'), null)
    t.is(cup.put('french', 'fromage'), null)
    t.deepEqual(cup.getAll(okeys), cheeses)
    t.deepEqual(cup.getAll(['spanish', 'chinese']), { spanish: 'queso' })
    t.is(cup.removeAll(okeys), null)


  })

  unit.section('check that cache partitioning works', t => {
    const key = 'somekey'
    const userId = getUserIdFromToken(ScriptApp.getOAuthToken())
    t.true (is.nonEmptyString(userId), 'should have got a userid')

    const cacheConfigs = [
      { config: {}, name: 'default', value: 'value1' },
      { config: { family: 'another-family' }, name: 'family', value: 'value2' },
      { config: { scriptId: 'another-script' }, name: 'scriptId', value: 'value3' },
      { config: { userId: 'another-user' }, name: 'userId', value: 'value4' },
      { config: { documentId: 'another-doc' }, name: 'documentId', value: 'value5' },
      { config: { scriptId: 'another-script', kind: "cache" }, name: 'cacheKind', value: 'value6' },
      { config: { scriptId: 'another-script', kind: "property" }, name: 'propertyKind', value: 'value7' }
    ]

    const caches = cacheConfigs.map(cc => ({
      ...cc,
      instance: newCacheDropin({ creds: { ...creds, ...cc.config } })
    }))

    // clean up from previous runs
    caches.forEach(c => c.instance.remove(key))
    caches.forEach(c => {
      t.is(c.instance.get(key), null, `cache ${c.name} should be empty initially`)
    })

    // put a unique value in each cache
    caches.forEach(c => {
      c.instance.put(key, c.value)
    })

    // check that each cache has its own value and was not overwritten
    caches.forEach(c => {
      t.is(c.instance.get(key), c.value, `cache ${c.name} should have its own value`)
    })

    // clean up
    caches.forEach(c => c.instance.remove(key))
  })

  unit.section('check that bulk methods also respect partitioning', t => {

    const userId = getUserIdFromToken(ScriptApp.getOAuthToken())
    t.true (is.nonEmptyString(userId), 'should have got a userid')

    const dataSets = [
      { d: { k1: 'v1.1', k2: 'v1.2' }, name: 'default', config: {} },
      { d: { k1: 'v2.1', k2: 'v2.2' }, name: 'family', config: { family: 'another-family' } },
      { d: { k1: 'v3.1', k2: 'v3.2' }, name: 'scriptId', config: { scriptId: 'another-script' } },
      { d: { k1: 'v4.1', k2: 'v4.2' }, name: 'userId', config: { userId } },
      { d: { k1: 'v5.1', k2: 'v5.2' }, name: 'documentId', config: { documentId: 'another-doc' } },
      { d: { k1: 'v6.1', k2: 'v6.2' }, name: 'cache', config: { scriptId: 'another-script' , kind: 'cache'} },
      { d: { k1: 'v7.1', k2: 'v7.2' }, name: 'property', config: { documentId: 'another-script' , kind: 'property'} }
    ]

    const allKeys = [...new Set(dataSets.flatMap(ds => Object.keys(ds.d)))]

    const caches = dataSets.map(ds => ({
      ...ds,
      instance: newCacheDropin({ creds: { ...creds, ...ds.config } })
    }))

    // clean up from previous runs using removeAll
    caches.forEach(c => c.instance.removeAll(allKeys))
    caches.forEach(c => {
      t.deepEqual(c.instance.getAll(allKeys), {}, `cache ${c.name} should be empty initially`)
    })

    // put a unique dataset in each cache using putAll
    caches.forEach(c => {
      c.instance.putAll(c.d)
    })

    // check that each cache has its own value and was not overwritten using getAll
    caches.forEach(c => {
      t.deepEqual(c.instance.getAll(allKeys), c.d, `cache ${c.name} should have its own values`)
    })

    // clean up
    caches.forEach(c => c.instance.removeAll(allKeys))
  })

  unit.section('check expiration works', t => {

    const cache = newCacheDropin({ creds })
    const partitionedCache = newCacheDropin({ creds: { ...creds, family: 'expiring-family' }, fetcher })
    const key = 'expiring-key'
    const value = 'expiring-value'
    const expirationInSeconds = 3 // use a short expiration

    // -- Test put() --
    // clean up first
    cache.remove(key)
    partitionedCache.remove(key)
    t.is(cache.get(key), null, 'put: should be null before putting')
    t.is(partitionedCache.get(key), null, 'put: partitioned should be null before putting')

    // put a value with an expiration in both
    cache.put(key, value, expirationInSeconds)
    partitionedCache.put(key, value, expirationInSeconds)
    t.is(cache.get(key), value, 'put: should get value immediately after putting')
    t.is(partitionedCache.get(key), value, 'put: partitioned should get value immediately after putting')

    // wait for a bit, but not long enough to expire
    Utilities.sleep(1000) // 1 second
    t.is(cache.get(key), value, 'put: should still get value before expiration')
    t.is(partitionedCache.get(key), value, 'put: partitioned should still get value before expiration')

    // wait for it to expire
    Utilities.sleep(expirationInSeconds * 1000 - 500) // should now have expired
    t.is(cache.get(key), null, 'put: should be null after expiration')
    t.is(partitionedCache.get(key), null, 'put: partitioned should be null after expiration')

    // -- Test putAll() --
    const data = { k1: 'v1', k2: 'v2' }
    const allKeys = Object.keys(data)

    cache.putAll(data, expirationInSeconds)
    partitionedCache.putAll(data, expirationInSeconds)
    t.deepEqual(cache.getAll(allKeys), data, 'putAll: should get all values immediately after putAll')
    t.deepEqual(partitionedCache.getAll(allKeys), data, 'putAll: partitioned should get all values immediately after putAll')

    // wait for it to expire
    Utilities.sleep(expirationInSeconds * 1000 + 500)
    t.deepEqual(cache.getAll(allKeys), {}, 'putAll: should be empty after expiration')
    t.deepEqual(partitionedCache.getAll(allKeys), {}, 'putAll: partitioned should be empty after expiration')
  })

  unit.section(`direct redis access`, t => {

    const redis = cup.client
    const someKey = "some-key-foo"
    const someValue = "bar"

    t.deepEqual(redis.request((["set", someKey, someValue])), [{ result: "OK" }])
    t.deepEqual(redis.request(["get", someKey]), [{ result: someValue }])
    t.deepEqual(redis.request(["del", someKey]), [{ result: 1 }])

    // test pipelining
    // clear any previous values
    const someSet = "cheeseboard"
    redis.request(["del", someSet, "fromage", "queso"])

    t.deepEqual(redis.pipeline([
      ["set", "fromage", "french"],
      ["set", "queso", "spanish"],
      ["sadd", "cheeseboard", "fromage", "queso"]
    ]), [{ result: "OK" }, { result: "OK" }, { result: 2 }])

    t.deepEqual(
      redis.request(["smembers", someSet])[0].result.sort(),
      ["fromage", "queso"],
      "order from redis.smembers is not guaranteed so we'll sort the expected"
    )

    t.deepEqual(redis.request(["del", someSet, "fromage", "queso"]), [{ result: 3 }], 'clean up')

  })

  unit.section('check that property store emulation works', t => {
    const props = newCacheDropin({ creds: { ...creds, kind: 'property' }});
    const key = 'propKey';
    const value = 'propValue';

    // Test setProperty/getProperty
    props.setProperty(key, value);
    t.is(props.getProperty(key), value, 'getProperty should retrieve the value');

    // Test deleteProperty
    props.deleteProperty(key);
    t.is(props.getProperty(key), null, 'getProperty should return null after delete');

    // Test setProperties/getProperties
    const properties = {
      p1: 'v1',
      p2: 'v2',
      p3: 'v3'
    };
    const propKeys = Object.keys(properties);

    props.setProperties(properties);
    t.deepEqual(props.getProperties(propKeys), properties, 'getProperties should retrieve all properties');

    // Test setProperties with deleteAllOthers = true
    const newProps = { c: '3', d: '4' };
    props.setProperties(newProps, true); // deleteAllOthers = true
    t.deepEqual(props.getProperties(['c', 'd']), newProps, 'should have new properties');
    t.deepEqual(props.getProperties(propKeys), {}, 'should not have old properties after deleteAllOthers');

    // Test deleteAllProperties (emulating PropertiesService.deleteAllProperties() - no args)
    // First, set some properties to be deleted
    props.setProperties({ x: '1', y: '2' });
    t.deepEqual(props.getProperties(['x', 'y']), { x: '1', y: '2' }, 'should have properties before deleteAllProperties');

    props.deleteAllProperties(); // No arguments, deletes all in the current store
    t.deepEqual(props.getProperties(['x', 'y']), {}, 'getProperties should return empty object after deleteAllProperties');
    t.deepEqual(props.getProperties(['c', 'd']), {}, 'getProperties should also clear properties from previous setProperties');

    // Note: If you need to test removing a specific list of properties, use props.removeAll(keys)
  });

  unit.section('check that properties do not expire', t => {
    const expirationInSeconds = 3; // A short expiration
    const expiringCreds = {
      ...creds,
      defaultExpirationSeconds: expirationInSeconds
    };

    const props = newCacheDropin({ creds: expiringCreds });
    const key = 'persistentKey';
    const value = 'persistentValue';
    const bulkProps = { bk1: 'bv1', bk2: 'bv2' };
    const bulkKeys = Object.keys(bulkProps);

    // Set properties using the property methods
    props.setProperty(key, value);
    props.setProperties(bulkProps);

    // Wait longer than the default expiration time
    Utilities.sleep((expirationInSeconds + 1) * 1000);

    // Verify the properties still exist
    t.is(props.getProperty(key), value, 'setProperty value should persist beyond default expiration');
    t.deepEqual(props.getProperties(bulkKeys), bulkProps, 'setProperties values should persist beyond default expiration');

    // Clean up the created properties
    props.removeAll([key, ...bulkKeys]);
    t.is(props.getProperty(key), null, 'persistentKey should be deleted after cleanup');
    t.deepEqual(props.getProperties(bulkKeys), {}, 'bulk persistent properties should be deleted after cleanup');
  });

  unit.report()
}

if (ScriptApp.isFake) {
  test()
}
