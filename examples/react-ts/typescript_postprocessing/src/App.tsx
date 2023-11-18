import './App.css'
import { Canvas } from '@react-three/fiber'
import MyEffect from './component/postprocessing'
import CameraControls from './component/cameraControls'

function App() {

  return (
    <>
      <Canvas gl={{
        alpha: true
      }} style={{
          width: '100%',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0
      }}>
        <CameraControls />
        <MyEffect />
      </Canvas>
    </>
  )
}

export default App
