// src/components/draggable.js
// Very simple desktop drag along ground plane (Y=0).
// Enable/disable via element.setAttribute('draggable', 'enabled: true/false')
AFRAME.registerComponent('draggable', {
  schema: { enabled: {type: 'boolean', default: false} },
  init() {
    this._dragging = false;
    this._onDown = this._onDown.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onUp = this._onUp.bind(this);
    this.el.addEventListener('mousedown', this._onDown);
    window.addEventListener('mousemove', this._onMove);
    window.addEventListener('mouseup', this._onUp);
    // Touch
    this.el.addEventListener('touchstart', this._onDown, {passive:false});
    window.addEventListener('touchmove', this._onMove, {passive:false});
    window.addEventListener('touchend', this._onUp);
  },
  remove() {
    this.el.removeEventListener('mousedown', this._onDown);
    window.removeEventListener('mousemove', this._onMove);
    window.removeEventListener('mouseup', this._onUp);
    this.el.removeEventListener('touchstart', this._onDown);
    window.removeEventListener('touchmove', this._onMove);
    window.removeEventListener('touchend', this._onUp);
  },
  _rayToGround(clientX, clientY) {
    const scene = this.el.sceneEl;
    const camera = scene.camera;
    const rect = scene.canvas.getBoundingClientRect();
    const x = ( (clientX - rect.left) / rect.width ) * 2 - 1;
    const y = - ( (clientY - rect.top) / rect.height ) * 2 + 1;
    // Ray in THREE.js
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({x, y}, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y=0
    const hit = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, hit);
    return hit;
  },
  _onDown(e) {
    if (!this.data.enabled) return;
    this._dragging = true;
    const p = e.touches ? e.touches[0] : e;
    this._last = this._rayToGround(p.clientX, p.clientY);
    e.preventDefault?.();
  },
  _onMove(e) {
    if (!this._dragging) return;
    const p = e.touches ? e.touches[0] : e;
    const hit = this._rayToGround(p.clientX, p.clientY);
    if (!hit) return;
    const el3 = this.el.object3D.position;
    // Lerp toward hit for stability
    el3.lerp(hit, 0.35);
  },
  _onUp() {
    this._dragging = false;
  }
});