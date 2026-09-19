function* (__imports) {
yield {"Hr": { get: () => Hr, set: value => { Hr = value; } }};
class Hr {
  constructor(e, t) {
    ((this.domContainer = e),
      (this.domVideo = t),
      (this.camera = null),
      (this.scene = null),
      (this.renderer = null),
      (this.isUserInteracting = !1),
      (this.lon = 0),
      (this.lat = 0),
      (this.phi = 0),
      (this.theta = 0),
      (this.distance = 50),
      (this.onPointerDownPointerX = 0),
      (this.onPointerDownPointerY = 0),
      (this.onPointerDownLon = 0),
      (this.onPointerDownLat = 0),
      (this.onDocumentMouseDown = this.onDocumentMouseDown.bind(this)),
      (this.onDocumentMouseMove = this.onDocumentMouseMove.bind(this)),
      (this.onDocumentMouseUp = this.onDocumentMouseUp.bind(this)),
      (this.onDocumentMouseWheel = this.onDocumentMouseWheel.bind(this)),
      (this.onWindowResize = this.onWindowResize.bind(this)),
      this.init());
  }
  init() {
    var e = this.domContainer,
      t =
        ((this.camera = new THREE.PerspectiveCamera(
          75,
          this.domVideo.videoWidth / this.domVideo.videoHeight,
          1,
          1100,
        )),
        (this.camera.target = new THREE.Vector3(0, 0, 0)),
        (this.scene = new THREE.Scene()),
        new THREE.SphereBufferGeometry(500, 60, 40)),
      o = (t.scale(-1, 1, 1), new THREE.VideoTexture(this.domVideo));
    ((o.minFilter = THREE.LinearFilter),
      (o = new THREE.MeshBasicMaterial({ map: o })),
      (t = new THREE.Mesh(t, o)),
      this.scene.add(t),
      (this.renderer = new THREE.WebGLRenderer()),
      this.renderer.setPixelRatio(window.devicePixelRatio),
      this.renderer.setSize(
        this.domVideo.clientWidth,
        this.domVideo.clientHeight,
      ),
      e.appendChild(this.renderer.domElement),
      e.addEventListener("mousedown", this.onDocumentMouseDown, !1),
      e.addEventListener("mousemove", this.onDocumentMouseMove, !1),
      e.addEventListener("mouseup", this.onDocumentMouseUp, !1),
      e.addEventListener("wheel", this.onDocumentMouseWheel, !1),
      window.addEventListener("resize", this.onWindowResize, !1));
  }
  onWindowResize() {
    ((this.camera.aspect =
      this.domVideo.videoWidth / this.domVideo.videoHeight),
      this.camera.updateProjectionMatrix(),
      this.renderer.setSize(
        this.domVideo.clientWidth,
        this.domVideo.clientHeight,
      ));
  }
  onDocumentMouseDown(e) {
    ((this.isUserInteracting = !0),
      (this.onPointerDownPointerX = e.clientX),
      (this.onPointerDownPointerY = e.clientY),
      (this.onPointerDownLon = this.lon),
      (this.onPointerDownLat = this.lat));
  }
  onDocumentMouseMove(e) {
    !0 === this.isUserInteracting &&
      ((this.lon =
        0.1 * (this.onPointerDownPointerX - e.clientX) + this.onPointerDownLon),
      (this.lat =
        0.1 * (e.clientY - this.onPointerDownPointerY) +
        this.onPointerDownLat));
  }
  onDocumentMouseUp() {
    this.isUserInteracting = !1;
  }
  onDocumentMouseWheel(e) {
    ((this.distance += 0.05 * e.deltaY),
      (this.distance = THREE.Math.clamp(this.distance, 1, 50)));
  }
  update() {
    ((this.lat = Math.max(-85, Math.min(85, this.lat))),
      (this.phi = THREE.Math.degToRad(90 - this.lat)),
      (this.theta = THREE.Math.degToRad(this.lon)),
      (this.camera.position.x =
        this.distance * Math.sin(this.phi) * Math.cos(this.theta)),
      (this.camera.position.y = this.distance * Math.cos(this.phi)),
      (this.camera.position.z =
        this.distance * Math.sin(this.phi) * Math.sin(this.theta)),
      this.camera.lookAt(this.camera.target),
      this.renderer.render(this.scene, this.camera));
  }
}

}
