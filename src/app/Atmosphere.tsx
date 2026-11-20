import { useEffect, useRef } from 'react'
import { startAtmosphere } from './fluidBackground.js'
import styles from './App.module.css'

export const Atmosphere = () => {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => (canvas.current ? startAtmosphere(canvas.current) : undefined), [])
  return (
    <div className={styles.atmosphere} aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  )
}
