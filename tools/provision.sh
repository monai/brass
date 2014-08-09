#!/bin/sh

wget -q http://download.fedoraproject.org/pub/epel/6/x86_64/epel-release-6-8.noarch.rpm
yum -y -q --nogpgcheck install epel-release-6-8.noarch.rpm
rm epel-release-6-8.noarch.rpm

yum -y -q --nogpgcheck update
yum -y -q --nogpgcheck groupinstall "Development Tools"
