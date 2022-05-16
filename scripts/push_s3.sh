#!/bin/bash

set -e

TAG=`cat CURRENT_COMMON`

echo "****************************************************"
echo "data.stack:common :: Saving Image to AWS S3 :: $S3_BUCKET/stable-builds"
echo "****************************************************"

TODAY_FOLDER=`date ++%Y_%m_%d`

docker save -o data.stack.common_$TAG.tar data.stack.common:$TAG
bzip2 data.stack.common_$TAG.tar
aws s3 cp data.stack.common_$TAG.tar.bz2 s3://$S3_BUCKET/stable-builds/$TODAY_FOLDER/data.stack.common_$TAG.tar.bz2
rm data.stack.common_$TAG.tar.bz2

echo "****************************************************"
echo "data.stack:common :: Image Saved to AWS S3 AS data.stack.common_$TAG.tar.bz2"
echo "****************************************************"