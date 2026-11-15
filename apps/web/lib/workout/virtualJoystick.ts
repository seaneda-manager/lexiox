/**
 * 폰용 가상 조이패드: 큰 원 안에서 작은 원(썸)을 끌어 방향을 입력한다.
 * - 터치 기기에서만 보인다(showAlways로 강제 표시 가능).
 * - vec.x / vec.y 는 -1~1 (데드존 12%), vec.active 는 손가락이 올려져 있는지.
 * - Phaser 씬마다 하나씩 만들고, 씬이 shutdown 되면 스스로 정리한다.
 */
export type Joystick = {
  vec: { x: number; y: number; active: boolean };
  setVisible: (v: boolean) => void;
  destroy: () => void;
  visible: boolean;
};

export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return navigator.maxTouchPoints > 0 || !!window.matchMedia?.("(pointer: coarse)").matches;
}

export function createJoystick(
  scene: Phaser.Scene,
  opts: { x: number; y: number; radius?: number; depth?: number; showAlways?: boolean },
): Joystick {
  const R = opts.radius ?? 60;
  const depth = opts.depth ?? 90;
  const show = !!opts.showAlways || isTouchDevice();

  const base = scene.add.circle(opts.x, opts.y, R, 0xffffff, 0.1).setStrokeStyle(3, 0xffffff, 0.45).setScrollFactor(0).setDepth(depth);
  const inner = scene.add.circle(opts.x, opts.y, R * 0.5, 0xffffff, 0.03).setStrokeStyle(1.5, 0xffffff, 0.22).setScrollFactor(0).setDepth(depth);
  const thumb = scene.add.circle(opts.x, opts.y, R * 0.42, 0xffffff, 0.5).setStrokeStyle(2, 0xffffff, 0.85).setScrollFactor(0).setDepth(depth + 1);
  const parts = [base, inner, thumb];
  parts.forEach((o) => o.setVisible(show));

  const vec = { x: 0, y: 0, active: false };
  let pid: number | null = null;

  const reset = () => {
    pid = null;
    vec.x = 0;
    vec.y = 0;
    vec.active = false;
    thumb.setPosition(opts.x, opts.y).setFillStyle(0xffffff, 0.5);
  };

  const update = (p: Phaser.Input.Pointer) => {
    let dx = p.x - opts.x;
    let dy = p.y - opts.y;
    const d = Math.hypot(dx, dy);
    const k = d > R ? R / d : 1;
    dx *= k;
    dy *= k;
    thumb.setPosition(opts.x + dx, opts.y + dy);
    const dead = 0.12;
    const nx = dx / R;
    const ny = dy / R;
    vec.x = Math.abs(nx) < dead ? 0 : nx;
    vec.y = Math.abs(ny) < dead ? 0 : ny;
    vec.active = vec.x !== 0 || vec.y !== 0;
  };

  const onDown = (p: Phaser.Input.Pointer) => {
    if (!joy.visible || pid !== null) return;
    if (Math.hypot(p.x - opts.x, p.y - opts.y) <= R * 1.7) {
      pid = p.id;
      thumb.setFillStyle(0xffffff, 0.8);
      update(p);
    }
  };
  const onMove = (p: Phaser.Input.Pointer) => {
    if (pid === p.id) update(p);
  };
  const onUp = (p: Phaser.Input.Pointer) => {
    if (pid === p.id) reset();
  };

  scene.input.on("pointerdown", onDown);
  scene.input.on("pointermove", onMove);
  scene.input.on("pointerup", onUp);
  scene.input.on("pointerupoutside", onUp);

  const destroy = () => {
    scene.input?.off("pointerdown", onDown);
    scene.input?.off("pointermove", onMove);
    scene.input?.off("pointerup", onUp);
    scene.input?.off("pointerupoutside", onUp);
  };
  scene.events.once("shutdown", destroy);

  const joy: Joystick = {
    vec,
    visible: show,
    setVisible: (v: boolean) => {
      joy.visible = v;
      parts.forEach((o) => o.setVisible(v));
      if (!v) reset();
    },
    destroy,
  };
  return joy;
}
