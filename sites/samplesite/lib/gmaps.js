/**
 * gmaps.js
 *
 * An interface to simplify access to gmaps information.
 */

jsload('config.js');

var Gmaps = {
  ipcache: {},
  // Not a GMaps thing, but it deals with location, and it makes sense
  // to keep all location stuff in this file.
  locateIP: function(ip) {
    var m;

    // Default IP. TODO: Pick a better one.
    var myip = '98.237.212.234';
    if (m = ip.match(/, (\d+\.\d+\.\d+\.\d+)/)) {
      myip = m[1];
    } else if (m = ip.match(/\D(\d+\.\d+\.\d+\.\d+)/)) {
      myip = m[1];
    } else if (m = ip.match(/(\d+\.\d+\.\d+\.\d+)/)) {
      myip = m[1];
    }
    // seattle IP for local
    if (myip == '127.0.0.1') {
      myip = '98.237.212.234';
    }

    if (Gmaps.ipcache[myip]) {
      var cs_split = Gmaps.ipcache[myip].split(',');
      return { city: cs_split[0].trim(), state: Utils.stateToAbbr(cs_split[1].trim()) };
      //return Gmaps.ipcache[myip];
    }
    
    var i = DB.ip_find(myip);
    if (i && i[0]) {
      Gmaps.ipcache[myip] = i[0].city_state;
      var cs_split = i[0].city_state.split(',');
      return { city: cs_split[0].trim(), state: Utils.stateToAbbr(cs_split[1].trim()) };
      //return i[0].city_state;
    }

    var url = "http://ipinfodb.com/ip_query.php?ip=" + myip;
    var body = readUrl(url);

    var city = body.match(/<City>(.+?)<\/City>/);
    var state = body.match(/<RegionName>(.+?)<\/RegionName>/);

    if (!city && !state) {
      return;
    }

    var ret = city[1] + ', ' + state[1];
    DB.ip_put(myip, ret);
    
    return { city: city[1].trim(), state: Utils.stateToAbbr(state[1].trim()) };

  },

  cache: {},

  find: function(key) {
    // Normalize the key.
    key = key.toLowerCase().replace(/^\s+|"|\s+$/g,'').replace(/\s+/,' ');

    // Is it cached in memory?
    if (Gmaps.cache[key]) {
      return Gmaps.cache[key];
    }

    // How about in the db?
    var res = {};
    
    res = DB.gmaps_find(key);

    if (res && res[0]) {
      // First result.
      res = res[0];
    } else {
      // Still no good? Okay, let's ask Google.
      res = Gmaps.query(key);
    }

    if (res) {
      var split = res.locname.split(',');
      if (split.length == 2) {
        res.locname = split[0] + ', ' + Utils.stateToAbbr(split[1].trim());
      } 
      Gmaps.cache[key] = res;
      return res;
    }
  },

  query: function(key) {
    var url = "http://maps.google.com/maps/geo?key=" + Config.googlekey +
              "&q=" + encodeURIComponent(key) +
              "&output=json";
    var body = readUrl(url);
    var res = JSON.parse(body);

    // It must have a placemark.
    if (!res || !res.Placemark || !res.Placemark[0]) {
      return;
    }

    var pm = res.Placemark[0];

    // if no locality name, we don't have a city name, so we return
    /*
    if (!pm.AddressDetails || 
        !pm.AddressDetails.Country || 
        !pm.AddressDetails.Country.AdministrativeArea || 
        !pm.AddressDetails.Country.AdministrativeArea.Locality ||
        !pm.AddressDetails.Country.AdministrativeArea.Locality.LocalityName) {

      return;

    }
    */

    var pmatch = pm.address.match(/\s*([^,]+, [a-zA-Z ]+)(?:\s+\d+)?,? USA/);

    if (!pmatch || /\d+/.test(pmatch[1])) {
      return;
    }

    var ploc = pmatch[1];
    var coords = pm.Point.coordinates;
    var lat = coords[1], lng = coords[0];

    DB.gmaps_put({
          key: key,
          locname: ploc,
          lat: lat,
          lng: lng,
          data: body
        });
    return {
          key: key,
          locname: ploc,
          lat: lat,
          lng: lng
    }; 
  } 
};
