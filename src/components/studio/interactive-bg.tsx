import { useEffect, useRef } from 'react'

type Intensity = 'ambient' | 'modal'

interface VoiceTheme {
  nodeColor: string
  lineRgb: string
  speed: number
  linkDist: number
  returnForce: number
  driftAmp: number
  magnetic: number
}

interface Node {
  x: number
  y: number
  baseX: number
  baseY: number
  vx: number
  vy: number
  size: number
  impulseX: number
  impulseY: number
}

interface Ripple {
  x: number
  y: number
  radius: number
  maxRadius: number
  opacity: number
}

interface TrailPoint {
  x: number
  y: number
  life: number
}

function getVoiceTheme(handle?: string): VoiceTheme {
  const h = handle?.toLowerCase()
  switch (h) {
    case '@cryptohayes':
      return {
        nodeColor: '#c89d66',
        lineRgb: '200,157,102',
        speed: 0.58,
        linkDist: 88,
        returnForce: 0.032,
        driftAmp: 0.48,
        magnetic: 3.2,
      }
    case '@cobie':
      return {
        nodeColor: '#8a9a82',
        lineRgb: '138,154,130',
        speed: 0.44,
        linkDist: 78,
        returnForce: 0.042,
        driftAmp: 0.28,
        magnetic: 2.8,
      }
    case '@hasu':
      return {
        nodeColor: '#7a8a92',
        lineRgb: '122,138,146',
        speed: 0.26,
        linkDist: 68,
        returnForce: 0.052,
        driftAmp: 0.18,
        magnetic: 2.2,
      }
    case '@6529':
      return {
        nodeColor: '#9a9082',
        lineRgb: '154,144,130',
        speed: 0.34,
        linkDist: 96,
        returnForce: 0.028,
        driftAmp: 0.42,
        magnetic: 3.0,
      }
    case '@loomdart':
      return {
        nodeColor: '#a89282',
        lineRgb: '168,146,130',
        speed: 0.68,
        linkDist: 92,
        returnForce: 0.024,
        driftAmp: 0.58,
        magnetic: 3.6,
      }
    default:
      return {
        nodeColor: '#33332c',
        lineRgb: '34,34,30',
        speed: 0.35,
        linkDist: 85,
        returnForce: 0.03,
        driftAmp: 0.35,
        magnetic: 3.0,
      }
  }
}

export function InteractiveBackground({
  intensity = 'ambient',
  isWriting = false,
  activeVoiceHandle,
}: {
  intensity?: Intensity
  isWriting?: boolean
  activeVoiceHandle?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isWritingRef = useRef(isWriting)
  const voiceRef = useRef(activeVoiceHandle)

  useEffect(() => {
    isWritingRef.current = isWriting
  }, [isWriting])

  useEffect(() => {
    voiceRef.current = activeVoiceHandle
  }, [activeVoiceHandle])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId = 0
    let width = window.innerWidth
    let height = window.innerHeight
    let nodes: Node[] = []
    let mouseX = width / 2
    let mouseY = height / 2
    let targetMouseX = mouseX
    let targetMouseY = mouseY
    let prevMouseX = mouseX
    let prevMouseY = mouseY
    const ripples: Ripple[] = []
    const trail: TrailPoint[] = []
    let writePulseFrame = 0
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const buildGrid = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
      const spacing = 65
      const cols = Math.ceil(width / spacing) + 1
      const rows = Math.ceil(height / spacing) + 1
      nodes = []
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * spacing + spacing / 2
          const y = r * spacing + spacing / 2
          nodes.push({
            x,
            y,
            baseX: x,
            baseY: y,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            size: Math.random() > 0.82 ? 2 : 1.2,
            impulseX: 0,
            impulseY: 0,
          })
        }
      }
    }

    buildGrid()

    const scatterFrom = (x: number, y: number, strength: number) => {
      for (const node of nodes) {
        const dx = node.x - x
        const dy = node.y - y
        const dist = Math.hypot(dx, dy) || 1
        if (dist < 220) {
          const f = ((220 - dist) / 220) * strength
          node.impulseX += (dx / dist) * f
          node.impulseY += (dy / dist) * f
        }
      }
    }

    const onResize = () => buildGrid()
    const onMove = (e: MouseEvent) => {
      targetMouseX = e.clientX
      targetMouseY = e.clientY
    }
    const onClick = (e: MouseEvent) => {
      if (reducedMotion) return
      ripples.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        maxRadius: 260,
        opacity: 0.55,
      })
      scatterFrom(e.clientX, e.clientY, 9)
    }

    window.addEventListener('resize', onResize)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('click', onClick)

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      mouseX += (targetMouseX - mouseX) * 0.08
      mouseY += (targetMouseY - mouseY) * 0.08

      const vel = Math.hypot(mouseX - prevMouseX, mouseY - prevMouseY)
      if (vel > 1.2 && !reducedMotion) {
        trail.push({ x: mouseX, y: mouseY, life: 1 })
        if (trail.length > 14) trail.shift()
      }
      prevMouseX = mouseX
      prevMouseY = mouseY

      for (let t = 0; t < trail.length; t++) {
        const point = trail[t]!
        point.life *= 0.88
        if (point.life < 0.05) {
          trail.splice(t, 1)
          t--
        }
      }

      const theme = getVoiceTheme(voiceRef.current)
      const writing = isWritingRef.current

      if (writing && !reducedMotion) {
        writePulseFrame++
        if (writePulseFrame % 38 === 0) {
          ripples.push({
            x: width * (0.25 + Math.random() * 0.5),
            y: height * (0.2 + Math.random() * 0.55),
            radius: 0,
            maxRadius: 180,
            opacity: 0.35,
          })
        }
      } else {
        writePulseFrame = 0
      }

      for (let r = ripples.length - 1; r >= 0; r--) {
        const ripple = ripples[r]!
        ripple.radius += writing ? 3.5 : 4
        ripple.opacity *= 0.94
        if (ripple.opacity < 0.01 || ripple.radius > ripple.maxRadius) {
          ripples.splice(r, 1)
          continue
        }
        ctx.strokeStyle = `rgba(${theme.lineRgb}, ${ripple.opacity})`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2)
        ctx.stroke()
      }

      if (trail.length > 1) {
        ctx.lineWidth = 1
        for (let t = 1; t < trail.length; t++) {
          const a = trail[t - 1]!
          const b = trail[t]!
          ctx.strokeStyle = `rgba(${theme.lineRgb}, ${a.life * 0.22})`
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]!
        if (!reducedMotion) {
          const typingBoost = writing ? 1 + (Math.random() - 0.5) * 0.9 : 1
          node.x += node.vx * theme.speed * typingBoost
          node.y += node.vy * theme.speed * typingBoost

          node.x += (node.baseX - node.x) * theme.returnForce
          node.y += (node.baseY - node.y) * theme.returnForce

          node.x += node.impulseX
          node.y += node.impulseY
          node.impulseX *= 0.9
          node.impulseY *= 0.9

          const dx = mouseX - node.x
          const dy = mouseY - node.y
          const dist = Math.hypot(dx, dy)
          if (dist < 180 && dist > 0) {
            const force = ((180 - dist) / 180) * theme.magnetic
            node.x -= (dx / dist) * force
            node.y -= (dy / dist) * force
          }

          if (Math.abs(node.x - node.baseX) > theme.driftAmp * 60) node.vx *= -1
          if (Math.abs(node.y - node.baseY) > theme.driftAmp * 60) node.vy *= -1
        }

        ctx.fillStyle = theme.nodeColor
        ctx.fillRect(node.x, node.y, node.size, node.size)

        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j]!
          const ndx = other.x - node.x
          const ndy = other.y - node.y
          const ndist = Math.hypot(ndx, ndy)
          if (ndist > theme.linkDist) continue
          const alpha = (1 - ndist / theme.linkDist) * 0.28
          ctx.strokeStyle = `rgba(${theme.lineRgb}, ${alpha})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(node.x, node.y)
          ctx.lineTo(other.x, other.y)
          ctx.stroke()
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('click', onClick)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  const opacity =
    intensity === 'modal'
      ? 'opacity-[0.58] transition-opacity duration-700'
      : 'opacity-[0.42] transition-opacity duration-700'

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-[1] ${opacity}`}
    />
  )
}
