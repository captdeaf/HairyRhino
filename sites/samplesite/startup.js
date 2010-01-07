/**
 * startup.js
 *
 * This initializes the mostly non-changing, non-site-specific stuff.
 * Do not put anything specific to the website in here, put it into
 * init.js.
 */

// Load Config.
var Config;

// Load the config settings.
if (!Config && File.exists('config.js')) {
  load('config.js');
}

// on production sites, we don't use RAD reloading, so we make jsload() an
// alias of load(). But for development sites, we use jsload() to enable
// automatic reloading of changed files.
if (Config.enableRAD) {
  load('jslib/jsload.js');
} else {
  var jsload = load;
  var jsreload = function() {};
}

// The common library, shifting javascript from usable to easy.
jsload('jslib/commonlib.js');

jsload('jslib/webHandler.js');
jsload('jslib/jsclass.js');

/* Initialize DBCONN only if it doesn't already exist. */
if (Config.sql_jdbc) {
  var DBCONN;
  var DB;

  // Check to see if it's already connected.
  if (DBCONN) {
    DBCONN = new SQL(Config.sql_jdbc, Config.sql_user, Config.sql_pass);
    DB = DBCONN.db;
  }
}

/* Mount root. */
Web.mountRoot('public');

/* Load commonly used libraries. */
jsload('jslib/ajax.js');
jsload('jslib/base64.js');

// The Template locals that are useful for rendering templates.
jsload('jslib/templates.js');

// Here we load the init.js - So they can load their own stuff.
if (File.exists('init.js')) {
  jsload('init.js');
}

/* Load all queries. */
jsload('jslib/queries.js');
jsload('jslib/pages.js');

/* When any page is accessed, reload everything that's changed. */
if (Config.enableRAD) {
  Web.onReload = function() {
    jsreload();
    reloadQueries();
    reloadPages();
  };
}

// We're done!
