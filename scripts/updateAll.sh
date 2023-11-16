for d in ./examples/**/* ; do
    cd $d
    yarn add glsl-pipeline three @react-three/fiber resolve-lygia
    yarn install
    cd ../../..
done