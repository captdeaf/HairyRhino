/**
 * Javascript scopes.
 *
 * This is basically a way to allow the main JavaScript code 
 */

import org.mozilla.javascript.*;

public class JsScope {
  Scriptable scope;

  public JsScope() {
    Context cx;
    cx = Context.getCurrentContext();
    if (cx == null) {
      scope = null;
      return;
    }
    scope = cx.initStandardObjects();
  }

  public Object evaluate(String what, String filename) {
    Context cx;
    cx = Context.getCurrentContext();
    if (cx == null) {
      return null;
    }
    if (scope == null) {
      scope = cx.initStandardObjects();
    }
    cx.setOptimizationLevel(9);
    Script newScript = cx.compileString(what, filename, 1, null);
    Object result = newScript.exec(cx, scope);
    return result;
  }

  public Object get(String what) {
    Context cx;
    cx = Context.getCurrentContext();
    if (cx == null) {
      return null;
    }
    if (scope == null) {
      scope = cx.initStandardObjects();
    }
    Object ret = scope.get(what, scope);
    if (ret == Scriptable.NOT_FOUND) {
      return cx.getUndefinedValue();
    } else {
      return ret;
    }
  }
}
