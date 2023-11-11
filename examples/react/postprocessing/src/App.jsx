/* eslint-disable react/no-unknown-property */
import { Canvas, extend } from '@react-three/fiber'
import { PerspectiveCamera } from 'three'
import Effect from "./component/postprocessing"
import './App.css'

extend({ PerspectiveCamera });

function App() {

  return (
    <>
    <div className='main'>
      <Canvas>
        <Effect />
      </Canvas>
    </div>
    </>
  )
}

export default App
