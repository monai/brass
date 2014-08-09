%define _topdir <%= BUILDROOT_DIR %>

Summary:        <%= summary %>
Name:           <%= name %>
Version:        <%= version %>
Release:        <%= release %>
License:        <%= license %>
Group:          <%= group %>
Source:         <%= source %>
<% if ('url' in locals) { %>URL:            <%= url %><% } %>
<% if ('distribution' in locals) { %>Distribution:    <%= distribution %><% } %>
<% if ('vendor' in locals) { %>Vendor:         <%= vendor %><% } %>
<% if ('packager' in locals) { %>Packager:       <%= packager %><% } %>

%description
<%= description %>

%prep
%setup -n package

%files
%doc README*
*

%clean
rm -rf $RPM_BUILD_ROOT
rm -rf $RPM_SOURCE_DIR/*
