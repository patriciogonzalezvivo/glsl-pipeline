import { Canvas } from '@react-three/fiber'
import './App.css'
import GlslViewer from './components/effectShader'
import React from 'react'
import { Scene } from 'three'

function App() {

  return (
    <>
      <div className='main'>
        <Canvas　gl={{
          alpha: false
        }}>
        <GlslViewer />
      </Canvas>
      </div>
    </>
  )
}

export default App
