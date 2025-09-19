/**
 * we can handle secrets using the property service
 * on both apps script and gas-fakes
 * note though, that on gas-fakes the scriptId is a random value in gasfakes.json
 * if you have a .clasp.json it will take it from there
 * however, if you plan to share this property service across multiple folders
 * just set the scriptId in gasfakes to some shared string value 
 */
//import '@mcpher/gas-fakes'
// this is a one off operation to store your dropin credentials
// replace the below with your approperiate creds
const setUpstashSecrets = () => {
  PropertiesService.getScriptProperties().setProperty("dropin_upstash_credentials", JSON.stringify({
    "type": "upstash",
    "token": "your upstash token",
    "url": "https://xxx.upstash.io"
  }))
}
// in apps script you run this from the IDE
// on node yor run as part of the script
if (ScriptApp.isFake) {
  setUpstashSecrets()
}

