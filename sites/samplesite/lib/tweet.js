var Twitter = { 
  tweet: function(user, pass, message) {

    var auth = 'Basic ' + Base64.encode(user + ':' + pass);
    var y;
    var x = new Ajax.Request("http://twitter.com/statuses/update.json", {
        method: 'post',
        requestHeaders: {
            'Authorization': auth,
            'Referer': Config.siteurl
            },
        parameters: {
          'status': message
        },
        onSuccess: function(x) {
              y = x.responseText;
            },
        onFailure: function(x) { print("Failed to send twitter message"); },
        asynchronous: false
        });
    return y;
  }
};
