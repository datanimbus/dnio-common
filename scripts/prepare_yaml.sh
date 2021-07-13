#!/bin/bash

echo "****************************************************"
echo "data.stack:common :: Copying yaml file "
echo "****************************************************"
if [ ! -d $WORKSPACE/../yamlFiles ]; then
    mkdir $WORKSPACE/../yamlFiles
fi

REL=$1
if [ $2 ]; then
    REL=$REL-$2
fi

rm -rf $WORKSPACE/../yamlFiles/common.*
cp $WORKSPACE/common.yaml $WORKSPACE/../yamlFiles/common.$REL.yaml
cd $WORKSPACE/../yamlFiles/
echo "****************************************************"
echo "data.stack:common :: Preparing yaml file "
echo "****************************************************"
sed -i.bak s/__release_tag__/"'$1'"/ common.$REL.yaml
sed -i.bak s/__release__/$REL/ common.$REL.yaml