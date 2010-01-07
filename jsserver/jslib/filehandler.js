/** fileHandler.js
 *
 * @author captdeaf@gmail.com (Greg Millam)
 */

var makeFileFinder = function(root) {
  var cache = {};
  return function(path) {
    var fn = root + '/' + path;
    var ret = {};
    if (File.file(fn)) {
      if (!cache[fn] || (File.mtime(fn) > cache[fn].mtime)) {
	var out = '';
	var err = '';
	var input = fn + '\n';
	var type = 'text/plain';
	var ext = (''+fn).replace(/^.*?\.(\w+)$/,'$1');
	switch (ext) {
	case 'css':
	  type = 'text/css';
	  break;
	case 'gif':
	  type = 'image/gif';
	  break;
	default:
	  var opts = {input: input, output: '', err: ''};
	  if (runCommand('/usr/bin/file','-i','-f','-',opts) === 0) {
	    type = opts.output.replace(/^.*?:\s+/,'');
	    type = type.replace(/\s+$/,'');
	  } else {
	    print("runCommand failed!");
	    print("in: " + opts.input);
	    print("out: " + opts.output);
	    print("Err: " + opts.err);
	  }
	}
	cache[fn] = {
	  mtime: File.mtime(fn),
	  body: File.read(fn),
	  type: type
	};
      }
      ret.directory = false;
      ret.body = cache[fn].body;
      ret.content_type = cache[fn].type;
      return ret;
    } else if (File.directory(fn)) {
      ret.directory = true;
      ret.content_type = 'text/plain';
      ret.body = "Sorry, directory listing is not coded yet.";
      return ret;
    } else {
      return null;
    }
  };
};

var makeFileHandler = function(root) {
  var finder = makeFileFinder(root);
  return function(path,req,resp) {
    var ret = finder(path);
    if (ret) {
      resp.body = ret.body;
      resp.content_type = ret.content_type;
    } else {
      resp.fourohfour();
    }
  };
};
