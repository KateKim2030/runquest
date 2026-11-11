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
  function torso(neck, hip, mid) {
    return tube(mid ? [neck, mid, hip] : [neck, hip], K.shirt, 26) + tube([lerp(hip, mid || neck, 0.02), hip], K.shorts, 26);
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
    return leg(P.hip, P.bl[0], P.bl[1], true) + arm(P.neck, P.ba[0], P.ba[1], true) + torso(P.neck, P.hip, P.mid) +
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

  // ---------- 틈새 운동: two frames per exercise (A = start/rest, B = effort) ----------
  const wallR = '<rect x="164" y="10" width="30" height="176" fill="#e8dac4" stroke="' + K.ink + '" stroke-width="3"/><path d="M164 50h30M164 92h30M164 134h30M179 10v40M179 92v42" stroke="' + K.ink + '" stroke-width="2" opacity=".35"/>';
  const wallL = '<rect x="6" y="10" width="30" height="176" fill="#e8dac4" stroke="' + K.ink + '" stroke-width="3"/><path d="M6 50h30M6 92h30M6 134h30M21 10v40M21 92v42" stroke="' + K.ink + '" stroke-width="2" opacity=".35"/>';
  const mat = '<rect x="14" y="180" width="172" height="8" rx="4" fill="' + K.sky + '" stroke="' + K.ink + '" stroke-width="2.5"/>';
  const chairSvg = (seatX, backX) => '<path d="M' + backX + ' 88 V184 M' + (seatX + 4) + ' 134 V184 M' + (seatX + 40) + ' 134 V184" stroke="' + K.ink + '" stroke-width="5" stroke-linecap="round"/>' +
    '<rect x="' + seatX + '" y="128" width="44" height="9" rx="4" fill="#e8dac4" stroke="' + K.ink + '" stroke-width="3"/>';
  const chairL = chairSvg(62, 62);    // seat to the right of its back: sit facing right
  const chairR = chairSvg(146, 146);  // stands on the right as a support
  const STAND = { head: [100, 36], neck: [100, 60], hip: [100, 110], ba: [[96, 84], [94, 108]], fa: [[104, 84], [106, 108]], bl: [[98, 146], [94, 178]], fl: [[102, 146], [106, 178]] };
  const EX = {
    squat: [
      { p: { head: [100, 36], neck: [100, 60], hip: [100, 110], ba: [[120, 66], [140, 68]], fa: [[122, 64], [142, 62]], bl: [[98, 146], [92, 178]], fl: [[104, 146], [108, 178]] }, m: "smile" },
      { p: { head: [114, 66], neck: [104, 90], hip: [80, 132], ba: [[126, 92], [148, 90]], fa: [[128, 90], [150, 86]], bl: [[112, 140], [96, 178]], fl: [[118, 138], [106, 178]] }, m: "grit" }],
    wallpush: [
      { p: { head: [134, 44], neck: [122, 66], hip: [96, 120], ba: [[140, 70], [160, 72]], fa: [[141, 67], [160, 68]], bl: [[84, 150], [70, 178]], fl: [[86, 150], [76, 178]] }, m: "smile", bg: wallR },
      { p: { head: [142, 58], neck: [132, 78], hip: [102, 122], ba: [[140, 100], [160, 74]], fa: [[144, 98], [160, 70]], bl: [[88, 151], [70, 178]], fl: [[90, 151], [76, 178]] }, m: "grit", bg: wallR }],
    calf: [{ p: STAND, m: "smile" }, { p: STAND, m: "grit", up: 9 }],
    lunge: [
      { p: { head: [100, 36], neck: [100, 60], hip: [100, 110], ba: [[86, 86], [94, 108]], fa: [[114, 86], [106, 108]], bl: [[98, 146], [94, 178]], fl: [[102, 146], [106, 178]] }, m: "smile" },
      { p: { head: [100, 56], neck: [100, 80], hip: [100, 130], ba: [[86, 106], [94, 128]], fa: [[114, 106], [106, 128]], bl: [[84, 166], [60, 178]], fl: [[130, 136], [130, 178]] }, m: "grit" }],
    bridge: [
      { p: { head: [38, 162], neck: [60, 166], hip: [108, 168], ba: [[82, 175], [104, 177]], fa: [[84, 173], [106, 175]], bl: [[132, 138], [148, 178]], fl: [[136, 136], [152, 178]] }, m: "smile", bg: mat },
      { p: { head: [38, 162], neck: [60, 164], hip: [110, 138], ba: [[82, 175], [104, 177]], fa: [[84, 173], [106, 175]], bl: [[138, 124], [148, 178]], fl: [[142, 122], [152, 178]] }, m: "grit", bg: mat }],
    birddog: [
      { p: { head: [154, 102], neck: [136, 116], hip: [80, 120], ba: [[134, 146], [134, 176]], fa: [[138, 146], [138, 176]], bl: [[78, 170], [48, 176]], fl: [[82, 170], [52, 176]] }, m: "smile", bg: mat },
      { p: { head: [154, 102], neck: [136, 116], hip: [80, 120], ba: [[134, 146], [134, 176]], fa: [[160, 112], [184, 106]], bl: [[50, 118], [20, 116]], fl: [[82, 170], [52, 176]] }, m: "grit", bg: mat }],
    knee: [
      { p: { head: [100, 36], neck: [100, 60], hip: [100, 110], ba: [[90, 84], [96, 102]], fa: [[112, 80], [118, 62]], bl: [[98, 146], [94, 178]], fl: [[126, 112], [122, 144]] }, m: "smile" },
      { p: { head: [100, 36], neck: [100, 60], hip: [100, 110], ba: [[110, 80], [116, 62]], fa: [[92, 84], [98, 102]], bl: [[124, 114], [120, 146]], fl: [[102, 146], [106, 178]] }, m: "smile" }],
    plank: [
      { p: { head: [166, 128], neck: [146, 140], hip: [98, 150], ba: [[144, 176], [166, 176]], fa: [[148, 176], [170, 176]], bl: [[68, 162], [36, 172]], fl: [[70, 164], [40, 174]] }, m: "grit", bg: mat },
      { p: { head: [166, 126], neck: [146, 138], hip: [98, 147], ba: [[144, 176], [166, 176]], fa: [[148, 176], [170, 176]], bl: [[68, 161], [36, 172]], fl: [[70, 163], [40, 174]] }, m: "grit", bg: mat }],
    chair: [
      { p: { head: [88, 50], neck: [86, 74], hip: [84, 122], ba: [[100, 94], [114, 102]], fa: [[102, 92], [118, 98]], bl: [[118, 124], [116, 176]], fl: [[122, 122], [122, 176]] }, m: "smile", bg: chairL },
      { p: { head: [114, 38], neck: [112, 62], hip: [112, 112], ba: [[130, 70], [146, 74]], fa: [[132, 68], [148, 70]], bl: [[112, 146], [110, 178]], fl: [[116, 146], [120, 178]] }, m: "grit", bg: chairL }],
    row: [
      { p: { head: [100, 36], neck: [100, 60], hip: [100, 110], ba: [[120, 68], [140, 70]], fa: [[122, 66], [142, 66]], bl: [[98, 146], [94, 178]], fl: [[102, 146], [106, 178]] }, m: "smile" },
      { p: { head: [103, 35], neck: [101, 60], hip: [100, 110], ba: [[82, 78], [98, 90]], fa: [[80, 74], [100, 86]], bl: [[98, 146], [94, 178]], fl: [[102, 146], [106, 178]] }, m: "grit" }],
    kickback: [
      { p: { head: [104, 36], neck: [104, 60], hip: [100, 110], ba: [[120, 82], [142, 96]], fa: [[122, 80], [144, 94]], bl: [[98, 146], [96, 178]], fl: [[102, 146], [106, 178]] }, m: "smile", bg: chairR },
      { p: { head: [112, 38], neck: [108, 62], hip: [100, 110], ba: [[122, 84], [142, 96]], fa: [[124, 82], [144, 94]], bl: [[80, 138], [56, 156]], fl: [[102, 146], [106, 178]] }, m: "grit", bg: chairR }],
    deadbug: [
      { p: { head: [38, 162], neck: [60, 166], hip: [108, 168], ba: [[62, 140], [60, 114]], fa: [[68, 138], [68, 112]], bl: [[110, 134], [140, 134]], fl: [[114, 132], [144, 132]] }, m: "smile", bg: mat },
      { p: { head: [38, 162], neck: [60, 166], hip: [108, 168], ba: [[62, 140], [60, 114]], fa: [[42, 146], [18, 138]], bl: [[140, 160], [172, 156]], fl: [[114, 132], [144, 132]] }, m: "grit", bg: mat }],
    kneeplank: [
      { p: { head: [166, 128], neck: [146, 140], hip: [98, 154], ba: [[144, 176], [166, 176]], fa: [[148, 176], [170, 176]], bl: [[66, 172], [38, 150]], fl: [[70, 174], [42, 152]] }, m: "grit", bg: mat },
      { p: { head: [166, 126], neck: [146, 138], hip: [98, 151], ba: [[144, 176], [166, 176]], fa: [[148, 176], [170, 176]], bl: [[66, 172], [38, 148]], fl: [[70, 174], [42, 150]] }, m: "grit", bg: mat }],
    wallsit: [
      { p: { head: [56, 56], neck: [52, 80], hip: [56, 130], ba: [[70, 104], [90, 112]], fa: [[74, 102], [94, 108]], bl: [[100, 130], [100, 178]], fl: [[104, 128], [106, 178]] }, m: "grit", bg: wallL },
      { p: { head: [56, 56], neck: [52, 80], hip: [56, 130], ba: [[70, 104], [90, 112]], fa: [[74, 102], [94, 108]], bl: [[100, 130], [100, 178]], fl: [[104, 128], [106, 178]] }, m: "open", bg: wallL }],
  };
  // ---------- 스트레칭 poses (catcow has two frames, the rest hold still) ----------
  const ST = {
    calf: [{ p: { head: [130, 48], neck: [120, 70], hip: [98, 118], ba: [[140, 76], [160, 78]], fa: [[142, 72], [160, 72]], bl: [[76, 150], [52, 178]], fl: [[124, 146], [130, 178]] }, m: "smile", bg: wallR }],
    hamstring: [{ p: { head: [114, 96], neck: [98, 114], hip: [70, 160], mid: [80, 132], ba: [[122, 140], [148, 162]], fa: [[124, 136], [150, 158]], bl: [[98, 148], [106, 172]], fl: [[112, 166], [156, 170]] }, m: "smile", bg: mat }],
    quad: [{ p: { head: [102, 36], neck: [102, 60], hip: [100, 110], ba: [[88, 92], [74, 124]], fa: [[118, 82], [132, 96]], bl: [[96, 146], [70, 128]], fl: [[102, 146], [104, 178]] }, m: "smile" }],
    glute: [{ p: { head: [108, 58], neck: [96, 80], hip: [84, 122], ba: [[110, 100], [118, 116]], fa: [[112, 98], [124, 112]], bl: [[118, 126], [116, 176]], fl: [[114, 108], [132, 122]] }, m: "smile", bg: chairL }],
    neck: [{ p: { head: [108, 42], neck: [100, 62], hip: [100, 112], ba: [[94, 86], [92, 110]], fa: [[120, 56], [114, 32]], bl: [[98, 146], [94, 178]], fl: [[102, 146], [106, 178]] }, m: "sleep" }],
    chest: [{ p: { head: [106, 34], neck: [103, 60], hip: [100, 112], ba: [[84, 82], [76, 108]], fa: [[86, 80], [80, 106]], bl: [[98, 146], [94, 178]], fl: [[102, 146], [106, 178]] }, m: "smile" }],
    hipflexor: [{ p: { head: [102, 56], neck: [102, 80], hip: [100, 132], ba: [[88, 104], [96, 126]], fa: [[116, 104], [106, 126]], bl: [[84, 172], [50, 176]], fl: [[130, 138], [130, 176]] }, m: "smile", bg: mat }],
    catcow: [
      { p: { head: [158, 100], neck: [138, 116], hip: [80, 118], mid: [108, 130], ba: [[136, 146], [136, 176]], fa: [[140, 146], [140, 176]], bl: [[78, 170], [48, 176]], fl: [[82, 170], [52, 176]] }, m: "smile", bg: mat },
      { p: { head: [152, 140], neck: [136, 122], hip: [80, 124], mid: [108, 100], ba: [[136, 148], [136, 176]], fa: [[140, 148], [140, 176]], bl: [[78, 170], [48, 176]], fl: [[82, 170], [52, 176]] }, m: "sleep", bg: mat }],
    child: [{ p: { head: [136, 162], neck: [118, 158], hip: [70, 152], mid: [96, 142], ba: [[146, 172], [174, 174]], fa: [[148, 170], [176, 172]], bl: [[98, 172], [62, 174]], fl: [[100, 174], [64, 176]] }, m: "sleep", bg: mat }],
    kneehug: [{ p: { head: [38, 162], neck: [60, 166], hip: [108, 168], ba: [[76, 150], [94, 138]], fa: [[78, 146], [96, 134]], bl: [[140, 170], [172, 172]], fl: [[90, 138], [114, 128]] }, m: "sleep", bg: mat }],
    deskbend: [{ p: { head: [132, 108], neck: [112, 100], hip: [66, 110], ba: [[128, 98], [144, 92]], fa: [[130, 95], [146, 89]], bl: [[66, 146], [64, 178]], fl: [[70, 146], [72, 178]] }, m: "sleep", bg: chairR }],
    seattwist: [{ p: { head: [88, 50], neck: [86, 74], hip: [84, 122], ba: [[104, 98], [116, 114]], fa: [[70, 96], [64, 114]], bl: [[118, 124], [116, 176]], fl: [[122, 122], [122, 176]] }, m: "smile", dir: -1, bg: chairL }],
    hipstand: [{ p: { head: [106, 36], neck: [105, 60], hip: [102, 112], ba: [[90, 84], [98, 106]], fa: [[120, 84], [110, 106]], bl: [[84, 146], [60, 174]], fl: [[122, 144], [128, 178]] }, m: "smile" }],
    twist: [{ p: { head: [38, 162], neck: [60, 166], hip: [108, 168], ba: [[82, 175], [104, 177]], fa: [[70, 142], [78, 118]], bl: [[134, 148], [150, 174]], fl: [[130, 152], [146, 176]] }, m: "sleep", bg: mat }],
  };
  function poseSvg(f, opts, extra) {
    const fig = figure(f.p, f.m, f.dir);
    const body = (f.bg || "") + (f.bg === mat ? "" : shadow(f.p.hip[0], 34)) +
      (f.up ? '<g transform="translate(0 -' + f.up + ')">' + fig + "</g>" : fig) + (extra || "");
    const disc = opts.disc ? '<circle cx="100" cy="100" r="96" fill="' + opts.disc + '"/>' : "";
    return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + disc +
      (opts.flip ? '<g transform="translate(200 0) scale(-1 1)">' + body + "</g>" : body) + "</svg>";
  }
  function st(id, frame, opts) {
    const fr = ST[id] || ST.calf;
    return poseSvg(fr[frame && fr.length > 1 ? 1 : 0], opts || {});
  }
  function ex(id, frame, opts) {
    opts = opts || {};
    const f = (EX[id] || EX.squat)[frame ? 1 : 0];
    const fig = figure(f.p, f.m);
    const body = (f.bg || "") + (f.bg === mat ? "" : shadow(f.p.hip[0], 34)) +
      (f.up ? '<g transform="translate(0 -' + f.up + ')">' + fig + "</g>" : fig) +
      (frame && !f.bg && id !== "knee" ? drop(150, 30, 0.7) : "");
    const disc = opts.disc ? '<circle cx="100" cy="100" r="96" fill="' + opts.disc + '"/>' : "";
    return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + disc + body + "</svg>";
  }
  // opts.disc: draw a filled circle behind (for dark backgrounds). opts.flip: face left.
  function svg(name, opts) {
    opts = opts || {};
    const body = (SCENES[name] || SCENES.walk)();
    const disc = opts.disc ? '<circle cx="100" cy="100" r="96" fill="' + opts.disc + '"/>' : "";
    const g = opts.flip ? '<g transform="translate(200 0) scale(-1 1)">' + body + "</g>" : body;
    return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + disc + g + "</svg>";
  }
  const API = { svg, ex, st, SCENES: Object.keys(SCENES), EXERCISES: Object.keys(EX), STRETCHES: Object.keys(ST) };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.RQART = API;
})(this);
