#!/bin/bash

set -e

TAG=`cat CURRENT_COMMON`

echo "****************************************************"
echo "datanimbus.io.common :: Pushing Image to Docker Hub :: appveen/datanimbus.io.common:$TAG"
echo "****************************************************"

docker tag datanimbus.io.common:$TAG appveen/datanimbus.io.common:$TAG
docker push appveen/datanimbus.io.common:$TAG

echo "****************************************************"
echo "datanimbus.io.common :: Image Pushed to Docker Hub AS appveen/datanimbus.io.common:$TAG"
echo "****************************************************"