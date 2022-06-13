import "./css/regular.min.css";
import "./css/solid.min.css";
import "./css/brands.min.css";
import "./css/font-awesome-custom.css";
import MicroModal from "micromodal";

MicroModal.init({
  onShow: (modal) => console.info(`${modal.id} is shown`), // [1]
  onClose: (modal) => console.info(`${modal.id} is hidden`), // [2]
  disableScroll: true, // [6]
  disableFocus: false, // [7]
  awaitOpenAnimation: false, // [8]
  awaitCloseAnimation: false, // [9]
  debugMode: false, // [10]
});

import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  IcosahedronGeometry,
  MeshStandardMaterial,
  Mesh,
  PointLight,
  Quaternion,
  Euler,
  Color
} from "three";

const scene = new Scene();

let color = window.localStorage.getItem("color") ?? 0xff6961;

color = Number(color);

const camera = new PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new WebGLRenderer({
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

const geometry = new IcosahedronGeometry(10, 0);

const material = new MeshStandardMaterial({
  color: 0xffffff,
  metalness: 0.1,
  roughness: 0.5,
});

const polyHedron = new Mesh(geometry, material);
const reversePolyHedron = new Mesh(geometry, material);

const pointLight = new PointLight(0xffffff, 1);
pointLight.position.set(-33, 20, 50);

scene.add(reversePolyHedron, polyHedron, pointLight);

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
    deltaRotationQuaternion = new Quaternion().setFromEuler(
      new Euler(
        toRadians(deltaMove.y * 0.1),
        toRadians(deltaMove.x * 0.1),
        0,
        "XYZ"
      )
    );
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
  reversePolyHedron.rotation.x = polyHedron.rotation.x * -1;
  reversePolyHedron.rotation.y = polyHedron.rotation.y * -1;
  reversePolyHedron.rotation.z = polyHedron.rotation.z;
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
  const { color, hex } = colorAndHex;
  element.classList.remove("far");
  element.classList.add("fas");
  const selector = Object.keys(colors)
    .filter((key) => colors[key] !== hex)
    .map((hex) => "." + hex + ":not(html)") // Otherwise we will add the .far (regular) class to the .fab (business) and .underline ones
    .join(",");
  document.querySelectorAll(selector).forEach((e) => {
    e.classList.remove("fas");
    e.classList.add("far");
  });
  window.localStorage.setItem("color", hex);
  polyHedron.material.color = new Color(hex);
  reversePolyHedron.material.color = new Color(hex);
  const html = document.querySelector("html");
  html.classList = [];
  html.classList.add(color);
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
