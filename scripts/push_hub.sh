#!/bin/bash

set -e

TAG=`cat CURRENT_COMMON`

echo "****************************************************"
echo "data.stack:common :: Pushing Image to Docker Hub :: appveen/data.stack.common:$TAG"
echo "****************************************************"

docker tag data.stack.common:$TAG appveen/data.stack.common:$TAG
docker push appveen/data.stack.common:$TAG

echo "****************************************************"
echo "data.stack:common :: Image Pushed to Docker Hub AS appveen/data.stack.common:$TAG"
echo "****************************************************"