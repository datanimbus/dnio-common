#!/bin/bash

set -e

TAG=`cat CURRENT_COMMON`

echo "****************************************************"
echo "datanimbus.io.common :: Cleaning Up Local Images :: $TAG"
echo "****************************************************"

docker rmi datanimbus.io.common:$TAG -f