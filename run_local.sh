# Test-run the application

# These are all of the defaults.
export NODE_ENV='development'
export NAME=`cat appName`
export DBHOST='localhost'
export DBNAME="${NAME}_${NODE_ENV}"
export IPADDRESS='localhost' 
export PORT='8080' 

node server.js
