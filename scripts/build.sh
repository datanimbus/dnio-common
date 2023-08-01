#!/bin/bash

set -e

TAG=`cat CURRENT_COMMON`

echo "****************************************************"
echo "datanimbus.io.common :: Building COMMON using TAG :: $TAG"
echo "****************************************************"

sed -i.bak s#__image_tag__#$TAG# Dockerfile

if $cleanBuild ; then
    docker build --no-cache -t datanimbus.io.common:$TAG .
else 
    docker build -t datanimbus.io.common:$TAG .
fi


echo "****************************************************"
echo "datanimbus.io.common :: COMMON Built using TAG :: $TAG"
echo "****************************************************"


echo $TAG > LATEST_COMMON