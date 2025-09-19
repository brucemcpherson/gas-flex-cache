//import is, {assert} from '@sindresorhus/is';
const newUpstash = (...args) => new Upstash(...args)

/**
 * specific cache service for upstash
 * https://upstash.com/docs/redis/features/restapi#rest-api
 */
// Implementation
class Upstash {
  constructor(cacheDropin) {
    this.cacheDropin = cacheDropin
  }
  get url() {
    const url = this.cacheDropin.externalService.url
    assert.urlString(url)
    return url
  }
  get token() {
    const token = this.cacheDropin.externalService.token
    assert.nonEmptyString(token)
    return token
  }
  get headers() {
    const headers = {
      Authorization: `Bearer ${this.token}`
    }
    // in appss script its a separate option property
    if (ScriptApp.isFake) {
      headers['Content-Type'] = 'application/json'
    }
    return headers
  }
  get redisSet() {
    return [this.cacheDropin.family, this.cacheDropin.documentId, this.cacheDropin.scriptId, this.cacheDropin.userId].join(":")
  }
  // the actual key we use us a digest of the potential key segreagators
  // this allows not only the emulation of apps script cache partitioning, 
  // but an additional prefix that allows the same cache to be used for multiple applications.
  // we could refins by usig SADD and SMEMBERS, but  cacheservice getAll() always expects keys
  // so we wont do that for now.
  makeCacheKey(key) {
    assert.nonEmptyString(key)
    const redisSet = this.redisSet
    return {
      redisSet,
      cacheKey: redisSet + "-" + key
    }
  }
  get batchUrl() {
    return `${this.url}/pipeline`
  }
  pipeline (commands) {
    // commands should be an array of arrays
    assert.nonEmptyArray(commands)
    commands.every(assert.nonEmptyArray)
    return this.request(commands, this.batchUrl)
  }
  request (commands, url = this.url) {
    const response = this.__request(commands, url)
    const result = this.checkResult(response)
    return result
  }
  __request(commands, url = this.url) {
    assert.nonEmptyArray(commands)
    const body = JSON.stringify(commands)
    let options = {
      method: 'POST',
      headers: this.headers
    }
    // in apps script, there's a special prop for this
    if (!ScriptApp.isFake) {
      options = {
        ...options,
        muteHttpExceptions: true,
        contentType:'application/json',
        payload: body
      }
    } else {
      options.body = body
    }
    return UrlFetchApp.fetch(url, options)
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
    const [result] = this.request(["PING"])
    if (result.result !== "PONG") {
      throw new Error(`failed to get PONG from upstash - got ${result.result}`)
    }
    return result.result
  }
  // emulate cacheservice methods
  get(key) {
    const values = this.getAll([key])
    return is.undefined(values[key]) ? null : values[key]
  }

  // get all needs to get all the items belonging to this family
  getAll(keys) {
    assert.nonEmptyArray(keys)
    const cacheKeys = keys.map(k => this.makeCacheKey(k).cacheKey)
    const commands = ["mget"].concat(cacheKeys)

    const {result: values} = this.request(commands)[0]

    // in this case we should have a single result, the length of keys

    if (values.length !== keys.length) {
      console.log(`expected ${keys.length} values, but got ${values.length} in getAll`)
    }
    const parsed = values.map(f => JSON.parse(f)).reduce((p, f, i) => {
      if (!is.null(f)) {
        if (keys[i] !== f.key) {
          throw new Error(`expected to get result for key ${keys[i]}, but got ${f.key}`)
        }
        p[f.key] = f.value
      }
      return p
    }, {})
    return parsed
  }

  putAll(values, expirationInSeconds = this.defaultExpirationSeconds) {
    assert.nonEmptyObject(values)
    const commands = Reflect.ownKeys(values).map(key => {
      const { cacheKey } = this.makeCacheKey(key)
      const c = ["set", cacheKey, JSON.stringify({
        value: values[key],
        key
      })]
      if (expirationInSeconds) {
        c.push("EX", expirationInSeconds)
      }
      return c
    })
    const result = this.pipeline(commands)

    result.forEach(f => {
      if (f.result !== "OK") {
        throw new Error(`failed to write to upstash - got ${f.result}`)
      }
    })
    // apps script returns null 
    return null
  }
  put(key, value, expirationInSeconds = this.defaultExpirationSeconds) {
    return this.putAll({ [key]: value }, expirationInSeconds)
  }


  remove(key) {
    return this.removeAll([key])
  }

  removeAll(keys) {
    assert.nonEmptyArray(keys)
    const cacheKeys = keys.map(k => this.makeCacheKey(k).cacheKey)
    const commands = ["del"].concat(cacheKeys)

    this.__request(commands)
    // the return values is the number of keys deleted
    // apps script silently ignores how many there were, so will we
    return null
  }
}