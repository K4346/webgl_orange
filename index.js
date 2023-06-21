class Parser {
    constructor(url) {
      this.url = url;
      this.normArray = [];
      this.texArray = [];
      this.posArray = [];
      this.pos_indArray = [];
      this.tex_indArray = [];
      this.norm_indArray = [];
      if(url==""){
        this.parseFloorModel();
      } else{
        this.parseModel();
      }
    
    }

    parseFloorModel(){
        this.normArray = [0, 1, 0,
             0, 1, 0,
              0, 1, 0,
               0, 1, 0];
      this.texArray = [
        0.0, 1.0,
        0.0, 0.0,
        1.0, 0.0,
        1.0, 1.0,
    ];
      this.posArray =[
        -1.0,  1.0, -1.0,
        -1.0,  1.0,  1.0,
        1.0,  1.0,  1.0,
        1.0,  1.0, -1.0,
    ];      
    this.pos_indArray = [0,1,2, 0,2,3];
    this.tex_indArray = [0,1,2, 0,2,3];
    this.norm_indArray = [0,1,2, 0,2,3];            
    }

    parseVertexNormals(splitLine) {
        this.normArray.push(
          parseFloat(splitLine[1]),
          parseFloat(splitLine[2]),
          parseFloat(splitLine[3])
        );
      }

      parseTextureCoordinates(splitLine) {
        this.texArray.push(
          parseFloat(splitLine[1]),
          parseFloat(splitLine[2])
        );
      }
    
      parsePositions(splitLine) {
        this.posArray.push(
          parseFloat(splitLine[1]),
          parseFloat(splitLine[2]),
          parseFloat(splitLine[3])
        );
      }

      parseFaces(splitLine) {
        this.pos_indArray.push(
            parseFloat(splitLine[1].split("/")[0]) - 1, parseFloat(splitLine[2].split("/")[0]) - 1, parseFloat(splitLine[3].split("/")[0]) - 1
           );
          this.tex_indArray.push(
            parseFloat(splitLine[1].split("/")[1]) - 1, parseFloat(splitLine[2].split("/")[1]) - 1, parseFloat(splitLine[3].split("/")[1]) - 1
           );
          this.norm_indArray.push(
            parseFloat(splitLine[1].split("/")[2]) - 1, parseFloat(splitLine[2].split("/")[2]) - 1, parseFloat(splitLine[3].split("/")[2]) - 1
          );
      }
    

    parseModel() {
        fetch(this.url)
          .then(response => response.text())
          .then(data => {
            const lines = data.split('\n').join('\r').split('\r');
            let splitLine = [];
            lines.forEach((line) => {
              splitLine = line.split(' ');
              switch (splitLine[0]) {
                case 'vn':
                    this.parseVertexNormals(splitLine);
                  break;
                case 'vt':
                    this.parseTextureCoordinates(splitLine);
                  break;
                case 'v':
                    this.parsePositions(splitLine);
                  break;
                case 'f':
                this.parseFaces(splitLine);
                  break;
                default:
                  break;
              }
            });
          })
      }
  }

class Model {
    constructor(type, gl, scale, center, parser) {
            this.type=type;
            this.gl = gl;
            this.pos = parser.posArray.map((point) => point * scale);
            this.tex=parser.texArray;
            this.norm=parser.normArray;
            this.pos_ind = parser.pos_indArray;
            this.tex_ind = parser.tex_indArray;
            this.norm_ind = parser.norm_indArray;
            this.center = center;
            this.full = [];
    
            for(let i=0; i < this.pos_ind.length; i++)
            {
                this.full.push(this.pos[this.pos_ind[i]*3]);
                this.full.push(this.pos[this.pos_ind[i]*3+1]);
                this.full.push(this.pos[this.pos_ind[i]*3+2]);
            }
        
            for(let i=0; i < this.tex_ind.length; i++)
            {
                this.full.push(this.tex[this.tex_ind[i]*2]);
                this.full.push(this.tex[this.tex_ind[i]*2+1]);
            }
            for(let i=0; i < this.norm_ind.length; i++)
            {
                this.full.push(this.norm[this.norm_ind[i]*3]);
                this.full.push(this.norm[this.norm_ind[i]*3+1]);
                this.full.push(this.norm[this.norm_ind[i]*3+2]);
            }
            this.fullBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.fullBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.full), gl.STATIC_DRAW);
            
            this.full_vertex_count = this.pos_ind.length;
            this.full_texture_count = this.tex_ind.length;
    }
  
    getBuffers() {
        return {
            full: this.fullBuffer,
            full_vertex_count: this.full_vertex_count,
        };
    }

    setVertexes(programInfo) {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.fullBuffer);
        
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        
        gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
        gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, this.full_vertex_count*3 * Float32Array.BYTES_PER_ELEMENT);
        
        gl.enableVertexAttribArray(programInfo.attribLocations.normal);
        gl.vertexAttribPointer(programInfo.attribLocations.normal, 3, gl.FLOAT, false, 0, (this.full_vertex_count*3+this.full_texture_count*2) * Float32Array.BYTES_PER_ELEMENT);
    }

    toPosition(Matrix) {
        this.translate(Matrix, this.center);
    }

    translate(Matrix, translation) {
        return mat4.translate(Matrix, Matrix, translation);
    }

    rotate(Matrix, rad, axis) {
        return mat4.rotate(Matrix, Matrix, rad, axis);
    }

}


var cubeVertexShader = `
attribute vec4 aVertexPosition;
attribute vec2 aTextureCoord;
attribute vec3 aNormal;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
varying highp vec2 vTextureCoord;
uniform vec3 uLightDirection;
varying highp vec3 vNormal;
varying vec4 vPosition;
void main(void) {
    
    vec3 normal = normalize(mat3(uModelViewMatrix) * aNormal);
    vec3 position = vec3(uModelViewMatrix * aVertexPosition);
    vec3 lightDirection = normalize(uLightDirection - position);

    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    vPosition = aVertexPosition;
    vNormal = normal;
    vTextureCoord = aTextureCoord;
}`

var cubeFragmentShader = `
precision highp float;
uniform sampler2D uSampler;
varying highp vec2 vTextureCoord;
varying highp vec3 vNormal;
varying vec4 vPosition;

uniform mat4 uModelViewMatrix;
uniform vec3 uLightDirection;


float lambert(vec3 normal, vec3 lightPosition, float power) {
    return max(dot(normal, normalize(lightPosition)), 0.0) * power;
}
float positive_dot(vec3 left, vec3 right) {
    return max(dot(left, right), 0.0);
}

float specualarLight(vec3 normal, vec3 lightDir, vec3 viewPosition, float power, float shininess) {
    vec3 reflectionVector = normalize(reflect(-lightDir, normal));
    float specularLightDot = positive_dot(reflectionVector, -normalize(viewPosition));
    float specularLightParam = pow(specularLightDot, shininess);
    return (specularLightParam) * power;
}    

void main(void) {
    float step = 1.0/256.0;

    vec3 xGradient = texture2D(uSampler, vec2(vTextureCoord.x - step, vTextureCoord.y)).xyz - texture2D(uSampler, vec2(vTextureCoord.x + step, vTextureCoord.y)).xyz;
    vec3 yGradient = texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y - step)).xyz - texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + step)).xyz;
    
    vec3 normal = vNormal + vTextureCoord.x * xGradient + vTextureCoord.y * yGradient;
    normal =  normalize(normal);

    vec3 positionEye3 = vec3(uModelViewMatrix * vPosition);
    vec3 lightDirection = normalize(uLightDirection - positionEye3);

    vec3 ambientColor =  vec3(0.5, 0.3, 0.0);
    vec3 diffusColor=vec3(1, 0.60, 0.0);
    float diffus = lambert(normal, lightDirection,1.0);
    float specular = specualarLight(normal, lightDirection,positionEye3,1.0,32.0);

    vec3 color = ambientColor * 0.8 + diffusColor * diffus+vec3(1.0, 1.0, 1.0)*specular;
    gl_FragColor = vec4(color,1.0);

}`

let speed = 0;
let currentRotate=0.1;
window.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft')
    speed = -0.5;
    else if (event.key === 'ArrowRight') 
    speed = 0.5;          
});
window.addEventListener('keyup', event => {
    if (event.key === 'ArrowLeft')   
    speed = 0;
    else if (event.key === 'ArrowRight') 
    speed = 0;  
});


class Scene {
    constructor(webgl_context, vertex_shader, fragment_shader) {
        this.gl = webgl_context;
        const shaderProgram = this.initShadersProgram(vertex_shader, fragment_shader);
        this.programInfo = {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
                textureCoord: this.gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
                normal: this.gl.getAttribLocation(shaderProgram, 'aNormal'),
            },
            uniformLocations: {
                projectionMatrix: this.gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                modelViewMatrix: this.gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
                sampler: this.gl.getUniformLocation(shaderProgram, 'uSampler'),
                lightDirection: this.gl.getUniformLocation(shaderProgram, 'uLightDirection'),

            }
        }
        this.objects = [];
        this.fieldOfView = 45 * Math.PI / 180;
        this.aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
        this.zNear = 0.1;
        this.zFar = 100.0;


        const textureOrange = loadTexture(this.gl, imageOrange.src);

        
        const render = () => {
            this.drawScene([textureOrange]);
            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);
    }

    drawScene(textures) {
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clearDepth(1.0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, this.fieldOfView, this.aspect, this.zNear, this.zFar);
        const sqCentr  =[0, -7, -15];
        var i = 0;
        this.gl.clearColor(1.0, 1.0, 1.0, 1.0);

        this.objects = [
                new Model("Sphere", this.gl, 2, [0, 0, -10], sphereParser)
            ];
            this.objects.forEach(obj => {
                var modelViewMatrix = mat4.create();

                obj.toPosition(modelViewMatrix);
                if (speed>0){
                    currentRotate+=0.1;
                }
                if (speed<0){
                    currentRotate-=0.1;
                }
                obj.rotate(modelViewMatrix, currentRotate, [0, 1, 0]);
                obj.setVertexes(this.programInfo);
    
                this.gl.activeTexture(this.gl.TEXTURE0);
                this.gl.bindTexture(this.gl.TEXTURE_2D, textures[i]);
    
                const buffers = obj.getBuffers();
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffers.full);
                this.gl.useProgram(this.programInfo.program);

                this.gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
                this.gl.uniformMatrix4fv(this.programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
                this.gl.drawArrays(this.gl.TRIANGLES, 0, buffers.full_vertex_count);
                this.gl.uniform1i(this.programInfo.uniformLocations.sampler, 0);              
                
                this.gl.uniform3fv(this.programInfo.uniformLocations.lightDirection, lightDirection);

                

                i++;
            });
    }  

    initShadersProgram(vertexShaderCode, fragmentShaderCode) {
        const vertexShader = this.loadShader(this.gl, this.gl.VERTEX_SHADER, vertexShaderCode);
        const fragmentShader = this.loadShader(this.gl, this.gl.FRAGMENT_SHADER, fragmentShaderCode);
        const shaderProgram = this.gl.createProgram();
        this.gl.attachShader(shaderProgram, vertexShader);
        this.gl.attachShader(shaderProgram, fragmentShader);
        this.gl.linkProgram(shaderProgram);
        if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
            alert('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        return shaderProgram;
    }

    loadShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }
}

lightDirection = [-7.0, 4.0, 0.0];

function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
}

function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);
    const image = new Image();
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
//TODO возмжоно стоит убрать след строчку
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);

        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            // Размер соответствует степени 2
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            // устанавливаем натяжение по краям
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        }
    };
    image.crossOrigin = "anonymous"
    image.src = url;
    return texture;
}


const imageOrange = document.getElementById("texOrange");



let sphereParser = new Parser("./models/sphere.obj");


const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
new Scene(gl, cubeVertexShader, cubeFragmentShader);