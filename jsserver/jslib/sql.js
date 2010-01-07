/** base.js
 *
 * @author captdeaf@gmail.com (Greg Millam)
 */

jsload('jslib/utils.js');

var SQL = defClass({
  construct: function(url, user, pass) {
    this.connect(url, user, pass);
    this.mutex = new java.util.concurrent.Semaphore(1);
    this.db = {};
  },
  methods: {
    connect: function(url, user, pass) {
      this.jsConnectionObj = new Packages.JsConnection();
      this.makeConn = function() {
        var conn = this.jsConnectionObj.open(url, user, pass);
        return conn;
      };
      this.conns = [];
    },

    getConn: function() {
      this.mutex.acquire();
      var conn = this.conns.pop();
      if (!conn) {
        conn = { conn: this.makeConn(), queries: {} };
      }
      this.mutex.release();
      return conn;
    },

    pushConn: function(cp) {
      this.mutex.acquire();
      this.conns.push(cp);
      this.mutex.release();
    },

    columnizer: {
      'string': function(rs,name) {
        // We need to turn this into Javascript strings.
        var s = rs.getString(name);
        if (s) {
          return String(s);
        } else {
          return null;
        }
      },
      'bool': function(rs, name) { 
        return rs.getBoolean(name); 
      },
      num: function(rs, name) {
        return rs.getInt(name);
      }
    },

    getColumnizer: function(type) {
      type = String(type);
      if (type.match(/int/i)) {
        return this.columnizer.num;
      } else if (type.match(/bool/i)) {
        return this.columnizer.bool;
      } else {
        return this.columnizer.string;
      }
    },

    doPQuery: function(q, args) {
      try {
        return this.doPQueryreal(q, args);
      } catch (err) {
        if ((""+err).match(/java\.io\.EOFException/i)) {
          print("EOF Exception!");
          // Ditch all current connections.
          while (this.conns.length > 0) {
            this.conns.pop();
          }
          return this.doPQueryreal(q, args);
        } else {
          print("While executing query '" + q.query + "':");
          print("doPQuery Unknown exception?: " + err);
        }
      }
    },

    bindVar: function(stmt, idx, type, arg) {
      idx = idx + 1; // Since stmt bind vars are 1-based. . .
      switch (type) {
      case 'int':
        stmt.setInt(idx,parseInt(arg));
        break;
      case 'float':
        stmt.setFloat(idx,parseFloat(arg));
        break;
      case 'date':
        stmt.setString(idx,arg);
        break;
      case 'bool':
        stmt.setBoolean(idx, arg);
        break;
      case 'glob':
        // We change glob style to 'LIKE' style.
        var glob =
            arg.replace(/[%_]/g,'\\\\\\1').replace(/\?/g,'_').replace(/\*/,'%');
        stmt.setString(idx, glob);
        break;
      default:
        stmt.setString(idx,arg);
      }
    },

    doPQueryreal: function(q, args) {
      var fun;
      if (args.length > 0) {
        fun = args.pop();
        if (typeof fun != 'function') {
          args.push(fun);
          fun = undefined;
        }
      }
      var cp = this.getConn();
      var conn = cp.conn;
      var preparedQueries = cp.queries;
      var ret;
      var query = preparedQueries[q.name];
      if (!query || !query.stmt || (query.query != q.query)) {
        query = {
              stmt: conn.prepareStatement(q.query),
              query: q.query
            };
        preparedQueries[q.name] = query;
      }
      var stmt = query.stmt;
      var f;
      var idx;
      if (args.length > 0) {
        if (args.length > 1) {
          // Positional instead of named.
          for (idx = 0; idx < q.populate.length; idx++) {
            f = q.populate[idx];
            this.bindVar(stmt, idx, f[1], args[idx]);
          }
        } else if (args.length == 1 && q.populate.length == 1) {
          // Single parameter.
          f = q.populate[0];
          var arg = args[0];
          if (arg[f[0]]) {
            arg = arg[f[0]];
          }
          this.bindVar(stmt, 0, f[1], arg);
        } else {
          // Object parameter.
          for (idx = 0; idx < q.populate.length; idx++) {
            f = q.populate[idx];
            this.bindVar(stmt, idx, f[1], args[0][f[0]]);
          }
        }
      }
      var rs;
      if (q.isQuery) {
        rs = stmt.executeQuery();
        if (fun) {
          ret = this.map_rs(rs, fun);
        } else {
          ret = this.js_rs(rs);
        }
        rs.close();
      } else {
        var retcount = stmt.executeUpdate();
        /*
        rs = stmt.executeQuery("select last_insert_id() as id");
        rs.next();
        var id = rs.getInt('id');
        rs.close();
        ret = {rows: retcount, id: id};
        */
        ret = [];
      }
      this.pushConn(cp);
      if (ret.length > 0) {
        return ret;
      }
      return null;
    },

    makePopulator: function(q) {
      var qi = [];
      var newq = q.replace(/(\W):(\w+)(?:\(\w+\))?(\W|$)/g,function(str) {
        var m = /(\W):(\w+)(?:\((\w+)\))?(\W|$)/.exec(str);
        qi.push([m[2], m[3] || 'string']);
        return m[1] + '?' + m[4];
      });
      return [newq,qi];
    },

    makeQueryCallback: function(q) {
      var me = this;
      return function() { 
        var args = [];
        if (arguments) {
          for (var i = 0; i < arguments.length; i++) {
            args.push(arguments[i]);
          }
        }
        return me.doPQuery(q,args);
      };
    },

    prepare: function(name, query) {
      var isQuery = !!query.match(/^\s*(select|describe|show)/i);
      var p = this.makePopulator(query);
      var q = {
        name: name,
        isQuery: isQuery,
        query: p[0],
        populate: p[1]
      };
      this.db[name] = this.makeQueryCallback(q);
    },

    update: function(query) {
      try {
        return this.updatereal(query);
      } catch (err) {
        if (err.match(/java\.io\.EOFException/i)) {
          print("EOF Exception!");
          // Ditch all current connections.
          while (this.conns.length > 0) {
            this.conns.pop();
          }
          return this.updatereal(query);
        } else {
          print("update() Unknown exception?: " + err);
        }
      }
    },

    updatereal: function(query) {
      var cp = this.getConn();
      var conn = cp.conn;
      var s = conn.createStatement();
      var rows = s.executeUpdate(query);
      var rs = s.executeQuery("select last_insert_id() as id");
      rs.next();
      var id = rs.getInt('id');
      s.close();
      var ret = {rows: rows, id: id};
      this.pushConn(cp);
      return ret;
    },

    query: function(query) {
      try {
        return this.queryreal(query);
      } catch (err) {
        if (err.match(/java\.io\.EOFException/i)) {
          // Ditch all current connections.
          print("EOF exception?");
          while (this.conns.length > 0) {
            this.conns.pop();
          }
          return this.queryreal(query);
        } else {
          print("query() Unknown exception?: " + err);
        }
      }
    },

    queryreal: function(query) {
      var cp = this.getConn();
      var conn = cp.conn;
      var s = conn.createStatement();
      s.executeQuery(query);
      var rs = s.getResultSet();
      var ret = this.js_rs(rs);
      this.pushConn(cp);
      if (ret.length > 0) {
        return ret;
      }
      return null;
    },

    js_rs: function(rs) {
      var md = rs.getMetaData();
      var columns = [];
      var count = md.getColumnCount();
      for (var i = 1; i<=count; i++) {
        columns.push([md.getColumnName(i),
        this.getColumnizer(md.getColumnTypeName(i))]);
      }
      var ret = [];
      while (rs.next()) {
        var row = {};
        for (var idx = 0; idx < columns.length; idx++) {
          var col = columns[idx];
          row[col[0]] = col[1](rs,idx+1);
        }
        ret.columns = columns;
        ret.push(row);
      }
      return ret;
    },

    map_rs: function(rs,fun) {
      var md = rs.getMetaData();
      var columns = [];
      var count = md.getColumnCount();
      for (var i = 1; i<=count; i++) {
        columns.push(this.getColumnizer(md.getColumnTypeName(i)));
      }
      var ret = [];
      while (rs.next()) {
        var row = [];
        for (var idx = 0; idx < columns.length; idx++) {
          var col = columns[idx];
          row.push(col(rs,idx+1));
        }
        fun.apply(this,row);
      }
      return ret;
    }
  }
});
