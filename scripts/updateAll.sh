#!/bin/bash

if command -v ncu >&2; then
    for d in ./examples/vanilla-*/* ; do
        cd $d
        yarn add glsl-pipeline three resolve-lygia
        ncu -u
        yarn install
        cd ../../..
    done

    for d in ./examples/react-*/* ; do
        cd $d
        yarn add glsl-pipeline three @react-three/fiber resolve-lygia
        ncu -u
        yarn install
        cd ../../..
    done
else
    echo "You must install npm-check-updates package to run this script. Check this: https://www.npmjs.com/package/npm-check-updates"
fi