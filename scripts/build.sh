#!/bin/bash

set -e

TAG=`cat CURRENT_COMMON`

echo "****************************************************"
echo "data.stack:common :: Building COMMON using TAG :: $TAG"
echo "****************************************************"


docker build -t data.stack.common:$TAG .


echo "****************************************************"
echo "data.stack:common :: COMMON Built using TAG :: $TAG"
echo "****************************************************"


echo $TAG > LATEST_COMMON