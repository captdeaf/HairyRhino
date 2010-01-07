// Template locals. This isn't wonderfully done, yet, as we don't
// use htmlEscape or params yet, just proof of concept.

Web.template.locals = {
  htmlEscape: function(str) {
    return str.replace(/[<>&]/g, function(s) {
      switch (s) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      }
    });
  },
  param: function(str) {
    return str.replace(/[<>&"]/g, function(s) {
      switch (s) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      }
    });
  },
};

// If TemplateGlobals exists, slurp all its values into Web.template.locals
var TemplateGlobals;
if (TemplateGlobals) {
  Object.extend(Web.template.locals, TemplateGlobals);
}
