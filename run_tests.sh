#!/bin/bash

export APPNAME=`cat appName`

# Get the current branch
branch=`git rev-parse --abbrev-ref HEAD`

# Depending on the branch, it will assume it's in "development"
# or in "production". If run on the same server, you can have them
# both run at the same time on different ports
if [ $branch == 'master' ];then
  export NODE_ENV='development'
else
  export NODE_ENV='production'
fi

# Export the usual story
export DBHOST='localhost'
export DBNAME="${APPNAME}_tests"
export IPADDRESS='localhost'
export PORT='8082'

# TESTING set to "1" will make sure the server knows to
# emit the 'startTests' signal, rather than actually working
TESTING=1 nodeunit tests/test.js
exit 0
