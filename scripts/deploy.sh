#!/bin/bash

set -e

TAG=`cat CURRENT_COMMON`


echo "****************************************************"
echo "datanimbus.io.common :: Deploying Image in K8S :: $NAMESPACE"
echo "****************************************************"

kubectl set image deployment/common common=$ECR_URL/datanimbus.io.common:$TAG -n $NAMESPACE --record=true


echo "****************************************************"
echo "datanimbus.io.common :: Image Deployed in K8S AS $ECR_URL/datanimbus.io.common:$TAG"
echo "****************************************************"