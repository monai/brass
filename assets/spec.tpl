%define _topdir <%= RPMBUILD_DIR %>
%define _prefix <%= prefix %>
%define _base   <%= name %>

Summary:        <%= summary %>
Name:           <%= name %>
Version:        <%= version %>
Release:        <%= release %>
License:        <%= license %>
Group:          <%= group %>
Source:         <%= source %>
<% if ('url' in locals)          { %>URL:            <%= url            %><% } %>
<% if ('distribution' in locals) { %>Distribution:   <%= distribution   %><% } %>
<% if ('vendor' in locals)       { %>Vendor:         <%= vendor         %><% } %>
<% if ('packager' in locals)     { %>Packager:       <%= packager       %><% } %>

%description
<%= description %>

%clean
rm -rf %{buildroot}
rm -rf %{sourcedir}/*

%files
/*
