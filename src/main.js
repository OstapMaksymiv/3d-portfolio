import "./style.scss";
import { OrbitControls } from "./utils/OrbitControls.js";
import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import gsap from "gsap";
import { Howl } from "howler";
import smokeVertexShader from "./shaders/smoke/vertex.glsl";
import smokeFragmentShader from "./shaders/smoke/fragment.glsl";

let pianoDebounceTimer = null;
let isMusicFaded = false;
const MUSIC_FADE_TIME = 500;
const PIANO_TIMEOUT = 2000;
const BACKGROUND_MUSIC_VOLUME = 0.4;
const FADED_VOLUME = 0;

const backgroundMusic = new Howl({
  src: ["/audio/music/Cita.mp3"],
  loop: true,
  volume: BACKGROUND_MUSIC_VOLUME,
});

const fadeOutBackgroundMusic = () => {
  if (!isMuted && !isMusicFaded) {
    backgroundMusic.fade(
      backgroundMusic.volume(),
      FADED_VOLUME,
      MUSIC_FADE_TIME,
    );
    isMusicFaded = true;
  }
};

const fadeInBackgroundMusic = () => {
  if (!isMuted && isMusicFaded) {
    backgroundMusic.fade(
      FADED_VOLUME,
      BACKGROUND_MUSIC_VOLUME,
      MUSIC_FADE_TIME,
    );
    isMusicFaded = false;
  }
};

const pianoKeyMap = {
  C1_Key: "Key_24",
  "C#1_Key": "Key_23",
  D1_Key: "Key_22",
  "D#1_Key": "Key_21",
  E1_Key: "Key_20",
  F1_Key: "Key_19",
  "F#1_Key": "Key_18",
  G1_Key: "Key_17",
  "G#1_Key": "Key_16",
  A1_Key: "Key_15",
  "A#1_Key": "Key_14",
  B1_Key: "Key_13",
  C2_Key: "Key_12",
  "C#2_Key": "Key_11",
  D2_Key: "Key_10",
  "D#2_Key": "Key_9",
  E2_Key: "Key_8",
  F2_Key: "Key_7",
  "F#2_Key": "Key_6",
  G2_Key: "Key_5",
  "G#2_Key": "Key_4",
  A2_Key: "Key_3",
  "A#2_Key": "Key_2",
  B2_Key: "Key_1",
};

const pianoSounds = {};
Object.values(pianoKeyMap).forEach((soundKey) => {
  pianoSounds[soundKey] = new Howl({
    src: [`/audio/sfx/piano/${soundKey}.ogg`],
    preload: true,
    volume: 0.5,
  });
});

const buttonSounds = {
  click: new Howl({
    src: ["/audio/sfx/click/bubble.ogg"],
    preload: true,
    volume: 0.5,
  }),
};

const canvas = document.querySelector("#experience-canvas");

const sizes = {
  height: window.innerHeight,
  width: window.innerWidth,
};

const modals = {
  work: document.querySelector(".modal.work"),
  about: document.querySelector(".modal.about"),
  contact: document.querySelector(".modal.contact"),
};
const overlay = document.querySelector(".overlay");
let touchHappened = false;
overlay.addEventListener(
  "touchend",
  (e) => {
    touchHappened = true;
    e.preventDefault();
    const modal = document.querySelector('.modal[style*="display: block"]');
    if (modal) hideModal(modal);
  },
  {
    passive: false,
  },
);
overlay.addEventListener(
  "click",
  (e) => {
    if (touchHappened) return;
    e.preventDefault();
    const modal = document.querySelector('.modal[style*="display: block"]');
    if (modal) hideModal(modal);
  },
  {
    passive: false,
  },
);

document.querySelectorAll(".modal-exit-button").forEach((button) => {
  button.addEventListener(
    "touchend",
    (e) => {
      touchHappened = true;
      const modal = e.target.closest(".modal");
      hideModal(modal);
    },
    {
      passive: false,
    },
  );
  button.addEventListener(
    "click",
    (e) => {
      if (touchHappened) return;
      const modal = e.target.closest(".modal");
      hideModal(modal);
    },
    {
      passive: false,
    },
  );
});
let isModalOpen = false;

const showModal = (modal) => {
  modal.style.display = "block";
  overlay.style.display = "block";

  isModalOpen = true;
  controls.enabled = false;

  if (hoverLeaveTimeout) {
    clearTimeout(hoverLeaveTimeout);
    hoverLeaveTimeout = null;
  }
  if (currentHoveredObject) {
    playHoverAnimation(currentHoveredObject, false);
    currentHoveredObject = null;
  }
  document.body.style.cursor = "default";
  currentIntersects = [];

  gsap.set(modal, { opacity: 0, scale: 0 });
  gsap.set(overlay, {
    opacity: 0,
  });

  gsap.to(overlay, {
    opacity: 1,
    duration: 0.5,
  });
  gsap.to(modal, {
    opacity: 1,
    scale: 1,
    duration: 0.5,
    ease: "back.out(2)",
  });
};
const hideModal = (modal) => {
  isModalOpen = false;
  controls.enabled = true;

  gsap.to(overlay, {
    opacity: 0,
    duration: 0.5,
  });

  gsap.to(modal, {
    opacity: 0,
    scale: 0,
    duration: 0.5,
    ease: "back.in(2)",
    onComplete: () => {
      modal.style.display = "none";
      overlay.style.display = "none";
    },
  });
};

const xAxisFans = [];
const yAxisFans = [];

const raycasterObjects = [];
let currentIntersects = [];

let currentHoveredObject = null;
let hoverLeaveTimeout = null;

const socialLinks = {
  GitHub: "https://github.com/OstapMaksymiv",
  Linkedin: "https://www.linkedin.com/in/ostap-maksymiv-60909a259",
  Telegram: "https://t.me/ostaprejo",
};

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const manager = new THREE.LoadingManager();

const loadingScreen = document.querySelector(".loading-screen");
const loadingScreenButton = document.querySelector(".loading-screen-button");
const noSoundButton = document.querySelector(".no-sound-button");

manager.onLoad = function () {
  loadingScreenButton.style.border = "8px solid #2a0f4e";
  loadingScreenButton.style.background = "#401d49";
  loadingScreenButton.style.color = "#e6dede";
  loadingScreenButton.style.boxShadow = "rgba(0, 0, 0, 0.24) 0px 3px 8px";
  loadingScreenButton.textContent = "Enter!";
  loadingScreenButton.style.cursor = "pointer";
  loadingScreenButton.style.transition =
    "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
  let isDisabled = false;

  noSoundButton.textContent = "Enter without Sound :(";

  function handleEnter(withSound = true) {
    if (isDisabled) return;

    noSoundButton.textContent = "";
    loadingScreenButton.style.cursor = "default";
    loadingScreenButton.style.border = "8px solid #6e5e9c";
    loadingScreenButton.style.background = "#ead7ef";
    loadingScreenButton.style.color = "#6e5e9c";
    loadingScreenButton.style.boxShadow = "none";
    loadingScreenButton.textContent = "~ Helloo ~";
    loadingScreen.style.background = "#ead7ef";
    isDisabled = true;

    if (!withSound) {
      isMuted = true;
      updateMuteState(true);

      soundOnSvg.style.display = "none";
      soundOffSvg.style.display = "block";
    } else {
      backgroundMusic.play();
    }

    playReveal();
  }

  loadingScreenButton.addEventListener("mouseenter", () => {
    loadingScreenButton.style.transform = "scale(1.3)";
  });

  loadingScreenButton.addEventListener("touchend", (e) => {
    touchHappened = true;
    e.preventDefault();
    handleEnter();
  });

  loadingScreenButton.addEventListener("click", (e) => {
    if (touchHappened) return;
    handleEnter(true);
  });

  loadingScreenButton.addEventListener("mouseleave", () => {
    loadingScreenButton.style.transform = "none";
  });

  noSoundButton.addEventListener("click", (e) => {
    if (touchHappened) return;
    handleEnter(false);
  });
};

function playReveal() {
  const tl = gsap.timeline();

  tl.to(loadingScreen, {
    scale: 0.5,
    duration: 1.2,
    delay: 0.25,
    ease: "back.in(1.8)",
  }).to(
    loadingScreen,
    {
      y: "200vh",
      transform: "perspective(1000px) rotateX(45deg) rotateY(-35deg)",
      duration: 1.2,
      ease: "back.in(1.8)",
      onComplete: () => {
        isModalOpen = false;
        playIntroAnimation();
        loadingScreen.remove();
      },
    },
    "-=0.1",
  );
}

function introScaleIn(objects, { overlaps, delay } = {}) {
  const tl = gsap.timeline({
    defaults: { duration: 0.8, ease: "back.out(1.8)" },
  });
  tl.timeScale(0.8);

  objects.forEach((object, index) => {
    const vars = {
      x: object.userData.initialScale.x,
      y: object.userData.initialScale.y,
      z: object.userData.initialScale.z,
    };
    if (index === 0) {
      if (delay) vars.delay = delay;
      tl.to(object.scale, vars);
    } else {
      tl.to(object.scale, vars, overlaps ? overlaps[index - 1] : "-=0.5");
    }
  });

  return tl;
}

function introLetterBounce(letters) {
  const tl = gsap.timeline({ defaults: { ease: "back.out(1.8)" } });
  tl.timeScale(0.8);

  letters.forEach((letter, index) => {
    tl.to(
      letter.position,
      {
        y: letter.userData.initialPosition.y + 0.3,
        duration: 0.4,
        ...(index === 0 ? { delay: 0.25 } : {}),
      },
      index === 0 ? undefined : "-=0.5",
    )
      .to(
        letter.scale,
        {
          x: letter.userData.initialScale.x,
          y: letter.userData.initialScale.y,
          z: letter.userData.initialScale.z,
          duration: 0.4,
        },
        "<",
      )
      .to(
        letter.position,
        { y: letter.userData.initialPosition.y, duration: 0.4 },
        ">-0.2",
      );
  });

  return tl;
}

function playIntroAnimation() {
  introScaleIn([plank1, plank2, workBtn, aboutBtn, contactBtn], {
    overlaps: ["-=0.5", "-=0.6", "-=0.6", "-=0.6"],
  });

  introScaleIn([frame1, frame2, frame3]);

  introScaleIn([boba, github, linkedin, telegram], {
    delay: 0.4,
    overlaps: ["-=0.5", "-=0.6", "-=0.6"],
  });

  introScaleIn([
    flower10,
    flower9,
    flower8,
    flower7,
    flower6,
    flower5,
    flower4,
    flower3,
    flower2,
    flower1,
  ]);

  introScaleIn([box1, box2, box3]);

  introScaleIn([lamp], { delay: 0.2 });

  introScaleIn([slippers1, slippers2], { delay: 0.5 });

  introScaleIn([egg1, egg2, egg3]);

  introScaleIn([fish], { delay: 0.8 });

  introLetterBounce([letter1, letter2, letter3, letter4, letter5, letter6]);
}

const textureLoader = new THREE.TextureLoader(manager);

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");

const loader = new GLTFLoader(manager);
loader.setDRACOLoader(dracoLoader);

const environmentMap = new THREE.CubeTextureLoader(manager)
  .setPath("textures/skybox/")
  .load(["px.webp", "nx.webp", "py.webp", "ny.webp", "pz.webp", "nz.webp"]);

const textureMap = {
  First: {
    day: "/textures/room/day/first_texture_set_day.webp",
    night: "/textures/room/night/first_texture_set_night.webp",
  },
  Second: {
    day: "/textures/room/day/second_texture_set_day(2).webp",
    night: "/textures/room/night/second_texture_set_night(2).webp",
  },
  Third: {
    day: "/textures/room/day/third_texture_set_day.webp",
    night: "/textures/room/night/third_texture_set_night.webp",
  },
  Fourth: {
    day: "/textures/room/day/fourth_texture_set_day.webp",
    night: "/textures/room/night/fourth_texture_set_night.webp",
  },
  Fifth: {
    day: "/textures/room/day/fifth_texture_set_day.webp",
    night: "/textures/room/night/fifth_texture_set_night.webp",
  },
};

const loadedTextures = {
  day: {},
  night: {},
};

Object.entries(textureMap).forEach(([key, paths]) => {
  const dayTexture = textureLoader.load(paths.day);
  dayTexture.flipY = false;
  dayTexture.colorSpace = THREE.SRGBColorSpace;
  loadedTextures.day[key] = dayTexture;

  const nightTexture = textureLoader.load(paths.night);
  nightTexture.flipY = false;
  nightTexture.colorSpace = THREE.SRGBColorSpace;
  loadedTextures.night[key] = nightTexture;
});
const glassMaterial = new THREE.MeshPhysicalMaterial({
  transmission: 1,
  opacity: 1,
  color: 0xfbfbfb,
  metalness: 0,
  roughness: 0,
  ior: 3,
  thickness: 0.01,
  specularIntensity: 1,
  envMap: environmentMap,
  envMapIntensity: 1,
  depthWrite: false,
  specularColor: 0xfbfbfb,
});
const videoElement = document.createElement("video");

videoElement.src = "/textures/video/0813.mp4";
videoElement.loop = true;
videoElement.muted = true;
videoElement.autoplay = true;
videoElement.play();

const videoTexture = new THREE.VideoTexture(videoElement);
videoTexture.colorSpace = THREE.SRGBColorSpace;
videoTexture.flipY = false;

// Coffee smoke
const smokeGeometry = new THREE.PlaneGeometry(1, 1, 16, 64);
smokeGeometry.translate(0, 0.5, 0);
smokeGeometry.scale(0.33, 1, 0.33);

const perlinTexture = textureLoader.load("/shaders/perlin.png");
perlinTexture.wrapS = THREE.RepeatWrapping;
perlinTexture.wrapT = THREE.RepeatWrapping;

const smokeMaterial = new THREE.ShaderMaterial({
  vertexShader: smokeVertexShader,
  fragmentShader: smokeFragmentShader,
  uniforms: {
    uTime: new THREE.Uniform(0),
    uPerlinTexture: new THREE.Uniform(perlinTexture),
  },
  side: THREE.DoubleSide,
  transparent: true,
  depthWrite: false,
});

const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);

window.addEventListener("mousemove", (e) => {
  touchHappened = false;
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener(
  "touchstart",
  (e) => {
    if (isModalOpen) return;
    e.preventDefault();
    pointer.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
  },
  { passive: false },
);
window.addEventListener(
  "touchend",
  (e) => {
    if (isModalOpen) return;
    e.preventDefault();
    handleRaycasterInteraction();
  },
  { passive: false },
);

function handleRaycasterInteraction() {
  if (currentIntersects.length > 0) {
    const object = currentIntersects[0].object;

    if (object.name.includes("Button")) {
      buttonSounds.click.play();
    }

    Object.entries(pianoKeyMap).forEach(([keyName, soundKey]) => {
      if (object.name.includes(keyName)) {
        if (pianoDebounceTimer) {
          clearTimeout(pianoDebounceTimer);
        }

        fadeOutBackgroundMusic();

        pianoSounds[soundKey].play();

        pianoDebounceTimer = setTimeout(() => {
          fadeInBackgroundMusic();
        }, PIANO_TIMEOUT);

        gsap.to(object.position, {
          y: object.userData.initialPosition.y - 0.025,
          duration: 0.08,
          ease: "power2.out",
          onComplete: () => {
            gsap.to(object.position, {
              y: object.userData.initialPosition.y,
              duration: 0.2,
              ease: "back.out(2)",
            });
          },
        });
      }
    });

    Object.entries(socialLinks).forEach(([key, url]) => {
      if (object.name.includes(key)) {
        const newWindow = window.open();
        newWindow.opener = null;
        newWindow.location = url;
        newWindow.target = "_blank";
        newWindow.rel = "noopener noreferrer";
      }
    });
    if (object.name.includes("Work_Button")) {
      showModal(modals.work);
    } else if (object.name.includes("About_Button")) {
      showModal(modals.about);
    } else if (object.name.includes("Contact_Button")) {
      showModal(modals.contact);
    }
  }
}

let fish;
let chairTop;
let hourHand;
let minuteHand;
let coffeePosition;

let plank1,
  plank2,
  workBtn,
  aboutBtn,
  contactBtn,
  boba,
  github,
  linkedin,
  telegram;

let letter1, letter2, letter3, letter4, letter5, letter6;

let flower1,
  flower2,
  flower3,
  flower4,
  flower5,
  flower6,
  flower7,
  flower8,
  flower9,
  flower10;
let box1, box2, box3;

let lamp;

let slippers1, slippers2;

let egg1, egg2, egg3;

let frame1, frame2, frame3;

const createCrossfadeMaterial = (dayTexture, nightTexture) => {
  dayTexture.minFilter = THREE.LinearFilter;
  nightTexture.minFilter = THREE.LinearFilter;

  const material = new THREE.MeshBasicMaterial({ map: dayTexture });

  material.userData.uMixRatio = { value: 0 };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uNightMap = { value: nightTexture };
    shader.uniforms.uMixRatio = material.userData.uMixRatio;

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <map_pars_fragment>",
        `#include <map_pars_fragment>
        uniform sampler2D uNightMap;
        uniform float uMixRatio;`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        #ifdef USE_MAP
        vec4 nightTexel = texture2D( uNightMap, vMapUv );
        diffuseColor.rgb = mix( diffuseColor.rgb, nightTexel.rgb, uMixRatio );
        #endif`,
      );
  };

  return material;
};

const roomMaterials = {};
Object.keys(textureMap).forEach((key) => {
  roomMaterials[key] = createCrossfadeMaterial(
    loadedTextures.day[key],
    loadedTextures.night[key],
  );
});

const handDayTexture = textureLoader.load(
  "/textures/room/day/second_texture_set_day.webp",
);
const handNightTexture = textureLoader.load(
  "/textures/room/night/second_texture_set_night.webp",
);
[handDayTexture, handNightTexture].forEach((texture) => {
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
});
const handMaterial = createCrossfadeMaterial(handDayTexture, handNightTexture);

const plankDayTexture = textureLoader.load(
  "/textures/room/day/second_texture_set_day(3).webp",
);
const plankNightTexture = textureLoader.load(
  "/textures/room/night/second_texture_set_night(3).webp",
);
[plankDayTexture, plankNightTexture].forEach((texture) => {
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
});
const plankMaterial = createCrossfadeMaterial(
  plankDayTexture,
  plankNightTexture,
);

const themedMaterials = [
  ...Object.values(roomMaterials),
  handMaterial,
  plankMaterial,
];

const objectsWithIntroAnimations = [
  "Hanging_Plank_1",
  "Hanging_Plank_2",
  "My_Work_Button",
  "About_Button",
  "Contact_Button",
  "Boba",
  "GitHub",
  "Linkedin",
  "Telegram",
  "Name_Letter_1",
  "Name_Letter_2",
  "Name_Letter_3",
  "Name_Letter_4",
  "Name_Letter_5",
  "Name_Letter_6",
  "Flower_1",
  "Flower_2",
  "Flower_3",
  "Flower_4",
  "Flower_5",
  "Flower_6",
  "Flower_7",
  "Flower_8",
  "Flower_9",
  "Flower_10",
  "Box_1",
  "Box_2",
  "Box_3",
  "Lamp",
  "Slipper_1",
  "Slipper_2",
  "Fish_Fourth",
  "Egg_1",
  "Egg_2",
  "Egg_3",
  "Frame_1",
  "Frame_2",
  "Frame_3",
];

function hasIntroAnimation(objectName) {
  return objectsWithIntroAnimations.some((animatedName) =>
    objectName.includes(animatedName),
  );
}

window.addEventListener("click", handleRaycasterInteraction);

loader.load("/models/Room14-v1.glb", (glb) => {
  glb.scene.traverse((child) => {
    if (child.isMesh) {
      if (child.name.includes("Fish_Fourth")) {
        fish = child;
        child.position.y -= 0.05;
        // child.position.z -= 0.03;
        child.userData.initialPosition = new THREE.Vector3().copy(
          child.position,
        );
      }
      if (child.name.includes("Coffee")) {
        coffeePosition = child.position.clone();
      }
      if (child.name.includes("Hand")) {
        child.material = handMaterial;
        if (child.name.includes("Hour")) {
          hourHand = child;
          child.userData.initialRotation = new THREE.Euler().copy(
            child.rotation,
          );
        } else {
          minuteHand = child;
          child.userData.initialRotation = new THREE.Euler().copy(
            child.rotation,
          );
        }
      }
      if (child.name.includes("Chair_Top")) {
        chairTop = child;
        child.userData.initialRotation = new THREE.Euler().copy(child.rotation);
      }

      if (
        child.name.includes("Hover") ||
        child.name.includes("Key") ||
        hasIntroAnimation(child.name)
      ) {
        child.userData.initialScale = new THREE.Vector3().copy(child.scale);
        child.userData.initialPosition = new THREE.Vector3().copy(
          child.position,
        );
        child.userData.initialRotation = new THREE.Euler().copy(child.rotation);
      }
      if (child.name.includes("Hanging_Plank_1")) {
        plank1 = child;
        child.scale.set(0, 0, 1);
      } else if (child.name.includes("Hanging_Plank_2")) {
        plank2 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("My_Work_Button")) {
        workBtn = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("About_Button")) {
        aboutBtn = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Contact_Button")) {
        contactBtn = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Boba")) {
        boba = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("GitHub")) {
        github = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Linkedin")) {
        linkedin = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Telegram")) {
        telegram = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Name_Letter_1")) {
        letter1 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Name_Letter_2")) {
        letter2 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Name_Letter_3")) {
        letter3 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Name_Letter_4")) {
        letter4 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Name_Letter_5")) {
        letter5 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Name_Letter_6")) {
        letter6 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Flower_10")) {
        flower10 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Flower_1")) {
        flower1 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Flower_2")) {
        flower2 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Flower_3")) {
        flower3 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Flower_4")) {
        flower4 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Flower_5")) {
        flower5 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Flower_6")) {
        flower6 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Flower_7")) {
        flower7 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Flower_8")) {
        flower8 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Flower_9")) {
        flower9 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Box_1")) {
        box1 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Box_2")) {
        box2 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Box_3")) {
        box3 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Lamp")) {
        lamp = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Slipper_1")) {
        slippers1 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Slipper_2")) {
        slippers2 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Fish_Fourth")) {
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Egg_1")) {
        egg1 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Egg_2")) {
        egg2 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Egg_3")) {
        egg3 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Frame_1")) {
        frame1 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Frame_2")) {
        frame2 = child;
        child.scale.set(0, 0, 0);
      } else if (child.name.includes("Frame_3")) {
        frame3 = child;
        child.scale.set(0, 0, 0);
      }
      if (child.name.includes("Water")) {
        child.material = new THREE.MeshBasicMaterial({
          color: 0x558bc8,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
        });
      } else if (
        child.name.includes("Glass") ||
        child.name.includes("PC_Screen")
      ) {
        child.material = glassMaterial;
      } else if (child.name === "Screen") {
        child.material = new THREE.MeshBasicMaterial({
          map: videoTexture,
          transparent: true,
          opacity: 0.8,
        });
      } else if (child.name.includes("Hanging_Plank_2")) {
        child.material = plankMaterial;
      } else {
        Object.keys(textureMap).forEach((key) => {
          if (child.name.includes(key)) {
            child.material = roomMaterials[key];

            if (child.name.includes("Fan")) {
              if (
                child.name.includes("Fan_2") ||
                child.name.includes("Fan_4")
              ) {
                xAxisFans.push(child);
              } else {
                yAxisFans.push(child);
              }
            }
          }
        });
      }
      if (child.name.includes("Target")) {
        raycasterObjects.push(child);
      }
    }
  });
  scene.add(glb.scene);
  glb.scene.updateMatrixWorld(true);

  if (coffeePosition) {
    smoke.position.set(
      coffeePosition.x,
      coffeePosition.y + 0.2,
      coffeePosition.z,
    );
  }
  scene.add(smoke);

  raycasterObjects.forEach((object) => {
    if (!object.geometry.boundingBox) {
      object.geometry.computeBoundingBox();
    }

    let worldMatrix = object.matrixWorld;

    if (object.userData.initialScale) {
      const restingMatrix = new THREE.Matrix4().compose(
        object.userData.initialPosition,
        new THREE.Quaternion().setFromEuler(object.userData.initialRotation),
        object.userData.initialScale,
      );
      worldMatrix = object.parent
        ? new THREE.Matrix4().multiplyMatrices(
            object.parent.matrixWorld,
            restingMatrix,
          )
        : restingMatrix;
    }

    object.userData.hitBox = object.geometry.boundingBox
      .clone()
      .applyMatrix4(worldMatrix);
  });
});

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  sizes.width / sizes.height,
  0.1,
  1000,
);

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 1;
controls.maxDistance = 30;
if (window.innerWidth < 470) {
  controls.maxDistance = 45;
}
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI / 2;
controls.minAzimuthAngle = 0;
controls.maxAzimuthAngle = Math.PI / 2;

controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.update();
if (window.innerWidth < 768) {
  camera.position.set(
    29.567116827654726,
    14.018476147584705,
    31.37040363900147,
  );
  controls.target.set(
    -0.08206262548844094,
    3.3119233527087255,
    -0.7433922282864018,
  );
} else {
  camera.position.set(13.321568800276395, 5.687962636482487, 13.08528504986003);
  controls.target.set(
    0.4624746759408973,
    1.9719940043010387,
    -0.8300979125494505,
  );
}
window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

const themeToggleButton = document.querySelector(".theme-toggle-button");
const sunSvg = document.querySelector(".sun-svg");
const moonSvg = document.querySelector(".moon-svg");

let isNightMode = false;

const handleThemeToggle = (e) => {
  e.preventDefault();

  isNightMode = !isNightMode;

  themedMaterials.forEach((material) => {
    gsap.to(material.userData.uMixRatio, {
      value: isNightMode ? 1 : 0,
      duration: 1.5,
      ease: "power2.inOut",
    });
  });

  gsap.to(themeToggleButton, {
    rotate: 45,
    scale: 5,
    duration: 0.5,
    ease: "back.out(2)",
    onStart: () => {
      if (isNightMode) {
        sunSvg.style.display = "none";
        moonSvg.style.display = "block";
      } else {
        moonSvg.style.display = "none";
        sunSvg.style.display = "block";
      }

      gsap.to(themeToggleButton, {
        rotate: 0,
        scale: 1,
        duration: 0.5,
        ease: "back.out(2)",
        onComplete: () => {
          gsap.set(themeToggleButton, {
            clearProps: "all",
          });
        },
      });
    },
  });
};

themeToggleButton.addEventListener(
  "click",
  (e) => {
    if (touchHappened) return;
    handleThemeToggle(e);
  },
  { passive: false },
);

themeToggleButton.addEventListener(
  "touchend",
  (e) => {
    touchHappened = true;
    handleThemeToggle(e);
  },
  { passive: false },
);

const muteToggleButton = document.querySelector(".mute-toggle-button");
const soundOnSvg = document.querySelector(".sound-on-svg");
const soundOffSvg = document.querySelector(".sound-off-svg");

const updateMuteState = (muted) => {
  if (muted) {
    backgroundMusic.volume(0);
  } else {
    backgroundMusic.volume(BACKGROUND_MUSIC_VOLUME);
  }
};

let isMuted = false;

const handleMuteToggle = (e) => {
  e.preventDefault();

  isMuted = !isMuted;
  updateMuteState(isMuted);
  buttonSounds.click.play();

  if (!backgroundMusic.playing()) {
    backgroundMusic.play();
  }

  gsap.to(muteToggleButton, {
    rotate: -45,
    scale: 5,
    duration: 0.5,
    ease: "back.out(2)",
    onStart: () => {
      if (!isMuted) {
        soundOffSvg.style.display = "none";
        soundOnSvg.style.display = "block";
      } else {
        soundOnSvg.style.display = "none";
        soundOffSvg.style.display = "block";
      }

      gsap.to(muteToggleButton, {
        rotate: 0,
        scale: 1,
        duration: 0.5,
        ease: "back.out(2)",
        onComplete: () => {
          gsap.set(muteToggleButton, {
            clearProps: "all",
          });
        },
      });
    },
  });
};

muteToggleButton.addEventListener(
  "click",
  (e) => {
    if (touchHappened) return;
    handleMuteToggle(e);
  },
  { passive: false },
);

muteToggleButton.addEventListener(
  "touchend",
  (e) => {
    touchHappened = true;
    handleMuteToggle(e);
  },
  { passive: false },
);

function playHoverAnimation(object, isHovering) {
  let scale = 1.4;
  gsap.killTweensOf(object.scale);
  gsap.killTweensOf(object.rotation);
  gsap.killTweensOf(object.position);

  if (object.name.includes("Coffee")) {
    gsap.killTweensOf(smoke.scale);
    if (isHovering) {
      gsap.to(smoke.scale, {
        x: 1.4,
        y: 1.4,
        z: 1.4,
        duration: 0.5,
        ease: "back.out(2)",
      });
    } else {
      gsap.to(smoke.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.3,
        ease: "back.out(2)",
      });
    }
  }

  if (object.name.includes("Fish")) {
    scale = 1.2;
  }
  if (isHovering) {
    gsap.to(object.scale, {
      x: object.userData.initialScale.x * scale,
      y: object.userData.initialScale.y * scale,
      z: object.userData.initialScale.z * scale,
      duration: 0.5,
      ease: "back.out(2)",
    });

    if (object.name.includes("About_Button")) {
      gsap.to(object.rotation, {
        x: object.userData.initialRotation.x - Math.PI / 10,
        duration: 0.5,
        ease: "back.out(2)",
      });
      gsap.to(object.scale, {
        x: object.userData.initialScale.x * 1.15,
        y: object.userData.initialScale.y * 1.15,
        z: object.userData.initialScale.z * 1.15,
        duration: 0.5,
        ease: "back.out(2)",
      });
    } else if (
      object.name.includes("Contact_Button") ||
      object.name.includes("My_Work_Button") ||
      object.name.includes("GitHub") ||
      object.name.includes("Linkedin") ||
      object.name.includes("Telegram")
    ) {
      gsap.to(object.rotation, {
        x: object.userData.initialRotation.x + Math.PI / 10,
        duration: 0.5,
        ease: "back.out(2)",
      });
      gsap.to(object.scale, {
        x: object.userData.initialScale.x * 1.15,
        y: object.userData.initialScale.y * 1.15,
        z: object.userData.initialScale.z * 1.15,
        duration: 0.5,
        ease: "back.out(2)",
      });
    }

    if (object.name.includes("Boba") || object.name.includes("Name_Letter")) {
      gsap.to(object.position, {
        y: object.userData.initialPosition.y + 0.3,
        duration: 0.5,
        ease: "back.out(2)",
      });
    }
  } else {
    gsap.to(object.scale, {
      x: object.userData.initialScale.x,
      y: object.userData.initialScale.y,
      z: object.userData.initialScale.z,
      duration: 0.3,
      ease: "back.out(2)",
    });

    if (
      object.name.includes("About_Button") ||
      object.name.includes("Contact_Button") ||
      object.name.includes("My_Work_Button") ||
      object.name.includes("GitHub") ||
      object.name.includes("Linkedin") ||
      object.name.includes("Telegram")
    ) {
      gsap.to(object.rotation, {
        x: object.userData.initialRotation.x,
        duration: 0.3,
        ease: "back.out(2)",
      });
    }

    if (object.name.includes("Boba") || object.name.includes("Name_Letter")) {
      gsap.to(object.position, {
        y: object.userData.initialPosition.y,
        duration: 0.3,
        ease: "back.out(2)",
      });
    }
  }
}
const clock = new THREE.Clock();
function updateClockHands() {
  if (!hourHand || !minuteHand) return;
  const now = new Date();
  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const minuteAngle = (minutes + seconds / 60) * ((Math.PI * 2) / 60);

  const hourAngle = (hours + minutes / 60) * ((Math.PI * 2) / 12);

  minuteHand.rotation.x = minuteHand.userData.initialRotation.x - minuteAngle;
  hourHand.rotation.x = hourHand.userData.initialRotation.x - hourAngle;
}

const render = (timestamp) => {
  controls.update();

  smokeMaterial.uniforms.uTime.value = timestamp * 0.001;

  updateClockHands();
  xAxisFans.forEach((fan) => {
    fan.rotation.x += 0.05;
  });
  yAxisFans.forEach((fan) => {
    fan.rotateZ(0.05);
    fan.rotateY(0.03);
  });
  if (chairTop) {
    const time = timestamp * 0.0007;
    const amplitude = Math.PI / 7;
    const position =
      amplitude * Math.sin(time) * (1 - Math.abs(Math.sin(time)) * 0.1);
    chairTop.rotation.y = chairTop.userData.initialRotation.y + position;
  }

  if (fish) {
    const time = timestamp * 0.0015;
    const amplitude = 0.12;
    const position =
      amplitude * Math.sin(time) * (1 - Math.abs(Math.sin(time)) * 0.1);
    fish.position.y = fish.userData.initialPosition.y + position;
  }

  if (!isModalOpen) {
    raycaster.setFromCamera(pointer, camera);

    raycasterObjects.forEach((object) => {
      object.material.color.set(0xffffff);
    });

    let hitObject = null;
    let hitDistance = Infinity;
    const hitPoint = new THREE.Vector3();
    raycasterObjects.forEach((object) => {
      const box = object.userData.hitBox;
      if (!box) return;
      if (raycaster.ray.intersectBox(box, hitPoint)) {
        const distance = raycaster.ray.origin.distanceTo(hitPoint);
        if (distance < hitDistance) {
          hitDistance = distance;
          hitObject = object;
        }
      }
    });
    currentIntersects = hitObject
      ? [{ object: hitObject, distance: hitDistance }]
      : [];

    if (currentIntersects.length > 0) {
      const currentIntersectObject = currentIntersects[0].object;

      if (currentIntersectObject.name.includes("Hover")) {
        if (hoverLeaveTimeout) {
          clearTimeout(hoverLeaveTimeout);
          hoverLeaveTimeout = null;
        }
        if (currentIntersectObject !== currentHoveredObject) {
          if (currentHoveredObject) {
            playHoverAnimation(currentHoveredObject, false);
          }

          currentHoveredObject = currentIntersectObject;
          playHoverAnimation(currentIntersectObject, true);
        }
      }
      if (currentIntersectObject.name.includes("Pointer")) {
        document.body.style.cursor = "pointer";
      } else {
        document.body.style.cursor = "default";
      }
    } else {
      if (currentHoveredObject && !hoverLeaveTimeout) {
        const objectLeaving = currentHoveredObject;
        hoverLeaveTimeout = setTimeout(() => {
          playHoverAnimation(objectLeaving, false);
          currentHoveredObject = null;
          hoverLeaveTimeout = null;
        }, 120);
      }
      document.body.style.cursor = "default";
    }
  }
  renderer.render(scene, camera);
  window.requestAnimationFrame(render);
};
render();
