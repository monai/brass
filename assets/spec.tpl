%define _topdir <%= RPMBUILD_DIR %>
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

<% if ('daemon' in locals) { %>
Requires(post): chkconfig
Requires(preun): chkconfig
Requires(preun): initscripts
Requires(postun): initscripts

%post
/sbin/chkconfig --add <%= daemonName %>

%preun
if [ $1 -eq 0 ]; then
    /sbin/service <%= daemonName %> stop >/dev/null 2>&1 || true
    /sbin/chkconfig --del <%= daemonName %>
fi

%postun
if [ $1 -ge 1 ]; then
    /sbin/service <%= daemonName %> condrestart >/dev/null 2>&1 || true
fi
<% } %>

%clean
# rm -rf %{buildroot}
# rm -rf %{sourcedir}/*

%files
<% if ('configDir' in locals ) { %>
%config
/etc/init.d/*
<% } %>
/<%= prefix %>/*
