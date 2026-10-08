// The checks behind the "Take a photo" auto-capture. Pure functions: the
// detector's output and a few pixels of the frame go in, a verdict comes out.
//
// Geometry: the preview is 496 x 372 and shows the camera "cover"-fitted. The
// face guide is an oval about 45% of the preview's width and 76% of its
// height, centred.

export const PREVIEW = { w: 496, h: 372 };
export const OVAL = { cx: PREVIEW.w / 2, cy: PREVIEW.h / 2, rx: (PREVIEW.w * 0.45) / 2, ry: (PREVIEW.h * 0.76) / 2 };

export const LIMITS = {
  faceMin: 0.3, // face height / oval height
  faceMax: 0.6,
  centred: 0.75, // face centre must sit this far (0..1) inside the oval
  yaw: 0.3, // nose offset from the eyes' midpoint, in eye distances
  roll: 18, // degrees
  lumaMin: 70, // face brightness, 0..255
  lumaMax: 205,
  backlight: 45, // surroundings brighter than the face by this much
  sharpness: 25, // Laplacian variance of the face region
  steady: 0.02, // movement over the last frames, as a share of the frame width
  steadyFrames: 10,
};

// A box in video pixels -> the preview's own pixels (object-fit: cover).
export function toPreview(box, video) {
  const scale = Math.max(PREVIEW.w / video.videoWidth, PREVIEW.h / video.videoHeight);
  const offsetX = (PREVIEW.w - video.videoWidth * scale) / 2;
  const offsetY = (PREVIEW.h - video.videoHeight * scale) / 2;
  return { x: box.x * scale + offsetX, y: box.y * scale + offsetY, w: box.w * scale, h: box.h * scale };
}

// Is the head roughly frontal? From the eyes and nose the detector reports
// (normalised coordinates).
export function isFrontal(keypoints) {
  const [rightEye, leftEye, nose] = keypoints ?? [];
  if (!rightEye || !leftEye || !nose) return true; // no landmarks: don't block
  const eyeDistance = Math.hypot(leftEye.x - rightEye.x, leftEye.y - rightEye.y) || 1e-6;
  const yaw = Math.abs(nose.x - (rightEye.x + leftEye.x) / 2) / eyeDistance;
  const roll = Math.abs((Math.atan2(leftEye.y - rightEye.y, leftEye.x - rightEye.x) * 180) / Math.PI);
  return yaw <= LIMITS.yaw && Math.min(roll, 180 - roll) <= LIMITS.roll;
}

// Brightness of the face, brightness around it (backlight) and how sharp it
// is (variance of the Laplacian), from a small grey copy of the region.
let scratch = null;
export function analyseFace(video, faceBox) {
  const size = 96;
  scratch ??= Object.assign(document.createElement("canvas"), { width: size, height: size });
  const context = scratch.getContext("2d", { willReadFrequently: true });
  const read = (box) => {
    context.drawImage(video, box.x, box.y, box.w, box.h, 0, 0, size, size);
    const { data } = context.getImageData(0, 0, size, size);
    const grey = new Float32Array(size * size);
    for (let i = 0; i < grey.length; i += 1) grey[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    return grey;
  };
  const clamp = (box) => {
    const x = Math.max(0, box.x);
    const y = Math.max(0, box.y);
    return { x, y, w: Math.min(video.videoWidth - x, box.w), h: Math.min(video.videoHeight - y, box.h) };
  };
  const face = read(clamp(faceBox));
  const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;
  const luma = mean(face);

  let laplacianSum = 0;
  let laplacianSquares = 0;
  let count = 0;
  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      const i = y * size + x;
      const value = 4 * face[i] - face[i - 1] - face[i + 1] - face[i - size] - face[i + size];
      laplacianSum += value;
      laplacianSquares += value * value;
      count += 1;
    }
  }
  const sharpness = laplacianSquares / count - (laplacianSum / count) ** 2;

  // The ring around the face: a box twice as big, without its middle.
  const around = read(
    clamp({ x: faceBox.x - faceBox.w * 0.5, y: faceBox.y - faceBox.h * 0.5, w: faceBox.w * 2, h: faceBox.h * 2 }),
  );
  const ring = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const inner = x > size * 0.25 && x < size * 0.75 && y > size * 0.25 && y < size * 0.75;
      if (!inner) ring.push(around[y * size + x]);
    }
  }
  return { luma, surround: mean(ring), sharpness };
}

// One frame's verdict. `face` is { box (video px), keypoints } or null;
// `history` the last face centres (preview pixels / frame width).
export function evaluateFrame({ faces, video, history }) {
  const result = { checks: { found: false, distance: false, centred: false, lighting: false, steady: false }, hint: "position", ok: false };
  if (faces.length === 0) return { ...result, hint: "position" };
  if (faces.length > 1) return { ...result, hint: "oneFace" };
  const [face] = faces;
  if (!isFrontal(face.keypoints)) return { ...result, hint: "frontal" };
  result.checks.found = true;

  const box = toPreview(face.box, video);
  const ratio = box.h / (OVAL.ry * 2);
  result.checks.distance = ratio >= LIMITS.faceMin && ratio <= LIMITS.faceMax;
  const dx = (box.x + box.w / 2 - OVAL.cx) / OVAL.rx;
  const dy = (box.y + box.h / 2 - OVAL.cy) / OVAL.ry;
  result.checks.centred = dx * dx + dy * dy <= LIMITS.centred ** 2;

  let lightingHint = null;
  const { luma, surround, sharpness } = analyseFace(video, face.box);
  if (luma < LIMITS.lumaMin) lightingHint = "dark";
  else if (luma > LIMITS.lumaMax) lightingHint = "bright";
  else if (surround - luma > LIMITS.backlight) lightingHint = "backlit";
  else if (sharpness < LIMITS.sharpness) lightingHint = "blurry";
  result.checks.lighting = lightingHint === null;

  const centre = { x: (box.x + box.w / 2) / PREVIEW.w, y: (box.y + box.h / 2) / PREVIEW.w };
  history.push(centre);
  if (history.length > LIMITS.steadyFrames) history.shift();
  const spread = (key) => Math.max(...history.map((p) => p[key])) - Math.min(...history.map((p) => p[key]));
  result.checks.steady = history.length >= LIMITS.steadyFrames && Math.max(spread("x"), spread("y")) <= LIMITS.steady;

  if (!result.checks.distance) result.hint = ratio < LIMITS.faceMin ? "closer" : "back";
  else if (!result.checks.centred) result.hint = "centre";
  else if (!result.checks.lighting) result.hint = lightingHint;
  else if (!result.checks.steady) result.hint = "steady";
  else result.hint = "perfect";
  result.ok = Object.values(result.checks).every(Boolean);
  return result;
}
