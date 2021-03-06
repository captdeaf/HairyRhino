// This is the web Handler for this JS Scope / Website.

// Default handler. onReload is called immediately before any page is
// accessed, in case of changes. This should probably be empty in Production
// environments. Designed for RAD development of pages.
// Web.onReload = function() {};

// URI Mangler. Return a new path, as mangled by information in the request.
// e.g: May be used to redirect mobile browsers, international visitors, etc.
// If a resp.redirect() or similar is called, then this causes the redirect to
// return directly. To do an internal redirect, return the new path.
Web.requestMangler = function(path, req, resp) {
  return path;
};

Web.masterTemplate = 'master';

// Web.handler() is what the Jetty scope uses to call.
Web.handler = function(path, req, resp) {
  // Set the path in response. This is for 'original path detection'.
  resp.path = path;

  // Get rid of leading and trailing /s in the path.
  path = path.replace(/^\/+|\/+$/g,'');

  // Default master template. Anything returned by the page is run through
  // this.
  resp.master = Web.masterTemplate;

  // By default, include pages in the master template.
  resp.layout = true;

  // Set our thread local stuff.
  Thread.local.hostname = req.hostname;

  // If Web.onReload is a function, call it.
  if (typeof(Web.onReload) == 'function') { Web.onReload(); }

  // Call requestMangler.
  if (typeof(Web.requestMangler) == 'function') {
    var newpath = Web.requestMangler(path, req, resp);
    if (newpath) { path = newpath; }
  }

  // Set the response locals. These are passed to the master template.
  resp.locals = {};

  // Did requestMangler() redirect, error or otherwise?
  var err;
  try {
    if (resp.status == 200) {
      if (path.match(/^action\/(.*)$/)) {
        var action = RegExp.$1;
        this.callAction(action, req, resp);
      } else {
        this.defaultHandler(path, req, resp);
      }
    }
  } catch (err) {
    resp.error(__exception__);
  }
  // Error handler.
  if (resp.status >= 400) {
    Web.errorHandler(path, req, resp);
  }
  if (resp.layout && resp.master) {
    resp.content_type = 'text/html; charset=UTF-8';
    resp.locals.body = resp.body;
    resp.body = render(resp.master, resp.locals);
  }
};

/** pages.js
 *
 * @author captdeaf@gmail.com (Greg Millam)
 */

// For caching.
Web.pageCache = {};

Web.pages = Web.pages || {};

Web.add_page = function(name, rx, callback) {
  Web.pages[name] = {rx:rx,cb:callback};
};

// The default handler. Search through the pages for a regexp that matches its
// path.
Web.defaultHandler = function(path,req,resp) {
  var page;
  if (!Config.enableRAD) {
    page = Web.pageCache[path];
  }
  var m;
  if (page) {
    m = page.rx.exec(path);
    req.m = m;
  } else {
    for (var name in Web.pages) {
      if ((m = Web.pages[name].rx.exec(path)) !== null) {
        page = Web.pages[name];
        Web.pageCache[path] = page;
        req.m = m;
        break;
      }
    }
  }
  var err;
  if (page) {
    resp.body = null;
    try {
      var body = page.cb(req,resp);
    } catch (err) {
      resp.error(__exception__);
    }
    if ((!resp.body) && body) {
       resp.body = body;
    }
  } else {
    resp.fourohfour();
  }
};

/** actions.js
 *
 * @author captdeaf@gmail.com (Greg Millam)
 */

Web.actions = Web.actions || {};

Web.add_action = function(name, callback) {
  Web.actions[name] = callback;
};

Web.callAction = function(path,req,resp) {
  if ((req.method != 'POST') ||
      (!req.referrer) ||
      (!Config.referrer_rx.exec(req.referrer))) {
    resp.unauthorized();
    return;
  }
  var action;
  if ((action = Web.actions[path]) != null) {
    action(req,resp);
  } else {
    resp.fourohfour();
  }
};

// errorHandler. This is called when status is an error code:
// 404, 500, 403, etc.

Web.errorHandler = function(path,req,resp) {
  // If <statuscode>.html exists in templates/, render that, within
  // the master.
  if (File.exists('templates/' + resp.status + '.html')) {
    resp.body = render('' + resp.status, {path: path, req: req, resp: resp});
  } else {
    // We use the messages generated by WebResponse. Lame, but if we don't
    // have better, we have to use it. But let's bold it up for inclusion
    // into our master template.
    resp.layout = true;
    resp.body = "<div><b><pre>\n" + resp.body + "\n</pre></div>";
  }
};
