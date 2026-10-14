/**
 * three.js viewer for the FitPlate panel.
 *
 * What is drawn, and from where:
 *  - the plate is the *real* tessellation of the published STEP file
 *    (`preview_mesh.json`), never a hand-built box that "looks the same";
 *  - fixed environment cylinders come from the frozen scene;
 *  - the blue device body and the orange connector-access envelope are placed
 *    by the pose the caller resolved (measured G04 pose preferred, candidate
 *    pose labelled as unverified by the panel).
 *
 * Everything the viewer allocates is released by `dispose()`: geometries,
 * materials, the WebGL context, DOM listeners and the resize observer. The
 * class has no React dependency so it can live across renders and be torn down
 * exactly once.
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { DecodedMesh } from './mesh.ts'
import type { SceneEnvelope } from './scene-model.ts'

export type CameraPreset = 'iso' | 'top' | 'side' | 'front'

export interface VisibilityState {
  plate: boolean
  device: boolean
  connector: boolean
  environment: boolean
}

export interface CameraState {
  position: [number, number, number]
  target: [number, number, number]
}

export interface PoseDelta {
  dx: number
  dy: number
  dz: number
  label: string
}

export interface ViewerOptions {
  container: HTMLElement
  onError?: (message: string, detail?: string) => void
  onUserChange?: () => void
}

const COLORS = {
  plate: 0x9aa2ab,
  device: 0x2f7fd0,
  connector: 0xe0891f,
  environment: 0x707880,
  screwHead: 0x8d939b,
  highlight: 0xd8342a,
  /** The comparison baseline's real STEP mesh, drawn as a ghost overlay. */
  reference: 0x8a5cf5,
} as const

const ROLE_COLORS: Record<string, number> = {
  fixed_obstacle: COLORS.environment,
  screw_head_envelope: COLORS.screwHead,
  sensor_body: COLORS.device,
  connector_access: COLORS.connector,
}

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      canvas.getContext('webgl2') ??
        canvas.getContext('webgl') ??
        canvas.getContext('experimental-webgl'),
    )
  } catch {
    return false
  }
}

export class WorkbenchViewer {
  readonly available: boolean

  private readonly container: HTMLElement
  private readonly onError: ((message: string, detail?: string) => void) | undefined
  private readonly onUserChange: (() => void) | undefined
  private renderer: THREE.WebGLRenderer | null = null
  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private controls: OrbitControls | null = null
  private resizeObserver: ResizeObserver | null = null
  private frameHandle: number | null = null
  private tween: {
    group: THREE.Group
    from: THREE.Vector3
    to: THREE.Vector3
    startedAt: number
    durationMs: number
    label: string
  } | null = null
  private disposed = false

  private readonly groups = {
    plate: new THREE.Group(),
    device: new THREE.Group(),
    connector: new THREE.Group(),
    environment: new THREE.Group(),
    reference: new THREE.Group(),
  }

  private readonly disposables: { dispose(): void }[] = []
  private readonly highlightTargets = new Map<string, THREE.Mesh>()
  private readonly visibility: VisibilityState = {
    plate: true,
    device: true,
    connector: true,
    environment: true,
  }
  private bounds: THREE.Box3 | null = null
  private framedOnce = false
  private highlightIds: string[] = []

  constructor(options: ViewerOptions) {
    this.container = options.container
    this.onError = options.onError
    this.onUserChange = options.onUserChange
    this.available = isWebGLAvailable()
    if (!this.available) {
      this.onError?.('当前浏览器环境不支持 WebGL，三维视图不可用（其余数据仍可查看）')
      return
    }
    try {
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2))
      renderer.setSize(this.container.clientWidth || 640, this.container.clientHeight || 420, false)
      renderer.domElement.setAttribute('data-fitplate-canvas', '1')
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      renderer.domElement.style.display = 'block'
      this.container.appendChild(renderer.domElement)
      this.renderer = renderer

      const scene = new THREE.Scene()
      scene.background = null
      this.scene = scene
      for (const group of Object.values(this.groups)) scene.add(group)

      const camera = new THREE.PerspectiveCamera(
        45,
        (this.container.clientWidth || 640) / (this.container.clientHeight || 420),
        0.5,
        20000,
      )
      // The project frame is Z-up (plate plane is XY); three.js defaults to Y-up.
      camera.up.set(0, 0, 1)
      camera.position.set(220, -260, 220)
      this.camera = camera

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.12
      controls.addEventListener('change', () => {
        this.onUserChange?.()
        this.invalidate()
      })
      this.controls = controls

      scene.add(new THREE.AmbientLight(0xffffff, 0.75))
      const hemi = new THREE.HemisphereLight(0xdfe8ee, 0x4a5057, 1.1)
      hemi.position.set(0, 0, 500)
      scene.add(hemi)
      const key = new THREE.DirectionalLight(0xffffff, 1.4)
      key.position.set(320, -420, 520)
      scene.add(key)
      const fill = new THREE.DirectionalLight(0xffffff, 0.5)
      fill.position.set(-260, 300, -180)
      scene.add(fill)

      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => this.handleResize())
        this.resizeObserver.observe(this.container)
      }
      globalThis.addEventListener('resize', this.handleResize)
      this.invalidate()
    } catch (error) {
      this.available = false
      this.onError?.(
        'three.js 初始化失败，三维视图不可用（其余数据仍可查看）',
        error instanceof Error ? error.message : String(error),
      )
      this.teardown()
    }
  }

  private handleResize = (): void => {
    if (!this.renderer || !this.camera) return
    const width = this.container.clientWidth || 1
    const height = this.container.clientHeight || 1
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.invalidate()
  }

  // -- content -------------------------------------------------------------

  setMesh(mesh: DecodedMesh | null): void {
    this.clearGroup(this.groups.plate)
    if (!mesh || !this.scene) return
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3))
    geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1))
    geometry.computeVertexNormals()
    geometry.computeBoundingBox()
    const material = new THREE.MeshStandardMaterial({
      color: COLORS.plate,
      metalness: 0.15,
      roughness: 0.78,
      side: THREE.DoubleSide,
      flatShading: false,
    })
    const plate = new THREE.Mesh(geometry, material)
    plate.name = 'plate'
    plate.userData.objectId = 'plate'
    this.groups.plate.add(plate)
    this.disposables.push(geometry, material)
    this.highlightTargets.set('plate', plate)
    if (geometry.boundingBox) {
      const box = geometry.boundingBox.clone()
      // Grow the framing box slightly so the plate does not touch the border.
      this.bounds = box.expandByScalar(Math.max(6, box.getSize(new THREE.Vector3()).length() * 0.06))
    }
    if (!this.framedOnce) {
      this.framedOnce = true
      this.frameAll()
    }
    this.applyHighlight()
    this.invalidate()
  }

  /**
   * Overlay the baseline candidate's own real STEP mesh as a semi-transparent
   * ghost (P02-07 comparison). It never replaces the current mesh, never
   * touches the camera and is only ever a decoded mesh — a missing baseline
   * mesh is the caller's "unavailable" case, never a schematic placeholder.
   * `null` removes the overlay.
   */
  setReferenceMesh(mesh: DecodedMesh | null): void {
    this.clearGroup(this.groups.reference)
    if (!mesh || !this.scene) return
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3))
    geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1))
    geometry.computeVertexNormals()
    geometry.computeBoundingBox()
    const material = new THREE.MeshStandardMaterial({
      color: COLORS.reference,
      metalness: 0.05,
      roughness: 0.9,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    const ghost = new THREE.Mesh(geometry, material)
    ghost.name = 'reference'
    ghost.userData.objectId = 'reference'
    ghost.renderOrder = 1
    this.groups.reference.add(ghost)
    this.disposables.push(geometry, material)
    this.invalidate()
  }

  /** True when a baseline ghost mesh is currently drawn (fixture assertion hook). */
  hasReferenceMesh(): boolean {
    return this.groups.reference.children.length > 0
  }

  setEnvelopes(envelopes: readonly SceneEnvelope[]): void {
    this.clearGroup(this.groups.device)
    this.clearGroup(this.groups.connector)
    this.clearGroup(this.groups.environment)
    for (const envelope of envelopes) {
      const target =
        envelope.id === 'sensor_body'
          ? this.groups.device
          : envelope.role === 'connector_access'
            ? this.groups.connector
            : this.groups.environment
      if (envelope.kind === 'cylinder') {
        const geometry = new THREE.CylinderGeometry(envelope.radius, envelope.radius, envelope.height, 40, 1, false)
        // CylinderGeometry is Y-up; rotate it onto the project's Z axis.
        geometry.rotateX(Math.PI / 2)
        const material = new THREE.MeshStandardMaterial({
          color: ROLE_COLORS[envelope.role] ?? COLORS.environment,
          transparent: true,
          opacity: envelope.role === 'screw_head_envelope' ? 0.55 : 0.45,
          metalness: 0.1,
          roughness: 0.7,
          side: THREE.DoubleSide,
        })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set(envelope.center[0], envelope.center[1], envelope.center[2])
        mesh.name = envelope.id
        mesh.userData.objectId = envelope.id
        mesh.userData.role = envelope.role
        mesh.userData.movable = envelope.movable
        target.add(mesh)
        this.disposables.push(geometry, material)
        this.highlightTargets.set(envelope.id, mesh)
        this.addEdges(mesh, geometry, ROLE_COLORS[envelope.role] ?? COLORS.environment)
      } else {
        const geometry = new THREE.BoxGeometry(envelope.size[0], envelope.size[1], envelope.size[2])
        const material = new THREE.MeshStandardMaterial({
          color: ROLE_COLORS[envelope.role] ?? COLORS.device,
          transparent: true,
          opacity: 0.38,
          metalness: 0.05,
          roughness: 0.6,
          side: THREE.DoubleSide,
        })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set(envelope.center[0], envelope.center[1], envelope.center[2])
        mesh.name = envelope.id
        mesh.userData.objectId = envelope.id
        mesh.userData.role = envelope.role
        mesh.userData.movable = envelope.movable
        target.add(mesh)
        this.disposables.push(geometry, material)
        this.highlightTargets.set(envelope.id, mesh)
        this.addEdges(mesh, geometry, ROLE_COLORS[envelope.role] ?? COLORS.device)
      }
    }
    this.applyVisibility()
    this.applyHighlight()
    this.invalidate()
  }

  private addEdges(mesh: THREE.Mesh, geometry: THREE.BufferGeometry, color: number): void {
    const edges = new THREE.EdgesGeometry(geometry)
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 })
    const lines = new THREE.LineSegments(edges, material)
    mesh.add(lines)
    this.disposables.push(edges, material)
  }

  private clearGroup(group: THREE.Group): void {
    for (const child of [...group.children]) {
      group.remove(child)
      const record = child as THREE.Mesh & { userData: { objectId?: string } }
      if (record.userData?.objectId) this.highlightTargets.delete(record.userData.objectId)
    }
  }

  private teardown(): void {
    if (this.renderer) {
      this.container.removeChild(this.renderer.domElement)
      this.renderer.dispose()
      this.renderer.forceContextLoss()
      this.renderer = null
    }
    this.controls?.dispose()
    this.controls = null
    this.scene = null
    this.camera = null
  }

  // -- visibility & highlight ---------------------------------------------

  setVisibility(next: Partial<VisibilityState>): void {
    Object.assign(this.visibility, next)
    this.applyVisibility()
    this.invalidate()
  }

  getVisibility(): VisibilityState {
    return { ...this.visibility }
  }

  private applyVisibility(): void {
    this.groups.plate.visible = this.visibility.plate
    this.groups.device.visible = this.visibility.device
    this.groups.connector.visible = this.visibility.connector
    this.groups.environment.visible = this.visibility.environment
  }

  setHighlight(ids: readonly string[]): void {
    this.highlightIds = [...ids]
    this.applyHighlight()
    this.invalidate()
  }

  getHighlight(): string[] {
    return [...this.highlightIds]
  }

  private applyHighlight(): void {
    for (const [id, mesh] of this.highlightTargets) {
      const material = mesh.material as THREE.MeshStandardMaterial
      const highlighted = this.highlightIds.includes(id)
      if (!material.userData.base) {
        material.userData.base = {
          color: material.color.getHex(),
          opacity: material.opacity,
          transparent: material.transparent,
          emissive: material.emissive ? material.emissive.getHex() : 0x000000,
        }
      }
      const base = material.userData.base as { color: number; opacity: number; transparent: boolean; emissive: number }
      if (highlighted) {
        material.color.setHex(COLORS.highlight)
        material.emissive?.setHex(0x5a0f08)
        material.opacity = Math.max(base.opacity, 0.75)
        material.transparent = true
      } else {
        material.color.setHex(base.color)
        material.emissive?.setHex(base.emissive)
        material.opacity = base.opacity
        material.transparent = base.transparent
      }
      material.needsUpdate = true
    }
  }

  // -- camera --------------------------------------------------------------

  setCamera(preset: CameraPreset): void {
    if (!this.camera || !this.controls) return
    const box = this.bounds ?? new THREE.Box3(new THREE.Vector3(-60, -60, 0), new THREE.Vector3(60, 60, 10))
    const center = box.getCenter(new THREE.Vector3())
    const radius = Math.max(box.getSize(new THREE.Vector3()).length() * 0.9, 80)
    const direction =
      preset === 'top'
        ? new THREE.Vector3(0, 0, 1)
        : preset === 'side'
          ? new THREE.Vector3(1, 0, 0)
          : preset === 'front'
            ? new THREE.Vector3(0, -1, 0)
            : new THREE.Vector3(1, -1.15, 0.85).normalize()
    this.controls.target.copy(center)
    this.camera.position.copy(center.clone().add(direction.multiplyScalar(radius)))
    if (preset === 'top') {
      // A straight-down view needs a stable in-plane "up" for OrbitControls.
      this.camera.up.set(0, 1, 0)
      this.camera.position.copy(center.clone().add(new THREE.Vector3(0, 0.001, radius)))
    } else {
      this.camera.up.set(0, 0, 1)
    }
    this.camera.updateProjectionMatrix()
    this.controls.update()
    this.invalidate()
  }

  resetCamera(): void {
    this.frameAll()
  }

  frameAll(): void {
    const box = this.bounds ?? new THREE.Box3(new THREE.Vector3(-60, -60, 0), new THREE.Vector3(60, 60, 10))
    const center = box.getCenter(new THREE.Vector3())
    // Fit projected box corners, including depth, to the actual viewport.
    // A sphere wastes most of a short/wide pane on empty space around a flat plate.
    const direction = new THREE.Vector3(0.85, -1.05, 0.75).normalize()
    const right = new THREE.Vector3(0, 0, 1).cross(direction).normalize()
    const up = direction.clone().cross(right).normalize()
    const tanVertical = Math.tan(THREE.MathUtils.degToRad((this.camera?.fov ?? 45) / 2))
    const tanHorizontal = tanVertical * Math.max(this.camera?.aspect ?? 1, 0.1)
    let radius = 60
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const point = new THREE.Vector3(x, y, z).sub(center)
      radius = Math.max(radius, point.dot(direction) + Math.max(Math.abs(point.dot(right)) / tanHorizontal, Math.abs(point.dot(up)) / tanVertical))
    }
    radius *= 1.12
    if (this.camera && this.controls) {
      this.camera.up.set(0, 0, 1)
      this.camera.position.copy(center.clone().add(new THREE.Vector3(0.85, -1.05, 0.75).normalize().multiplyScalar(radius)))
      this.controls.target.copy(center)
      this.camera.updateProjectionMatrix()
      this.controls.update()
    }
    this.invalidate()
  }

  focusObjects(ids: readonly string[]): void {
    const targets = ids.map((id) => this.highlightTargets.get(id)).filter((mesh): mesh is THREE.Mesh => Boolean(mesh))
    if (targets.length === 0 || !this.camera || !this.controls) return
    const box = new THREE.Box3()
    for (const mesh of targets) {
      mesh.updateWorldMatrix(true, false)
      box.expandByObject(mesh)
    }
    if (box.isEmpty()) return
    const center = box.getCenter(new THREE.Vector3())
    const size = Math.max(box.getSize(new THREE.Vector3()).length(), 20)
    const direction = this.camera.position.clone().sub(this.controls.target)
    if (direction.lengthSq() < 1e-6) direction.set(1, -1, 0.8)
    direction.normalize()
    this.controls.target.copy(center)
    this.camera.position.copy(center.clone().add(direction.multiplyScalar(size * 1.6)))
    this.controls.update()
    this.invalidate()
  }

  getCameraState(): CameraState | null {
    if (!this.camera || !this.controls) return null
    const { x, y, z } = this.camera.position
    const target = this.controls.target
    return { position: [x, y, z], target: [target.x, target.y, target.z] }
  }

  setCameraState(state: CameraState): void {
    if (!this.camera || !this.controls) return
    this.camera.position.set(state.position[0], state.position[1], state.position[2])
    this.controls.target.set(state.target[0], state.target[1], state.target[2])
    this.controls.update()
    this.invalidate()
  }

  // -- version-change indication ------------------------------------------

  /**
   * Animate the movable envelopes by a delta and settle them at their real
   * place. This is explicitly a *schematic* of the change between two versions,
   * not a motion plan: nothing here checks collision along the path.
   */
  animatePoseDelta(delta: PoseDelta): void {
    if (!this.scene || !this.camera) return
    const group = new THREE.Group()
    group.name = 'pose-delta'
    group.position.set(delta.dx, delta.dy, delta.dz)
    group.add(this.groups.device, this.groups.connector)
    this.scene.add(group)
    this.tween = {
      group,
      from: new THREE.Vector3(delta.dx, delta.dy, delta.dz),
      to: new THREE.Vector3(0, 0, 0),
      startedAt: performance.now(),
      durationMs: 700,
      label: delta.label,
    }
    this.invalidate()
  }

  get activeTweenLabel(): string | null {
    return this.tween?.label ?? null
  }

  private stepTween(now: number): boolean {
    if (!this.tween || !this.scene) return false
    const t = Math.min(1, (now - this.tween.startedAt) / this.tween.durationMs)
    const eased = 1 - (1 - t) * (1 - t)
    this.tween.group.position.lerpVectors(this.tween.from, this.tween.to, eased)
    if (t >= 1) {
      // Settle: put the movable groups back under the scene root at origin.
      const { group } = this.tween
      group.remove(this.groups.device, this.groups.connector)
      this.scene.add(this.groups.device, this.groups.connector)
      this.scene.remove(group)
      this.tween = null
    }
    return this.tween !== null
  }

  // -- render loop ---------------------------------------------------------

  invalidate(): void {
    if (this.disposed || !this.renderer || this.frameHandle !== null) return
    this.frameHandle = requestAnimationFrame(this.renderFrame)
  }

  private renderFrame = (now: number): void => {
    this.frameHandle = null
    if (!this.renderer || !this.scene || !this.camera) return
    const tweening = this.stepTween(now)
    this.controls?.update()
    this.renderer.render(this.scene, this.camera)
    if (tweening) this.invalidate()
  }

  /** True once the WebGL context, listeners and geometries have been released. */
  get isDisposed(): boolean {
    return this.disposed
  }

  /** Test/diagnostic helper: rendered object counts by group. */
  describe(): { plate: number; device: number; connector: number; environment: number; highlight: string[] } {
    return {
      plate: this.groups.plate.children.length,
      device: this.groups.device.children.length,
      connector: this.groups.connector.children.length,
      environment: this.groups.environment.children.length,
      highlight: this.getHighlight(),
    }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    if (this.frameHandle !== null) {
      cancelAnimationFrame(this.frameHandle)
      this.frameHandle = null
    }
    this.tween = null
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    globalThis.removeEventListener('resize', this.handleResize)
    for (const group of Object.values(this.groups)) {
      this.clearGroup(group)
      for (const child of [...group.children]) {
        const editable = child as THREE.Object3D & { geometry?: THREE.BufferGeometry }
        editable.geometry?.dispose()
      }
    }
    for (const item of this.disposables) item.dispose()
    this.disposables.length = 0
    this.highlightTargets.clear()
    this.teardown()
  }
}
