// Lightweight, dependency-free candidate detector. It is intentionally a review aid, not ground truth.
export function detectBubbleCandidates(imageData, width, height) {
  const { data } = imageData;
  if (!data || width < 80 || height < 80) return [];
  const at = (x, y) => {
    const i = (Math.max(0, Math.min(height - 1, y)) * width + Math.max(0, Math.min(width - 1, x))) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const cornerSamples = [at(3, 3), at(width - 4, 3), at(3, height - 4), at(width - 4, height - 4)];
  const bg = [0, 1, 2].map((channel) => cornerSamples.map((c) => c[channel]).sort((a, b) => a - b)[1]);
  const similar = (a, b, tolerance = 14) => Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]) + Math.abs(a[2]-b[2]) < tolerance * 3;
  const candidatePixel = (x, y) => {
    const [r, g, b] = at(x, y);
    const delta = Math.abs(r-bg[0]) + Math.abs(g-bg[1]) + Math.abs(b-bg[2]);
    const bright = Math.min(r, g, b) > 185;
    const neutral = Math.max(r, g, b) - Math.min(r, g, b) < 32;
    const greenBubble = g > r + 7 && g > b - 2 && r > 150;
    return delta > 34 && bright && (neutral || greenBubble) && !similar([r,g,b], bg, 10);
  };

  const rows = [];
  const yStart = Math.floor(height * 0.08);
  const yEnd = Math.floor(height * 0.92);
  const step = Math.max(2, Math.floor(width / 500));
  for (let y = yStart; y < yEnd; y += step) {
    const runs = [];
    let start = null, last = null;
    for (let x = Math.floor(width * 0.025); x < width * 0.975; x += step) {
      if (candidatePixel(x, y)) {
        if (start === null) start = x;
        last = x;
      } else if (start !== null && x - last > width * 0.018) {
        if (last - start > width * 0.12 && last - start < width * 0.9) runs.push({ x0: start, x1: last });
        start = null; last = null;
      }
    }
    if (start !== null && last - start > width * 0.12 && last - start < width * 0.9) runs.push({ x0: start, x1: last });
    for (const run of runs) rows.push({ ...run, y0: y, y1: Math.min(y + step, height) });
  }

  const boxes = [];
  for (const row of rows) {
    const previous = boxes.find((box) => row.y0 - box.y1 <= height * 0.022 && overlapRatio(row, box) > 0.5);
    if (previous) {
      previous.x0 = Math.min(previous.x0, row.x0);
      previous.x1 = Math.max(previous.x1, row.x1);
      previous.y1 = row.y1;
    } else boxes.push({ ...row });
  }
  return boxes
    .filter((box) => box.y1 - box.y0 >= height * 0.018 && box.x1 - box.x0 >= width * 0.15)
    .filter((box) => box.y1 - box.y0 <= height * 0.22)
    .sort((a, b) => a.y0 - b.y0)
    .slice(0, 80)
    .map((box, i) => ({ ...box, id: `bubble-${i + 1}`, side: (box.x0 + box.x1) / 2 > width / 2 ? 'me' : 'them' }));
}

function overlapRatio(a, b) {
  const intersection = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
  const minWidth = Math.max(1, Math.min(a.x1 - a.x0, b.x1 - b.x0));
  return intersection / minWidth;
}
