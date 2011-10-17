jsload('jslib/utils.js');
jsload('jslib/webresponse.js');
jsload('jslib/json.js');

// config.js may already define a logvisit.
var logvisit;
if (logvisit == undefined) {
  logvisit = function(wreq, hostname, path) {
    var pvals = wreq.getParameters().map(function(pname) {
      return pname + ": " + JSON.stringify(wreq.val(pname));
    }).join(', ');
    var referrer = wreq.referrer;
    if (!referrer) {
      referrer = 'direct';
    }
    print('LOGREF [' + (new Date()) + '] ' + // Time
          wreq.remoteAddr + ':' +  // Remote IP address.
          'http://' + hostname + path + // Host+path
          ' ' + referrer // Referrer
          );
    print('LOG [' + (new Date()) + '] ' + // Time
          wreq.remoteAddr + ':' +  // Remote IP address.
          'http://' + hostname + path + // Host+path
          ': {' + pvals + '}' // Parameter values.
          );
  }
}

var WebRequest = defClass({
  name: 'WebRequest',

  construct: function(javareq, params) {
    this.method = javareq.getMethod();
    this.remoteAddr = javareq.getHeader('X-Real-IP') ||
                      javareq.getRemoteAddr();
    this.referrer = javareq.getHeader('Referer');
    this.hostname = javareq.getServerName();

    this.header = function(w) { return javareq.getHeader(w); };

    var cookies = {};

    var c = javareq.getCookies();
    if (c) {
      for (var i = 0; i < c.length; i++) {
        var n = c[i].getName();
        cookies[n] = c[i].getValue();
      }
    }
    this.cookies = cookies;

    this.getCookie = function(k) {
      if (cookies[k]) {
        return ''+String(cookies[k]);
      }
    };

    if (params) {
      var x = params.keySet().toArray();
      var paramnames = [];
      for (var i = 0; i < x.length; i++) {
        paramnames.push(String(x[i]));
      }
      this.getParameters = function() {
        return paramnames;
      }
      this.val = function(name) {
        var ret = params.get(name);
        if (ret) {
          return String(ret[0]);
        }
        return null;
      }
      this.vals = function(name) {
        var ret = params.get(name);
        if (ret) {
          return ret;
        }
        return null;
      }
    } else {
      this.val = function(name) {
        var x = javareq.getParameter(name);
        if (x) {
          return String(x);
        }
        return null;
      };

      this.getParameters = function() {
        if (this.paramnames) {
          return this.paramnames;
        }
        this.paramnames = [];
        var x = javareq.getParameterNames();
        while (x.hasMoreElements()) {
          this.paramnames.push(String(x.nextElement()));
        }
        return this.paramnames;
      }

      this.vals = function(name) {
        var allvals = javareq.getParameterValues(name);
        if (allvals) {
          var ret = [];
          for (var i = 0; i < allvals.length; i++) {
            if (allvals[i]) {
              ret.push(String(allvals[i]));
            }
          }
          return ret;
        }
        return null;
      };
    }

    this.attr = function(name) {
      var ret = javareq.getAttribute(name);
      if (ret) {
        return String(ret);
      }
      return null;
    }

    this.getAttrs = function() {
      if (this.attrnames) {
        return this.attrnames;
      }
      this.attrnames = [];
      var x = javareq.getAttributeNames();
      while (x.hasMoreElements()) {
        this.attrnames.push(String(x.nextElement()));
      }
      return this.attrnames;
    }
  }
});

var WebServer = defClass({
  name: 'WebServer',

  construct: function(host,port) {
    this.host = host;
    this.port = port;

    this.sandboxes = {};
    this.hostmap = {};
  },

  methods: {
    makeServer: function() {
      /* Jetty is weird - A 'server' is just a thread pool and message
       * passer from a connector (which actually does the listening/etc)
       * to the content. */
      this.server = new Packages.org.mortbay.jetty.Server();
      this.connector =
          new Packages.org.mortbay.jetty.nio.SelectChannelConnector();

      this.connector.setHost(this.host);
      this.connector.setPort(this.port);

      this.server.setConnectors(
          [this.connector].toJava(Packages.org.mortbay.jetty.Connector));

      this.handle = this.webHandle;
      // Needing to convert to/from JS and Java just plain sucks beans.
      // this.handler = new 
      //    Packages.org.mortbay.jetty.handler.AbstractHandler(handler);
      this.handler = new JavaAdapter(Packages.JsHandler,this);

      // Create the context connecting the handler and server
      // this.context = new Packages.org.mortbay.jetty.handler.ContextHandler({});
      // this.context.setContextPath('/');
      // this.context.setHandler(this.handler);
      this.server.setHandler(this.handler);
    },
    loadSandboxes: function() {
      var me = this;
      var allsites = File.list(SITES_DIR);
      allsites.each(function(dir) {
        var basedir = SITES_DIR + '/' + dir;
        var site = {};
        site.basedir = basedir;
        if (File.exists(basedir + '/hostrx')) {
          site.hostrx = File.read(basedir + '/hostrx').split(/\n|\r/,2)[0];
        }
        if (!me.sandboxes[site.siteid]) {
          print('Adding site: ' + site.basedir);
          var sb = new Sandbox(site);
          me.sandboxes[sb.siteid] = sb;
          if (!me.defaultSandbox) {
            me.defaultSandbox = sb;
          }
          if (File.exists(basedir + '/default')) {
            me.defaultSandbox = sb;
          }
        }
      });
    },

    send: function(wresp, resp) {
      for (var header in wresp.headers) {
        resp.setHeader(header,wresp.headers[header]);
      }
      var C = Packages.javax.servlet.http.Cookie;
      for (var name in wresp.cookies) {
        var val = wresp.cookies[name][0];
        var o   = wresp.cookies[name][1];
        var cookie = new C(name, val);
        if (o) {
          if (o.domain) {
            cookie.setDomain(o.domain);
          }
          if (o.age)  {
            cookie.setMaxAge(o.age);
          }
          if (o.path) {
            cookie.setPath(o.path);
          }
          if (o.secure) {
            cookie.setSecure(o.secure);
          }
        }
        resp.addCookie(cookie);
      }
      // print('content-type: ' + wresp.content_type);
      // print('status: ' + wresp.status);
      // print('');
      // print(wresp.body);
      resp.setContentType(wresp.content_type);                    
      resp.setStatus(wresp.status);                               
      resp.getWriter().write(wresp.body.toString());
    },

    start: function() {
      // Create the web server.
      this.makeServer();

      // Start it.
      this.server.start();
    },

    webHandle: function(path,req,resp,dispatch) {
      path = '' + String(path);
      // Create a new Javascript Thread.local context.
      jsreload();
      Thread.local = {};

      // Do we have a match for the domain?
      var hostname = req.getServerName();
      var sb;
      var sid = this.hostmap[hostname];
      if (sid) {
        sb = this.sandboxes[sid];
      } 
      if (!sb) {
        // Iterate through sandboxes looking for a regexp match.
        for (var i in this.sandboxes) {
          print("Testing " + hostname + " against " + this.sandboxes[i].hostrx);
          if (hostname.match(this.sandboxes[i].hostrx)) {
            sb = this.sandboxes[i];
            this.hostmap[hostname] = sb.siteid;
            break;
          }
        }
      }

      if (!sb && this.defaultSandbox) {
        sb = this.defaultSandbox;
      }
      
      // If we match a sandbox, let the sandbox do the handling!
      if (sb) {
        try {
          // temp dir.
          var tempdir = sb.basedir + '/tmp';

          // Parse in case of enctype=multipart/form-data
          var params = Packages.JsUtils.parseMultiPartForm(req,tempdir);

          // Convert Java requests into our JavaScript WebRequest/WebResponse.
          var wreq = new WebRequest(req, params);
          var wresp = new WebResponse();

          // Log the visit
          logvisit(wreq, hostname, path);

          // Call the handler
          sb.handler(path,wreq,wresp);

          // Send it.
          this.send(wresp,resp);
          req.setHandled(true);

          // Delete all the uploaded files still in /tmp.
          var names = wreq.getAttrs();
          for (var i = 0; i < names.length; i++) {
            var val = wreq.attr(names[i]);
            var path = sb.basedir + '/' + val;
            if (val.match(/^\/tmp/) && File.exists(path)) {
              File.remove(path);
            }
          }
        } catch (err) {
          err = __exception__;
          resp.setContentType('text/plain');
          resp.setStatus(500);
          var str = [];
          str.push('There was an error on this page.');
          str.push('');
          str.push('Message: ' + err.getMessage());
          str.push('File: ' + err.sourceName());
          str.push('Line ' + err.lineNumber() + ': ' + err.lineSource());
          str.push('');
          str.push('Details:');
          str.push('  ' + err.details());
          str.push('');
          str.push('ScriptTrace:');
          str.push('  ' + err.getScriptStackTrace());
          // str.push('');
          // str.push('StackTrace:');
          // var s = err.getStackTrace();
          // for (var j = 0; j < s.length; j++) {
            // str.push('  ' + s[j].getFileName() + '@' + s[j].getLineNumber() +
            // ': ' + s[j].getClassName() + '.' + s[j].getMethodName() + '()');
          // }
          print(str.join('\n'));
          resp.getWriter().println(str.join('\n'));
          req.setHandled(true);
        }
      } else {
        resp.setContentType('text/plain');
        resp.setStatus(500);
        var str = [];
        str.push('Invalid domain, sorry!');
        resp.getWriter().println(str.join('\n'));
        req.setHandled(true);
      }
    }
  }
});

