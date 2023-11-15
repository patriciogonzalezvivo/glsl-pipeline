/* eslint-disable react/no-unknown-property */
import { Canvas } from '@react-three/fiber'
import Effect from "./component/postprocessing"
import './App.css'
import CameraControls from './component/cameraControls';

function App() {

  return (
    <div className='main'>
      <Canvas>
        <CameraControls />
        <Effect />
      </Canvas>
    </div>
  )
}

export default App
