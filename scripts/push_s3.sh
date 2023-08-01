#!/bin/bash

set -e

TAG=`cat CURRENT_COMMON`

echo "****************************************************"
echo "datanimbus.io.common :: Saving Image to AWS S3 :: $S3_BUCKET/stable-builds"
echo "****************************************************"

TODAY_FOLDER=`date ++%Y_%m_%d`

docker save -o datanimbus.io.common_$TAG.tar datanimbus.io.common:$TAG
bzip2 datanimbus.io.common_$TAG.tar
aws s3 cp datanimbus.io.common_$TAG.tar.bz2 s3://$S3_BUCKET/stable-builds/$TODAY_FOLDER/datanimbus.io.common_$TAG.tar.bz2
rm datanimbus.io.common_$TAG.tar.bz2

echo "****************************************************"
echo "datanimbus.io.common :: Image Saved to AWS S3 AS datanimbus.io.common_$TAG.tar.bz2"
echo "****************************************************"