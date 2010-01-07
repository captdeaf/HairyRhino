import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintStream;
import java.io.UnsupportedEncodingException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.StringTokenizer;

import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;

import org.mortbay.util.MultiMap;
import org.mortbay.util.StringUtil;
import org.mortbay.util.TypeUtil;

public class JsUtils {
  public static String readBinaryFile(String filename) {
    try {
      File fn = new File(filename);
      if (fn.exists()) {
        byte inbuff[] = new byte[8192];
        String ret = new String("");
        FileInputStream fin = new FileInputStream(fn);
        int numread;
        while ((numread = fin.read(inbuff)) > 0) {
          ret += new String(inbuff,0,numread,"iso_8859-1");
        }
        fin.close();
        return ret;
      } else {
        return null;
      }
    } catch (Exception e) {
      return null;
    }
  }

  public static boolean writeBinaryFile(String filename, String body) {
    try {
      File fn = new File(filename);
      FileOutputStream fout = new FileOutputStream(fn, false);
      PrintStream p = new PrintStream(fout);
      p.print(body);
      p.close();
      return true;
    } catch (Exception e) {
      return false;
    }
  }

  private static String value(String nameEqualsValue) {
    String value =
        nameEqualsValue.substring(nameEqualsValue.indexOf('=') + 1).trim();
    int i = value.indexOf(';');
    if (i > 0) value = value.substring(0, i);
    if (value.startsWith("\"")) {
      value = value.substring(1, value.indexOf('"', 1));
    } else {
      i = value.indexOf(' ');
      if (i > 0) value = value.substring(0, i);
    }
    return value;
  }


  /* Ganked from MultiPartFilter class. */
  public static Map parseMultiPartForm(
      HttpServletRequest request,
      String temppath) throws IOException {

    if (request.getContentType() == null ||
        !request.getContentType().startsWith("multipart/form-data")) {
      return null;
    }

    File tempdir = new File(temppath);
    if (tempdir.exists() && !tempdir.isDirectory()) {
      throw new IOException("Can't write to tempdir");
    } else {
      tempdir.mkdir();
    }

    BufferedInputStream in = new BufferedInputStream(request.getInputStream());
    String content_type = request.getContentType();

    Map params = new MultiMap();

    // TODO - handle encodings

    String boundary =
      "--" + value(content_type.substring(content_type.indexOf("boundary=")));
    byte[]byteBoundary = (boundary + "--").getBytes(StringUtil.__ISO_8859_1);

    // Get first boundary
    byte[]bytes = TypeUtil.readLine(in);
    String line = bytes == null ? null : new String(bytes, "UTF-8");
    if (line == null || !line.equals(boundary)) {
      throw new IOException("Missing initial multi part boundary");
    }
    // Read each part
    boolean lastPart = false;
    String content_disposition = null;
    while (!lastPart) {
      while (true) {
        bytes = TypeUtil.readLine(in);
        // If blank line, end of part headers
        if (bytes == null || bytes.length == 0)
          break;
        line = new String(bytes, "UTF-8");

        // place part header key and value in map
        int c = line.indexOf(':', 0);
        if (c > 0) {
          String key = line.substring(0, c).trim().toLowerCase();
          String value = line.substring(c + 1, line.length()).trim();
          if (key.equals("content-disposition"))
            content_disposition = value;
        }
      }
      // Extract content-disposition
      boolean form_data = false;
      if (content_disposition == null) {
        throw new IOException("Missing content-disposition");
      }

      StringTokenizer tok = new StringTokenizer(content_disposition, ";");
      String name = null;
      String filename = null;
      while (tok.hasMoreTokens()) {
        String t = tok.nextToken().trim();
        String tl = t.toLowerCase();
        if (t.startsWith("form-data"))
          form_data = true;
        else if (tl.startsWith("name="))
          name = value(t);
        else if (tl.startsWith("filename="))
          filename = value(t);
      }

      // Check disposition
      if (!form_data) {
        continue;
      }
      if (name == null || name.length() == 0) {
        continue;
      }

      OutputStream out = null;
      File file = null;
      try {
        if (filename != null && filename.length() > 0) {
          file = File.createTempFile("UploadFile", "", tempdir);
          out = new FileOutputStream(file);
          request.setAttribute(name, "/tmp/" + file.getName());
          String[] oneParam = {filename};
          params.put(name, oneParam);
        } else
          out = new ByteArrayOutputStream();

        int state = -2;
        int c;
        boolean cr = false;
        boolean lf = false;

        // loop for all lines`
        while (true) {
          int b = 0;
          while ((c = (state != -2) ? state : in.read()) != -1) {
            state = -2;
            // look for CR and/or LF
            if (c == 13 || c == 10) {
              if (c == 13)
                state = in.read();
              break;
            }
            // look for boundary
            if (b >= 0 && b < byteBoundary.length && c == byteBoundary[b]) {
              b++;
            } else {
              // this is not a boundary
              if (cr)
                out.write(13);
              if (lf)
                out.write(10);
              cr = lf = false;
              if (b > 0)
                out.write(byteBoundary, 0, b);
              b = -1;
              out.write(c);
            }
          }
          // check partial boundary
          if ((b > 0 && b < byteBoundary.length - 2)
              || (b == byteBoundary.length - 1)) {
            if (cr)
              out.write(13);
            if (lf)
              out.write(10);
            cr = lf = false;
            out.write(byteBoundary, 0, b);
            b = -1;
          }
          // boundary match
          if (b > 0 || c == -1) {
            if (b == byteBoundary.length)
              lastPart = true;
            if (state == 10)
              state = -2;
            break;
          }
          // handle CR LF
          if (cr)
            out.write(13);
          if (lf)
            out.write(10);
          cr = (c == 13);
          lf = (c == 10 || state == 10);
          if (state == 10)
            state = -2;
        }
      } finally {
        out.close();
      }

      if (file == null) {
        bytes = ((ByteArrayOutputStream) out).toByteArray();
        String[] oneParam = {new String(bytes)};
        params.put(name, oneParam);
      }
    }

    return params;
  }
}
