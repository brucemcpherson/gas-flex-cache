// This is a one-off operation to store your credentials securely.
// In the Apps Script IDE, run this function once to set it up.
import "@mcpher/gas-fakes"

function setUpstashSecrets() {
  PropertiesService.getScriptProperties().setProperty(
    "dropin_upstash_credentials",
    JSON.stringify({
      type: "upstash",
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    })
  );
  console.log ('set properties.. all done')
}
setUpstashSecrets()