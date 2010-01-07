/**
 * pages.js
 *
 * This loads every file in the pages/ dir.
 *
 * For RAD, reloadPages() is executed on every page access.
 *
 * This works in conjunction with jsreload(). It only looks for new,
 * as yet unadded pages, and lets jsload() worry about the previously
 * loaded pages.
 */
var pageCache = {};

function reloadPages() {
  File.list('pages').each(function(name) { 
    if (!pageCache[name]) {
      // So we don't end up loading .swp files
      if (name.match(/^[\w]+\.js$/)) {
        pageCache[name] = true;
        jsload('pages/' + name);
      }
    }
  });
}

reloadPages();
