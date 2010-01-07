/** fourohfour.js
 *
 * @author captdeaf@gmail.com (Greg Millam)
 */

var WebResponse = defClass({
  name: 'WebResponse',

  construct: function() {
    this.body = 'The app forgot to set the body.';
    this.status = 200;
    this.content_type = 'text/plain';
    this.cookies = {};
    this.headers = {};
  },

  methods: {
    setCookie: function(name,value,opts) {
      this.cookies[name] = [value,opts];
    },

    fourohfour: function() {
      this.status = 404;
      this.body = "Error 404: File Not Found.";
    },

    error: function(err) {
      this.status = 500;
      var s = [];
      for (var key in err) {
        s.push('' + key + ': ' + err[key]);
      }
      this.error = err;
      this.body = 'Error: ' + err + '\n' +  s.join("\n");
    },

    unauthorized: function() {
      this.status = 403;
      this.body = "403 Forbidden.";
    },

    redirect: function(url) {
      this.headers.Location = url;
      this.status = 303;
      this.body = 'Redirecting to: ' + url;
    }
  }
});
