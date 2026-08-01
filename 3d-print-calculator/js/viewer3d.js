/**
 * 3D Model Interactive Canvas Viewer using Three.js
 */
class ModelViewer3D {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.mesh = null;
    this.grid = null;
    this.boxHelper = null;
    this.wireframeMode = false;
    this.currentColor = 0x6366f1; // Indigo modern accent

    this.init();
  }

  init() {
    if (!this.container) return;

    // Canvas size
    const width = this.container.clientWidth || 400;
    const height = this.container.clientHeight || 350;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a); // Slate-900

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(100, 100, 100);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Clear old elements if any
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(1, 1, 1).normalize();
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x06b6d4, 0.5); // Cyan rim light
    dirLight2.position.set(-1, -1, -1).normalize();
    this.scene.add(dirLight2);

    // Grid helper
    this.grid = new THREE.GridHelper(200, 20, 0x334155, 0x1e293b);
    this.grid.position.y = 0;
    this.scene.add(this.grid);

    // Simple mouse controls fallback if OrbitControls is attached
    if (typeof THREE.OrbitControls !== 'undefined') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
    }

    // Window resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Animation Loop
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  loadGeometry(stlData) {
    if (!this.scene) return;

    // Remove existing mesh & helpers
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      if (Array.isArray(this.mesh.material)) {
        this.mesh.material.forEach(m => m.dispose());
      } else {
        this.mesh.material.dispose();
      }
      this.mesh = null;
    }
    if (this.boxHelper) {
      this.scene.remove(this.boxHelper);
      this.boxHelper = null;
    }

    // Build BufferGeometry from STL positions
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(stlData.positions, 3));

    if (stlData.normals && stlData.normals.length > 0) {
      geometry.setAttribute('normal', new THREE.BufferAttribute(stlData.normals, 3));
    } else {
      geometry.computeVertexNormals();
    }

    // Center geometry at origin
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const center = new THREE.Vector3();
    box.getCenter(center);
    geometry.center();

    // Material
    const material = new THREE.MeshStandardMaterial({
      color: this.currentColor,
      roughness: 0.3,
      metalness: 0.1,
      wireframe: this.wireframeMode
    });

    this.mesh = new THREE.Mesh(geometry, material);
    
    // Place base on grid (Y=0)
    const size = new THREE.Vector3();
    box.getSize(size);
    this.mesh.position.y = size.y / 2;

    this.scene.add(this.mesh);

    // Bounding Box Helper
    this.boxHelper = new THREE.BoxHelper(this.mesh, 0x06b6d4);
    this.scene.add(this.boxHelper);

    // Adjust camera position based on object bounding sphere
    geometry.computeBoundingSphere();
    const radius = geometry.boundingSphere.radius;
    const distance = radius * 2.5;

    this.camera.position.set(distance, distance * 0.8, distance);
    this.camera.lookAt(0, size.y / 2, 0);

    if (this.controls) {
      this.controls.target.set(0, size.y / 2, 0);
      this.controls.update();
    }
  }

  setWireframe(enabled) {
    this.wireframeMode = enabled;
    if (this.mesh && this.mesh.material) {
      this.mesh.material.wireframe = enabled;
    }
  }

  setColor(hexColor) {
    this.currentColor = hexColor;
    if (this.mesh && this.mesh.material) {
      this.mesh.material.color.setHex(hexColor);
    }
  }

  resetView() {
    if (!this.mesh) return;
    const geometry = this.mesh.geometry;
    geometry.computeBoundingSphere();
    const radius = geometry.boundingSphere.radius;
    const distance = radius * 2.5;
    const box = geometry.boundingBox;
    const size = new THREE.Vector3();
    box.getSize(size);

    this.camera.position.set(distance, distance * 0.8, distance);
    this.camera.lookAt(0, size.y / 2, 0);
    if (this.controls) {
      this.controls.target.set(0, size.y / 2, 0);
      this.controls.update();
    }
  }
}
