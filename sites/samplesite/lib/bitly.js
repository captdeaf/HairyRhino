/*
 * bitly.js
 *
 * Simple library that uses the bit.ly API to shorten URLs.
 *
 */
jsload('config.js');

var Bitly = {

  shortenUrl: function(url) {
    // need to implement db caching
    return Bitly.retrieve(url);
  },

  retrieve : function(url) {
  
    var apiurl = 'http://api.bit.ly/shorten?version=2.0.1' +
                 '&longUrl=' + encodeURIComponent(url) +
                 '&login=' + Config.bitlyuser +
                 '&apiKey=' + Config.bitlykey;

    var ret = readUrl(apiurl);
    var data = JSON.parse(ret); 

    if (data.statusCode == 'OK') {
      return data.results[url].shortUrl;
    } else {
      return;
    }

  }

};
