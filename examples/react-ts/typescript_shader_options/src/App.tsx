import './App.css'
import { Canvas } from '@react-three/fiber'
import Effect from './components/effectShader'

function App() {

  return (
    <>
      <Canvas>
        <Effect />
      </Canvas>
    </>
  )
}

export default App
