/** bootstrap.js
 *
 * @author captdeaf@gmail.com (Greg Millam)
 */

try {
  load('config.js');
  load('jslib/utils.js');
  load('jslib/jsload.js');

  /* We do this 'again' so we can auto-reload them. */
  jsload('jslib/utils.js');
  jsload('jslib/jsload.js');
  jsload('main.js');
} catch (err) {
  print("Error: " + err);
  err = __exception__;
  print("Error: " + err.details() );
}
