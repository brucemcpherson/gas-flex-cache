// This is a one-off operation to store your credentials securely.
// In the Apps Script IDE, run this function once to set it up.
import "@mcpher/gas-fakes"
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
setUpstashSecrets()