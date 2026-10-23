import { SHADER_PRESETS } from "./shaders";

/**
 * The WebGL engine behind ShaderHero (loaded on demand): one full-screen triangle and a fragment shader, plain WebGL, no library.
 * It refuses software renderers and context loss (the poster stays), draws at a capped resolution and frame rate, and stops when the
 * canvas is off screen or the tab is hidden.
 */
export interface ShaderEngineOptions {
  canvas: HTMLCanvasElement;
  /** A preset name from shaders.ts, or full fragment shader source. */
  shader: string;
  /** Frames per second to draw (default 30). */
  fps?: number;
  /** Fraction of the device resolution to render at (default 0.75: a field of colour does not need more). */
  scale?: number;
  onReady(): void;
  onError(reason: string): void;
}

export interface ShaderEngine {
  setVisible(visible: boolean): void;
  setPointer(x: number, y: number): void;
  destroy(): void;
}

const VERTEX = "attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }";

/** CSS colour to 0..1 RGB, through a 1x1 canvas (the browser does the colour maths for any CSS colour syntax it supports). */
export function cssColorToRgb(value: string): [number, number, number] {
  const c = document.createElement("canvas");
  c.width = 1;
  c.height = 1;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return [0.5, 0.5, 0.5];
  g.fillStyle = "gray";
  g.fillStyle = value;
  g.fillRect(0, 0, 1, 1);
  const d = g.getImageData(0, 0, 1, 1).data;
  return [(d[0] ?? 128) / 255, (d[1] ?? 128) / 255, (d[2] ?? 128) / 255];
}

const token = (name: string): [number, number, number] => cssColorToRgb(getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim() || "gray");

export function startShader(o: ShaderEngineOptions): ShaderEngine {
  const { canvas } = o;
  const noop: ShaderEngine = { setVisible() {}, setPointer() {}, destroy() {} };
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power", failIfMajorPerformanceCaveat: true, preserveDrawingBuffer: false }) as WebGLRenderingContext | null;
  if (!gl) {
    o.onError("WebGL is not available (or only as a software renderer)");
    return noop;
  }
  const compile = (type: number, src: string): WebGLShader | null => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl.FRAGMENT_SHADER, SHADER_PRESETS[o.shader] ?? o.shader);
  const program = gl.createProgram();
  if (!vs || !fs || !program) {
    o.onError("the shader did not compile");
    return noop;
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    o.onError("the shader did not link");
    return noop;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (name: string): WebGLUniformLocation | null => gl.getUniformLocation(program, name);
  const uRes = u("u_resolution");
  const uTime = u("u_time");
  const uPointer = u("u_pointer");
  const uProgress = u("u_progress");
  const [bg, fg, accent] = [token("bg"), token("fg"), token("accent")];
  gl.uniform3f(u("u_bg"), ...bg);
  gl.uniform3f(u("u_fg"), ...fg);
  gl.uniform3f(u("u_accent"), ...accent);
  gl.uniform1f(uProgress, 0);

  const interval = 1000 / Math.max(5, Math.min(60, o.fps ?? 30));
  let destroyed = false;
  let visible = true;
  let raf = 0;
  let last = 0;
  let started = 0;
  let firstFrame = true;
  let px = 0;
  let py = 0;
  let tx = 0;
  let ty = 0;

  const resize = (): void => {
    const rect = canvas.getBoundingClientRect();
    const k = Math.min(window.devicePixelRatio || 1, 1.5) * (o.scale ?? 0.75);
    const w = Math.max(2, Math.round(rect.width * k));
    const h = Math.max(2, Math.round(rect.height * k));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };

  const frame = (now: number): void => {
    raf = 0;
    if (destroyed || !visible || document.hidden) return;
    raf = requestAnimationFrame(frame);
    if (now - last < interval) return;
    last = now;
    if (!started) started = now;
    px += (tx - px) * 0.08;
    py += (ty - py) * 0.08;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, (now - started) / 1000);
    gl.uniform2f(uPointer, px, py);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (firstFrame) {
      firstFrame = false;
      o.onReady();
    }
  };
  const start = (): void => {
    if (!raf && !destroyed && visible && !document.hidden) raf = requestAnimationFrame(frame);
  };

  const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
  ro?.observe(canvas);
  resize();
  const onLost = (e: Event): void => {
    e.preventDefault();
    o.onError("the graphics context was lost");
  };
  const onVis = (): void => start();
  canvas.addEventListener("webglcontextlost", onLost);
  document.addEventListener("visibilitychange", onVis);
  start();

  return {
    setVisible(v) {
      visible = v;
      if (v) start();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    setPointer(x, y) {
      tx = Math.max(-1, Math.min(1, x));
      ty = Math.max(-1, Math.min(1, y));
    },
    destroy() {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      ro?.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      document.removeEventListener("visibilitychange", onVis);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
