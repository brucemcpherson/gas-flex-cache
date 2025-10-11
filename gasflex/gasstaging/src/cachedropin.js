//import is from '@sindresorhus/is';
//import { assert } from '@sindresorhus/is'
//import { newUpstash } from './clients/upstash.js'
var newCacheDropin = (...args) => new CacheDropin(...args)

class CacheDropin {

  constructor(config) {

    // this is the apps script cacheservice to fake
    this.supportedServices = {
      upstash: () => newUpstash(this)
    }
    const supportedTypes = Reflect.ownKeys(this.supportedServices)
    assert.nonEmptyObject(config)
    this.externalService = config.creds

    // we accept a custom fetcher, but normally it would be just this usual one
    this.fetcher = config.fetcher || (!is.undefined(globalThis.UrlFetchApp) && globalThis.UrlFetchApp?.fetch)
    if (!is.function (this.fetcher)) {
      throw new Error `no fetcher function available - normally we'd use Apps Script or gas-fakes fetch`
    }
    assert.nonEmptyObject(this.externalService)
    assert.nonEmptyString(this.externalService.type)
    if (!supportedTypes.includes(this.externalService.type)) {
      throw new Error(`unsupported service ${this.externalService.name} not in ${supportedTypes.join(',')}`)
    }
    if (!this.externalService.name) this.externalService.name = this.externalService.type
    assert.nonEmptyString(this.externalService.name)

    // all of these ids below can be used to precisely define the visibility of cache.
    // setting these allows the same database to contain the same key value in multiple scenarios without conflict

    // setting this value can be used to emulate CacheSefvice.ScriptCache and restrict to those sharing the same value
    if (!is.undefined(this.externalService.scriptId)) assert.nonEmptyString(this.externalService.scriptId)

    // setting this value can be used to paritally emulate CacheService.UserCache and restrict to those sharing the same value
    // to fully emulate UserCache, set a scriptId as well
    if (!is.undefined(this.externalService.userId)) assert.nonEmptyString(this.externalService.userId)

    // setting this value can be used to paritally emulate CacheService.DocumentCache and restrict to those sharing the same value
    // to fully emulate DocumentCache, set a scriptId as well
    if (!is.undefined(this.externalService.documentId)) assert.nonEmptyString(this.externalService.documentId)

    // this is general value to partition the underlying cache so you can use the same cache database for multiple projects
    // this would restrict the access to those sharing the same family id
    if (!is.undefined(this.externalService.family)) assert.nonEmptyString(this.externalService.family)


    // create an implementation 
    this.client = this.supportedServices[this.externalService.type](this)
    // make sure it works
    this.client.ping()
  }

  get type() {
    return this.externalService.type
  }
  get name() {
    return this.externalService.name
  }
  get scriptId() {
    return this.externalService.scriptId || 's'
  }
  get documentId() {
    return this.externalService.documentId || 'c'
  }
  get userId() {
    return this.externalService.userId || 'u'
  }
  get family() {
    return this.externalService.family || 'p'
  }
  get defaultExpirationSeconds() {
    return this.externalService.defaultExpirationSeconds
  }
  get(...args) {
    return this.client.get(...args)
  }
  getAll(...args) {
    return this.client.getAll(...args)
  }
  put(...args) {
    return this.client.put(...args)
  }
  putAll(...args) {
    return this.client.putAll(...args)
  }
  remove(...args) {
    return this.client.remove(...args)
  }
  removeAll(...args) {
    return this.client.removeAll(...args)
  }

  // property stores have different names for the same thing
  deleteAllProperties (...args) {
    // Emulate PropertiesService.deleteAllProperties() which deletes all in the current store
    // and does not take arguments.
    return this.client.deleteAllInPartition();
  }
  deleteProperty (...args) {
    return this.remove(...args)
  } 
  getProperty (...args) {
    return this.get(...args)
  }
  getProperties (...args) {
    return this.getAll(...args)
  }
  setProperty (...args) {
    // Properties should not expire, so explicitly pass null for expiration
    return this.put(args[0], args[1], null);
  }

  setProperties (props, deleteAllOthers = false) {
    if (deleteAllOthers) this.deleteAllProperties()
    // Properties should not expire, so explicitly pass null for expiration
    return this.putAll(props, null);
  }
}
