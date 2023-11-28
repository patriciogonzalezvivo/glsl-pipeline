import { Canvas } from '@react-three/fiber'
import GlslViewer from './components/effectShader'
import './App.css'

function App() {

  return (
    <>
      <>
        <div className='main'>
          <Canvas gl={{
            alpha: true
          }}>
            <GlslViewer />
          </Canvas>
        </div>
      </>
    </>
  )
}

export default App
