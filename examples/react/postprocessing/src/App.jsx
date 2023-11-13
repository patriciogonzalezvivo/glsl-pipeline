/* eslint-disable react/no-unknown-property */
import { Canvas } from '@react-three/fiber'
import Effect from "./component/postprocessing"
import './App.css'

function App() {

  return (
    <div className='main'>
      <Canvas>
        <Effect />
      </Canvas>
    </div>
  )
}

export default App
