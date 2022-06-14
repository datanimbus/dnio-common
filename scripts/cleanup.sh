#!/bin/bash

set -e

TAG=`cat CURRENT_COMMON`

echo "****************************************************"
echo "data.stack:common :: Cleaning Up Local Images :: $TAG"
echo "****************************************************"

docker rmi data.stack.common:$TAG -f