/** main.js *
 * @author captdeaf@gmail.com (Greg Millam)
 */

/* We use jsload() so that these are automatically recompiled
 * and reloaded when modified. */
jsload('jslib/utils.js');
jsload('jslib/jsclass.js');

// Load SQL first, since the rest may need to use methods on it.
jsload('jslib/sql.js');

/* Initialize our own SQL service */
// var DBCONN = new SQL(SQLURI, SQLUSER, SQLPASS);
// var DB = DBCONN.db;

// Webserver.
jsload('jslib/webserver.js');

// Visit logger
jsload('visitlogger.js');

// Templates for the sandboxes.
jsload('jslib/templates.js');

// Load the sandbox class after everything else, since it ties most of them
// together.
jsload('jslib/sandbox.js');

/* Initialize the server. */
var Server = new WebServer(HOST,PORT);
// Now - Load sandboxes!
print("loadSandboxes()");
Server.loadSandboxes();
print("loadSandboxes() complete");

Server.start();

print("Started!");
