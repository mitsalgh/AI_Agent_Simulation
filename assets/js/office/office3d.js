
import * as THREE from "three";
import { AGENTS } from "../agents.js";
import { getAgentState } from "../company.js";

const MEETING_POSITION = [5, 0, 1];

export class VirtualOffice {
  constructor(container) {
    if (!container) {
      throw new Error("Elemen officeScene tidak ditemukan.");
    }

    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#dce7f2");

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      100
    );

    this.camera.position.set(15, 15, 19);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(
      container.clientWidth,
      container.clientHeight
    );

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.innerHTML = "";
    container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.characters = [];
    this.isMeeting = false;
    this.selectedAgent = null;

    this.createLights();
    this.createFloor();
    this.createWalls();
    this.createRooms();
    this.createFurniture();
    this.createCharacters();
    this.bindControls();

    this.animate = this.animate.bind(this);
    this.renderer.setAnimationLoop(this.animate);

    this.resizeHandler = () => this.resize();
    window.addEventListener("resize", this.resizeHandler);
  }

  // ==========================================
  // MATERIAL DAN OBJEK DASAR
  // ==========================================

  material(color, roughness = 0.8) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness
    });
  }

  addBox(parent, x, y, z, width, height, depth, color) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      this.material(color)
    );

    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    parent.add(mesh);
    return mesh;
  }

  // ==========================================
  // PENCAHAYAAN
  // ==========================================

  createLights() {
    const hemisphere = new THREE.HemisphereLight(
      "#ffffff",
      "#8090a0",
      2
    );

    this.scene.add(hemisphere);

    const directional = new THREE.DirectionalLight(
      "#ffffff",
      2.2
    );

    directional.position.set(5, 14, 8);
    directional.castShadow = true;
    directional.shadow.mapSize.set(2048, 2048);

    this.scene.add(directional);
  }

  // ==========================================
  // LANTAI DAN DINDING
  // ==========================================

  createFloor() {
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(22, 0.3, 16),
      this.material("#e8edf2")
    );

    floor.position.y = -0.2;
    floor.receiveShadow = true;

    this.scene.add(floor);

    const grid = new THREE.GridHelper(
      22,
      22,
      "#c2ced8",
      "#d5dde5"
    );

    grid.position.y = -0.035;
    this.scene.add(grid);
  }

  createWalls() {
    this.addBox(
      this.scene,
      0, 1.5, -8,
      22, 3, 0.2,
      "#f7f9fb"
    );

    this.addBox(
      this.scene,
      -11, 1.5, 0,
      0.2, 3, 16,
      "#f7f9fb"
    );

    this.addBox(
      this.scene,
      11, 1.5, 0,
      0.2, 3, 16,
      "#f7f9fb"
    );

    this.addBox(
      this.scene,
      0, 0.55, 0,
      0.12, 1.1, 13,
      "#cbd5df"
    );
  }

  // ==========================================
  // LABEL RUANGAN DAN KARAKTER
  // ==========================================

  makeTextSprite(text, color = "#172536") {
    const canvas = document.createElement("canvas");

    canvas.width = 512;
    canvas.height = 128;

    const context = canvas.getContext("2d");

    context.fillStyle = "rgba(255,255,255,0.94)";
    context.beginPath();
    context.roundRect(8, 8, 496, 112, 20);
    context.fill();

    context.font = "bold 34px Arial";
    context.fillStyle = color;
    context.textAlign = "center";
    context.textBaseline = "middle";

    context.fillText(text, 256, 64, 470);

    const texture = new THREE.CanvasTexture(canvas);

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false
      })
    );

    sprite.scale.set(2.5, 0.63, 1);

    return sprite;
  }

  createRooms() {
    const labels = [
      ["CEO OFFICE", -7, -6],
      ["RESEARCH", -2.5, -6],
      ["PRODUCT", 2.5, -6],
      ["QUALITY CONTROL", 7, -6],
      ["CONTENT STUDIO", -7, 6],
      ["SALES", -2.5, 6],
      ["FINANCE", 2.5, 6],
      ["MEETING ROOM", 7, 2.5]
    ];

    labels.forEach(([name, x, z]) => {
      const label = this.makeTextSprite(name);

      label.position.set(x, 2.3, z);
      this.scene.add(label);
    });

    this.addBox(
      this.scene,
      7, 0.55, 2.5,
      5.2, 0.12, 3.5,
      "#a9b8c7"
    );
  }

  // ==========================================
  // MEJA, LAPTOP, KURSI, DEKORASI
  // ==========================================

  createDesk(x, z) {
    const group = new THREE.Group();

    this.addBox(
      group,
      0, 0.85, 0,
      2.2, 0.14, 1.1,
      "#8c684b"
    );

    [-0.9, 0.9].forEach((dx) => {
      [-0.4, 0.4].forEach((dz) => {
        this.addBox(
          group,
          dx, 0.4, dz,
          0.12, 0.8, 0.12,
          "#495767"
        );
      });
    });

    // Laptop keyboard
    this.addBox(
      group,
      0, 1.13, -0.15,
      0.85, 0.06, 0.52,
      "#202b38"
    );

    // Laptop display
    this.addBox(
      group,
      0, 1.37, -0.38,
      0.85, 0.48, 0.05,
      "#263d55"
    );

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.73, 0.36),
      new THREE.MeshBasicMaterial({
        color: "#4ca6d9"
      })
    );

    screen.position.set(0, 1.38, -0.345);
    group.add(screen);

    group.position.set(x, 0, z);
    this.scene.add(group);

    return group;
  }

  createChair(x, z) {
    const group = new THREE.Group();

    this.addBox(
      group,
      0, 0.65, 0,
      0.8, 0.12, 0.8,
      "#34495e"
    );

    this.addBox(
      group,
      0, 1.15, -0.32,
      0.8, 0.9, 0.12,
      "#34495e"
    );

    this.addBox(
      group,
      0, 0.3, 0,
      0.12, 0.55, 0.12,
      "#687888"
    );

    group.position.set(x, 0, z);
    this.scene.add(group);
  }

  createFurniture() {
    AGENTS.forEach((agent) => {
      const [x, , z] = agent.start;

      this.createDesk(x, z);
      this.createChair(x, z + 1.25);
    });

    // Meja meeting
    this.addBox(
      this.scene,
      7, 0.8, 2.5,
      3.5, 0.16, 1.8,
      "#8c684b"
    );

    // Kursi meeting
    for (let i = 0; i < 3; i++) {
      this.createChair(5.3 + i * 1.4, 0.5);
      this.createChair(5.3 + i * 1.4, 4.4);
    }

    // Tanaman dekorasi
    [-9.5, 9.5, -7, 7].forEach((x, index) => {
      const z = index < 2 ? -6.5 : 6.5;

      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.25,
          0.3,
          0.5,
          12
        ),
        this.material("#8b654d")
      );

      pot.position.set(x, 0.25, z);
      this.scene.add(pot);

      const leaves = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 12, 12),
        this.material("#39865a")
      );

      leaves.position.set(x, 0.9, z);
      this.scene.add(leaves);
    });
  }

  // ==========================================
  // KARAKTER 3D
  // ==========================================

  createCharacter(agent) {
    const group = new THREE.Group();

    const skin = this.material("#e5b995");
    const clothes = this.material(
      agent.color || "#3978a8"
    );
    const dark = this.material("#243447");

    // Badan
    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.48, 4, 8),
      clothes
    );

    torso.position.y = 1.05;
    torso.castShadow = true;
    group.add(torso);

    // Kepala
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.23, 16, 16),
      skin
    );

    head.position.y = 1.72;
    head.castShadow = true;
    group.add(head);

    // Rambut
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.235,
        16,
        12,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2
      ),
      dark
    );

    hair.position.y = 1.8;
    group.add(hair);

    // Tangan kiri
    const leftArm = new THREE.Group();

    const armGeometry = new THREE.CapsuleGeometry(
      0.09,
      0.4,
      3,
      8
    );

    const leftArmMesh = new THREE.Mesh(
      armGeometry,
      clothes
    );

    leftArmMesh.position.y = -0.22;
    leftArm.add(leftArmMesh);
    leftArm.position.set(-0.34, 1.3, 0);

    // Tangan kanan
    const rightArm = new THREE.Group();

    const rightArmMesh = new THREE.Mesh(
      armGeometry,
      clothes
    );

    rightArmMesh.position.y = -0.22;
    rightArm.add(rightArmMesh);
    rightArm.position.set(0.34, 1.3, 0);

    group.add(leftArm, rightArm);

    // Kaki
    const legs = [];

    [-0.14, 0.14].forEach((x) => {
      const leg = new THREE.Group();

      const mesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(
          0.11,
          0.38,
          3,
          8
        ),
        dark
      );

      mesh.position.y = -0.25;
      leg.add(mesh);

      leg.position.set(x, 0.58, 0);
      group.add(leg);

      legs.push(leg);
    });

    // Label nama
    const label = this.makeTextSprite(
      agent.name,
      "#142b40"
    );

    label.position.set(0, 2.35, 0);
    group.add(label);

    // Label aktivitas
    const activityLabel = this.makeTextSprite(
      "Menunggu perintah",
      "#28618b"
    );

    activityLabel.position.set(0, 2.78, 0);
    activityLabel.scale.set(2.8, 0.48, 1);
    group.add(activityLabel);

    const character = {
      group,
      agent,
      leftArm,
      rightArm,
      legs,
      label,
      activityLabel,

      userData: {
        target: new THREE.Vector3(...agent.start),
        status: "Idle",
        activity: "Menunggu perintah",
        currentTask: ""
      }
    };

    group.position.set(...agent.start);

    this.scene.add(group);
    this.characters.push(character);

    return character;
  }

  createCharacters() {
    AGENTS.forEach((agent) => {
      this.createCharacter(agent);
    });
  }

  // ==========================================
  // POSISI MEETING INDIVIDUAL
  // ==========================================

  getMeetingTarget(index) {
    const col = index % 3;
    const row = Math.floor(index / 3);

    return new THREE.Vector3(
      MEETING_POSITION[0] + col,
      0,
      MEETING_POSITION[2] + row
    );
  }

  // ==========================================
  // UPDATE AKTIVITAS AGENT
  // ==========================================

  setAgentActivity(
    agentId,
    status,
    activity,
    destination = "work"
  ) {
    const character = this.characters.find(
      (item) => item.agent.id === agentId
    );

    if (!character) return;

    const index = this.characters.indexOf(character);

    // Target dipilih dari destination.
    // CEO dapat berjalan ke meeting walaupun statusnya Walking.
    const target = destination === "meeting"
      ? this.getMeetingTarget(index)
      : new THREE.Vector3(...character.agent.start);

    character.userData.target.copy(target);
    character.userData.status = status;
    character.userData.activity = activity;

    this.updateCharacterLabel(character);
  }

  updateCharacterLabel(character) {
    const { status, activity } = character.userData;

    const text = `${status}: ${activity}`;

    character.group.remove(character.activityLabel);

    if (character.activityLabel.material.map) {
      character.activityLabel.material.map.dispose();
    }

    character.activityLabel.material.dispose();

    character.activityLabel = this.makeTextSprite(
      text,
      status === "Working" ? "#247a4b" : "#28618b"
    );

    character.activityLabel.position.set(0, 2.78, 0);
    character.activityLabel.scale.set(2.8, 0.48, 1);

    character.group.add(character.activityLabel);
  }

  // ==========================================
  // POIN 10: KIRIM AGENT KE MEETING
  // ==========================================

  sendToMeeting() {
    this.isMeeting = true;

    this.characters.forEach((character, index) => {
      const target = this.getMeetingTarget(index);

      character.userData.target.copy(target);
      character.userData.status = "Meeting";
      character.userData.activity = "Mengikuti meeting";

      this.updateCharacterLabel(character);
    });
  }

  // ==========================================
  // KEMBALI KE MEJA KERJA
  // ==========================================

  returnToWork() {
    this.isMeeting = false;

    this.characters.forEach((character) => {
      character.userData.target.set(
        ...character.agent.start
      );

      character.userData.status = "Walking";
      character.userData.activity = "Kembali ke meja kerja";

      this.updateCharacterLabel(character);
    });
  }

  // ==========================================
  // POIN 12: UPDATE GERAKAN KARAKTER
  // ==========================================

  updateCharacters(delta, elapsed) {
    this.characters.forEach((character, index) => {
      const state = getAgentState(character.agent.id);

      // Meeting: setiap agent mempunyai posisi sendiri.
      if (state.status === "Meeting") {
        character.userData.target.copy(
          this.getMeetingTarget(index)
        );
      }

      // Idle atau Working: menuju posisi meja kerja.
      // Walking: pertahankan target yang ditentukan
      // oleh setAgentActivity().
      if (
        state.status === "Idle" ||
        state.status === "Working"
      ) {
        character.userData.target.set(
          ...character.agent.start
        );
      }

      const position = character.group.position;

      const distance = position.distanceTo(
        character.userData.target
      );

      if (distance > 0.08) {
        const direction = character.userData.target
          .clone()
          .sub(position)
          .normalize();

        const speed = 2.2 * delta;

        position.add(
          direction.multiplyScalar(
            Math.min(speed, distance)
          )
        );

        // Karakter menghadap arah perjalanan.
        character.group.rotation.y = Math.atan2(
          direction.x,
          direction.z
        );

        // Animasi kaki dan tangan saat berjalan.
        const swing = Math.sin(elapsed * 10) * 0.45;

        character.legs[0].rotation.x = swing;
        character.legs[1].rotation.x = -swing;

        character.leftArm.rotation.x = -swing * 0.7;
        character.rightArm.rotation.x = swing * 0.7;
      } else {
        // Hentikan gerakan kaki saat sampai tujuan.
        character.legs.forEach((leg) => {
          leg.rotation.x *= 0.8;
        });

        // Animasi mengetik saat bekerja.
        const working = state.status === "Working";

        character.leftArm.rotation.x = working
          ? Math.sin(elapsed * 8) * 0.18
          : 0;

        character.rightArm.rotation.x = working
          ? Math.cos(elapsed * 8) * 0.18
          : 0;
      }

      // Sinkronisasi label karakter dengan status perusahaan.
      if (
        character.userData.status !== state.status ||
        character.userData.activity !== state.activity
      ) {
        character.userData.status = state.status;
        character.userData.activity = state.activity;
        character.userData.currentTask = state.currentTask || "";

        this.updateCharacterLabel(character);
      }
    });
  }

  // ==========================================
  // KONTROL KAMERA
  // ==========================================

  bindControls() {
    let dragging = false;
    let previousX = 0;
    let previousY = 0;

    const canvas = this.renderer.domElement;

    canvas.addEventListener("pointerdown", (event) => {
      dragging = true;
      previousX = event.clientX;
      previousY = event.clientY;

      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointerup", () => {
      dragging = false;
    });

    canvas.addEventListener("pointercancel", () => {
      dragging = false;
    });

    canvas.addEventListener("pointermove", (event) => {
      if (!dragging) return;

      const dx = event.clientX - previousX;
      const dy = event.clientY - previousY;

      previousX = event.clientX;
      previousY = event.clientY;

      this.camera.position.x -= dx * 0.025;
      this.camera.position.z -= dy * 0.025;

      this.camera.lookAt(0, 0, 0);
    });

    canvas.addEventListener(
      "wheel",
      (event) => {
        const factor = event.deltaY > 0 ? 1.08 : 0.92;

        this.camera.position.multiplyScalar(factor);
        this.camera.lookAt(0, 0, 0);
      },
      { passive: true }
    );
  }

  // ==========================================
  // ANIMATION LOOP
  // ==========================================

  animate() {
    const delta = Math.min(
      this.clock.getDelta(),
      0.05
    );

    const elapsed = this.clock.elapsedTime;

    this.updateCharacters(delta, elapsed);

    this.renderer.render(
      this.scene,
      this.camera
    );
  }

  // ==========================================
  // RESIZE
  // ==========================================

  resize() {
    if (!this.container) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    if (!width || !height) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  // ==========================================
  // RESET KAMERA
  // ==========================================

  resetCamera() {
    this.camera.position.set(15, 15, 19);
    this.camera.lookAt(0, 0, 0);
  }

  // ==========================================
  // CLEANUP
  // ==========================================

  destroy() {
    this.renderer.setAnimationLoop(null);

    window.removeEventListener(
      "resize",
      this.resizeHandler
    );

    this.scene.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }

      if (object.material) {
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        materials.forEach((material) => {
          if (material.map) material.map.dispose();
          material.dispose();
        });
      }
    });

    this.renderer.dispose();

    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
