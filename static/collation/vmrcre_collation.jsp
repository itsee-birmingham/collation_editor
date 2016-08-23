<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page trimDirectiveWhitespaces="true" %>
<%@ page import="java.io.IOException" %>
<%@ page import="java.io.InputStream" %>
<%@ page import="java.io.BufferedReader" %>
<%@ page import="java.io.File" %>
<%@ page import="java.nio.charset.Charset" %>
<%@ page import="java.io.InputStreamReader" %>
<%@ page import="org.apache.log4j.Logger" %>
<%@ page import="javax.servlet.http.Cookie" %>
<%

Logger logger = Logger.getLogger("collation_editor/vmrcre_collation");
String requestURI = request.getRequestURI();
// strip the webapp name off the URI
requestURI = requestURI.substring(requestURI.indexOf("/", 2));
File collate_cli = new File(getServletContext().getRealPath(requestURI));
collate_cli = new File(collate_cli.getParentFile().getParentFile().getParentFile(), "python/collate_cli.py");

String options = request.getParameter("options");

if (options != null) {
	response.setContentType("application/json");
	
	// collation
	if (options.indexOf("\"data_input\"") > -1) {
	}
	// apparatus export
	else {
		response.setContentType("text/plain");
		response.setHeader("Content-Disposition", "attachment; filename=\"negative-apparatus.xml\"");
		Cookie c = new Cookie("fileDownload", "true");
		response.addCookie(c);
	}

	String args[] = new String[] {
		"python",
		collate_cli.getAbsolutePath()
	};

	StringBuffer resultBuf = new StringBuffer();
	StringBuffer errorBuf = new StringBuffer();
		
logger.debug("********************************************************* Input: " + options);
	runCommand(args, resultBuf, errorBuf, options, logger);

logger.debug("********************************************************* Result: " + resultBuf);
	if (errorBuf.length() > 0) logger.debug("********************************************************* Error: " + errorBuf);
%>
<%= resultBuf %>
<%
	return;
}
%>
<html>
<body>
<h1>vmrcre_collation</h1>
<p>collation from the collation_editor to collatex</p>
<h3>Parameters</h3>
<table border="1">
<tr><td><b>options</b></td><td>data from collation_editor</td></tr>
</table>
</body>
</html>
<%!
public static Thread startSlurpStreamThreaded(final InputStream is, final StringBuffer outBuf) {
	Thread t = new Thread() {
		InputStream myIS = is;
		StringBuffer myOutBuf = outBuf;
    
		public void run() {
			try {
				InputStreamReader isr = new InputStreamReader(myIS);
				BufferedReader br = new BufferedReader(isr);
				String line=null;
				while ( (line = br.readLine()) != null)
					myOutBuf.append(line + "\n");
			}
			catch (IOException ioe) {
				ioe.printStackTrace();  
			}
		}
	};
	t.start();
	return t;
}

public static int runCommand(String command[], StringBuffer result, StringBuffer error, String toStdin, Logger logger) {
	int retVal = -1;
	try {

		File cwd = new File(".");
		String cmd = "";
		for (String s: command) {
			cmd += " [" + s + "]";
		}
logger.debug("executing from cwd ("+cwd.getAbsolutePath()+"):" + cmd);

		java.lang.Process p = Runtime.getRuntime().exec(command, new String[0], cwd);
		p.getOutputStream().write(toStdin.getBytes(Charset.forName("UTF-8")));

		Thread o = startSlurpStreamThreaded(p.getInputStream(), result);
		Thread e = startSlurpStreamThreaded(p.getErrorStream(), error);

		p.getOutputStream().close();

		retVal = p.waitFor();
		
		o.join();
		e.join();
		

		if (error.length() > 0) {
logger.warn("error: " + error.toString());
		}
	}
	catch (Exception e) {e.printStackTrace();}
logger.debug("returned: " + retVal + "; stdout: " + result);
	return retVal;
}
%>
