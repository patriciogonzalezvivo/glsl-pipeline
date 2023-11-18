for d in ./examples/vanilla-*/* ; do
    cd $d
    yarn add glsl-pipeline three resolve-lygia
    cd ../../..
done

for d in ./examples/react-*/* ; do
    cd $d
    yarn add glsl-pipeline three @react-three/fiber resolve-lygia
    cd ../../..
done