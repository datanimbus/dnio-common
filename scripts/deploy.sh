#!/bin/bash

set -e

TAG=`cat CURRENT_COMMON`


echo "****************************************************"
echo "data.stack:common :: Deploying Image in K8S :: $NAMESPACE"
echo "****************************************************"

kubectl set image deployment/common common=$ECR_URL/data.stack.common:$TAG -n $NAMESPACE --record=true


echo "****************************************************"
echo "data.stack:common :: Image Deployed in K8S AS $ECR_URL/data.stack.common:$TAG"
echo "****************************************************"