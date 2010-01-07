import java.sql.*;

public class JsConnection {
    public JsConnection() {
      try {
        // Load the postgresql and mysql drivers.
        Class.forName("org.postgresql.Driver");
        Class.forName("com.mysql.jdbc.Driver");
      } catch (Exception e) {
        System.out.println(e.toString());
      }
    }

    public Connection open(String url, String username, String password) {
      Connection c = null;
      try {
          c = DriverManager.getConnection(url, username, password);
          return c;
      }
      catch (Exception e) {
          System.out.println(e.getMessage());
          return null;
      }
    }
        
    public void close(Connection c) {
      try {
        c.close();
      }
      catch (Exception e) {}
    }
}
