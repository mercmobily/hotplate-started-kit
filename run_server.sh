#!/bin/bash

export NAME=`cat appName`
export FOREVERUSERNAME=`cat foreverUserName`

# Get the current branch
branch=`git rev-parse --abbrev-ref HEAD`

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

export DBHOST='localhost'
export DBNAME="${NAME}_${NODE_ENV}"
export IPADDRESS='localhost'

# Actually run the server
/usr/bin/sudo -u $FOREVERUSERNAME forever start -a --watch --watchDirectory `pwd` --killSignal=SIGTERM -l /var/log/$NAME-forever.log -o /var/log/$NAME-out.log -e /var/log/$NAME-err.log server.js
