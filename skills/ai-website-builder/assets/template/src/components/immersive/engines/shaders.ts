/**
 * Three small fragment shaders (GLSL ES 1.00) for ShaderHero. They are plain text so an app can pass its own through the
 * `fragment` prop with the same uniforms. Colours arrive as uniforms read from the app's tokens: a shader never has a colour of its own.
 *
 *   uniform vec2  u_resolution   canvas size in pixels
 *   uniform float u_time         seconds since start
 *   uniform vec2  u_pointer      -1..1 from the centre, eased
 *   uniform float u_progress     0..1 (reserved for a scene that scrubs; 0 for a hero)
 *   uniform vec3  u_bg, u_fg, u_accent   token colours
 */
export const SHADER_HEADER = `precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_pointer;
uniform float u_progress;
uniform vec3 u_bg;
uniform vec3 u_fg;
uniform vec3 u_accent;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}
vec2 coords() { return (gl_FragCoord.xy / u_resolution.xy - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0); }
`;

export const SHADER_PRESETS: Record<string, string> = {
  /** Slow domain-warped noise: a field that drifts, leaning toward the pointer. */
  flow: `${SHADER_HEADER}
void main() {
  vec2 p = coords();
  float t = u_time * 0.05;
  vec2 q = vec2(fbm(p * 2.0 + t), fbm(p * 2.0 + vec2(5.2, 1.3) - t));
  float f = fbm(p * 2.0 + 2.0 * q + u_pointer * 0.15);
  vec3 col = mix(u_bg, u_accent, smoothstep(0.25, 0.85, f) * 0.55);
  col = mix(col, u_fg, smoothstep(0.72, 1.0, f) * 0.12);
  gl_FragColor = vec4(col, 1.0);
}`,
  /** A soft vertical gradient with film grain and a vignette: quiet, for type-led pages. */
  grain: `${SHADER_HEADER}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float g = hash(gl_FragCoord.xy + floor(u_time * 12.0)) - 0.5;
  vec3 col = mix(u_bg, u_accent, smoothstep(0.0, 1.0, uv.y + 0.08 * sin(u_time * 0.2 + uv.x * 3.0)) * 0.35);
  float vig = smoothstep(1.1, 0.35, length(uv - 0.5 - u_pointer * 0.04));
  col = mix(u_bg, col, vig) + g * 0.035;
  gl_FragColor = vec4(col, 1.0);
}`,
  /** Moving contour lines, like a map of a hill that breathes. */
  contours: `${SHADER_HEADER}
void main() {
  vec2 p = coords();
  float h = fbm(p * 2.2 + vec2(u_time * 0.03, -u_time * 0.02) + u_pointer * 0.1);
  float line = abs(fract(h * 9.0) - 0.5);
  float ink = 1.0 - smoothstep(0.0, 0.08, line);
  vec3 col = mix(u_bg, u_fg, ink * 0.22);
  col = mix(col, u_accent, smoothstep(0.55, 0.9, h) * 0.2);
  gl_FragColor = vec4(col, 1.0);
}`,
};

export const SHADER_PRESET_NAMES = Object.keys(SHADER_PRESETS);
