## `GasFlexCache` Reference Documentation

`GasFlexCache` provides a flexible, drop-in replacement for Google Apps Script's `CacheService`. It allows you to use external, persistent caching backends like Upstash Redis while maintaining an API that is consistent with the familiar `CacheService` methods. This enables more flexible and scalable caching strategies for your Apps Script projects.

### gas-fakes and live Apps Script

This project has been developed entirely using gas-fakes, so works both in Apps Script emulation mode as well as in Live Apps Script. It is provided as an Apps Script library (bmGasFlexCache id: 1R_r9n4EGctvA8lWBZVeuT66mgaKBRV5IxfIsD_And-ra2H16iNXVWva0) and from npm if you want to use it with gas-fakes.

### back end caches

This initial release supports upstash redis. This is an ideal starting point as it offers a generous free starter tier, and a fully **featured redis over http**. Most other Redis offerings run on TCP, so are unsuitable for use with Apps Script. You will need to create an upstash database and get some credentials - it's super easy and even better, it's free, and GasFlexCache gives you direct access to all redis commands from Apps Script in addition to its drop in cache capabilities.

### Feature Comparison

| Feature | Apps Script `CacheService/PropertiesService` | `GasFlexCache` (`CacheDropin`) |
| :------------------------- | :----------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------- |
| **Backend** | Google-managed | External (e.g., Upstash Redis) |
| **Persistence** | Volatile, non-persistent. Data can be evicted at any time. Persistent for properties service | Persistent. Data remains until explicitly removed or expired. |
| **Instances** | 1 for each service | As many instances as you want, with different default attributes|
| **Storage Limits** | 100 KB per item, 10 MB total per cache. 10k for properties | Depends on backend plan (Upstash free tier: 256 MB). |
| **Max Expiration** | 6 hours (21,600 seconds) for cacheservice. Unlimited for properties | Effectively unlimited for both (depends on backend). |
| **Partitioning** | `getScript..()`<br>`getUser..()`<br>`getDocument...()` | Emulated via `scriptId`, `userId`, `documentId` properties. Adds a `family` property for cross-application partitioning. |
| **API** | Standard `get`, `put`, `getAll`, etc. | Identical API for drop-in compatibility. |
| **Environment** | Live Apps Script & local Node.js (via `gas-fakes`). | Live Apps Script & local Node.js (via `gas-fakes`). |
| **PropertiesService Emulation** | Native | Yes. Provides aliases (`getProperty`, `setProperty`, etc.) that map to persistent cache methods, emulating `PropertiesService` behavior.  |
| **Data Sharing** | Strictly isolated by script and optionally by user or document. | Can be configured to share data between different scripts, users or applications in any combination. |
| **Cross Platform sharing** | data only shareable amongst apps scripts | cross platform - you could share data between apps script and any other platform |
| **Redis compatability** | n/a | direct access to all of redis commands supported by upstash |
| **Performance** | Faster as it remains within Google Insfrastructure - average operation time is about 100ms | Slower, as it has to go to an external Redis - average operation time about 300ms |
| **write/delete protection** | None | Use a readonly upstash token to prevent accidental update |
---

### Getting Started

#### on upstash

- visit https://upstash.com/ and start up a free redis database.
- get the redis database url and token - you;ll be storing this in the property store of your script

#### on apps script

- Add the Apps Script library to your project
- add a shortcut to the dropin class to your script

```javascript
var newCacheDropin = bmGasFlexCache.newCacheDropin;
```

#### on Node with gas-fakes

- see the gas-fakes repo for how to set up auth.
- the shells folder in this repo contains a script to help set up Apps Script Application Default credentials
- install @mcpher/gas-flex-cache
- if you you are not using @mcpher/gas-fakes yet, you should install that too

```javascript
  import @mcpher/gas-fakes
  import { newCacheDropin } from '@mcpher/gas-flex-cache'
``` 

#### 1. Storing Credentials

Your backend credentials should be stored securely. For both Apps Script and gas-fakes, `PropertiesService` is a good choice. There's an example script as below in ./test/props.js. Just add your upstash token and url.

```javascript
// This is a one-off operation to store your credentials securely.
// In the Apps Script IDE, run this function once to set it up.
function setUpstashSecrets() {
  PropertiesService.getScriptProperties().setProperty(
    "dropin_upstash_credentials",
    JSON.stringify({
      type: "upstash",
      token: "YOUR_UPSTASH_TOKEN",
      url: "YOUR_UPSTASH_URL",
    })
  );
}
```

#### 2. Basic Usage

```javascript
// Retrieve your stored credentials
const pc = PropertiesService.getScriptProperties().getProperty(
  "dropin_upstash_credentials"
);
const creds = JSON.parse(pc);

// Create a cache instance
const cache = newCacheDropin({creds});

// Now use it like you would use CacheService
cache.put("some_key", "some value");
const value = cache.get("some_key"); // 'some value'
```

### Usage Examples & Recipes

Here are some common patterns for configuring `CacheDropin`.

#### Emulating `CacheService.getScriptCache()`

This creates a cache that is partitioned by the script's ID. All users of this script will share the same cache. 

- In apps script it is the actual scriptId
- In gas-fakes the scriptId is in gasfakes.json (which is created automatically). It will be its Apps Script counterpart's scriptId if it can find a .clasp.json to get it from, otherwise it'll be a random value.

```javascript
const scriptCacheCreds = {
  ...upstashCreds,
  scriptId: ScriptApp.getScriptId(),
  defaultExpirationSeconds: 3600, // optional: 1 hour
};
const scriptCache = newCacheDropin({creds: scriptCacheCreds});
```

#### Emulating `CacheService.getUserCache()`

This creates a cache partitioned by both script ID and user ID. Each user gets their own private cache within the script.

To avoid storing sensitive information like email addresses, or if your script runs without requiring user authentication, you can generate and store a unique, anonymous ID for each user in their `UserProperties` using a trick like this.

```javascript
function getAnonymousUserId() {
  const userProperties = PropertiesService.getUserProperties();
  const userKey = "GasFlexCache_anonymous_id";
  let userId = userProperties.getProperty(userKey);
  if (!userId) {
    userId = Utilities.getUuid();
    userProperties.setProperty(userKey, userId);
  }
  return userId;
}

const userCacheCreds = {
  ...upstashCreds,
  scriptId: ScriptApp.getScriptId(),
  userId: getAnonymousUserId(),
  defaultExpirationSeconds: 3600,
};
const userCache = newCacheDropin({creds:userCacheCreds});
```

#### Emulating `CacheService.getDocumentCache()`

For container-bound scripts (e.g., in a Google Doc), this creates a cache partitioned by the document's ID.

```javascript
const activeDocument = DocumentApp.getActiveDocument();
if (activeDocument) {
  const documentCacheCreds = {
    ...upstashCreds,
    scriptId: ScriptApp.getScriptId(),
    documentId: activeDocument.getId(),
    defaultExpirationSeconds: 3600,
  };
  const documentCache = newCacheDropin({creds:documentCacheCreds});
}
```

#### Partitioning by namespace (`family`)

The `family` property provides a custom namespace. This is useful for isolating data for different projects or environments (e.g., "dev", "prod") that share the same Redis database. The family can be added in combination with any of the ids already mentioned. 

```javascript
const familyCacheCreds = {
  ...upstashCreds,
  family: "my-project-name-v1",
};
const projectCache = newCacheDropin({creds:familyCacheCreds});
// This cache is isolated from other caches that don't share the same `family`.
```

#### Emulating `PropertiesService` for Persistent Storage

Because `GasFlexCache` data is persistent by default (it only expires if you set an expiration time), it can serve as a powerful replacement for `PropertiesService`. For convenience and API consistency, it includes aliases for all the standard `PropertiesService` methods.

```javascript
// Create an instance to use as a property store
const propertyStore = newCacheDropin({ creds });

// Use familiar property-style methods
propertyStore.setProperty('apiKey', 'some_secret_value');
const apiKey = propertyStore.getProperty('apiKey');

console.log(apiKey); // 'some_secret_value'

// Manage multiple properties at once
propertyStore.setProperties({
  settingA: 'valueA',
  settingB: 'valueB'
});
const settings = propertyStore.getProperties(['settingA', 'settingB']);

propertyStore.deleteProperty('apiKey');
```

#### Advanced: Cross-Application User Cache

By omitting the `scriptId`, you can create a cache for a user that is shared across multiple different scripts.

```javascript
// Share a cache for a specific user across multiple different scripts
const singleUserCreds = {
  ...upstashCreds,
  userId: "user@example.com", // Use a stable ID like an email
};
const crossAppUserCache = newCacheDropin({creds: singleUserCreds});
```

#### Advanced: Sharing data between Node and Apps Script

By adding the real Apps Script scriptId to gas-fakes.json, they can both share the same cache data.

```javascript
// Share a cache for a specific user across platorms for the same script
const sharingCreds = {
  ...upstashCreds,
  scriptId: ScriptApp.getScriptId()
};
const sharingCache = newCacheDropin({creds: sharingCreds});
```

#### Advanced: Replacing a native cacheservice

You can replace an existing cacheservice with a drop in. Because the API is exactly the same, this will allow you to try it out without actually changing any code. In this example we'll replace the ScriptCache.

```javascript
const scriptCacheCreds = {
  ...upstashCreds,
  scriptId: ScriptApp.getScriptId(),
  defaultExpirationSeconds: 3600 // optional: 1 hour
};
const CacheService.ScriptCache = () => newCacheDropin({creds:scriptCacheCreds});
```

#### Advanced: adding to cacheservice

You may extend the CacheService to add new kinds of stores. You can do this by adding a method to the CacheService object. I recommend you prefix '\_\_' to the name to differentiate from native CacheService methods. In this example, we're adding an enhanced scriptCache service that doesn't expire.

```javascript
const scriptCacheCreds = {
  ...upstashCreds,
  scriptId: ScriptApp.getScriptId(),
};
CacheService.__scriptCache = () => newCacheDropin({creds:scriptCacheCreds});
```

#### Advanced: Using redis directly

Although the main focus of this library is to provide an alternative drop-in for the apps script cache service, it features a full redis client which you can now access all of redis's commands **directly from Apps Script**

Single commands are provided via an array, the first element is the command, and the rest are arguments. Here's a few examples from the unit tests.

via cacheDropin.client.request([commands])

```javascript
    const redis = const cache = newCacheDropin({creds:upstashCreds}).client
    const someKey = "some-key-foo"
    const someValue = "bar"

    t.deepEqual(redis.request((["set", someKey, someValue])), [{ result: "OK" }])
    t.deepEqual(redis.request(["get", someKey]), [{ result: someValue }])
    t.deepEqual(redis.request(["del", someKey]), [{ result: 1 }])

```

Pipelining is also supported using an array of arrays of commands

via cacheDropin.client.pipeline([[commands],[more commands],...])

```javascript
t.deepEqual(
  redis.pipeline([
    ["set", "fromage", "french"],
    ["set", "queso", "spanish"],
    ["sadd", "cheeseboard", "fromage", "queso"],
  ]),
  [{ result: "OK" }, { result: "OK" }, { result: 2 }]
);

t.deepEqual(
  redis.request(["smembers", someSet])[0].result.sort(),
  ["fromage", "queso"],
  "order from redis.smembers is not guaranteed so we'll sort the expected"
);
```

Note that when you are using redis directly, there is of course no id based partitioned of the type mentioned earlier in cache dropin mode.

---

## `CacheDropin` Class

This is the main class you will interact with. It serves as a factory and wrapper for the specific cache client implementation (like the one for Upstash).

### `newCacheDropin({creds[, fetcher]})`

Creates and initializes a new cache instance.

- **`creds`** `(Object)`: A required configuration object that defines the caching backend and its properties.
- **`fetcher`** `(function)`: Advanced: An optional fetcher - by default it's UrlFetchApp.fetch.Provided in case you want to provide a wrapper that enhances its behavior. It should return the same HttpResponse as UrlFetchApp.fetch.

#### `externalService` Configuration Object

This object tells `CacheDropin` which backend to use and how to configure it.

- **`type`** `(string)`: **Required**. The type of the backend service. Currently, the only supported value is `'upstash'`.
- **`name`** `(string)`: An optional friendly name for the cache instance. Defaults to the `type`.
- **`defaultExpirationSeconds`** `(number)`: An optional default expiration time in seconds for items added to the cache via `put()` and `putAll()`. If not provided, items will not expire by default.
- **Partitioning Properties**: These optional string properties allow you to create isolated cache namespaces within the same backend database, emulating the behavior of Google's `ScriptCache`, `UserCache`, and `DocumentCache`.
  - **`family`** `(string)`: A general-purpose identifier to partition the cache. This is useful for separating data from different applications using the same Redis database.
  - **`scriptId`** `(string)`: Used to emulate `CacheService.getScriptCache()`, restricting cache access to instances sharing the same `scriptId`.
  - **`userId`** `(string)`: Used to emulate `CacheService.getUserCache()`, restricting cache access to a specific user. For a full emulation, `scriptId` should also be set.
  - **`documentId`** `(string)`: Used to emulate `CacheService.getDocumentCache()`, restricting cache access to a specific document. For a full emulation, `scriptId` should also be set.

**Example Configuration:**

```javascript
const creds = {
  type: "upstash",
  token: "YOUR_UPSTASH_TOKEN",
  url: "YOUR_UPSTASH_URL",
};

// A cache partitioned for a specific user in a specific script
const userCache = newCacheDropin({
  ...creds,
  scriptId: "MY_UNIQUE_SCRIPT_ID",
  userId: "user@example.com",
  family: "my-app-v1",
  defaultExpirationSeconds: 3600, // 1 hour
});
```

### Properties

- **`.type`**: The type of the external service (e.g., `'upstash'`).
- **`.name`**: The name of the external service.
- **`.scriptId`**: The script ID for partitioning. Defaults to `'s'`.
- **`.documentId`**: The document ID for partitioning. Defaults to `'c'`.
- **`.userId`**: The user ID for partitioning. Defaults to `'u'`.
- **`.family`**: The family for partitioning. Defaults to `'p'`.
- **`.defaultExpirationSeconds`**: The configured default expiration time in seconds.

### Methods

The `CacheDropin` class provides the standard Google Apps Script `CacheService` methods.

- **`get(key)`**: Retrieves a value from the cache. Returns `null` if the key is not found.
- **`getAll(keys)`**: Retrieves multiple values from the cache. Returns an object containing the key/value pairs for the keys that were found.
- **`put(key, value, [expirationInSeconds])`**: Puts a single key/value pair into the cache.
  - `expirationInSeconds` `(number)`: (Optional) The time in seconds for the item to live. Overrides `defaultExpirationSeconds`.
- **`putAll(object, [expirationInSeconds])`**: Puts multiple key/value pairs into the cache.
  - `expirationInSeconds` `(number)`: (Optional) The time in seconds for the items to live. Overrides `defaultExpirationSeconds`.
- **`remove(key)`**: Removes a single item from the cache.
- **`removeAll(keys)`**: Removes multiple items from the cache.

#### Property Store Aliases

This can also be used as dropin replacement for Property services. For convenience when emulating `PropertiesService`, the following aliases are also available. They map directly to their `CacheService` counterparts but ensure that data is stored without expiration, overriding any `defaultExpirationSeconds`. T

- **`getProperty(key)`**: Alias for `get(key)`.
- **`getProperties(keys)`**: Alias for `getAll(keys)`.
- **`setProperty(key, value)`**: Alias for `put(key, value, null)`.
- **`setProperties(object, [deleteAllOthers])`**: Alias for `putAll(object, null)`. If `deleteAllOthers` is true, it will clear all existing properties in the partition first.
- **`deleteProperty(key)`**: Alias for `remove(key)`.
- **`deleteAllProperties()`**: Clears all key-value pairs within the current cache partition.
---

## `Upstash` Client

This class is the internal implementation that communicates with the Upstash Redis REST API. You do not interact with it directly, but configure it via the `CacheDropin` `externalService` object.

### Configuration

When `type` is `'upstash'`, the following properties are required in the `externalService` object:

- **`url`** `(string)`: The REST API URL for your Upstash database (e.g., `https://<region>-<name>-<id>.upstash.io`).
- **`token`** `(string)`: The read/write REST API token for your Upstash database.

### Key Generation and Partitioning

The `Upstash` client creates a unique Redis key for each item to ensure that different cache partitions do not conflict.

The key is constructed as:
`[family]:[documentId]:[scriptId]:[userId]-[your_key]`

The default values from `CacheDropin` are used if the partitioning properties are not provided in the configuration. For example, a key `my-key` in a default cache instance would be stored in Redis as `p:c:s:u-my-key`.

### Data Storage

All values are stored in Redis as JSON strings in the format `{"key":"...","value":"..."}`. This allows the client to store complex objects and perform integrity checks on retrieval.

### Cache Method Implementation Details

The standard cache methods are mapped to Upstash REST API commands:

- `get(key)` / `getAll(keys)`: Uses the `MGET` command.
- `put(key, ...)` / `putAll(object, ...)`: Uses a `PIPELINE` of `SET` commands. If an expiration is provided, the `EX` option is included.
- `remove(key)` / `removeAll(keys)`: Uses the `DEL` command.

All communication with the Upstash API is performed using Google Apps Script's `UrlFetchApp` service (or if running on Node, then the gas-fake emulation of `UrlFetchApp`).

---

### A Note on Google Workspace vs. Consumer Accounts

You will notice different authorization behavior depending on the type of account running your script. This is a key part of Google's security model if you are using gasflexcache (or any other script) as an apps script library. Since gasflex cache uses UrlFetchApp to communicate with redis, it flags extra scrutiny and nowadays will show an 'unverfied app' warning screen as part of the OAuth consent process.

- **Google Workspace accounts:** If your script is created by a Google Workspace account you can use a library that uses UrlFetchApp, Google's security model assumes a higher level of trust, so the "unverified app" warning screen is **skipped**. The user proceeds directly to the standard consent screen.

- **Consumer `@gmail.com` accounts:** A consumer account is treated with suspicion, so Google will show the "Google hasn't verified this app" warning screen. You must click "Advanced" to proceed with authorization.

This behavior is (allegedly) not a bug, but rather the intended (somewhat overzealous) behavior of Google's OAuth and permissions system.