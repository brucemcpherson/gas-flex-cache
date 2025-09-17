import is from '@sindresorhus/is';
import { assert } from '@sindresorhus/is'
export const newUpstash = (...args) => new Upstash(...args)

/**
 * specific cache service for upstash
 * https://upstash.com/docs/redis/features/restapi#rest-api
 */
// Implementation
class Upstash {
  constructor(cacheProxy) {
    this.cacheProxy = cacheProxy
  }
  get url() {
    const url = this.cacheProxy.externalService.url
    assert.urlString(url)
    return url
  }
  get token() {
    const token = this.cacheProxy.externalService.token
    assert.nonEmptyString(token)
    return token
  }
  get headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    }
  }
  // the actual key we use us a digest of the potential key segreagators
  // this allows not only the emulation of apps script cache partitioning, 
  // but an additional prefix that allows the same cache to be used for multiple applications.
  // we'll use SADD and SMEMBERS 
  makeCacheKey(key) {
    const redisSet = [this.cacheProxy.prefix, this.cacheProxy.cacheId, this.cacheProxy.scriptId, this.cacheProxy.userId].join(":")
    return {
      redisSet,
      cacheKey: redisSet + "-" + key
    }
  }
  get batchUrl() {
    return `${this.url}/pipeline`
  }
  request(commands, url = this.url) {
    assert.nonEmptyArray(commands)
    const body = JSON.stringify(commands)
    console.log(body, url)
    return UrlFetchApp.fetch(url, {
      method: 'POST',
      headers: this.headers,
      body
    })
  }
  checkResult(response) {
    if (response.getResponseCode() !== 200) {
      throw new Error(`bad response from upstash:  ${response.getContentText()}`)
    }
    let result = JSON.parse(response.getContentText())
    if (!is.array(result)) result = [result]
    result.forEach(f => {
      if (!is.nonEmptyObject(f) || !Reflect.has(f, 'result')) {
        throw `expected a result from upstash, but got ${JSON.stringify(f)}`
      }
    })
    return result
  }

  ping() {
    const response = this.request(["PING"])
    const [result] = this.checkResult(response)
    if (result.result !== "PONG") {
      throw new Error(`failed to get PONG from upstash - got ${result.result}`)
    }
    return result.result
  }
  // emulate cacheservice methods
  get(key) {
    const { cacheKey, redisSet } = this.makeCacheKey(key)
    const commands = ["get", cacheKey]
    const response = this.request(commands)
    const result = this.checkResult(response)
    if (is.null(result[0].result)) return null  
    const ro = JSON.parse(result[0].result)
    if (ro.key !== key) {
      throw new Error ('expected to get result for key ${}, but got ${ro.key}')
    }
    return ro.value
  }
  getAll() {

  }

  put(key, value, expirationInSeconds = this.defaultExpirationSeconds) {
    const { cacheKey, redisSet } = this.makeCacheKey(key)
    const commands = ["set", cacheKey, JSON.stringify({
      value,
      key
    })]
    // add expiration if any given
    if (expirationInSeconds) {
      commands.push("EX", expirationInSeconds)
    }
    // add set membership
    const response = this.request([commands, ["sadd", redisSet, cacheKey]], this.batchUrl)
    const result = this.checkResult(response)
    console.log(result)
    if (result.length !== 2 || result[0].result !== "OK" || result[1].result !== 1)
      return result
  }

  putAll(values) {

  }
  remove(key) {

  }
  removeAll(keys) {

  }
}