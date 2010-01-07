/**
 * file.js
 *
 * Adding some ruby-like File.foo utilities.
 */
var File = {
  file: function(fn) {
    var file = new java.io.File(fn);
    return file.isFile();
  },

  directory: function(fn) {
    var file = new java.io.File(fn);
    return file.isDirectory();
  },

  exists: function(fn) {
    var file = new java.io.File(fn);
    return file.exists();
  },

  mtime: function(fn) {
    var file = new java.io.File(fn);
    return file.lastModified();
  },

  readable: function(fn) {
    var file = new java.io.File(fn);
    return file.canRead();
  },

  read: function(fn) {
    var ret = Packages.JsUtils.readBinaryFile(fn);
    if (ret) {
      return ''+String(ret);
    }
    return null;
  },

  write: function(fn,str) {
    print("Writing file: " + fn);
    return Packages.JsUtils.writeBinaryFile(fn,str);
  },

  rename: function(fn,to) {
    var file = new java.io.File(fn);
    var fto = new java.io.File(to);
    // delete is a keyword in javascript, so we have
    // to call file.delete this way. :-(.
    return file.renameTo(fto);
  },

  remove: function(fn) {
    var file = new java.io.File(fn);
    // delete is a keyword in javascript, so we have
    // to call file.delete this way. :-(.
    return file['delete']();
  },

  type: function(fn) {
    var opts = {input: fn, output: '', err: ''};
    var type = '';
    if (runCommand('/usr/bin/file','-i','-f','-',opts) === 0) {
      type = ''+String(opts.output).replace(/^.*?:\s+/,'');
      type = type.replace(/\s+$/,'');
    } else {
      print("runCommand failed!");
      print("in: " + opts.input);
      print("out: " + opts.output);
      print("Err: " + opts.err);
    }
    return type;
  },

  safepath: function(fn) {
    if (!fn || !fn.match(/^[\/a-zA-Z0-9\._\-]+$/)) {
      return false;
    }
    var ary = fn.split(/\/+/);
    var path = [];
    for (var i=0; i < ary.length; i++) {
      var dir = ary[i];
      if (dir == "..") {
        if (path.length < 1) {
          return false;
        }
        path.pop();
      } else {
        path.push(dir);
      }
    }
    return path.join("/");
  },

  list: function(fn) {
    var dir = new java.io.File(fn);
    if (dir.isDirectory()) {
      var ret = [];
      var kids = dir.list();
      for (var i = 0; i < kids.length; i++) {
        ret.push(''+String(kids[i]));
      }
      return ret;
    }
    print("File.list called on a non-dir? For '" + fn + "'?");
    return false;
  }
};
