
import * as THREE from "three";
import { AGENTS } from "../agents.js";
import { getAgentState } from "../company.js";

export class VirtualOffice {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#101c2e");

    this.camera = new THREE.PerspectiveCamera(
      45,
      1,
      0.1,
      100
    );
    this.camera.position.set(11, 13, 17);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.characters = [];
    this.onSelect = null;

    this.build();
    this.resize();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);

    this.renderer.domElement.addEventListener(
      "pointerdown",
      event => this.handleClick(event)
    );

    this.animate();
  }

  material(color, roughness = 0.8) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness
    });
  }

  addBox(x, y, z, sx, sy, sz, color) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(sx, sy, sz),
      this.material(color)
    );

    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  build() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 17),
      this.material("#26374c")
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.scene.add(new THREE.HemisphereLight("#dbeafe", "#334155", 2));

    const light = new THREE.DirectionalLight("#ffffff", 2.5);
    light.position.set(5, 12, 8);
    light.castShadow = true;
    this.scene.add(light);

    this.addBox(0, 1.8, -8.4, 22, 3.6, 0.2, "#34465e");
    this.addBox(-10.9, 1.8, 0, 0.2, 3.6, 17, "#34465e");
    this.addBox(10.9, 1.8, 0, 0.2, 3.6, 17, "#34465e");

    // Area meja rapat
    this.addBox(0, 0.65, 0, 4.2, 0.15, 2.2, "#7d8ba0");

    // Meja kerja setiap agent
    for (const agent of AGENTS) {
      const [x, , z] = agent.position;

      this.addBox(x, 0.65, z, 2.1, 0.15, 1.1, "#8a9aaf");
      this.addBox(x, 1.1, z - 0.3, 0.8, 0.75, 0.08, "#26364c");
      this.addBox(x, 1.5, z - 0.3, 0.7, 0.05, 0.03, "#6f9fe8");

      this.createCharacter(agent);
    }
  }

  createCharacter(agent) {
    const group = new THREE.Group();
    const color = new THREE.Color(agent.color);

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.55, 4, 8),
      new THREE.MeshStandardMaterial({ color })
    );
    body.position.y = 0.72;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 12),
      this.material("#e7bd9c")
    );
    head.position.y = 1.32;
    head.castShadow = true;
    group.add(head);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.035, 8, 32),
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.65
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    group.add(ring);

    const [x, , z] = agent.position;
    group.position.set(x, 0, z + 1.1);
    group.userData.agent = agent;
    group.userData.ring = ring;

    this.scene.add(group);
    this.characters.push(group);
  }

  updateStatuses() {
    for (const character of this.characters) {
      const agent = character.userData.agent;
      const state = getAgentState(agent.id);
      const ring = character.userData.ring;

      const color = state.status === "Working"
        ? "#28c48a"
        : state.status === "Monitoring"
          ? "#f2ad54"
          : "#8d9bb0";

      ring.material.color.set(color);
    }
  }

  handleClick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();

    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    const objects = this.characters.flatMap(group => group.children);
    const hits = this.raycaster.intersectObjects(objects, true);

    if (!hits.length) return;

    let object = hits[0].object;
    while (object && !object.userData.agent) {
      object = object.parent;
    }

    if (object?.userData.agent && this.onSelect) {
      this.onSelect(object.userData.agent);
    }
  }

  resize() {
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  resetCamera() {
    this.camera.position.set(11, 13, 17);
    this.camera.lookAt(0, 0, 0);
  }

  animate() {
    this.frame = requestAnimationFrame(() => this.animate());

    for (const character of this.characters) {
      character.userData.ring.rotation.z += 0.003;
    }

    this.updateStatuses();
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    this.renderer.dispose();
  }
}
