### Supercharge Your Google Apps Script Caching with GasFlexCache!

Are you hitting the limits of Google Apps Script's built-in `CacheService`? Tired of the 6-hour expiration and restrictive size limits?

**GasFlexCache** is the solution you've been waiting for. It provides a flexible, drop-in caching layer that connects your Apps Script projects to a powerful, persistent, and scalable Upstash Redis database.

#### Why Choose GasFlexCache?

*   **Familiar API, More Power:** GasFlexCache emulates the standard `CacheService` methods you already know (`get`, `put`, `putAll`, etc.), making it incredibly easy to integrate. Swap out `CacheService.getScriptCache()` with your new Upstash cache and you're ready to go.

*   **Break Free from Limitations:** Say goodbye to the 6-hour cache lifetime. With Upstash, your cache is persistent and can handle significantly more data, unlocking new possibilities for your applications.

*   **Advanced Cache Partitioning:** Go beyond the standard user and script caches. GasFlexCache allows you to partition your cache by application `family`, `documentId`, `scriptId`, and `userId`, giving you granular control for complex add-ons and multi-tenant apps.

*   **Modern Development Workflow:** It's built to work seamlessly with `@mcpher/gas-fakes`, allowing you to develop and test your caching logic locally in a Node.js environment before deploying to Apps Script.

*   **Direct Redis Access:** When you need more than simple key-value storage, GasFlexCache provides a direct client to execute any Redis command, giving you the full power of Upstash's capabilities.

Stop fighting with cache limitations and give your Google Apps Script projects the enterprise-grade caching they deserve.

**Check out GasFlexCache here**

- [github](https://github.com/brucemcpherson/gasflexcache)
- [npm](https://www.npmjs.com/package/@mcpher/gas-flex-cache)
- [docs](https://github.com/brucemcpherson/gasflexcache/readme.MD)
- [Apps Script library](https://script.google.com/d/1R_r9n4EGctvA8lWBZVeuT66mgaKBRV5IxfIsD_And-ra2H16iNXVWva0/edit?usp=sharing)  (bmGasFlexCache id: 1R_r9n4EGctvA8lWBZVeuT66mgaKBRV5IxfIsD_And-ra2H16iNXVWva0)
- [gas-fakes](https://github.com/brucemcpherson/gas-fakes)



***