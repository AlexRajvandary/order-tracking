import createGlobe, { type Marker } from 'cobe'
import { useEffect, useRef } from 'react'
import { cn } from '@/shared/lib/utils'

export type GlobeColor = [number, number, number]

export type GlobeProps = {
  className?: string
  /** CSS size of the canvas box (width & height). Default 520. */
  size?: number
  /** Auto-rotation speed (phi delta per frame). Default 0.003 */
  rotationSpeed?: number
  dark?: number
  diffuse?: number
  mapSamples?: number
  mapBrightness?: number
  baseColor?: GlobeColor
  markerColor?: GlobeColor
  glowColor?: GlobeColor
  /** Optional city markers. Pass [] to disable markers. Omit for defaults. */
  markers?: Marker[] | null
  scale?: number
}

const defaultMarkers: Marker[] = [
  { location: [55.75, 37.62], size: 0.04 },
  { location: [40.71, -74.01], size: 0.03 },
  { location: [51.51, -0.13], size: 0.03 },
  { location: [35.68, 139.69], size: 0.03 },
  { location: [1.35, 103.82], size: 0.03 },
]

/**
 * Decorative WebGL globe powered by [cobe](https://cobe.vercel.app/).
 */
export function Globe({
  className,
  size = 520,
  rotationSpeed = 0.003,
  dark = 1,
  diffuse = 1.2,
  mapSamples = 16000,
  mapBrightness = 5.5,
  baseColor = [0.12, 0.12, 0.14],
  markerColor = [0.88, 0.88, 0.92],
  glowColor = [0.45, 0.45, 0.5],
  markers,
  scale = 1.05,
}: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let width = size
    let destroyed = false
    let phi = 0
    let pointerInteracting: number | null = null
    let pointerInteractionMovement = 0
    let frameId = 0

    const resolvedMarkers = markers === null || markers === undefined
      ? defaultMarkers
      : markers

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.22,
      dark,
      diffuse,
      mapSamples,
      mapBrightness,
      baseColor,
      markerColor,
      glowColor,
      scale,
      markers: resolvedMarkers,
    })

    const applySize = (side: number) => {
      width = side
      canvas.style.width = `${side}px`
      canvas.style.height = `${side}px`
      globe.update({
        width: side * 2,
        height: side * 2,
      })
    }

    const onResize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const side = Math.max(180, Math.min(parent.clientWidth, parent.clientHeight, size))
      applySize(side)
    }

    onResize()
    const ro = new ResizeObserver(onResize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    const animate = () => {
      if (destroyed) return
      if (pointerInteracting == null) {
        phi += rotationSpeed
      }
      globe.update({
        phi: phi + pointerInteractionMovement,
      })
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)

    const onPointerDown = (e: PointerEvent) => {
      pointerInteracting = e.clientX - pointerInteractionMovement * 200
      canvas.style.cursor = 'grabbing'
    }
    const onPointerUp = () => {
      pointerInteracting = null
      canvas.style.cursor = 'grab'
    }
    const onPointerOut = () => {
      pointerInteracting = null
      canvas.style.cursor = 'grab'
    }
    const onPointerMove = (e: PointerEvent) => {
      if (pointerInteracting == null) return
      pointerInteractionMovement = (e.clientX - pointerInteracting) / 200
    }

    canvas.style.cursor = 'grab'
    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointerout', onPointerOut)
    window.addEventListener('pointermove', onPointerMove)

    return () => {
      destroyed = true
      cancelAnimationFrame(frameId)
      ro.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointerout', onPointerOut)
      window.removeEventListener('pointermove', onPointerMove)
      globe.destroy()
    }
  }, [
    size,
    rotationSpeed,
    dark,
    diffuse,
    mapSamples,
    mapBrightness,
    scale,
    baseColor[0],
    baseColor[1],
    baseColor[2],
    markerColor[0],
    markerColor[1],
    markerColor[2],
    glowColor[0],
    glowColor[1],
    glowColor[2],
    markers,
  ])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn('block touch-none select-none', className)}
      style={{ width: size, height: size }}
    />
  )
}
