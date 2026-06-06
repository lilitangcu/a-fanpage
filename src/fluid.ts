type FluidPointer = {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  active: boolean;
};

const vertexShader = `#version 300 es
  in vec2 aPosition;
  out vec2 vUv;

  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const simulationShader = `#version 300 es
  precision highp float;

  uniform sampler2D uPrevious;
  uniform vec2 uTexel;
  uniform vec2 uPointer;
  uniform vec2 uVelocity;
  uniform float uInject;
  uniform float uTime;
  in vec2 vUv;
  out vec4 outColor;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 velocity = texture(uPrevious, vUv).gb * 2.0 - 1.0;
    vec2 curl = vec2(
      sin((vUv.y + uTime * 0.025) * 17.0),
      cos((vUv.x - uTime * 0.018) * 13.0)
    ) * 0.0009;
    vec2 tracedUv = vUv - velocity * uTexel * 2.8 - curl;

    vec4 center = texture(uPrevious, tracedUv);
    float blurred =
      texture(uPrevious, tracedUv + vec2(uTexel.x, 0.0)).r +
      texture(uPrevious, tracedUv - vec2(uTexel.x, 0.0)).r +
      texture(uPrevious, tracedUv + vec2(0.0, uTexel.y)).r +
      texture(uPrevious, tracedUv - vec2(0.0, uTexel.y)).r;
    float density = mix(center.r, blurred * 0.25, 0.085) * 0.992;
    velocity *= 0.984;
    velocity += curl * 28.0;

    float distanceToPointer = distance(vUv, uPointer);
    float splat = exp(-distanceToPointer * distanceToPointer * 460.0) * uInject;
    density = min(1.0, density + splat * 0.48);
    velocity += uVelocity * splat * 0.82;

    float grain = (hash(vUv * 480.0 + uTime * 0.01) - 0.5) * 0.004;
    outColor = vec4(max(density + grain * density, 0.0), velocity * 0.5 + 0.5, 1.0);
  }
`;

const displayShader = `#version 300 es
  precision highp float;

  uniform sampler2D uFluid;
  uniform vec2 uTexel;
  in vec2 vUv;
  out vec4 outColor;

  void main() {
    float density = texture(uFluid, vUv).r;
    float softDensity =
      density * 0.48 +
      texture(uFluid, vUv + vec2(uTexel.x * 3.0, 0.0)).r * 0.13 +
      texture(uFluid, vUv - vec2(uTexel.x * 3.0, 0.0)).r * 0.13 +
      texture(uFluid, vUv + vec2(0.0, uTexel.y * 3.0)).r * 0.13 +
      texture(uFluid, vUv - vec2(0.0, uTexel.y * 3.0)).r * 0.13;
    float alpha = smoothstep(0.014, 0.44, softDensity) * 0.86;
    vec3 smoke = mix(vec3(0.48), vec3(0.82), smoothstep(0.08, 0.7, softDensity));
    outColor = vec4(smoke, alpha);
  }
`;

const compileShader = (
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
) => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create fluid shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "Fluid shader compilation failed.");
  }
  return shader;
};

const createProgram = (
  gl: WebGL2RenderingContext,
  fragmentSource: string,
) => {
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create fluid program.");
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexShader));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "Fluid program link failed.");
  }
  return program;
};

const createTarget = (
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
) => {
  const texture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();
  if (!texture || !framebuffer) throw new Error("Unable to create fluid target.");

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA8,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null,
  );
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0,
  );
  return { texture, framebuffer };
};

export const setupFluidCursor = (
  stage: HTMLElement,
  backCanvas: HTMLCanvasElement,
  frontCanvas: HTMLCanvasElement,
  isVisible: () => boolean,
) => {
  const gl = backCanvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
  });
  const frontContext = frontCanvas.getContext("2d");
  if (!gl || !frontContext) return () => undefined;

  const simulationProgram = createProgram(gl, simulationShader);
  const displayProgram = createProgram(gl, displayShader);
  const buffer = gl.createBuffer();
  if (!buffer) return () => undefined;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );

  const pointer: FluidPointer = {
    x: 0.74,
    y: 0.5,
    previousX: 0.74,
    previousY: 0.5,
    active: false,
  };
  const isMobile = window.matchMedia("(max-width: 640px), (pointer: coarse)").matches;
  let simulationWidth = 1;
  let simulationHeight = 1;
  let targets: ReturnType<typeof createTarget>[] = [];
  let frame = 0;
  let ambientPhase = 0;
  let lastPointerMove = 0;
  let lastRenderTime = 0;

  const bindPosition = (program: WebGLProgram) => {
    const location = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
  };

  const resize = () => {
    const width = Math.max(stage.clientWidth, 1);
    const height = Math.max(stage.clientHeight, 1);
    const dpr = Math.min(window.devicePixelRatio, isMobile ? 1 : 1.35);
    backCanvas.width = Math.round(width * dpr);
    backCanvas.height = Math.round(height * dpr);
    frontCanvas.width = Math.round(width * dpr);
    frontCanvas.height = Math.round(height * dpr);
    frontCanvas.style.width = `${width}px`;
    frontCanvas.style.height = `${height}px`;

    const simulationScale = isMobile ? 0.3 : 0.46;
    simulationWidth = Math.max(isMobile ? 128 : 180, Math.round(width * simulationScale));
    simulationHeight = Math.max(isMobile ? 160 : 180, Math.round(height * simulationScale));
    targets.forEach(({ texture, framebuffer }) => {
      gl.deleteTexture(texture);
      gl.deleteFramebuffer(framebuffer);
    });
    targets = [
      createTarget(gl, simulationWidth, simulationHeight),
      createTarget(gl, simulationWidth, simulationHeight),
    ];
    gl.viewport(0, 0, simulationWidth, simulationHeight);
    gl.clearColor(0, 0.5, 0.5, 1);
    targets.forEach(({ framebuffer }) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.clear(gl.COLOR_BUFFER_BIT);
    });
  };

  const onPointerMove = (event: PointerEvent) => {
    const bounds = stage.getBoundingClientRect();
    pointer.previousX = pointer.x;
    pointer.previousY = pointer.y;
    pointer.x = (event.clientX - bounds.left) / Math.max(bounds.width, 1);
    pointer.y = 1 - (event.clientY - bounds.top) / Math.max(bounds.height, 1);
    pointer.active = true;
    lastPointerMove = performance.now();
  };

  const simulate = (time: number) => {
    const read = targets[frame % 2];
    const write = targets[(frame + 1) % 2];
    const velocityX = Math.max(-0.08, Math.min(0.08, pointer.x - pointer.previousX));
    const velocityY = Math.max(-0.08, Math.min(0.08, pointer.y - pointer.previousY));
    const pointerIsMoving = pointer.active && performance.now() - lastPointerMove < 90;
    const ambientInterval = isMobile ? 72 : 48;
    const ambient = !pointerIsMoving && frame % ambientInterval === 0;
    if (ambient) {
      ambientPhase += 0.013;
      pointer.previousX = pointer.x;
      pointer.previousY = pointer.y;
      pointer.x = 0.73 + Math.sin(ambientPhase * 1.7) * 0.09;
      pointer.y = 0.51 + Math.cos(ambientPhase) * 0.12;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, write.framebuffer);
    gl.viewport(0, 0, simulationWidth, simulationHeight);
    gl.useProgram(simulationProgram);
    bindPosition(simulationProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, read.texture);
    gl.uniform1i(gl.getUniformLocation(simulationProgram, "uPrevious"), 0);
    gl.uniform2f(
      gl.getUniformLocation(simulationProgram, "uTexel"),
      1 / simulationWidth,
      1 / simulationHeight,
    );
    gl.uniform2f(
      gl.getUniformLocation(simulationProgram, "uPointer"),
      pointer.x,
      pointer.y,
    );
    gl.uniform2f(
      gl.getUniformLocation(simulationProgram, "uVelocity"),
      velocityX * 18,
      velocityY * 18,
    );
    gl.uniform1f(
      gl.getUniformLocation(simulationProgram, "uInject"),
      pointerIsMoving ? (isMobile ? 0.62 : 0.82) : ambient ? (isMobile ? 0.42 : 0.58) : 0,
    );
    gl.uniform1f(gl.getUniformLocation(simulationProgram, "uTime"), time * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    pointer.previousX += (pointer.x - pointer.previousX) * 0.42;
    pointer.previousY += (pointer.y - pointer.previousY) * 0.42;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, backCanvas.width, backCanvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(displayProgram);
    bindPosition(displayProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, write.texture);
    gl.uniform1i(gl.getUniformLocation(displayProgram, "uFluid"), 0);
    gl.uniform2f(
      gl.getUniformLocation(displayProgram, "uTexel"),
      1 / simulationWidth,
      1 / simulationHeight,
    );
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.BLEND);

    frontContext.clearRect(0, 0, frontCanvas.width, frontCanvas.height);
    frontContext.save();
    frontContext.globalAlpha = isMobile ? 0.26 : 0.38;
    frontContext.globalCompositeOperation = "source-over";
    frontContext.filter = "blur(2px) contrast(1.08)";
    frontContext.drawImage(backCanvas, 0, 0, frontCanvas.width, frontCanvas.height);
    frontContext.restore();
    frame += 1;
  };

  const render = (time: number) => {
    const frameInterval = isMobile ? 1000 / 30 : 0;
    if (
      isVisible() &&
      targets.length === 2 &&
      (!isMobile || time - lastRenderTime >= frameInterval)
    ) {
      lastRenderTime = time;
      simulate(time);
    }
    requestAnimationFrame(render);
  };

  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerleave", () => {
    pointer.active = false;
  });
  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(render);

  return () => {
    stage.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("resize", resize);
  };
};
