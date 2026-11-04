
import * as THREE from "three";
import { AGENTS, MEETING_POSITION } from "../agents.js";
import { getAgentState } from "../company.js";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function makeLabel(agent) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 150;

  const context = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.6, 0.76, 1);
  sprite.position.y = 2.65;

  sprite.userData.canvas = canvas;
  sprite.userData.context = context;
  sprite.userData.texture = texture;
  sprite.userData.lastText = "";

  updateLabel(sprite, agent, "Menunggu pekerjaan");
  return sprite;
}

function updateLabel(sprite, agent, activity) {
  const key = `${agent.name}|${activity}`;
  if (sprite.userData.lastText === key) return;

  const { canvas, context, texture } = sprite.userData;
  context.clearRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "rgba(13,24,40,0.94)";
  context.beginPath();
  context.roundRect(8, 8, 496, 134, 22);
  context.fill();

  context.strokeStyle = agent.color;
  context.lineWidth = 6;
  context.stroke();

  context.fillStyle = "#ffffff";
  context.font = "bold 35px Arial";
  context.textAlign = "center";
  context.fillText(agent.name, 256, 58);

  context.fillStyle = "#b9d2ef";
  context.font = "25px Arial";
  context.fillText(activity.slice(0, 35), 256, 105);

  texture.needsUpdate = true;
  sprite.userData.lastText = key;
}

export class VirtualOffice {
  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.characters = [];
    this.onSelect = null;
    this.frame = null;
    this.isMeeting = false;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#b9c9d8");
    this.scene.fog = new THREE.Fog("#b9c9d8", 25, 55);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.camera.position.set(17, 19, 23);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    container.appendChild(this.renderer.domElement);

    this.target = new THREE.Vector3(0, 0, 0);
    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.drag = {
      active: false,
      moved: false,
      x: 0,
      y: 0,
      theta: Math.PI / 4,
      phi: 0.9,
      radius: 30
    };

    this.buildLights();
    this.buildFloor();
    this.buildRooms();
    this.buildFurniture();
    this.buildCharacters();
    this.bindCamera();
    this.resize();

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);

    this.animate();
  }

  mat(color, roughness = 0.75, metalness = 0) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness
    });
  }

  box(x, y, z, sx, sy, sz, color, options = {}) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(sx, sy, sz),
      this.mat(color, options.roughness ?? 0.75, options.metalness ?? 0)
    );

    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  cylinder(x, y, z, radius, height, color) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, 20),
      this.mat(color)
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  buildLights() {
    this.scene.add(new THREE.HemisphereLight("#ffffff", "#7c8b9c", 2.1));

    const sun = new THREE.DirectionalLight("#ffffff", 2.6);
    sun.position.set(-8, 18, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    this.scene.add(sun);

    const fill = new THREE.PointLight("#8abaff", 45, 35);
    fill.position.set(0, 7, 0);
    this.scene.add(fill);
  }

  buildFloor() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 18),
      this.mat("#dce5ec", 0.92)
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Lantai area utama dan karpet meeting.
    this.box(0, 0.015, 0, 21.5, 0.03, 17.5, "#dce5ec");
    this.box(0, 0.035, 0, 20.5, 0.025, 16.5, "#cbd8e3");
    this.box(5.5, 0.06, 2.2, 5.8, 0.04, 5.0, "#b5c7d8");
  }

  roomLabel(x, z, text) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#20334b";
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 34px Arial";
    ctx.textAlign = "center";
    ctx.fillText(text.toUpperCase(), 256, 78);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture })
    );
    sprite.position.set(x, 2.5, z);
    sprite.scale.set(3.3, 0.82, 1);
    this.scene.add(sprite);
  }

  buildRooms() {
    // Dinding belakang dan sisi luar.
    this.box(0, 1.65, -8.8, 22, 3.3, 0.2, "#d5e0e9");
    this.box(-10.9, 1.65, 0, 0.2, 3.3, 18, "#d5e0e9");
    this.box(10.9, 1.65, 0, 0.2, 3.3, 18, "#d5e0e9");

    // Partisi kaca rendah antar departemen.
    for (const x of [-4.8, 0, 4.8]) {
      this.box(x, 0.95, -5.4, 0.07, 1.9, 5.8, "#9bb9ca");
      this.box(x, 0.95, 4.6, 0.07, 1.9, 5.8, "#9bb9ca");
    }

    this.box(0, 0.95, 0, 21, 1.9, 0.07, "#9bb9ca");

    this.roomLabel(-7, -7.8, "Executive");
    this.roomLabel(-2.5, -7.8, "Research");
    this.roomLabel(2.5, -7.8, "Product Studio");
    this.roomLabel(7, -7.8, "Quality Lab");
    this.roomLabel(-7, 7.6, "Marketing");
    this.roomLabel(-2.5, 7.6, "Sales");
    this.roomLabel(2.5, 7.6, "Finance");
    this.roomLabel(6.5, 5.0, "Meeting Room");

    // Jendela kaca dekoratif.
    this.box(0, 2.2, -8.68, 8, 1.3, 0.025, "#91b7d0");
  }

  buildDesk(agent) {
    const [x, , z] = agent.desk;

    // Meja.
    this.box(x, 0.85, z, 2.2, 0.16, 1.05, "#8a654d");
    for (const dx of [-0.9, 0.9]) {
      for (const dz of [-0.38, 0.38]) {
        this.box(x + dx, 0.42, z + dz, 0.09, 0.82, 0.09, "#53677d");
      }
    }

    // Laptop dan layar.
    this.box(x, 1.05, z - 0.23, 0.75, 0.035, 0.5, "#26384c");
    this.box(x, 1.32, z - 0.38, 0.72, 0.48, 0.045, "#283c52");
    this.box(x, 1.32, z - 0.35, 0.61, 0.36, 0.018, "#6d9fbd");

    // Keyboard.
    this.box(x, 1.08, z + 0.13, 0.55, 0.025, 0.19, "#4c5c70");

    // Kursi dan kaki kursi.
    this.cylinder(x, 0.12, z + 1.15, 0.28, 0.12, "#384e68");
    this.box(x, 0.52, z + 1.4, 0.55, 0.12, 0.5, "#405a76");
    this.box(x, 0.9, z + 1.62, 0.55, 0.72, 0.12, "#405a76");
    this.cylinder(x, 0.28, z + 1.4, 0.07, 0.4, "#7c8fa3");
  }

  buildFurniture() {
    for (const agent of AGENTS) this.buildDesk(agent);

    // Meja rapat.
    this.box(6.5, 0.82, 2.4, 4.2, 0.18, 2.4, "#765b48");

    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      const x = 6.5 + Math.cos(angle) * 2.5;
      const z = 2.4 + Math.sin(angle) * 1.8;
      this.cylinder(x, 0.12, z, 0.28, 0.12, "#344b65");
      this.box(x, 0.48, z, 0.5, 0.12, 0.5, "#526c87");
      this.box(x, 0.82, z + 0.2, 0.5, 0.65, 0.1, "#526c87");
    }

    // Papan presentasi.
    this.box(9.5, 1.8, -0.1, 0.12, 2.1, 2.8, "#344b62");
    this.box(9.42, 1.8, -0.1, 0.025, 1.85, 2.55, "#e8f0f4");

    // Tanaman hias.
    for (const [x, z] of [[-9.5, -7.2], [9.5, 7.2], [-9.5, 7.2]]) {
      this.cylinder(x, 0.35, z, 0.35, 0.65, "#a87853");
      const leaves = new THREE.Mesh(
        new THREE.SphereGeometry(0.65, 12, 10),
        this.mat("#4d9a77")
      );
      leaves.position.set(x, 1.25, z);
      leaves.scale.set(0.8, 1.25, 0.8);
      this.scene.add(leaves);
    }

    // Lampu gantung.
    for (const x of [-7, -2.5, 2.5, 7]) {
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 12, 8),
        new THREE.MeshStandardMaterial({
          color: "#ffe3a1",
          emissive: "#dcae62",
          emissiveIntensity: 0.7
        })
      );
      lamp.position.set(x, 3.0, 0);
      this.scene.add(lamp);
    }
  }

  createCharacter(agent) {
    const group = new THREE.Group();
    group.userData.agent = agent;

    const skin = this.mat("#e4b99b");
    const shirt = this.mat(agent.color);
    const pants = this.mat("#34455e");
    const shoes = this.mat("#202b3b");

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.25, 0.48, 4, 8),
      shirt
    );
    body.position.y = 0.88;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.21, 18, 14),
      skin
    );
    head.position.y = 1.55;
    head.castShadow = true;
    group.add(head);

    // Rambut.
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.215, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
      this.mat("#293344")
    );
    hair.position.y = 1.61;
    group.add(hair);

    const arms = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.075, 0.4, 4, 8),
        shirt
      );
      arm.position.set(side * 0.31, 0.94, 0);
      arm.rotation.z = side * -0.12;
      arm.castShadow = true;
      group.add(arm);
      arms.push(arm);
    }

    const legs = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      const legMesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.085, 0.38, 4, 8),
        pants
      );
      legMesh.position.y = -0.25;
      leg.add(legMesh);

      const shoe = new THREE.Mesh(
        new THREE.BoxGeometry(0.19, 0.12, 0.3),
        shoes
      );
      shoe.position.set(0, -0.49, 0.08);
      leg.add(shoe);

      leg.position.set(side * 0.13, 0.48, 0);
      group.add(leg);
      legs.push(leg);
    }

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.025, 8, 32),
      new THREE.MeshBasicMaterial({ color: agent.color })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.04;
    group.add(ring);

    const label = makeLabel(agent);
    group.add(label);

    group.userData.arms = arms;
    group.userData.legs = legs;
    group.userData.body = body;
    group.userData.ring = ring;
    group.userData.label = label;
    group.userData.phase = Math.random() * 5;
    group.userData.target = new THREE.Vector3(...agent.start);
    group.userData.destination = "work";

    group.position.set(...agent.start);
    this.scene.add(group);
    this.characters.push(group);
  }

  buildCharacters() {
    for (const agent of AGENTS) this.createCharacter(agent);
  }

  setAgentActivity(agentId, status, activity, destination = "work") {
    const character = this.characters.find(
      item => item.userData.agent.id === agentId
    );
    if (!character) return;

    const agent = character.userData.agent;
    const target = destination === "meeting"
      ? new THREE.Vector3(
          MEETING_POSITION[0] + (this.characters.indexOf(character) % 3 - 1) * 0.9,
          0,
          MEETING_POSITION[2] + Math.floor(this.characters.indexOf(character) / 3) * 0.8
        )
      : destination === "ceo"
        ? new THREE.Vector3(-5.4, 0, -2.3)
        : new THREE.Vector3(...agent.start);

    character.userData.target.copy(target);
    character.userData.destination = destination;
    character.userData.status = status;
    character.userData.activity = activity;
  }

  
sendToMeeting() {
  this.isMeeting = true;

  this.characters.forEach((character, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);

    const target = new THREE.Vector3(
      5.0 + col * 1.0,
      0,
      1.0 + row * 1.0
    );

    character.userData.target.copy(target);
    character.userData.status = "Meeting";
    character.userData.activity = "Mengikuti meeting";
  });
}


  returnToWork() {
    this.isMeeting = false;
    for (const character of this.characters) {
      const state = getAgentState(character.userData.agent.id);
      this.setAgentActivity(
        character.userData.agent.id,
        state.status,
        state.activity,
        "work"
      );
    }
  }

  updateCharacters(delta, elapsed) {
    for (const character of this.characters) {
      const data = character.userData;
      const state = getAgentState(data.agent.id);

      // Sinkronisasi label dengan status Company Core.
      if (state.status !== data.status || state.activity !== data.activity) {
        data.status = state.status;
        data.activity = state.activity;

        const target = state.status === "Meeting"
          ? new THREE.Vector3(...MEETING_POSITION)
          : new THREE.Vector3(...data.agent.start);

        data.target.copy(target);
      }

      const direction = new THREE.Vector3().subVectors(
        data.target,
        character.position
      );

      const distance = direction.length();
      const walking = distance > 0.12;

      if (walking) {
        direction.normalize();
        const step = Math.min(distance, delta * 2.5);
        character.position.addScaledVector(direction, step);
        character.rotation.y = Math.atan2(direction.x, direction.z);
      }

      const t = elapsed + data.phase;

      if (walking) {
        data.legs[0].rotation.x = Math.sin(t * 9) * 0.55;
        data.legs[1].rotation.x = -Math.sin(t * 9) * 0.55;
        data.arms[0].rotation.x = -Math.sin(t * 9) * 0.35;
        data.arms[1].rotation.x = Math.sin(t * 9) * 0.35;
        data.body.position.y = 0.88 + Math.abs(Math.sin(t * 9)) * 0.035;
      } else {
        data.legs[0].rotation.x = 0;
        data.legs[1].rotation.x = 0;

        if (data.status === "Working") {
          data.arms[0].rotation.x = Math.sin(t * 5) * 0.18;
          data.arms[1].rotation.x = Math.cos(t * 5) * 0.18;
          data.body.position.y = 0.88;
        } else {
          data.arms[0].rotation.x = 0;
          data.arms[1].rotation.x = 0;
          data.body.position.y = 0.88 + Math.sin(t * 1.8) * 0.018;
        }
      }

      const color = data.status === "Working"
        ? "#35c995"
        : data.status === "Walking"
          ? "#62b6ff"
          : data.status === "Meeting"
            ? "#efb45e"
            : "#9aa9bb";

      data.ring.material.color.set(color);
      data.ring.rotation.z += delta * 0.4;

      updateLabel(data.label, data.agent, walking
        ? "Berjalan ke lokasi"
        : data.activity || "Menunggu pekerjaan");
    }
  }

  bindCamera() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener("pointerdown", event => {
      this.drag.active = true;
      this.drag.moved = false;
      this.drag.x = event.clientX;
      this.drag.y = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointermove", event => {
      if (!this.drag.active) return;

      const dx = event.clientX - this.drag.x;
      const dy = event.clientY - this.drag.y;

      if (Math.abs(dx) + Math.abs(dy) > 3) this.drag.moved = true;

      this.drag.x = event.clientX;
      this.drag.y = event.clientY;
      this.drag.theta -= dx * 0.006;
      this.drag.phi = clamp(this.drag.phi + dy * 0.004, 0.25, 1.35);

      this.updateCamera();
    });

    canvas.addEventListener("pointerup", event => {
      this.drag.active = false;
      if (!this.drag.moved) this.selectAgent(event);
    });

    canvas.addEventListener("wheel", event => {
      this.drag.radius = clamp(
        this.drag.radius + event.deltaY * 0.018,
        16,
        42
      );
      this.updateCamera();
    }, { passive: true });

    this.updateCamera();
  }

  updateCamera() {
    const { theta, phi, radius } = this.drag;
    this.camera.position.set(
      this.target.x + radius * Math.sin(phi) * Math.sin(theta),
      this.target.y + radius * Math.cos(phi),
      this.target.z + radius * Math.sin(phi) * Math.cos(theta)
    );
    this.camera.lookAt(this.target);
  }

  selectAgent(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const objects = this.characters.flatMap(c => c.children);
    const hits = this.raycaster.intersectObjects(objects, true);

    if (!hits.length) return;

    let current = hits[0].object;
    while (current && !current.userData.agent) current = current.parent;

    if (current?.userData.agent) {
      this.onSelect?.(current.userData.agent);
    }
  }

  resetCamera() {
    this.drag.theta = Math.PI / 4;
    this.drag.phi = 0.9;
    this.drag.radius = 30;
    this.target.set(0, 0, 0);
    this.updateCamera();
  }

  resize() {
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    this.frame = requestAnimationFrame(() => this.animate());
    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.updateCharacters(delta, this.clock.elapsedTime);
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
