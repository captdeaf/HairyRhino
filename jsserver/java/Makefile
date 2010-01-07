javac=javac -Xlint:deprecation

all: JsConnection.class JsHandler.class JsScope.class JsUtils.class XMLHttpRequest.class

clean:
	-rm *.class

JsConnection.class: JsConnection.java
	$(javac) -cp ../jars/mysql.jar JsConnection.java

JsHandler.class: JsHandler.java
	$(javac) -cp ../jars/jetty.jar:../jars/jetty-util.jar:../jars/servlet-api.jar JsHandler.java

JsScope.class: JsScope.java
	$(javac) -cp ../jars/js.jar JsScope.java

JsUtils.class: JsUtils.java
	$(javac) -cp ../jars/jetty.jar:../jars/jetty-util.jar:../jars/servlet-api.jar JsUtils.java

XMLHttpRequest.class: XMLHttpRequest.java
	$(javac) -cp ../jars/js.jar XMLHttpRequest.java
