/**
 * Fail-Safe 3D Model Canvas Viewer using Three.js
 * Features: Native 100% Fail-safe Pointer Drag Orbit & Pan Controller, Custom Button Controls, Ground Bed Alignment, Slicer Rotations & Light/Dark Theme Adaptation.
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
    this.controls = null;
    this.wireframeMode = false;
    this.currentColor = 0x6366f1;
    this.currentScale = 1.0;
    this.autoRotate = false;
    this.currentTheme = 'dark';
    this.activeMode = 'rotate'; // 'rotate' or 'pan'
    this.isReady = false;
    this.targetPosition = new THREE.Vector3(0, 15, 0);

    this.init();
  }

  init() {
    if (!this.container || typeof THREE === 'undefined') {
      console.warn('Three.js not available or container missing');
      return;
    }

    try {
      const width = this.container.clientWidth || 400;
      const height = this.container.clientHeight || 350;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x0b0f19);

      this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      this.camera.position.set(100, 100, 100);
      this.camera.lookAt(this.targetPosition);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      this.container.innerHTML = '';
      this.container.appendChild(this.renderer.domElement);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
      this.scene.add(ambientLight);

      const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.95);
      dirLight1.position.set(1, 1.5, 1).normalize();
      this.scene.add(dirLight1);

      const dirLight2 = new THREE.DirectionalLight(0x06b6d4, 0.5);
      dirLight2.position.set(-1, -1, -1).normalize();
      this.scene.add(dirLight2);

      this.grid = new THREE.GridHelper(200, 20, 0x334155, 0x1e293b);
      this.grid.position.y = 0;
      this.scene.add(this.grid);

      if (typeof THREE.OrbitControls !== 'undefined') {
        try {
          this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
          this.controls.enableDamping = true;
          this.controls.dampingFactor = 0.05;
          this.controls.enablePan = true;
          this.controls.screenSpacePanning = true;
          this.controls.enableZoom = true;
          this.controls.rotateSpeed = 0.9;
          this.controls.zoomSpeed = 1.2;
          this.controls.panSpeed = 1.2;
          this.controls.target.copy(this.targetPosition);

          this.setControlMode('rotate');
        } catch (e) {
          console.warn('OrbitControls init warning:', e);
        }
      }

      this.setupNativePointerControls();

      window.addEventListener('resize', () => this.onWindowResize());
      this.isReady = true;
      this.animate();
    } catch (err) {
      console.warn('WebGL Renderer init warning:', err);
    }
  }

  /**
   * Native Fail-Safe Pointer & Drag Controller (Works on touch, trackpad, and mouse)
   */
  setupNativePointerControls() {
    if (!this.renderer || !this.renderer.domElement) return;

    const el = this.renderer.domElement;
    let isDragging = false;
    let previousPointer = { x: 0, y: 0 };
    let dragMode = 'rotate';

    el.style.touchAction = 'none';

    el.addEventListener('contextmenu', (e) => e.preventDefault());

    el.addEventListener('pointerdown', (e) => {
      isDragging = true;
      previousPointer = { x: e.clientX, y: e.clientY };
      dragMode = (e.button === 2 || e.shiftKey || this.activeMode === 'pan') ? 'pan' : 'rotate';
      try { el.setPointerCapture(e.pointerId); } catch(ex){}
    });

    el.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousPointer.x;
      const deltaY = e.clientY - previousPointer.y;
      previousPointer = { x: e.clientX, y: e.clientY };

      if (dragMode === 'pan') {
        this.panCamera(deltaX, deltaY);
      } else {
        this.orbitCamera(deltaX, deltaY);
      }
    });

    const stopDrag = (e) => {
      isDragging = false;
      try { el.releasePointerCapture(e.pointerId); } catch(ex){}
    };

    el.addEventListener('pointerup', stopDrag);
    el.addEventListener('pointercancel', stopDrag);

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.15 : 0.85;
      this.zoomCamera(factor);
    }, { passive: false });
  }

  setControlMode(mode = 'rotate') {
    this.activeMode = mode;
    if (!this.controls || typeof THREE === 'undefined') return;

    if (mode === 'pan') {
      this.controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE
      };
    } else {
      this.controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
      };
    }
  }

  orbitCamera(deltaX = 0, deltaY = 0) {
    if (!this.camera) return;
    const target = (this.controls && this.controls.target) ? this.controls.target : this.targetPosition;

    const offset = new THREE.Vector3().subVectors(this.camera.position, target);
    let radius = offset.length();
    let theta = Math.atan2(offset.x, offset.z);
    let phi = Math.acos(Math.max(-1, Math.min(1, offset.y / radius)));

    theta -= deltaX * 0.01;
    phi -= deltaY * 0.01;
    phi = Math.max(0.05, Math.min(Math.PI - 0.05, phi));

    offset.x = radius * Math.sin(phi) * Math.sin(theta);
    offset.y = radius * Math.cos(phi);
    offset.z = radius * Math.sin(phi) * Math.cos(theta);

    this.camera.position.copy(target).add(offset);
    this.camera.lookAt(target);

    if (this.controls) this.controls.update();
  }

  panCamera(deltaX = 0, deltaY = 0) {
    if (!this.camera) return;
    const target = (this.controls && this.controls.target) ? this.controls.target : this.targetPosition;
    const distance = this.camera.position.distanceTo(target);
    const factor = distance * 0.0025;

    const vRight = new THREE.Vector3();
    const vUp = new THREE.Vector3();

    this.camera.matrix.extractBasis(vRight, vUp, new THREE.Vector3());

    vRight.multiplyScalar(-deltaX * factor);
    vUp.multiplyScalar(deltaY * factor);

    this.camera.position.add(vRight).add(vUp);
    target.add(vRight).add(vUp);
    if (this.controls) this.controls.target.copy(target);
    this.camera.lookAt(target);
  }

  zoomCamera(factor = 0.85) {
    if (!this.camera) return;
    const target = (this.controls && this.controls.target) ? this.controls.target : this.targetPosition;
    const vDir = new THREE.Vector3().subVectors(this.camera.position, target);
    const distance = vDir.length();
    const newDistance = Math.max(5, Math.min(600, distance * factor));

    vDir.normalize().multiplyScalar(newDistance);
    this.camera.position.copy(target).add(vDir);
    if (this.controls) this.controls.update();
  }

  setTheme(theme = 'dark') {
    this.currentTheme = theme;
    if (!this.scene) return;

    if (theme === 'light') {
      this.scene.background = new THREE.Color(0xf8fafc);
      if (this.grid) {
        this.scene.remove(this.grid);
        this.grid = new THREE.GridHelper(200, 20, 0x64748b, 0xcbd5e1);
        this.grid.position.y = 0;
        this.scene.add(this.grid);
      }
    } else {
      this.scene.background = new THREE.Color(0x0b0f19);
      if (this.grid) {
        this.scene.remove(this.grid);
        this.grid = new THREE.GridHelper(200, 20, 0x334155, 0x1e293b);
        this.grid.position.y = 0;
        this.scene.add(this.grid);
      }
    }
  }

  animate() {
    if (!this.isReady) return;
    requestAnimationFrame(() => this.animate());
    
    if (this.autoRotate && this.mesh) {
      this.mesh.rotation.y += 0.012;
      this.alignMeshToGround();
    }

    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  alignMeshToGround() {
    if (!this.mesh) return;
    try {
      this.mesh.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(this.mesh);
      const minY = box.min.y;
      this.mesh.position.y -= minY;
      if (this.boxHelper) this.boxHelper.update();
    } catch (e) {
      console.warn('Error aligning mesh to ground:', e);
    }
  }

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
    return this.autoRotate;
  }

  setVisualRotation(degX = 0, degY = 0, degZ = 0) {
    if (!this.mesh) return;
    try {
      const radX = (degX * Math.PI) / 180.0;
      const radY = (degY * Math.PI) / 180.0;
      const radZ = (degZ * Math.PI) / 180.0;
      this.mesh.rotation.set(radX, radY, radZ);
      this.alignMeshToGround();
    } catch (e) {
      console.warn('Error setting visual rotation:', e);
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
    if (!this.isReady || !this.scene || !stlData || !stlData.positions) return;

    try {
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

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(stlData.positions, 3));

      if (stlData.normals && stlData.normals.length > 0) {
        geometry.setAttribute('normal', new THREE.BufferAttribute(stlData.normals, 3));
      } else {
        geometry.computeVertexNormals();
      }

      geometry.computeBoundingBox();
      geometry.center();

      const material = new THREE.MeshStandardMaterial({
        color: this.currentColor,
        roughness: 0.35,
        metalness: 0.15,
        wireframe: this.wireframeMode
      });

      this.mesh = new THREE.Mesh(geometry, material);
      this.currentScale = 1.0;

      this.scene.add(this.mesh);

      this.boxHelper = new THREE.BoxHelper(this.mesh, 0x06b6d4);
      this.scene.add(this.boxHelper);

      this.alignMeshToGround();
      this.resetCameraView();
    } catch (e) {
      console.warn('Error rendering 3D mesh:', e);
    }
  }

  setScale(scaleFactor = 1.0) {
    if (!this.mesh || !this.mesh.geometry) return null;

    try {
      this.currentScale = scaleFactor;
      this.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);

      const geometry = this.mesh.geometry;
      geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      const unscaledSize = new THREE.Vector3();
      box.getSize(unscaledSize);

      this.alignMeshToGround();

      return {
        x: unscaledSize.x * scaleFactor,
        y: unscaledSize.y * scaleFactor,
        z: unscaledSize.z * scaleFactor
      };
    } catch (e) {
      console.warn('Error scaling mesh:', e);
      return null;
    }
  }

  rotateAxis(axis, degrees = 90) {
    if (!this.mesh || !this.mesh.geometry) return null;

    try {
      const rad = (degrees * Math.PI) / 180.0;
      const geometry = this.mesh.geometry;

      if (axis === 'x') geometry.rotateX(rad);
      if (axis === 'y') geometry.rotateY(rad);
      if (axis === 'z') geometry.rotateZ(rad);

      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.center();

      const box = geometry.boundingBox;
      const unscaledSize = new THREE.Vector3();
      box.getSize(unscaledSize);

      this.alignMeshToGround();

      return {
        x: unscaledSize.x * this.currentScale,
        y: unscaledSize.y * this.currentScale,
        z: unscaledSize.z * this.currentScale
      };
    } catch (e) {
      console.warn('Error rotating mesh:', e);
      return null;
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

  resetCameraView() {
    if (!this.mesh || !this.camera) return;
    try {
      const geometry = this.mesh.geometry;
      geometry.computeBoundingSphere();
      const radius = geometry.boundingSphere.radius * this.currentScale;
      const distance = radius * 2.5;

      this.mesh.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(this.mesh);
      const center = new THREE.Vector3();
      box.getCenter(center);

      this.targetPosition.copy(center);

      this.camera.position.set(center.x + distance * 1.1, center.y + distance * 0.9, center.z + distance * 1.1);
      this.camera.lookAt(center);
      if (this.controls) {
        this.controls.target.copy(center);
        this.controls.update();
      }
    } catch (e) {
      console.warn('Error resetting camera:', e);
    }
  }

  resetView() {
    this.resetCameraView();
  }
}
