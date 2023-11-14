/* eslint-disable react/no-unknown-property */
import { Canvas, extend } from '@react-three/fiber'
import Effect from "./component/postprocessing"
import './App.css'
import { OrbitControls } from 'three-stdlib'

extend({ OrbitControls });

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
