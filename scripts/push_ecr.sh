#!/bin/bash

set -e

TAG=`cat CURRENT_COMMON`


echo "****************************************************"
echo "data.stack:common :: Pushing Image to ECR :: $ECR_URL/data.stack.common:$TAG"
echo "****************************************************"

aws ecr get-login --no-include-email
docker tag data.stack.common:$TAG $ECR_URL/data.stack.common:$TAG
docker push $ECR_URL/data.stack.common:$TAG


echo "****************************************************"
echo "data.stack:common :: Image pushed to ECR AS $ECR_URL/data.stack.common:$TAG"
echo "****************************************************"