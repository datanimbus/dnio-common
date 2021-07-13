#!/bin/bash
set -e
if [ -f $WORKSPACE/../TOGGLE ]; then
    echo "****************************************************"
    echo "data.stack:common :: Toggle mode is on, terminating build"
    echo "data.stack:common :: BUILD CANCLED"
    echo "****************************************************"
    exit 0
fi

cDate=`date +%Y.%m.%d.%H.%M` #Current date and time

if [ -f $WORKSPACE/../CICD ]; then
    CICD=`cat $WORKSPACE/../CICD`
fi
if [ -f $WORKSPACE/../DATA_STACK_RELEASE ]; then
    REL=`cat $WORKSPACE/../DATA_STACK_RELEASE`
fi
if [ -f $WORKSPACE/../DOCKER_REGISTRY ]; then
    DOCKER_REG=`cat $WORKSPACE/../DOCKER_REGISTRY`
fi
BRANCH='dev'
if [ -f $WORKSPACE/../BRANCH ]; then
    BRANCH=`cat $WORKSPACE/../BRANCH`
fi
if [ $1 ]; then
    REL=$1
fi
if [ ! $REL ]; then
    echo "****************************************************"
    echo "data.stack:common :: Please Create file DATA_STACK_RELEASE with the releaese at $WORKSPACE or provide it as 1st argument of this script."
    echo "data.stack:common :: BUILD FAILED"
    echo "****************************************************"
    exit 0
fi
TAG=$REL
if [ $2 ]; then
    TAG=$TAG"-"$2
fi
if [ $3 ]; then
    BRANCH=$3
fi
if [ $CICD ]; then
    echo "****************************************************"
    echo "data.stack:common :: CICI env found"
    echo "****************************************************"
    TAG=$TAG"_"$cDate
    if [ ! -f $WORKSPACE/../DATA_STACK_NAMESPACE ]; then
        echo "****************************************************"
        echo "data.stack:common :: Please Create file DATA_STACK_NAMESPACE with the namespace at $WORKSPACE"
        echo "data.stack:common :: BUILD FAILED"
        echo "****************************************************"
        exit 0
    fi
    DATA_STACK_NS=`cat $WORKSPACE/../DATA_STACK_NAMESPACE`
fi

sh $WORKSPACE/scripts/prepare_yaml.sh $REL $2

echo "****************************************************"
echo "data.stack:common :: Using build :: "$TAG
echo "****************************************************"

cd $WORKSPACE

echo "****************************************************"
echo "data.stack:common :: Adding IMAGE_TAG in Dockerfile :: "$TAG
echo "****************************************************"
sed -i.bak s#__image_tag__#$TAG# Dockerfile

if [ -f $WORKSPACE/../CLEAN_BUILD_COMMON ]; then
    echo "****************************************************"
    echo "data.stack:common :: Doing a clean build"
    echo "****************************************************"
    
    docker build --no-cache -t data.stack:common.$TAG .
    rm $WORKSPACE/../CLEAN_BUILD_COMMON

    echo "****************************************************"
    echo "data.stack:common :: Copying deployment files"
    echo "****************************************************"

    if [ $CICD ]; then
        sed -i.bak s#__docker_registry_server__#$DOCKER_REG# common.yaml
        sed -i.bak s/__release_tag__/"'$REL'"/ common.yaml
        sed -i.bak s#__release__#$TAG# common.yaml
        sed -i.bak s#__namespace__#$DATA_STACK_NS# common.yaml
        sed -i.bak '/imagePullSecrets/d' common.yaml
        sed -i.bak '/- name: regsecret/d' common.yaml

        kubectl delete deploy common -n $DATA_STACK_NS || true # deleting old deployement
        kubectl delete service common -n $DATA_STACK_NS || true # deleting old service
        #creating new deployment
        kubectl create -f common.yaml
    fi

else
    echo "****************************************************"
    echo "data.stack:common :: Doing a normal build"
    echo "****************************************************"

    docker build -t data.stack:common.$TAG .

    cd $WORKSPACE

    if [ $CICD ]; then
        if [ $DOCKER_REG ]; then
            kubectl set image deployment/common common=$DOCKER_REG/data.stack:common.$TAG -n $DATA_STACK_NS --record=true
        else 
            kubectl set image deployment/common common=data.stack:common.$TAG -n $DATA_STACK_NS --record=true
        fi
    fi
fi
if [ $DOCKER_REG ]; then
    echo "****************************************************"
    echo "data.stack:common :: Docker Registry found, pushing image"
    echo "****************************************************"

    echo "docker tag data.stack:common.$TAG $DOCKER_REG/data.stack:common.$TAG"
    docker tag data.stack:common.$TAG $DOCKER_REG/data.stack:common.$TAG
    echo "docker push $DOCKER_REG/data.stack:common.$TAG"
    docker push $DOCKER_REG/data.stack:common.$TAG
fi
echo "****************************************************"
echo "data.stack:common :: BUILD SUCCESS :: data.stack:common.$TAG"
echo "****************************************************"
echo $TAG > $WORKSPACE/../LATEST_COMMON
