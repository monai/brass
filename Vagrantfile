# -*- mode: ruby -*-
# vi: set ft=ruby :

# Vagrantfile API/syntax version. Don't touch unless you know what you're doing!
VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "box-cutter/centos64"
  
  config.vbguest.auto_update = false
  config.vm.provision "shell", path: "tools/provision.sh"
end
