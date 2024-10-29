import { Canvas } from '@react-three/fiber'
import Devlook from "./component/devlook"
import './App.css'
import CameraControls from './component/cameraControls';

function App() {

  return (
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
      <Devlook />
    </Canvas>
  )
}

export default App
