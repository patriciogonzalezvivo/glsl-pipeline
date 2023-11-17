import './App.css'
import { Canvas } from '@react-three/fiber'
import MyEffect from './component/postprocessing'
import CameraControls from './component/cameraControls'

function App() {

  return (
    <>
      <div className='main'>
        <Canvas gl={{
          alpha: true
        }}>
          <CameraControls />
          <MyEffect />
        </Canvas>
      </div>
    </>
  )
}

export default App
