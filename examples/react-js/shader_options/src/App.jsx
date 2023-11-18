import { Canvas } from '@react-three/fiber'
import './App.css'
import Effect from './components/effectShader'

function App() {

  return (
    <>
      <Canvas gl={{
        alpha:true
      }} style={{
        width: '100%',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0
      }}>
        <Effect />
      </Canvas>
    </>
  )
}

export default App
