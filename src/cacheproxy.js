import is from '@sindresorhus/is';
import { assert } from '@sindresorhus/is'
import { newUpstash } from './clients/upstash.js'
export const newCacheProxy = (...args) => new CacheProxy(...args)

export class CacheProxy {

  constructor(externalService, gasService = {}) {
    // this is the apps script cacheservice to fake
    this.supportedServices = {
      upstash: () => newUpstash(this)
    }
    const supportedNames = Reflect.ownKeys(this.supportedServices)
    this.gasService = gasService
    this.externalService = externalService

    assert.object(this.externalService)
    assert.nonEmptyObject(this.externalService)
    assert.nonEmptyString(this.externalService.name)
    if (!supportedNames.includes(this.externalService.name)) {
      throw new Error(`unsupported service ${this.externalService.name} not in ${supportedNames.join(',')}`)
    }
    if (!is.undefined(this.externalService.scriptId)) assert(is.nonEmptyString(this.externalService.scriptId))
    if (!is.undefined(this.externalService.userId)) assert(is.nonEmptyString(this.externalService.userId))
    if (!is.undefined(this.externalService.cacheId)) assert(is.nonEmptyString(this.externalService.cacheId))
    if (!is.undefined(this.externalService.prefix)) assert(is.nonEmptyString(this.externalService.prefix))
    // create an implementation 
    this.client = this.supportedServices[this.externalService.name](this)
    // make sure it works
    this.client.ping()
  }


  get name() {
    return this.externalService.name
  }
  get scriptId() {
    return this.externalService.scriptId || 's'
  }
  get cacheId() {
    return this.externalService.cacheId || 'c'
  }
  get userId() {
    return this.externalService.userId || 'u'
  }
  get prefix() {
    return this.externalService.prefix || 'p'
  }
  get defaultExpirationSeconds() {
    return this.externalService.defaultExpirationSeconds
  }
  get (...args) {
    return this.client.get(...args)
  }
  getAll (...args) {
    return this.client.getAll(...args)
  }
  put (...args) {
    return this.client.put(...args)
  }
  putAll (...args) {
    return this.client.putAll(...args)
  }
  remove (...args) {
    return this.client.remove(...args)
  }
  removeAll (...args) {
    return this.client.removeAll(...args)
  }
}

