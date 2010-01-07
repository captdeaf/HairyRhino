/* mail.js
 *
 * Sending Mail through the Rhino runCommand(), calling /usr/bin/mail
 */
function isValidEmail(str) {
  return str.match(/^([\w.%+-]+)@([\w.-]+\.([A-Z]{2,4}))$/i);
}

function isValidArg(str) {
  return str.match(/^[\w.:"'\s-#@1><^%,]+$/i);
}

function sendMail(opts) {
  var args = [];

  if (opts.to && isValidEmail(opts.to)) {
    args.push(opts.to);
  } else if (opts.to) {
    return "Mail Error: Invalid 'to' email: '" + opts.to + "'";
  } else {
    return "Mail Error: No 'to' was set.";
  }

  if (opts.subject && isValidArg(opts.subject)) {
    args.push('-s');
    args.push(opts.subject);
  } else if (opts.subject) {
    return "Mail Error: Invalid email subject: '" + opts.subject + "'";
  } else {
    return "Mail Error: No email subject was set.";
  }
  
  args.push('--');

  if (opts.from && isValidEmail(opts.from)) {
    args.push('-f');
    args.push(opts.from);
  } else if (opts.from) {
    return "Mail Error: Invalid 'from' email: '" + opts.from + "'";
  } else {
    return "Mail Error: No 'from' was set.";
  }

  if (opts.fromName && isValidArg(opts.fromName)) {
    args.push('-F');
    args.push(opts.fromName);
  } else {
    return "Mail Error: Invalid fromName was set: '" + opts.fromName + "'";
  }

  if (!opts.body) {
    return "Mail Error: No body set in email!";
  }

  var rcargs = {args: args,
                input: opts.body,
                output: '',
                err: ''};
print('sending email');
  runCommand('/usr/bin/mail', rcargs);
  if (rcargs.err) {
print('error: '+ rcargs.err);
    return 'Mail Error: ' + rcargs.err;
  }
}
