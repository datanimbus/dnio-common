#!/bin/bash

set -e

echo "****************************************************"
echo "datanimbus.io.common :: Copying yaml file "
echo "****************************************************"
if [ ! -d yamlFiles ]; then
    mkdir yamlFiles
fi

TAG=`cat CURRENT_COMMON`

rm -rf yamlFiles/common.*
cp common.yaml yamlFiles/common.$TAG.yaml
cd yamlFiles/
echo "****************************************************"
echo "datanimbus.io.common :: Preparing yaml file "
echo "****************************************************"

sed -i.bak s/__release__/$TAG/ common.$TAG.yaml

echo "****************************************************"
echo "datanimbus.io.common :: yaml file saved"
echo "****************************************************"