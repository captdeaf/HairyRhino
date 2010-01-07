/**
 * visitlogger.js
 * This is called on each visit with wreq, hostname and path.
 */

LOGCONN = new SQL(
   'jdbc:mysql://127.0.0.1/jsserver',
   'jsserver',
   'jsserver'
 );
LOGDB = LOGCONN.db;
LOGCONN.prepare('log_visit',
  " INSERT INTO visits " +
  "  (domain, visitor_ip, useragent, referrer, visit_day, visit_time, path, params, cookies) " +
  " VALUES " +
  "  (:domain, :visitor_ip, :useragent, :referrer, current_date, NOW(), :path, :params, :cookies)"
  );

logvisit = function(wreq, hostname, path) {
  // Referrer
  var referrer = wreq.referrer || '';

  // Parameters.
  var pobj = {};
  wreq.getParameters().map(function(pname) {
    pobj[pname] = wreq.val(pname);
  });
  var pvals = JSON.stringify(pobj);

  // cookies
  var cookies = JSON.stringify(wreq.cookies);

  // hostname.
  hostname = hostname.toLowerCase();

  var userAgent = wreq.header('user-agent') || wreq.header('User-Agent');
  // We shouldn't get an error, but just in case mysql is down ...
  try {
    LOGDB.log_visit( {
      domain: hostname || '',
      visitor_ip: wreq.remoteAddr || '',
      useragent: userAgent || '',
      referrer: wreq.referrer || '',
      path: path || '/',
      params: pvals || '',
      cookies: cookies || ''
    });
  } catch (e) {
    print("Error while logging visit: " + e.toString());
  }

  // Keep doing old style logs.
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
