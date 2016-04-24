# Test-run the application

# These are all of the defaults.
export NODE_ENV='development'
export APPNAME=`cat appName`
export DBHOST='localhost'
export DBNAME="${APPNAME}_${NODE_ENV}"
export IPADDRESS='localhost'
export PORT='8080'

node server.js
