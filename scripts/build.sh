#!/bin/bash

set -e

TAG=`cat CURRENT_COMMON`

echo "****************************************************"
echo "data.stack:common :: Building COMMON using TAG :: $TAG"
echo "****************************************************"

sed -i.bak s#__image_tag__#$TAG# Dockerfile

if [ $cleanBuild ]; then
    docker build --no-cache -t data.stack.common:$TAG .
else 
    docker build -t data.stack.common:$TAG .
fi


echo "****************************************************"
echo "data.stack:common :: COMMON Built using TAG :: $TAG"
echo "****************************************************"


echo $TAG > LATEST_COMMON