#!/bin/bash

set -e

TAG=`cat CURRENT_COMMON`

echo "****************************************************"
echo "datanimbus.io.common :: Pushing Image to Docker Hub :: datanimbus/datanimbus.io.common:$TAG"
echo "****************************************************"

docker tag datanimbus.io.common:$TAG datanimbus/datanimbus.io.common:$TAG
docker push datanimbus/datanimbus.io.common:$TAG

echo "****************************************************"
echo "datanimbus.io.common :: Image Pushed to Docker Hub AS datanimbus/datanimbus.io.common:$TAG"
echo "****************************************************"