export type LegPose = {
  thigh: number;
  knee: number;
  foot: number;
};

export type WalkPose = {
  front: LegPose;
  back: LegPose;
  liftX: number;
  liftY: number;
};

const UPPER_LEG = 48.5;
const LOWER_LEG = 51;
const LEG_REACH_Y = 96;
const STEP_REACH = 17;
const SWING_LIFT = 11;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const degrees = (radians: number) => radians * 180 / Math.PI;

function footTarget(phase: number) {
  const cycle = ((phase % 1) + 1) % 1;
  if (cycle < .62) {
    const stance = cycle / .62;
    return { x: STEP_REACH - stance * STEP_REACH * 2, y: LEG_REACH_Y };
  }
  const swing = (cycle - .62) / .38;
  const eased = swing * swing * (3 - 2 * swing);
  return {
    x: -STEP_REACH + eased * STEP_REACH * 2,
    y: LEG_REACH_Y - Math.sin(Math.PI * swing) * SWING_LIFT,
  };
}

function solveLeg(phase: number): LegPose {
  const target = footTarget(phase);
  const rawDistance = Math.hypot(target.x, target.y);
  const distance = clamp(rawDistance, Math.abs(UPPER_LEG - LOWER_LEG) + .01, UPPER_LEG + LOWER_LEG - .2);
  const direction = Math.atan2(target.x, target.y);
  const hipBend = Math.acos(clamp((UPPER_LEG ** 2 + distance ** 2 - LOWER_LEG ** 2) / (2 * UPPER_LEG * distance), -1, 1));
  const kneeBend = Math.PI - Math.acos(clamp((UPPER_LEG ** 2 + LOWER_LEG ** 2 - distance ** 2) / (2 * UPPER_LEG * LOWER_LEG), -1, 1));
  // SVG's positive rotation turns a downward vector towards the left, so the
  // screen-space target direction is the negative of the usual atan2 angle.
  const thigh = degrees(-(direction + hipBend));
  const knee = degrees(kneeBend);
  return { thigh, knee, foot: -(thigh + knee) };
}

export function walkPoseAt(phase: number): WalkPose {
  const safe = ((phase % 1) + 1) % 1;
  return {
    front: solveLeg(safe),
    back: solveLeg((safe + .5) % 1),
    liftX: Math.sin(safe * Math.PI * 2) * .8,
    liftY: -Math.abs(Math.sin(safe * Math.PI * 2)) * 1.4,
  };
}

export function applyWalkPose(element: HTMLElement, phase: number) {
  const pose = walkPoseAt(phase);
  element.style.setProperty('--front-thigh-angle', `${pose.front.thigh.toFixed(3)}deg`);
  element.style.setProperty('--front-knee-angle', `${pose.front.knee.toFixed(3)}deg`);
  element.style.setProperty('--front-foot-angle', `${pose.front.foot.toFixed(3)}deg`);
  element.style.setProperty('--back-thigh-angle', `${pose.back.thigh.toFixed(3)}deg`);
  element.style.setProperty('--back-knee-angle', `${pose.back.knee.toFixed(3)}deg`);
  element.style.setProperty('--back-foot-angle', `${pose.back.foot.toFixed(3)}deg`);
  element.style.setProperty('--walk-lift-x', `${pose.liftX.toFixed(3)}px`);
  element.style.setProperty('--walk-lift-y', `${pose.liftY.toFixed(3)}px`);
}
