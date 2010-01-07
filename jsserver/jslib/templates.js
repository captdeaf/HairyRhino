/** templates.js
 *
 * @author captdeaf@gmail.com (Greg Millam)
 */

jsload('jslib/utils.js');
jsload('jslib/file.js');
jsload('jslib/fulljslint.js');

/* The TemplateEngine class. */
var TemplateEngine = defClass({
  name: 'TemplateEngine',

  construct: function(paths, log, myeval) {
    this.paths = paths;
    if (PRODUCTION) {
      this.log = log || function(){};
    } else {
      this.log = log || print;
    }
    this.evaluate = myeval;
    this.templates = {};
    this.mylocals = {};
    this.mutex = new java.util.concurrent.Semaphore(1);
  },

  setters: {
    locals: function(l) {
      this.mylocals = l;
    }
  },

  getters: {
    locals: function() {
      return this.mylocals;
    }
  },

  methods: {
    /* templates is a hash of {path:foo, render: foo, loadtime: foo} */
    templates: {},

    paths: [],

    addPath: function(path) {
      this.paths.push(path);
    },
    
    subrender: function(tname, locals, superlocals) {
      if (locals) {
        for (var i in superlocals) {
          if (!locals.hasOwnProperty(i)) {
            locals[i] = superlocals[i];
          }
        }
      } else {
        locals = superlocals;
      }
      return this.dorender(tname,locals);
    },

    render: function(tname,locals) {
      if (!locals) {
        locals = {};
      }
      for (var i in this.mylocals) {
        if (!locals.hasOwnProperty(i)) {
          locals[i] = this.mylocals[i];
        }
      }
      if (this.templates[tname]) {
        return this.dorender(tname, locals);
      } else {
        var goodname = File.safepath(tname);
        if (!goodname) {
          this.log("Unable to find file '" + tname  + "'!");
          return "Invalid template: '" + tname + "'";
        }
        return this.dorender(goodname, locals);
      }
    },

    dorender: function(tname,locals) {
      var tpl = this.templates[tname];
      var me = this;
      var i, j;
      locals.render = function(t,l) { return me.subrender(t,l,locals); };
      // Only reload new templates if we're not a production environment.
      if (!tpl || (!PRODUCTION && (tpl.loadtime < File.mtime(tpl.path)))) {
        this.mutex.acquire();
        // We don't have an up to date template. But in the time it took
        // to acquire a mutex, did some other thread compile and cache
        // it?
        tpl = this.templates[tname];
        if (!tpl || tpl.loadtime < File.mtime(tpl.path)) {
          if (!tpl) {
            for (j = 0; j < this.paths.length; j++) {
              i = this.paths[j];
              if (File.exists(i + '/' + tname + '.html')) {
                tpl = {path: i + '/' + tname + '.html'};
              } else if (File.exists(i + '/' + tname + '.txt')) {
                tpl = {path: i + '/' + tname + '.txt'};
              } else if (File.exists(i + '/' + tname)) {
                tpl = {path: i + '/' + tname};
              }
            }
            if (!tpl) {
              this.mutex.release();
              this.log("Unable to find file '" + tname  + "'!");
              return "Invalid template: '" + tname + "'";
            }
          }
          if (this.loadTemplate(tpl)) {
            this.templates[tname] = tpl;
          } else {
            tpl = null;
          }
        }
        this.mutex.release();
      }
      if (tpl && tpl.render) {
        var out = [];
        try {
          tpl.render(out, locals);
        } catch (err) {
          print("Got an error within dorender while rendering '" + tname + "'");
          print("Locals:");
          printout(locals);
          print("Err:");
          printout(err);
          throw err;
        }
        return out.join('');
      }
      return 'Error in templating system.';
    },

    /* This needs to turn HTML into something I can print out
     * surrounded by ""s. */
    escapeTpl: function(str) {
      return str.replace(/["\\]/g,"\\$&").replace(/\n/g,'\\n');
    },

    loadTemplate: function(tpl) {
      tpl.render = null;
      var code = [];
      var lines = [];
      var mtime = File.mtime(tpl.path);
      try {
        this.log("Loading Template: " + tpl.path);
        var content = File.read(tpl.path);
        
        var pattern = new RegExp(/([\s\S]*?)(?:<%([#=]?)([\s\S]*?)\2?%>|$)/g);

        var stripline = false;
        var lcount = 0;
        var result;
        while ((result = pattern.exec(content)) !== null) {
          if (result[0] === '') { break; }
          var headlines = (result[1].match(/\n/g)||[]).length;
          if (result[1]) {
            var res = result[1];
            if (!(stripline && (result[2] != '=') && result[1].match(/^\s+$/))) {
              // Don't strip leading stuff.
              // if (stripline) {
              //   res = res.replace(/^\s*?\r?\n\r?/,'');
              // }
              stripline = (result[2] != '=');
              if (stripline) {
                res = res.replace(/\r?\n\r?\s*$/,'');
              }
              code.push('tmplout.push("' + this.escapeTpl(res) +
                        '");');
              lines.push(-1);
            }
          }
          switch (result[2]) {
          case "#":
            // Comment.
            break;
          case "=":
            // Evaluate and print this code.
            lines.push(lcount + headlines);
            code.push('tmplout.push(' + result[3] + ');');
            break;
          default:
            if (result[3]) {
              lines.push(lcount + headlines);
              code.push(result[3]);
            }
          }
          lcount += (result[0].match(/\n/g)||[]).length;
        }

        var warnings;
        if (!PRODUCTION) {
          warnings = this.lint(lines,code);
        }
        if (warnings) {
          this.log("Error while loading " + tpl.path + ":\n[" +
                   warnings.join("\n") + "\n]");
          tpl.render = function(t,l) { t.push(warnings.join("<br />\n")); };
          return;
        } else {
          var s = "var tmplfun = function(tmplout,locals) { with(locals) {\n" +
                  code.join("\n") + "}} ; tmplfun";

          var fun;
          if (this.evaluate) {
            fun = this.evaluate(s);
          } else {
            fun = eval(s);
          }
          tpl.render = fun;
          this.log("Template '" + tpl.path + "' loaded.");
        }
        tpl.loadtime = mtime;
        return true;
      } catch (exception) {
        print("Got an error within loadtemplate while loading '" + tpl.path + "'");
        print("Err:");
        printout(exception);
        tpl.render = function(t,l) {
          t.push("Error with templating system.");
        };
        tpl.loadtime = mtime;
        this.log("Unable to load template '" + tpl.path + "': " + exception.message);
        return true;
      }
    },

    /* This attempts to use rhino to compile the file. */
    lint: function(lines,code) {
      var str = 'var tmplout = []; ';
      var addprint = false;
      var i;
      for (i = 0; i < code.length; i++) {
        if (lines[i] < 0) { addprint = true; continue; }
        var cnt = (lines[i] - (str.match(/\n/g)||[]).length);
        for (var j = 0;j < cnt;j++) {
          if (addprint) {
            str += "print('placeholder');\n";
            addprint = false;
          } else {
            str += "\n";
          }
        }
        str += code[i];
      }
      if (!JSLINT(str, {
          rhino: true, passfail: false, evil: false, nomen: false,
          white: false, laxbreak: true
          })) {
        print("Linting: <" + str + ">");
        var ret = [];
        for (i = 0; i < JSLINT.errors.length; i += 1) {
          var e = JSLINT.errors[i];
          if (e) {
            ret.push('Lint at line ' + (e.line + 1) + ' character ' +
                (e.character + 1) + ': [' + e.reason + ']');
            ret.push('');
          }
        }
        return ret;
      } else {
        return null;
      }
    }
  }
});

