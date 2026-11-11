// 런퀘스트 illustrations — one recurring runner (headband + bun), flat fills with royal-blue outlines.
// Every limb is drawn twice: a wide ink stroke, then a narrower colour stroke, which gives the outlined-tube look.
(function (root) {
  "use strict";
  const K = { ink: "#162660", skin: "#f4cfb0", skinD: "#e2b38f", shirt: "#ef8a62", shirtD: "#d16f48", shorts: "#162660",
    shoe: "#fbf6ee", band: "#f3c766", sky: "#D0E6FD", bone: "#F1E4D1", paper: "#fbf6ee", blush: "#ef8a62", gold: "#f3c766" };
  let uid = 0;
  const pt = (p) => p[0].toFixed(1) + " " + p[1].toFixed(1);
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  function tube(pts, color, w) {
    const d = "M" + pts.map(pt).join(" L");
    return '<path d="' + d + '" fill="none" stroke="' + K.ink + '" stroke-width="' + (w + 6) + '" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  function leg(hip, knee, foot, back) {
    const sk = back ? K.skinD : K.skin;
    const shoeX = foot[0] + 5;
    return tube([hip, knee, foot], sk, 11) + tube([hip, lerp(hip, knee, 0.5)], K.shorts, 15) +
      '<ellipse cx="' + shoeX + '" cy="' + (foot[1] + 2) + '" rx="10" ry="6" fill="' + (back ? "#e4ddd0" : K.shoe) + '" stroke="' + K.ink + '" stroke-width="3"/>';
  }
  const arm = (sh, el, ha, back) => tube([sh, el, ha], back ? K.skinD : K.skin, 9);
  function torso(neck, hip) {
    return tube([neck, hip], K.shirt, 26) + tube([lerp(hip, neck, 0.02), hip], K.shorts, 26);
  }
  function head(h, mood, dir) {
    dir = dir || 1;
    const [x, y] = h, id = "rqh" + uid++;
    const e = x + 7 * dir;
    let face = "";
    if (mood === "sleep") face = '<path d="M' + (e - 4) + " " + (y + 1) + " q4 3 8 0" + '" fill="none" stroke="' + K.ink + '" stroke-width="2.5" stroke-linecap="round"/>';
    else face = '<circle cx="' + e + '" cy="' + (y + 1) + '" r="2.4" fill="' + K.ink + '"/>';
    if (mood === "open") face += '<ellipse cx="' + (x + 9 * dir) + '" cy="' + (y + 9) + '" rx="3" ry="3.6" fill="' + K.ink + '"/>';
    else if (mood === "grit") face += '<path d="M' + (x + 4 * dir) + " " + (y + 9) + " h" + 9 * dir + '" stroke="' + K.ink + '" stroke-width="2.5" stroke-linecap="round"/>';
    else if (mood !== "sleep") face += '<path d="M' + (x + 4 * dir) + " " + (y + 7) + " q" + 4 * dir + " 5 " + 9 * dir + ' 0" fill="none" stroke="' + K.ink + '" stroke-width="2.5" stroke-linecap="round"/>';
    return '<circle cx="' + (x - 13 * dir) + '" cy="' + (y - 13) + '" r="8" fill="' + K.ink + '"/>' + // bun
      '<clipPath id="' + id + '"><circle cx="' + x + '" cy="' + y + '" r="16"/></clipPath>' +
      '<circle cx="' + x + '" cy="' + y + '" r="16" fill="' + K.skin + '"/>' +
      '<g clip-path="url(#' + id + ')"><rect x="' + (x - 20) + '" y="' + (y - 20) + '" width="40" height="11" fill="' + K.ink + '"/>' +
      '<rect x="' + (x - 20) + '" y="' + (y - 10) + '" width="40" height="6" fill="' + K.band + '"/>' +
      '<rect x="' + (x - 20 + (dir < 0 ? 26 : 0)) + '" y="' + (y - 4) + '" width="14" height="14" fill="' + K.ink + '"/></g>' + // hair at the back
      '<circle cx="' + x + '" cy="' + y + '" r="16" fill="none" stroke="' + K.ink + '" stroke-width="3"/>' +
      '<circle cx="' + (x + 3 * dir) + '" cy="' + (y + 6) + '" r="3.6" fill="' + K.blush + '" opacity=".55"/>' + face;
  }
  // P: head, neck, hip, arms [shoulder, elbow, hand] x2 (back, front), legs [knee, foot] x2 (back, front)
  function figure(P, mood, dir) {
    return leg(P.hip, P.bl[0], P.bl[1], true) + arm(P.neck, P.ba[0], P.ba[1], true) + torso(P.neck, P.hip) +
      leg(P.hip, P.fl[0], P.fl[1], false) + arm(P.neck, P.fa[0], P.fa[1], false) + head(P.head, mood, dir);
  }
  const shadow = (x, w) => '<ellipse cx="' + x + '" cy="184" rx="' + w + '" ry="6" fill="' + K.ink + '" opacity=".12"/>';
  const lines = (x, y) => [0, 12, 24].map((d, i) => '<path d="M' + (x - i * 4) + " " + (y + d) + " h-" + (22 - i * 4) + '" stroke="' + K.ink + '" stroke-width="3.5" stroke-linecap="round" opacity=".55"/>').join("");
  const drop = (x, y, s) => '<path transform="translate(' + x + " " + y + ") scale(" + (s || 1) + ')" d="M0 -9 C5 -2 7 2 7 5 A7 7 0 0 1 -7 5 C-7 2 -5 -2 0 -9Z" fill="' + K.sky + '" stroke="' + K.ink + '" stroke-width="2.5"/>';
  const star = (x, y, r, c) => {
    const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; p.push([x + rr * Math.cos(a), y + rr * Math.sin(a)]); }
    return '<path d="M' + p.map(pt).join(" L") + 'Z" fill="' + (c || K.gold) + '" stroke="' + K.ink + '" stroke-width="2.5" stroke-linejoin="round"/>';
  };

  const POSES = {
    run: { head: [118, 40], neck: [108, 64], hip: [96, 112], ba: [[86, 86], [72, 72]], fa: [[128, 86], [142, 68]],
      bl: [[80, 144], [54, 156]], fl: [[124, 132], [118, 168]] },
    walk: { head: [106, 36], neck: [102, 60], hip: [100, 112], ba: [[92, 86], [84, 106]], fa: [[112, 86], [122, 104]],
      bl: [[94, 146], [80, 176]], fl: [[112, 146], [120, 176]] },
    fast: { head: [112, 38], neck: [106, 62], hip: [100, 112], ba: [[88, 84], [76, 96]], fa: [[122, 82], [130, 64]],
      bl: [[92, 146], [72, 176]], fl: [[116, 144], [128, 176]] },
    stretch: { head: [116, 46], neck: [106, 66], hip: [100, 116], ba: [[96, 38], [118, 18]], fa: [[118, 48], [136, 30]],
      bl: [[90, 148], [80, 176]], fl: [[110, 148], [120, 176]] },
    cheer: { head: [100, 36], neck: [100, 60], hip: [100, 108], ba: [[80, 42], [70, 20]], fa: [[120, 42], [130, 20]],
      bl: [[86, 134], [80, 158]], fl: [[116, 132], [124, 154]] },
    tired: { head: [146, 96], neck: [126, 84], hip: [88, 104], ba: [[124, 108], [112, 128]], fa: [[132, 108], [120, 130]],
      bl: [[96, 138], [86, 176]], fl: [[112, 138], [104, 176]] },
  };

  function sleepBag() {
    return '<rect x="34" y="132" width="140" height="40" rx="20" fill="' + K.sky + '" stroke="' + K.ink + '" stroke-width="3.5"/>' +
      '<path d="M84 134 v36 M112 134 v36 M140 134 v36" stroke="' + K.ink + '" stroke-width="2.5" opacity=".45"/>' +
      '<path d="M60 132 q-14 4 -18 16" fill="none" stroke="' + K.ink + '" stroke-width="3"/>' +
      '<rect x="22" y="146" width="34" height="22" rx="9" fill="' + K.paper + '" stroke="' + K.ink + '" stroke-width="3"/>' + // pillow
      head([46, 136], "sleep", 1) +
      '<text x="78" y="108" font-family="Jua, sans-serif" font-size="22" fill="' + K.paper + '">z</text>' +
      '<text x="92" y="88" font-family="Jua, sans-serif" font-size="28" fill="' + K.paper + '">z</text>' +
      '<text x="112" y="62" font-family="Jua, sans-serif" font-size="34" fill="' + K.paper + '">Z</text>' +
      '<path d="M156 30 a18 18 0 1 0 14 30 a14 14 0 1 1 -14 -30z" fill="' + K.gold + '" stroke="' + K.ink + '" stroke-width="3"/>';
  }

  const SCENES = {
    run: () => shadow(100, 44) + lines(58, 74) + figure(POSES.run, "grit") + drop(150, 34, 0.8),
    walk: () => shadow(100, 36) + figure(POSES.walk, "smile"),
    fast: () => shadow(100, 40) + lines(64, 80) + figure(POSES.fast, "smile"),
    stretch: () => shadow(100, 34) + figure(POSES.stretch, "smile") + '<path d="M150 70 q10 10 0 22" fill="none" stroke="' + K.ink + '" stroke-width="3" stroke-linecap="round" opacity=".5"/>',
    cheer: () => shadow(100, 26) + figure(POSES.cheer, "open") + star(44, 40, 13) + star(160, 52, 10, K.shirt) + star(150, 16, 7, K.sky) + star(52, 92, 7, K.sky),
    tired: () => shadow(104, 46) + figure(POSES.tired, "open") + drop(168, 74, 0.9) + drop(178, 96, 0.7) + drop(160, 56, 0.6),
    rest: () => shadow(100, 72) + sleepBag(),
  };
  // opts.disc: draw a filled circle behind (for dark backgrounds). opts.flip: face left.
  function svg(name, opts) {
    opts = opts || {};
    const body = (SCENES[name] || SCENES.walk)();
    const disc = opts.disc ? '<circle cx="100" cy="100" r="96" fill="' + opts.disc + '"/>' : "";
    const g = opts.flip ? '<g transform="translate(200 0) scale(-1 1)">' + body + "</g>" : body;
    return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + disc + g + "</svg>";
  }
  const API = { svg, SCENES: Object.keys(SCENES) };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.RQART = API;
})(this);
