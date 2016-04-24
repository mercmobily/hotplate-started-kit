#!/bin/bash

export APPNAME=`cat appName`
export FOREVERUSERNAME=`cat foreverUserName`

# Get the current branch
branch=`git rev-parse --abbrev-ref HEAD`

echo Branch: $branch

# Depending on the branch, it will assume it's in "development"
# or in "production". If run on the same server, you can have them
# both run at the same time on different ports
if [ "$branch" == "master" ];then
  export NODE_ENV='development'
  export PORT='8081'
else
  export NODE_ENV='production'
  export PORT='8080'
fi

echo NODE_ENV: $NODE_ENV

export DBHOST='localhost'
export DBNAME="${APPNAME}-${NODE_ENV}"
export IPADDRESS='localhost'

# Actually run the server
LP="${APPNAME}-${NODE_ENV}"
/usr/bin/sudo -u $FOREVERUSERNAME forever start -a --watch --watchDirectory `pwd` --killSignal=SIGTERM -l /var/log/$LP-forever.log -o /var/log/$LP-out.log -e /var/log/$LP-err.log server.js

