import "./css/regular.min.css";
import "./css/solid.min.css";
import "./css/brands.min.css";
import "./css/font-awesome-custom.css";

import * as THREE from "three";

const scene = new THREE.Scene();

let color = window.localStorage.getItem("color") ?? 0xff6961;

color = Number(color);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("background"),
  alpha: true,
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.color = "white";
renderer.domElement.style.backgroundColor = "transparent";

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

camera.position.setZ(30);

renderer.render(scene, camera);

const geometry = new THREE.IcosahedronGeometry(10, 0);

const fragmentShader = `
  #include <common>

  uniform vec3 iResolution;
  uniform float iTime;
  uniform vec2 iMouse;

  // Protean clouds by nimitz (twitter: @stormoid)
  // https://www.shadertoy.com/view/3l23Rh
  // License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License
  // Contact the author for other licensing options
  
  /*
    Technical details:
  
    The main volume noise is generated from a deformed periodic grid, which can produce
    a large range of noise-like patterns at very cheap evalutation cost. Allowing for multiple
    fetches of volume gradient computation for improved lighting.
  
    To further accelerate marching, since the volume is smooth, more than half the the density
    information isn't used to rendering or shading but only as an underlying volume	distance to 
    determine dynamic step size, by carefully selecting an equation	(polynomial for speed) to 
    step as a function of overall density (not necessarialy rendered) the visual results can be 
    the	same as a naive implementation with ~40% increase in rendering performance.
  
    Since the dynamic marching step size is even less uniform due to steps not being rendered at all
    the fog is evaluated as the difference of the fog integral at each rendered step.
  
  */
  
  mat2 rot(in float a){float c = cos(a), s = sin(a);return mat2(c,s,-s,c);}
  const mat3 m3 = mat3(0.33338, 0.56034, -0.71817, -0.87887, 0.32651, -0.15323, 0.15162, 0.69596, 0.61339)*1.93;
  float mag2(vec2 p){return dot(p,p);}
  float linstep(in float mn, in float mx, in float x){ return clamp((x - mn)/(mx - mn), 0., 1.); }
  float prm1 = 0.;
  vec2 bsMo = vec2(0);
  
  vec2 disp(float t){ return vec2(sin(t*0.22)*1., cos(t*0.175)*1.)*2.; }
  
  vec2 map(vec3 p)
  {
      vec3 p2 = p;
      p2.xy -= disp(p.z).xy;
      p.xy *= rot(sin(p.z+iTime)*(0.1 + prm1*0.05) + iTime*0.09);
      float cl = mag2(p2.xy);
      float d = 0.;
      p *= .61;
      float z = 1.;
      float trk = 1.;
      float dspAmp = 0.1 + prm1*0.2;
      for(int i = 0; i < 5; i++)
      {
      p += sin(p.zxy*0.75*trk + iTime*trk*.8)*dspAmp;
          d -= abs(dot(cos(p), sin(p.yzx))*z);
          z *= 0.57;
          trk *= 1.4;
          p = p*m3;
      }
      d = abs(d + prm1*3.)+ prm1*.3 - 2.5 + bsMo.y;
      return vec2(d + cl*.2 + 0.25, cl);
  }
  
  vec4 render( in vec3 ro, in vec3 rd, float time )
  {
    vec4 rez = vec4(0);
      const float ldst = 8.;
    vec3 lpos = vec3(disp(time + ldst)*0.5, time + ldst);
    float t = 1.5;
    float fogT = 0.;
    for(int i=0; i<130; i++)
    {
      if(rez.a > 0.99)break;
  
      vec3 pos = ro + t*rd;
          vec2 mpv = map(pos);
      float den = clamp(mpv.x-0.3,0.,1.)*1.12;
      float dn = clamp((mpv.x + 2.),0.,3.);
          
      vec4 col = vec4(0);
          if (mpv.x > 0.6)
          {
          
              col = vec4(sin(vec3(5.,0.4,0.2) + mpv.y*0.1 +sin(pos.z*0.4)*0.5 + 1.8)*0.5 + 0.5,0.08);
              col *= den*den*den;
        col.rgb *= linstep(4.,-2.5, mpv.x)*2.3;
              float dif =  clamp((den - map(pos+.8).x)/9., 0.001, 1. );
              dif += clamp((den - map(pos+.35).x)/2.5, 0.001, 1. );
              col.xyz *= den*(vec3(0.005,.045,.075) + 1.5*vec3(0.033,0.07,0.03)*dif);
          }
      
      float fogC = exp(t*0.2 - 2.2);
      col.rgba += vec4(0.06,0.11,0.11, 0.1)*clamp(fogC-fogT, 0., 1.);
      fogT = fogC;
      rez = rez + col*(1. - rez.a);
      t += clamp(0.5 - dn*dn*.05, 0.09, 0.3);
    }
    return clamp(rez, 0.0, 1.0);
  }
  
  float getsat(vec3 c)
  {
      float mi = min(min(c.x, c.y), c.z);
      float ma = max(max(c.x, c.y), c.z);
      return (ma - mi)/(ma+ 1e-7);
  }
  
  //from my "Will it blend" shader (https://www.shadertoy.com/view/lsdGzN)
  vec3 iLerp(in vec3 a, in vec3 b, in float x)
  {
      vec3 ic = mix(a, b, x) + vec3(1e-6,0.,0.);
      float sd = abs(getsat(ic) - mix(getsat(a), getsat(b), x));
      vec3 dir = normalize(vec3(2.*ic.x - ic.y - ic.z, 2.*ic.y - ic.x - ic.z, 2.*ic.z - ic.y - ic.x));
      float lgt = dot(vec3(1.0), ic);
      float ff = dot(dir, normalize(ic));
      ic += 1.5*dir*sd*ff*lgt;
      return clamp(ic,0.,1.);
  }
  
  void mainImage( out vec4 fragColor, in vec2 fragCoord )
  {	
    vec2 q = fragCoord.xy/iResolution.xy;
      vec2 p = (gl_FragCoord.xy - 0.5*iResolution.xy)/iResolution.y;
      bsMo = (iMouse.xy - 0.5*iResolution.xy)/iResolution.y;
      
      float time = iTime*3.;
      vec3 ro = vec3(0,0,time);
      
      ro += vec3(sin(iTime)*0.5,sin(iTime*1.)*0.,0);
          
      float dspAmp = .85;
      ro.xy += disp(ro.z)*dspAmp;
      float tgtDst = 3.5;
      
      vec3 target = normalize(ro - vec3(disp(time + tgtDst)*dspAmp, time + tgtDst));
      ro.x -= bsMo.x*2.;
      vec3 rightdir = normalize(cross(target, vec3(0,1,0)));
      vec3 updir = normalize(cross(rightdir, target));
      rightdir = normalize(cross(updir, target));
    vec3 rd=normalize((p.x*rightdir + p.y*updir)*1. - target);
      rd.xy *= rot(-disp(time + 3.5).x*0.2 + bsMo.x);
      prm1 = smoothstep(-0.4, 0.4,sin(iTime*0.3));
    vec4 scn = render(ro, rd, time);
      
      vec3 col = scn.rgb;
      col = iLerp(col.bgr, col.rgb, clamp(1.-prm1,0.05,1.));
      
      col = pow(col, vec3(.55,0.65,0.6))*vec3(1.,.97,.9);
  
      col *= pow( 16.0*q.x*q.y*(1.0-q.x)*(1.0-q.y), 0.12)*0.7+0.3; //Vign
      
    fragColor = vec4( col, 1.0 );
  }
  void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
  }
  `;
const uniforms = {
  iTime: { value: 0 },
  iResolution: { value: new THREE.Vector3() },
  iMouse: { value: new THREE.Vector2() },
};
const shaderMaterial = new THREE.ShaderMaterial({
  fragmentShader,
  uniforms,
  opacity: 0,
  wireframe: true,
  wireframeLinewidth: 5,
});
const shaderPolyHedron = new THREE.Mesh(geometry, shaderMaterial);
const polyHedron = new THREE.Mesh(
  new THREE.IcosahedronGeometry(10, 0),
  new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.5,
  })
);

const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(-33, 20, 50);

scene.add(shaderPolyHedron, polyHedron, pointLight);

document.body.appendChild(renderer.domElement);

let isDragging = false;
let previousMousePosition = {
  x: 0,
  y: 0,
};

function toRadians(angle) {
  return angle * (Math.PI / 180);
}

renderer.domElement.addEventListener("mousedown", () => {
  isDragging = true;
});

renderer.domElement.addEventListener("mouseup", () => {
  isDragging = false;
});

let deltaMove;
let deltaRotationQuaternion;

renderer.domElement.addEventListener("mousemove", (e) => {
  deltaMove = {
    x: e.offsetX - previousMousePosition.x,
    y: e.offsetY - previousMousePosition.y,
  };

  if (isDragging) {
    deltaRotationQuaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        toRadians(deltaMove.y * 0.1),
        toRadians(deltaMove.x * 0.1),
        0,
        "XYZ"
      )
    );
    uniforms.iMouse.value.set(deltaMove.x, deltaMove.y);
  }

  previousMousePosition = {
    x: e.offsetX,
    y: e.offsetY,
  };
});

function animate(time) {
  time *= 0.001;
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  if (deltaRotationQuaternion) {
    polyHedron.quaternion.multiplyQuaternions(
      deltaRotationQuaternion,
      polyHedron.quaternion
    );
  } else {
    polyHedron.rotation.x += 0.001;
    polyHedron.rotation.y += 0.001;
    polyHedron.rotation.z += 0.001;
  }
  shaderPolyHedron.rotation.x = polyHedron.rotation.x * -1;
  shaderPolyHedron.rotation.y = polyHedron.rotation.y * -1;
  shaderPolyHedron.rotation.z = polyHedron.rotation.z * -1;
  uniforms.iResolution.value.set(window.innerWidth, window.innerHeight, 1);
  uniforms.iTime.value = time;
}

animate();

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", onWindowResize);

const colors = {
  red: 0xff6961,
  green: 0xc1e1c1,
  blue: 0xa7c7e7,
};

function getColor(element) {
  for (const [color, hex] of Object.entries(colors)) {
    if (element.classList.contains(color)) {
      return { color, hex };
    }
  }
  return { color: "white", hex: 0xffffff };
}

function changeColor(element, colorAndHex) {
  const color = colorAndHex.hex;
  element.classList.remove("far");
  element.classList.add("fas");
  const selector = Object.keys(colors)
    .filter((key) => colors[key] !== color)
    .map((color) => "." + color + ":not(.fab):not(.underline)") // Otherwise we will add the .far (regular) class to the .fab (business) and .underline ones
    .join(",");
  document.querySelectorAll(selector).forEach((e) => {
    e.classList.remove("fas");
    e.classList.add("far");
  });
  window.localStorage.setItem("color", color);
  polyHedron.material.color = new THREE.Color(color);

  // Social / Branding Icons

  document.querySelectorAll("i.fab").forEach((icon) => {
    icon.classList.remove("red", "green", "blue");
    icon.classList.add(colorAndHex.color);
  });

  document.querySelectorAll(".underline").forEach((element) => {
    element.classList.remove("red", "green", "blue");
    element.classList.add(colorAndHex.color);
  });
}

const buttons = document.querySelectorAll("i.red, i.green, i.blue");
for (const button of buttons) {
  button.addEventListener("click", (e) => {
    color = getColor(e.target);
    changeColor(e.target, color);
  });
}

const colorName = Object.keys(colors).filter((key) => colors[key] === color);

changeColor(document.querySelector("." + colorName), {
  color: colorName,
  hex: color,
});
