#!/bin/bash

set -e

TAG=`cat CURRENT_COMMON`


echo "****************************************************"
echo "datanimbus.io.common :: Pushing Image to ECR :: $ECR_URL/datanimbus.io.common:$TAG"
echo "****************************************************"

$(aws ecr get-login --no-include-email)
docker tag datanimbus.io.common:$TAG $ECR_URL/datanimbus.io.common:$TAG
docker push $ECR_URL/datanimbus.io.common:$TAG


echo "****************************************************"
echo "datanimbus.io.common :: Image pushed to ECR AS $ECR_URL/datanimbus.io.common:$TAG"
echo "****************************************************"