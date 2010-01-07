/**
 * queries.js
 *
 * This loads every file in the queries/dir as a query, with the name
 * equal to the file. Lines beginning with a # in the file are comments and
 # ignored by the loader.
 #
 # For RAD, reloadQueries() is executed on every page access.
 */

var queryCache = {};

function reloadQueries() {
  File.list('queries').each(function(name) { 
    if (!queryCache[name] ||
        queryCache[name] < File.mtime('queries/' + name)) {
      // My jsserver keeps loading my .foo.swp files while I'm editing
      // queries. Prevent this.
      if (name.match(/^\w+$/)) {
        queryCache[name] = (new Date()).getTime();
        var fileContents = File.read('queries/' + name);
        var split = fileContents.split(/[\r\n]+/g);
        var i = 0;

        // Strip out all comment lines.
        split = split.select(function(line) {
          return !line.match(/^\s*#/);
        });

        query = split.splice(i).join(' ');

        // TODO: need to trim
        if (query != '') {
          DBCONN.prepare(name, query);
        }
      }
    }
  });
}

reloadQueries();
