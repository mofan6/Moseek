const vertexSource = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

// Layered noise bends the colored bands into slow, continuous folds.
const fragmentSource = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif
  uniform vec2 size;
  uniform float time;
  uniform vec3 base;
  uniform vec3 glow;
  uniform vec3 veil;
  uniform vec3 shade;

  float grain(vec2 cell) {
    vec3 p = fract(vec3(cell.xyx) * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float noise(vec2 p) {
    vec2 cell = floor(p);
    vec2 u = fract(p);
    u = u * u * (3.0 - 2.0 * u);
    return mix(
      mix(grain(cell), grain(cell + vec2(1.0, 0.0)), u.x),
      mix(grain(cell + vec2(0.0, 1.0)), grain(cell + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float folds(vec2 p) {
    const mat2 turn = mat2(0.84, 0.54, -0.54, 0.84);
    return noise(p) * 0.67 + noise(turn * p * 2.03 + vec2(6.4, 2.9)) * 0.33;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / size;
    vec2 ratio = vec2(size.x / size.y, 1.0);
    vec2 p = (uv - vec2(0.49, 0.55)) * ratio * 2.65;
    float drift = time * 0.075;
    vec2 flow = vec2(folds(p * 0.66 + vec2(drift, 1.6)),
                     folds(p * 0.75 + vec2(5.5, -drift * 0.72))) - 0.5;
    vec2 bend = p + flow * 3.4;
    float dense = folds(bend + vec2(0.4, drift * 0.18));
    float ribbon = folds(bend * 0.8 + vec2(-drift * 0.15, 4.3));
    float light = exp(-length((uv - vec2(0.78, 0.79)) * ratio) * 2.8);
    vec3 color = mix(base, glow, smoothstep(0.24, 0.72, dense + light * 0.18) * 0.76);
    color = mix(color, veil, smoothstep(0.32, 0.74, ribbon) * 0.43);
    color = mix(color, shade, smoothstep(0.32, 0.91, length(uv - vec2(0.52, 0.66))) * 0.78);
    color += (grain(gl_FragCoord.xy) - 0.5) * 0.004;
    gl_FragColor = vec4(color, 1.0);
  }
`

const compile = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type)
  if (!shader) {
    return null
  }
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    return shader
  }
  gl.deleteShader(shader)
  return null
}

const createProgram = (gl: WebGLRenderingContext) => {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource)
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource)
  const program = vertex && fragment ? gl.createProgram() : null
  if (program && vertex && fragment) {
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
  }
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (program && gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return program
  }
  gl.deleteProgram(program)
  return null
}

export const startAtmosphere = (canvas: HTMLCanvasElement) => {
  const surface = canvas.parentElement
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: 'low-power',
    preserveDrawingBuffer: true,
  })
  if (!surface || !gl) {
    return
  }
  const program = createProgram(gl)
  if (!program) {
    return
  }
  const buffer = gl.createBuffer()
  if (!buffer) {
    gl.deleteProgram(program)
    return
  }
  const position = gl.getAttribLocation(program, 'position')
  gl.useProgram(program)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  const size = gl.getUniformLocation(program, 'size')
  const time = gl.getUniformLocation(program, 'time')
  const root = document.documentElement
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
  let seconds = 21
  let frame = 0
  let previous = 0
  let lost = false

  const updatePalette = () => {
    const colors = [
      ['base', '--moseek-atmosphere-top'],
      ['glow', '--moseek-atmosphere-glow'],
      ['veil', '--moseek-atmosphere-veil'],
      ['shade', '--moseek-atmosphere-base'],
    ] as const
    const probe = document.createElement('span')
    probe.hidden = true
    document.body.append(probe)
    for (const [name, token] of colors) {
      probe.style.color = `var(${token})`
      const channels = getComputedStyle(probe)
        .color.match(/[\d.]+/g)
        ?.map(Number)
      if (channels && channels.length >= 3) {
        gl.uniform3f(
          gl.getUniformLocation(program, name),
          channels[0] / 255,
          channels[1] / 255,
          channels[2] / 255
        )
      }
    }
    probe.remove()
  }

  const draw = () => {
    if (lost) {
      return
    }
    gl.uniform2f(size, canvas.width, canvas.height)
    gl.uniform1f(time, seconds)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  const canPlay = () =>
    !lost && !reduce.matches && !document.hidden && !root.hasAttribute('data-moseek-theme-reveal')

  const animate = (now: number) => {
    frame = 0
    if (!canPlay()) {
      return
    }
    if (!previous || now - previous >= 1000 / 24) {
      seconds += previous ? Math.min(now - previous, 100) / 1000 : 0
      previous = now
      draw()
    }
    frame = requestAnimationFrame(animate)
  }

  const syncPlayback = () => {
    cancelAnimationFrame(frame)
    frame = 0
    previous = 0
    if (canPlay()) {
      frame = requestAnimationFrame(animate)
    }
  }

  const resize = () => {
    const { width, height } = surface.getBoundingClientRect()
    const budget = width < 768 ? 220_000 : 530_000
    const scale = Math.min(1, Math.sqrt(budget / (width * height)))
    const w = Math.max(1, Math.round(width * scale))
    const h = Math.max(1, Math.round(height * scale))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    gl.viewport(0, 0, w, h)
    draw()
  }

  const onContextLost = () => {
    lost = true
    delete surface.dataset.renderer
    syncPlayback()
  }
  const themeObserver = new MutationObserver((records) => {
    if (!lost && records.some(({ target }) => target === document.body)) {
      updatePalette()
      draw()
    }
    syncPlayback()
  })
  themeObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-moseek-palette', 'data-ds-dark-theme'],
  })
  themeObserver.observe(root, { attributes: true, attributeFilter: ['data-moseek-theme-reveal'] })
  const sizeObserver = new ResizeObserver(resize)
  sizeObserver.observe(surface)
  canvas.addEventListener('webglcontextlost', onContextLost)
  document.addEventListener('visibilitychange', syncPlayback)
  reduce.addEventListener('change', syncPlayback)
  updatePalette()
  resize()
  surface.dataset.renderer = 'webgl'
  syncPlayback()

  return () => {
    cancelAnimationFrame(frame)
    themeObserver.disconnect()
    sizeObserver.disconnect()
    canvas.removeEventListener('webglcontextlost', onContextLost)
    document.removeEventListener('visibilitychange', syncPlayback)
    reduce.removeEventListener('change', syncPlayback)
    delete surface.dataset.renderer
    gl.deleteBuffer(buffer)
    gl.deleteProgram(program)
  }
}
