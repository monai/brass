<% if ('summary' in locals) { %>Summary: <%= summary %><% } %>
Name: <%= name %>
Version: <%= version %>
Release: <%= release %>
License: <%= license %>
Group: <%= group %>
Source: <%= source %>
<% if ('url' in locals) { %>URL: <%= url %><% } %>
<% if ('distribution' in locals) { %>Distribution: <%= distribution %><% } %>
<% if ('vendor' in locals) { %>Vendor: <%= vendor %><% } %>
<% if ('packager' in locals) { %>Packager: <%= packager %><% } %>

%description
<%= description %>