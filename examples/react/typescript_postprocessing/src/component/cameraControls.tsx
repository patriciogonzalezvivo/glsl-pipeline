import { useRef } from 'react'
import { useThree, useFrame, extend, Object3DNode } from '@react-three/fiber'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

extend({ OrbitControls });

// Need to declare according to this doc: https://docs.pmnd.rs/react-three-fiber/tutorials/typescript#extending-threeelements
// Add types to ThreeElements elements so primitives pick up on it
declare module '@react-three/fiber' {
    interface ThreeElements {
        orbitControls: Object3DNode<OrbitControls, typeof OrbitControls>
    }
}

const CameraControls = () => {
    // Get a reference to the Three.js Camera, and the canvas html element.
    // We need these to setup the OrbitControls class.
    // https://threejs.org/docs/#examples/en/controls/OrbitControls

    const {
        camera,
        gl: { domElement }
    } = useThree();

    // Ref to the controls, so that we can update them on every frame using useFrame
    const controls = useRef<OrbitControls>();
    useFrame(() => controls.current.update());
    return (
        <orbitControls
            ref={controls}
            args={[camera, domElement]}
            enableZoom={false}
            maxAzimuthAngle={Math.PI / 4}
            maxPolarAngle={Math.PI}
            minAzimuthAngle={-Math.PI / 4}
            minPolarAngle={0}
        />
    );
};

export default CameraControls;