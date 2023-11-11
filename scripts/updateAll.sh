for d in ./examples/**/* ; do
    cd $d
    npm i glsl-pipeline three @react-three/fiber resolve-lygia
    cd ../../..
done