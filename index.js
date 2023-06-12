async function main() {
  const gl = document.querySelector('canvas').getContext('webgl');
  
  const m4 = twgl.m4;
  const v3 = twgl.v3;
  const vs = `
  attribute vec4 position;
  attribute vec2 texcoord;

  uniform sampler2D displacementMap;
  uniform mat4 projection;
  uniform mat4 view;
  uniform mat4 model;

  varying vec2 v_texcoord;

  void main() {
    float displacementScale = .1;
    float displacement = texture2D(displacementMap, texcoord).a * displacementScale;
    vec4 displacedPosition = position + vec4(0, displacement, 0, 0);
    gl_Position = projection * view * model * displacedPosition;
    v_texcoord = texcoord;
  }  
  `;

  const fs = `
  precision highp float;

  varying vec2 v_texcoord;

  uniform sampler2D displacementMap;

  float positive_dot(vec3 left, vec3 right) {
    return max(dot(left, right), 0.0);
}
float lambert(vec3 normal, vec3 lightPosition, float power) {
  return max(dot(normal, normalize(lightPosition)), 0.0) * power;
}

float selShaded(vec3 normal, vec3 lightPosition, float power) {
  float coef = lambert(normal, lightPosition, power);
  if (coef >= 0.95) {
      coef = 1.0;
  } else if (coef >= 0.5) {
      coef = 0.7;
  } else if (coef >= 0.2) {
      coef = 0.4;
  } else {
      coef = 0.1;
  }

  return coef;
}
float phong(vec3 normal, vec3 lightDir, vec3 viewPosition, float power, float shininess) {
  float diffuseLightDot = positive_dot(normal, lightDir);
  vec3 reflectionVector = normalize(reflect(-lightDir, normal));
  float specularLightDot = positive_dot(reflectionVector, -normalize(viewPosition));
  float specularLightParam = pow(specularLightDot, shininess);
  return (diffuseLightDot + specularLightParam) * power;
}
// vec3 lightPosition = vec3(0, 0, 4.5);
// vec3 viewPosition = vec3(0, 0, -5);
// float light = dot(lightPosition, normal);
// vec3 color = vec3(1.0, 0.545, 0.0);

// gl_FragColor = vec4(color * phong(normal,lightPosition,viewPosition,0.4,1.0), 1);

  void main() {    
    vec3 data = texture2D(displacementMap, v_texcoord).rgb;
    vec3 normal = data ;
  
     vec3 lightPosition = vec3(0, 0, 4.5);
     vec3 viewPosition = vec3(0, 0, -5);
    float light = dot(lightPosition, normal);
    vec3 color = vec3(1.0, 0.545, 0.0);
    
    gl_FragColor = vec4(color * phong(normal,lightPosition,viewPosition,0.35,1.0), 1);
    
  }

  `;


  let leftKeyPressed = false;
  let rightKeyPressed = false;
  function handleKeyDown(event) {
    if (event.key === "ArrowLeft") {
      leftKeyPressed = true;
    } else if (event.key === "ArrowRight") {
      rightKeyPressed = true;
    }
  }
  
  function handleKeyUp(event) {
    if (event.key === "ArrowLeft") {
      leftKeyPressed = false;
    } else if (event.key === "ArrowRight") {
      rightKeyPressed = false;
    }
  }
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);

  const programInfo = twgl.createProgramInfo(gl, [vs, fs]);

  const bufferInfo = twgl.primitives.createSphereBufferInfo(
      gl,
      5,   
      50,  
      50, 
  );

  const img = new Image();
  //img.src = '/noisy_image2.jpg';
  img.src = '/Orange-bumpmap.png';
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.canvas.width = img.width;
  ctx.canvas.height = img.height;
  img.addEventListener('load', function() {
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, img.width, img.height);
    

    const displacementScale = -2;
    const data = new Uint8Array(imgData.data.length);
    for (let z = 0; z < imgData.height; ++z) {
      for (let x = 0; x < imgData.width; ++x) {
        const off = (z * img.width + x) * 4;
        const h0 = imgData.data[off];
        const h1 = imgData.data[off + 4] || 0;  
        const h2 = imgData.data[off + imgData.width * 4] || 0; 
        const p0 = [x, h0 * displacementScale / 255, z];
        const p1 = [x+1, h1 * displacementScale / 255, z];
        const p2 = [x, h2 * displacementScale / 255, z+1];
        const v0 = v3.normalize(v3.subtract(p1, p0));
        const v1 = v3.normalize(v3.subtract(p2, p0));
        const normal = v3.normalize(v3.cross(v0, v1));
        data[off] = (normal[0] * 0.5 + 0.5) * 255;
        data[off+1] = (normal[1] * 0.5 + 0.5) * 255;
        data[off+2] = (normal[2] * 0.5 + 0.5) * 255;
        data[off+3] = h0;
      }
    }  
  
    const tex = twgl.createTexture(gl, {
      src: data,
    });
  
    function render(time) {

      twgl.resizeCanvasToDisplaySize(gl.canvas);
  
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
  
      const fov = 60 * Math.PI / 180;
      const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
      const near = 0.1;
      const far = 200;
      const projection = m4.perspective(fov, aspect, near, far);
      if (leftKeyPressed) {
        dx+=0.1;
      } else if (rightKeyPressed) {
        dx-=0.1;
      }
      let eye = [Math.cos(dx) * 30, 10, Math.sin(dx) * 30];

      const target = [0, 0, 0];
      const up = [0, 1, 0];
      const camera = m4.lookAt(eye, target, up);
      const view = m4.inverse(camera);
      const model = m4.identity();
  
      gl.useProgram(programInfo.program);
  
    
      twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
  
      twgl.setUniformsAndBindTextures(programInfo, {
        projection,
        view,
        model,
        displacementMap: tex,
      });
  
      twgl.drawBufferInfo(gl, bufferInfo);
  
      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
});
 
}
let dx=1;
main();


