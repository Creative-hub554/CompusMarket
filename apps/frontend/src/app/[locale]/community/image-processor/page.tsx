'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import NextImage from "next/image"

type Gender = 'male' | 'female'
type EditorStep = 'upload' | 'edit'

interface SuitDef {
  id: string
  name: string
  gender: Gender
  svg: string
}

interface BgOption {
  id: string
  name: string
  type: 'color' | 'gradient'
  colors: string[]
}

const SUITS: SuitDef[] = [
  {
    id: 'male-classic',
    name: 'Classic Black',
    gender: 'male',
    svg: `<svg viewBox="0 0 240 480" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="suit-shadow"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15"/></filter></defs>
      <g filter="url(#suit-shadow)">
      <path d="M48 96 L32 58 Q68 32 120 28 Q172 32 208 58 L192 96 L196 400 Q160 440 120 440 Q80 440 44 400 Z" fill="#111827" stroke="#0f172a" stroke-width="1"/>
      <path d="M120 58 L96 90 L90 160 L102 142 L120 120 Z" fill="#1e293b"/>
      <path d="M120 58 L144 90 L150 160 L138 142 L120 120 Z" fill="#1e293b"/>
      <path d="M112 108 L128 108 L130 240 L120 260 L110 240 Z" fill="#dc2626"/>
      <path d="M108 106 L132 106 L134 118 L106 118 Z" fill="#b91c1c"/>
      <path d="M64 52 Q92 46 120 52 Q148 46 176 52" fill="none" stroke="#0f172a" stroke-width="2"/>
      <path d="M104 52 L92 76 L102 72 Z" fill="#f8fafc" opacity="0.9"/>
      <path d="M136 52 L148 76 L138 72 Z" fill="#f8fafc" opacity="0.9"/>
      <path d="M60 174 L82 174 L79 206 L56 206 Z" fill="#1e293b" opacity="0.6"/>
      <circle cx="120" cy="200" r="4" fill="#0f172a"/>
      <circle cx="120" cy="228" r="4" fill="#0f172a"/>
      <path d="M32 58 Q26 46 32 36 L48 48 Z" fill="#111827" opacity="0.8"/>
      <path d="M208 58 Q214 46 208 36 L192 48 Z" fill="#111827" opacity="0.8"/>
      </g>
    </svg>`
  },
  {
    id: 'male-navy',
    name: 'Navy Blue',
    gender: 'male',
    svg: `<svg viewBox="0 0 240 480" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="suit-shadow"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15"/></filter></defs>
      <g filter="url(#suit-shadow)">
      <path d="M48 96 L32 58 Q68 32 120 28 Q172 32 208 58 L192 96 L196 400 Q160 440 120 440 Q80 440 44 400 Z" fill="#1e3a5f" stroke="#15294a" stroke-width="1"/>
      <path d="M120 58 L96 90 L90 160 L102 142 L120 120 Z" fill="#15294a"/>
      <path d="M120 58 L144 90 L150 160 L138 142 L120 120 Z" fill="#15294a"/>
      <path d="M112 108 L128 108 L130 240 L120 260 L110 240 Z" fill="#c41e3a"/>
      <path d="M108 106 L132 106 L134 118 L106 118 Z" fill="#9c152c"/>
      <path d="M64 52 Q92 46 120 52 Q148 46 176 52" fill="none" stroke="#0f1f3a" stroke-width="2"/>
      <path d="M104 52 L92 76 L102 72 Z" fill="#f8fafc" opacity="0.9"/>
      <path d="M136 52 L148 76 L138 72 Z" fill="#f8fafc" opacity="0.9"/>
      <path d="M60 174 L82 174 L79 206 L56 206 Z" fill="#15294a" opacity="0.6"/>
      <circle cx="120" cy="200" r="4" fill="#0f1f3a"/>
      <circle cx="120" cy="228" r="4" fill="#0f1f3a"/>
      <path d="M32 58 Q26 46 32 36 L48 48 Z" fill="#1e3a5f" opacity="0.8"/>
      <path d="M208 58 Q214 46 208 36 L192 48 Z" fill="#1e3a5f" opacity="0.8"/>
      </g>
    </svg>`
  },
  {
    id: 'female-blazer',
    name: 'Crimson Blazer',
    gender: 'female',
    svg: `<svg viewBox="0 0 240 480" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="suit-shadow"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15"/></filter></defs>
      <g filter="url(#suit-shadow)">
      <path d="M50 100 L36 62 Q72 34 120 26 Q168 34 204 62 L190 100 L196 380 Q160 420 120 420 Q80 420 44 380 Z" fill="#7f1d1d" stroke="#601515" stroke-width="1"/>
      <path d="M120 58 L92 94 L84 150 L102 136 L120 114 Z" fill="#601515"/>
      <path d="M120 58 L148 94 L156 150 L138 136 L120 114 Z" fill="#601515"/>
      <path d="M48 238 L192 238" stroke="#601515" stroke-width="2"/>
      <circle cx="120" cy="200" r="5" fill="#d4af37" stroke="#b8962e" stroke-width="0.5"/>
      <path d="M70 56 Q96 48 120 56 Q144 48 170 56" fill="none" stroke="#4a1010" stroke-width="2"/>
      <path d="M104 48 L96 76 L104 70 Z" fill="#fdf2f8" opacity="0.9"/>
      <path d="M136 48 L144 76 L136 70 Z" fill="#fdf2f8" opacity="0.9"/>
      <path d="M36 62 Q30 50 36 40 L50 48 Z" fill="#7f1d1d" opacity="0.8"/>
      <path d="M204 62 Q210 50 204 40 L190 48 Z" fill="#7f1d1d" opacity="0.8"/>
      <path d="M50 100 L44 152 Q44 160 50 164 L64 164 L68 100 Z" fill="#601515" opacity="0.5"/>
      <path d="M190 100 L196 152 Q196 160 190 164 L176 164 L172 100 Z" fill="#601515" opacity="0.5"/>
      </g>
    </svg>`
  },
  {
    id: 'female-navy',
    name: 'Navy Blazer',
    gender: 'female',
    svg: `<svg viewBox="0 0 240 480" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="suit-shadow"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15"/></filter></defs>
      <g filter="url(#suit-shadow)">
      <path d="M50 100 L36 62 Q72 34 120 26 Q168 34 204 62 L190 100 L196 380 Q160 420 120 420 Q80 420 44 380 Z" fill="#1e3a5f" stroke="#15294a" stroke-width="1"/>
      <path d="M120 58 L92 94 L84 150 L102 136 L120 114 Z" fill="#15294a"/>
      <path d="M120 58 L148 94 L156 150 L138 136 L120 114 Z" fill="#15294a"/>
      <path d="M48 238 L192 238" stroke="#15294a" stroke-width="2"/>
      <circle cx="120" cy="200" r="5" fill="#c0c0c0" stroke="#909090" stroke-width="0.5"/>
      <path d="M70 56 Q96 48 120 56 Q144 48 170 56" fill="none" stroke="#0f1f3a" stroke-width="2"/>
      <path d="M104 48 L96 76 L104 70 Z" fill="#f0fdf4" opacity="0.9"/>
      <path d="M136 48 L144 76 L136 70 Z" fill="#f0fdf4" opacity="0.9"/>
      <path d="M36 62 Q30 50 36 40 L50 48 Z" fill="#1e3a5f" opacity="0.8"/>
      <path d="M204 62 Q210 50 204 40 L190 48 Z" fill="#1e3a5f" opacity="0.8"/>
      <path d="M50 100 L44 152 Q44 160 50 164 L64 164 L68 100 Z" fill="#15294a" opacity="0.5"/>
      <path d="M190 100 L196 152 Q196 160 190 164 L176 164 L172 100 Z" fill="#15294a" opacity="0.5"/>
      </g>
    </svg>`
  },
]

const BG_OPTIONS: BgOption[] = [
  { id: 'white', name: 'White', type: 'color', colors: ['#ffffff'] },
  { id: 'gray', name: 'Light Gray', type: 'color', colors: ['#e5e5e5'] },
  { id: 'blue', name: 'Sky Blue', type: 'gradient', colors: ['#93c5fd', '#bfdbfe'] },
  { id: 'khmer', name: 'Khmer Blue', type: 'gradient', colors: ['#1a3a5c', '#0d2137'] },
  { id: 'sunset', name: 'Sunset', type: 'gradient', colors: ['#fa709a', '#fee140'] },
  { id: 'forest', name: 'Forest', type: 'gradient', colors: ['#11998e', '#38ef7d'] },
  { id: 'dark', name: 'Charcoal', type: 'color', colors: ['#1f2937'] },
  { id: 'red', name: 'Cambodia Red', type: 'gradient', colors: ['#dc2626', '#991b1b'] },
]

export default function ImageProcessorPage() {
  const [step, setStep] = useState<EditorStep>('upload')
  const [cleanUrl, setCleanUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingMsg, setProcessingMsg] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)

  const [gender, setGender] = useState<Gender>('male')
  const [suitId, setSuitId] = useState('male-classic')
  const [suitX, setSuitX] = useState(0)
  const [suitY, setSuitY] = useState(0)
  const [suitW, setSuitW] = useState(200)
  const [suitH, setSuitH] = useState(400)
  const [suitRot, setSuitRot] = useState(0)

  const [bgId, setBgId] = useState('white')
  const [isExporting, setIsExporting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  const dragRef = useRef({ active: false, type: '', startX: 0, startY: 0, pX: 0, pY: 0, sX: 0, sY: 0, sW: 0, sH: 0, sR: 0 })

  const currentSuit = SUITS.find(s => s.id === suitId) || SUITS[0]
  const currentBg = BG_OPTIONS.find(b => b.id === bgId) || BG_OPTIONS[0]

  const bgStyle = currentBg.type === 'gradient'
    ? { background: `linear-gradient(135deg, ${currentBg.colors[0]}, ${currentBg.colors[1]})` }
    : { backgroundColor: currentBg.colors[0] }

  const handleRemoveBg = useCallback(async (file: File) => {
    setIsProcessing(true)
    setProcessingMsg('Loading AI model...')
    setError(null)
    try {
      const { removeBackground } = await import('@imgly/background-removal')
      const blob = await removeBackground(file, {
        progress: (key: string, current: number, total: number) => {
          if (key === 'load-model') setProcessingMsg('Downloading AI model (first time may take a moment)...')
          else if (key === 'compute') setProcessingMsg(`Removing background... ${Math.round((current / total) * 100)}%`)
          else setProcessingMsg('Finalizing...')
        },
        model: 'isnet_quint8',
        output: { format: 'image/png' },
      })
      const url = URL.createObjectURL(blob)
      setCleanUrl(url)
      setStep('edit')
    } catch (err) {
      console.error('Background removal failed:', err)
      setError('Failed to process image. The image may be too large or unsupported.')
    } finally {
      setIsProcessing(false)
      setProcessingMsg('')
    }
  }, [])

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return }
    if (file.size > 20 * 1024 * 1024) { setError('Image must be under 20 MB.'); return }
    handleRemoveBg(file)
  }, [handleRemoveBg])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault() }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (step !== 'edit') return
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(z => Math.max(0.25, Math.min(4, Math.round((z + delta) * 100) / 100)))
  }, [step])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const t = e.target as HTMLElement
    const suitEl = t.closest('[data-suit-handle]')
    const resizeEl = t.closest('[data-resize]')
    const rotateEl = t.closest('[data-rotate]')
    const canvasEl = t.closest('[data-canvas]')

    if (rotateEl) {
      dragRef.current = { active: true, type: 'rotate', startX: e.clientX, startY: e.clientY, pX: 0, pY: 0, sX: suitX, sY: suitY, sW: suitW, sH: suitH, sR: suitRot }
      return
    }
    if (resizeEl) {
      const h = resizeEl.getAttribute('data-resize') || 'br'
      dragRef.current = { active: true, type: `resize-${h}`, startX: e.clientX, startY: e.clientY, pX: 0, pY: 0, sX: suitX, sY: suitY, sW: suitW, sH: suitH, sR: suitRot }
      return
    }
    if (suitEl) {
      dragRef.current = { active: true, type: 'suit', startX: e.clientX, startY: e.clientY, pX: 0, pY: 0, sX: suitX, sY: suitY, sW: suitW, sH: suitH, sR: suitRot }
      return
    }
    if (canvasEl) {
      dragRef.current = { active: true, type: 'pan', startX: e.clientX, startY: e.clientY, pX: panX, pY: panY, sX: 0, sY: 0, sW: 0, sH: 0, sR: 0 }
      return
    }
  }, [panX, panY, suitX, suitY, suitW, suitH, suitRot])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d.active) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY

    if (d.type === 'pan') { setPanX(d.pX + dx); setPanY(d.pY + dy) }
    else if (d.type === 'suit') { setSuitX(d.sX + dx); setSuitY(d.sY + dy) }
    else if (d.type === 'rotate') {
      const cx = d.sX + d.sW / 2
      const cy = d.sY + d.sH / 2
      const a1 = Math.atan2(d.startY - cy, d.startX - cx)
      const a2 = Math.atan2(e.clientY - cy, e.clientX - cx)
      setSuitRot(d.sR + (a2 - a1) * (180 / Math.PI))
    }
    else if (d.type.startsWith('resize-')) {
      const handle = d.type.replace('resize-', '') as 'tl' | 'tr' | 'bl' | 'br'
      let nw = d.sW, nh = d.sH, nx = d.sX, ny = d.sY
      if (handle.includes('r')) { nw = Math.max(50, d.sW + dx) }
      if (handle.includes('l')) { nw = Math.max(50, d.sW - dx); nx = d.sX + (d.sW - nw) }
      if (handle.includes('b')) { nh = Math.max(80, d.sH + dy) }
      if (handle.includes('t')) { nh = Math.max(80, d.sH - dy); ny = d.sY + (d.sH - nh) }
      setSuitX(nx); setSuitY(ny); setSuitW(nw); setSuitH(nh)
    }
  }, [])

  const handlePointerUp = useCallback(() => {
    dragRef.current.active = false
  }, [])

  const handleGenderChange = useCallback((g: Gender) => {
    setGender(g)
    const s = SUITS.find(x => x.gender === g)
    if (s) setSuitId(s.id)
  }, [])

  const resetView = useCallback(() => {
    setZoom(1); setPanX(0); setPanY(0); setSuitX(0); setSuitY(0)
    setSuitW(200); setSuitH(400); setSuitRot(0)
  }, [])

  const compositeImage = useCallback(async (W: number, H: number, canvas: HTMLCanvasElement): Promise<Blob | null> => {
    const container = containerRef.current
    if (!container || !cleanUrl) return null

    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const cw = container.offsetWidth
    const ch = container.offsetHeight
    const sx = W / cw
    const sy = H / ch

    if (currentBg.type === 'gradient') {
      const g = ctx.createLinearGradient(0, 0, W, H)
      currentBg.colors.forEach((c, i) => g.addColorStop(i / (currentBg.colors.length - 1), c))
      ctx.fillStyle = g
    } else { ctx.fillStyle = currentBg.colors[0] }
    ctx.fillRect(0, 0, W, H)

    const loadImg = (src: string): Promise<HTMLImageElement> => new Promise((res, rej) => {
      const i = new Image()
      const timer = setTimeout(() => rej(new Error('Image load timed out')), 20000)
      i.onload = () => { clearTimeout(timer); res(i) }
      i.onerror = () => { clearTimeout(timer); rej(new Error('Failed to load image')) }
      i.src = src
    })

    try {
      const personImg = await loadImg(cleanUrl)
      const s = W / cw
      const imgAspect = personImg.naturalWidth / personImg.naturalHeight
      let dispW: number, dispH: number
      if (imgAspect >= cw / ch) { dispW = cw; dispH = cw / imgAspect }
      else { dispH = ch; dispW = ch * imgAspect }
      const pw = dispW * s * zoom, ph = dispH * s * zoom
      const px = (W - pw) / 2 + panX * s, py = (H - ph) / 2 + panY * s
      ctx.drawImage(personImg, px, py, pw, ph)

      if (currentSuit) {
        const suitImg = await loadImg('data:image/svg+xml,' + encodeURIComponent(currentSuit.svg))
        ctx.save()
        const scx = suitX * sx + (suitW * sx) / 2, scy = suitY * sy + (suitH * sy) / 2
        ctx.translate(scx, scy)
        ctx.rotate(suitRot * Math.PI / 180)
        ctx.translate(-scx, -scy)
        ctx.drawImage(suitImg, suitX * sx, suitY * sy, suitW * sx, suitH * sy)
        ctx.restore()
      }

      return new Promise(res => canvas.toBlob(b => res(b), 'image/png'))
    } catch {
      return null
    }
  }, [cleanUrl, zoom, panX, panY, suitX, suitY, suitW, suitH, suitRot, currentSuit, currentBg])

  const generatePreview = useCallback(async () => {
    const canvas = previewCanvasRef.current
    if (!canvas) return
    const blob = await compositeImage(320, 400, canvas)
    if (blob) setPreviewUrl(URL.createObjectURL(blob))
    setShowPreview(true)
  }, [compositeImage])

  const exportImage = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setIsExporting(true)
    const blob = await compositeImage(1080, 1350, canvas)
    if (blob) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'portrait.png'; a.click()
      URL.revokeObjectURL(url)
    }
    setIsExporting(false)
  }, [compositeImage])

  useEffect(() => {
    return () => { if (cleanUrl) URL.revokeObjectURL(cleanUrl) }
  }, [cleanUrl])

  return (
    <div className="min-h-screen">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Smart Image Processor</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Remove background, add a suit overlay, and set your background — all in your browser. Your image never leaves your device.</p>

      {step === 'upload' && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-[var(--border-subtle)] rounded-2xl p-16 text-center cursor-pointer hover:border-indigo-600 transition-colors bg-white/50 dark:bg-slate-900/50"
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">Drop your photo here or click to browse</p>
          <p className="text-sm text-slate-400">Supports JPG, PNG • Max 20 MB</p>
          <input id="file-input" type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

          {isProcessing && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500 dark:text-slate-400">{processingMsg}</p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
              <button className="mt-2 text-sm text-red-600 underline" onClick={() => setError(null)}>Dismiss</button>
            </div>
          )}
        </div>
      )}

      {step === 'edit' && cleanUrl && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div
              ref={containerRef}
              data-canvas
              className="relative w-full aspect-[4/5] max-h-[75vh] rounded-xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
              style={bgStyle}
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ transform: `translate(${panX}px, ${panY}px)` }}
              >
                <img
                  ref={imgRef}
                  src={cleanUrl}
                  alt="Processed"
                  className="max-w-full max-h-full pointer-events-none"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', imageRendering: 'auto' }}
                  draggable={false}
                />
              </div>

              {currentSuit && (
                <div
                  data-suit-handle
                  className="absolute cursor-move"
                  style={{
                    left: suitX, top: suitY,
                    width: suitW, height: suitH,
                    transform: `rotate(${suitRot}deg)`,
                    transformOrigin: 'center center',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
                  }}
                >
                  <div
                    className="w-full h-full pointer-events-none"
                    dangerouslySetInnerHTML={{
                      __html: currentSuit.svg.replace('<svg', '<svg style="width:100%;height:100%"')
                    }}
                  />
                  <div data-rotate className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-[var(--surface)] rounded-full border-2 border-indigo-600 cursor-grab active:cursor-grabbing flex items-center justify-center shadow-sm">
                    <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </div>
                  <div data-resize="tl" className="absolute -top-2 -left-2 w-4 h-4 bg-[var(--surface)] border-2 border-indigo-600 rounded-sm cursor-nw-resize shadow-sm" />
                  <div data-resize="tr" className="absolute -top-2 -right-2 w-4 h-4 bg-[var(--surface)] border-2 border-indigo-600 rounded-sm cursor-ne-resize shadow-sm" />
                  <div data-resize="bl" className="absolute -bottom-2 -left-2 w-4 h-4 bg-[var(--surface)] border-2 border-indigo-600 rounded-sm cursor-sw-resize shadow-sm" />
                  <div data-resize="br" className="absolute -bottom-2 -right-2 w-4 h-4 bg-[var(--surface)] border-2 border-indigo-600 rounded-sm cursor-se-resize shadow-sm" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setZoom(z => Math.max(0.25, z - 0.2))} className="btn-ghost btn-sm" title="Zoom out">−</button>
                <span className="text-sm text-slate-500 dark:text-slate-400 w-12 text-center font-mono">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(4, z + 0.2))} className="btn-ghost btn-sm" title="Zoom in">+</button>
                <button onClick={resetView} className="btn-ghost btn-sm text-xs ml-2">Reset</button>
              </div>
              <p className="text-xs text-slate-400">Scroll to zoom • Drag to pan • Drag suit to position</p>
            </div>
          </div>

          <div className="w-full lg:w-72 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Gender</label>
              <div className="flex gap-2">
                <button onClick={() => handleGenderChange('male')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${gender === 'male' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-[var(--surface)] text-slate-700 dark:text-slate-300 border-[var(--border-subtle)] hover:border-indigo-400/60'}`}>Male</button>
                <button onClick={() => handleGenderChange('female')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${gender === 'female' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-[var(--surface)] text-slate-700 dark:text-slate-300 border-[var(--border-subtle)] hover:border-indigo-400/60'}`}>Female</button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Suit</label>
              <div className="grid grid-cols-2 gap-3">
                {SUITS.filter(s => s.gender === gender).map(s => (
                  <button key={s.id} onClick={() => setSuitId(s.id)} className={`relative aspect-[3/4] rounded-xl border-2 overflow-hidden transition-all ${suitId === s.id ? 'border-indigo-600 ring-2 ring-indigo-600/30 shadow-md' : 'border-[var(--border-subtle)] hover:border-indigo-400/60 hover:shadow-sm'}`}>
                    <div className="w-full h-full bg-[var(--surface)]" dangerouslySetInnerHTML={{ __html: s.svg.replace('<svg', '<svg style="width:100%;height:100%"') }} />
                    <span className="absolute bottom-0 inset-x-0 text-xs font-semibold text-center py-1.5 bg-gradient-to-t from-white via-white/95 to-transparent text-slate-800 dark:text-slate-200">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Background</label>
              <div className="grid grid-cols-4 gap-2">
                {BG_OPTIONS.map(b => (
                  <button key={b.id} onClick={() => setBgId(b.id)} className={`aspect-square rounded-lg border-2 overflow-hidden transition-all ${bgId === b.id ? 'border-indigo-600 ring-2 ring-indigo-600/20' : 'border-[var(--border-subtle)] hover:border-[var(--border-subtle)]'}`} title={b.name}>
                    <div className="w-full h-full" style={b.type === 'gradient' ? { background: `linear-gradient(135deg, ${b.colors[0]}, ${b.colors[1]})` } : { backgroundColor: b.colors[0] }} />
                  </button>
                ))}
              </div>
            </div>

            <button onClick={generatePreview} className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              Preview
            </button>

            <button onClick={exportImage} disabled={isExporting} className="w-full btn-primary py-3 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isExporting ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Exporting...</>
              ) : (
                <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Download Portrait</>
              )}
            </button>

            <button onClick={() => { setStep('upload'); setCleanUrl(null); resetView() }} className="w-full text-sm text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors">
              Start over
            </button>
          </div>
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => { setShowPreview(false); if (previewUrl) URL.revokeObjectURL(previewUrl) }}>
          <div className="bg-[var(--surface)] rounded-2xl shadow-2xl overflow-hidden max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)]">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Final Preview</h3>
              <button onClick={() => { setShowPreview(false); if (previewUrl) URL.revokeObjectURL(previewUrl) }} className="text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 flex justify-center">
              {previewUrl ? (
                <NextImage src={previewUrl} alt="Preview" width={240} height={320} unoptimized className="w-full max-w-[240px] rounded-lg shadow-md" />
              ) : (
                <div className="w-60 h-80 bg-[var(--surface-2)] rounded-lg flex items-center justify-center text-sm text-slate-400">Generating preview...</div>
              )}
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => { setShowPreview(false); if (previewUrl) URL.revokeObjectURL(previewUrl); exportImage() }} className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download Full Resolution
              </button>
              <button onClick={() => { setShowPreview(false); if (previewUrl) URL.revokeObjectURL(previewUrl) }} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-[var(--surface-2)] transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={previewCanvasRef} className="hidden" />
    </div>
  )
}
