// Configuration for the site.
//
// To change configured values for production or development, use
// config_production.js or confi_development.js. If those files exist,
// config.js will not be used.
//
// Since config.js impacts so many things, it is only loaded once, instead
// of being monitored for changes. If you want to change this, then change
// 'load('config.js')' in startup.js to jsload. But not everything will work
// as expected.

var Config = {
  // Site URL: The root URL for this server.
  siteurl: 'http://www.samplesite.com',

  // Do we call jsreload() when sites are visited? That is - Do we enable
  // Rapid Development on this site?
  enableRAD: true,

  // All POST requests are required to come from a domain that matches this RX.
  // This is to help prevent Cross-site scriptiong.
  // For dev purposes, make it /.?/. The more accurate and
  // anchored it is, the better. It's /.?/ for because I have no idea
  // what you'll use to access your sample site. Fix it! =).
  referrer_rx: /.?/,

  // SQL access information - If desired.
  // sql_jdbc: 'jdbc:mysql://127.0.0.1/dbname', // Mysql
  // sql_jdbc: 'jdbc:postgresql://127.0.0.1/dbname', // Postgresql
  // sql_user: 'username',
  // sql_pass: 'password',

  // The Google API key, for gmaps.js
  // googlekey: 'gmapskey',

  // Bit.ly API key, for bitly.js
  // bitlyuser: 'username',
  // bitlykey: 'bitlykey',
}

// Global values set for all Templates.
var TemplateGlobals = {
  title: 'A Sample Site',
  description: "A sample site to show off HairyRhino",
  keywords: "sample, hairyrhino, javascript, serverside javascript"
}
