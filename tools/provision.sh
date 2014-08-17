#!/bin/sh

centos64() {
    sudo /etc/init.d/vboxadd setup
    
    install_epel http://download.fedoraproject.org/pub/epel/6/x86_64/epel-release-6-8.noarch.rpm
    
    yum -y -q --nogpgcheck update
    yum -y -q --nogpgcheck groupinstall "Development Tools"
}

centos70() {
    install_epel http://download.fedoraproject.org/pub/epel/beta/7/x86_64/epel-release-7-0.2.noarch.rpm
    
    yum -y -q --nogpgcheck groups mark install "Development Tools"
    yum -y -q --nogpgcheck update
}

centos() {
    yum install -y -q nodejs npm
}

install_epel() {
    local filename=$(basename $1)
    wget -q $1
    yum -y -q --nogpgcheck install $filename
    rm $filename
}

case "$1" in
    centos64 )
        centos64
        centos
        ;;
    centos70 )
        centos70
        centos
        ;;
    * ) true ;;
esac
