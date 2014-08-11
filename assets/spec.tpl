%define _topdir <%= BUILDROOT_DIR %>
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

%install
rm -rf %{buildroot}
mkdir -p %{buildroot}/%{_prefix}/lib/%{_base}
cd package
cp -a * %{buildroot}/%{_prefix}/lib/%{_base}

%clean
rm -rf $RPM_BUILD_ROOT
rm -rf $RPM_SOURCE_DIR/*

%files
%doc %{_prefix}/lib/%{_base}/README*
/*

