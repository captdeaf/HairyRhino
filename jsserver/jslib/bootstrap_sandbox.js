var XMLHttpRequest = Thread.XMLHttpRequest;

/*
TODO: A better wrapper around this type of stuff.

java = undefined;
Packages = undefined;
java = undefined;
javax = undefined;
org = undefined;
com = undefined;
edu = undefined;
net = undefined;
getClass = undefined;
JavaAdapter = undefined;
JavaImporter = undefined;
Continuation = undefined;
XML = undefined;
XMLList = undefined;
Namespace = undefined;
QName = undefined;
*/

// SQL
var SQL = Web.sql;

// Are we running a production environment?
var PRODUCTION = Web.production;

// Print to the log.
var print = Web.print;

// Run a command.
var runCommand = Web.runCommand;

// Read an URL.
var readUrl = Web.readUrl;

// read and write files within the files/ dir.
var readFile = Web.readFile;
var writeFile = Web.writeFile;

// List files.
var readDir = Web.readDir;

// render(template,args)
var render = Web.render;

// load(jsfile)
var load = Web.load;

// Default web handler: Four oh Four.
Web.handler = function(path,req,resp) {
  resp.content_type = "text/plain";
  resp.body =
      "Dear sir, goat or lump of cheese:\n\n" +
      "Please override your default Web.handler.\n" +
      "\nThank you.\n\nSincerely,\n\nRoot.";
};

try {
  load('startup.js');
} catch (err) {
  err = __exception__;
  print('There was an error while loading this playground:');
  print('');
  print('Message: ' + err.getMessage());
  print('File: ' + err.sourceName());
  print('Line ' + err.lineNumber() + ': ' + err.lineSource());
  print('');
  print('Details:');
  print('  ' + err.details());
  print('');
  print('ScriptTrace:');
  print('  ' + err.getScriptStackTrace());
}
