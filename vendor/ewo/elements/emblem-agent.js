//#region packages/elements/src/emblem-agent.ts
var e = "#22201c", t = "#ffffff", n = "#c8322b", r = "#1d1b19", i = (e, t) => ({
	de: e,
	en: t
}), a = "#45474c", o = [
	[i("Hell", "Light"), "#f3d5b8"],
	[i("Pfirsich", "Peach"), "#e6b48f"],
	[i("Warm", "Warm"), "#c98e62"],
	[i("Braun", "Brown"), "#9a6440"],
	[i("Dunkel", "Dark"), "#6b4329"],
	[i("Schatten", "Shadow"), "#34302b"]
], s = (e, t) => `<${e} ${Object.entries(t).map(([e, t]) => `${e}="${t}"`).join(" ")}/>`, c = (t, n = "none", r = e, i = 2.6, a = {}) => s("path", {
	d: t,
	fill: n,
	stroke: r,
	"stroke-width": i,
	"stroke-linecap": "round",
	"stroke-linejoin": "round",
	...a
}), l = (e, t, n, r, i = "none", a = 0) => s("circle", {
	cx: e,
	cy: t,
	r: n,
	fill: r,
	stroke: i,
	"stroke-width": a
}), u = (t, n, r, i, a, o = e, c = 2.6) => s("ellipse", {
	cx: t,
	cy: n,
	rx: r,
	ry: i,
	fill: a,
	stroke: o,
	"stroke-width": c
}), d = 43, f = 57, p = 50;
function m(e, t) {
	return `#${[
		1,
		3,
		5
	].map((t) => parseInt(e.slice(t, t + 2), 16)).map((e) => Math.round(t < 1 ? e * t : e + (255 - e) * (t - 1))).map((e) => e.toString(16).padStart(2, "0")).join("")}`;
}
var h = "#3b2a20", g = [
	[i("ohne", "none"), ({ s: t }) => ({ front: c("M33.5 47C32 33 40 28.5 50 28.5C60 28.5 68 33 66.5 47C63 39 57 36.5 50 36.5C43 36.5 37 39 33.5 47Z", h, e, 2.2) })],
	[i("Fedora", "Fedora"), ({ c: t }) => ({ front: c("M35 37L37 22.5Q50 16 63 22.5L65 37Z", t) + c("M37 22.5Q43 26 50 22Q57 26 63 22.5", "none", e, 1.8) + c("M35.6 31.5H64.4L65 36.5H35Z", e, e, 1.2) + c("M22 39.5C30 34.5 70 34.5 78 39.5C70 42 30 42 22 39.5Z", t) })],
	[i("Trilby", "Trilby"), ({ c: t }) => ({ front: c("M37 37L39 25Q50 20 61 25L63 37Z", t) + c("M37.6 32H62.4L63 36.5H37Z", e, e, 1.2) + c("M29 39C34 35 66 35 72 37.5C66 41 36 41.5 29 39Z", t) })],
	[i("Melone", "Bowler"), ({ c: t }) => ({ front: c("M35 37C35 24 41 18.5 50 18.5C59 18.5 65 24 65 37Z", t) + c("M35.4 33H64.6V36.6H35.4Z", e, e, 1.2) + c("M28 38.5C33 35.5 67 35.5 72 38.5C67 41 33 41 28 38.5Z", t) })],
	[i("Barett", "Beret"), ({ c: t }) => ({ front: c("M30 40C26 30 38 22 52 23C66 24 74 31 69 38C62 34 40 34 30 40Z", t) + c("M51 23.5L52 19", "none", e, 2.4) })],
	[i("Schiebermütze", "Flat cap"), ({ c: t }) => ({ front: c("M33 39C33 28 42 24.5 53 25.5C63 26.5 68 31 67.5 38C58 35.5 42 35.5 33 39Z", t) + c("M57 36.5C64 36 72 37 76 39.5C70 41.5 62 40.5 56 39.5Z", m(t, .75)) + c("M41 27.5C48 26.5 56 27.5 62 30.5", "none", e, 1.4) })],
	[i("Jagdmütze", "Deerstalker"), ({ c: t }) => ({ front: c("M33.5 40C33.5 26 41 21 50 21C59 21 66.5 26 66.5 40Z", t) + c("M50 21V40M41 23.5C39 30 39 35 39.5 40M59 23.5C61 30 61 35 60.5 40", "none", e, 1.3) + c("M33.5 39.5L31 50L36 48.5Z", t) + c("M66.5 39.5L69 50L64 48.5Z", t) + c("M38 40C44 41.5 56 41.5 62 40L61 43.5C55 45 45 45 39 43.5Z", m(t, .78)) + c("M47 20.5L50 18L53 20.5", "none", e, 2) })],
	[i("Kapuze", "Hood"), ({ c: e }) => ({
		back: c("M24 84C21 50 31 26 50 26C69 26 79 50 76 84Z", e),
		front: c("M30 58C30 40 38 31.5 50 31.5C62 31.5 70 40 70 58", "none", m(e, .6), 3.2)
	})],
	[i("Fellmütze", "Ushanka"), ({ c: e }) => ({ front: c("M33 40C33 26 41 20 50 20C59 20 67 26 67 40Z", e) + c("M31 37C38 33.5 62 33.5 69 37V42C62 39 38 39 31 42Z", "#e9e1d2") + c("M31 41L28 58C30 61 35 61 36 58L35.5 42Z", "#e9e1d2") + c("M69 41L72 58C70 61 65 61 64 58L64.5 42Z", "#e9e1d2") + c("M36 28C39 25.5 42 25.5 45 28M55 28C58 25.5 61 25.5 64 28", "none", m(e, .6), 1.4) })],
	[i("Zylinder", "Top hat"), ({ c: t }) => ({ front: c("M37.5 37V12.5H62.5V37Z", t) + c("M37.5 30.5H62.5V35H37.5Z", n, e, 1.2) + c("M27 38.5C33 35.5 67 35.5 73 38.5C67 41 33 41 27 38.5Z", t) })]
], _ = [
	[i("Punkte", "Dots"), ({ k: e }, t) => l(t, p, 2.3, e)],
	[i("Schmal", "Narrow"), ({ k: e }, t) => c(`M${t - 3.5} ${p}H${t + 3.5}`, "none", e, 2.8)],
	[i("Seitenblick", "Side-eye"), ({ k: e }, n) => u(n, p, 4.2, 3, t, e, 1.8) + l(n + 2, p, 1.9, e)],
	[i("Zwinkern", "Wink"), ({ k: e }, t, n) => n === "l" ? l(t, p, 2.3, e) : c(`M${t - 3.5} 50.5Q${t} 47.5 ${t + 3.5} 50.5`, "none", e, 2.2)],
	[i("Skeptisch", "Sceptical"), ({ k: e }, t, n) => l(t, p, 2.2, e) + c(n === "l" ? `M${t - 4} 45H${t + 3.5}` : `M${t - 3.5} 42.5L${t + 4} 44.5`, "none", e, 2)],
	[i("Müde", "Sleepy"), ({ k: e }, t) => c(`M${t - 4} 49.5H${t + 4}`, "none", e, 2) + c(`M${t - 3} 49.5Q${t} 53.2 ${t + 3} 49.5Z`, e, e, 1)],
	[i("Groß", "Wide"), ({ k: e }, n) => l(n, p, 4.2, t, e, 1.8) + l(n, 50.4, 1.7, e)],
	[i("Zu", "Closed"), ({ k: e }, t) => c(`M${t - 3.5} ${p}Q${t} 53 ${t + 3.5} ${p}`, "none", e, 2.2)]
], v = [
	[i("ohne", "none"), () => ({})],
	[i("Sonnenbrille", "Sunglasses"), ({ k: e }) => ({
		cover: "both",
		face: c("M35 46.5H48.5L47.5 53.5C46.5 55 37.5 55 36.5 53.5Z", r, e, 1.4) + c("M51.5 46.5H65L63.5 53.5C62.5 55 53.5 55 52.5 53.5Z", r, e, 1.4) + c("M48.5 48H51.5M35 47L33 46M65 47L67 46", "none", e, 1.6) + c("M38 48.5L41 48", "none", "rgba(255,255,255,.7)", 1.2) + c("M54.5 48.5L57.5 48", "none", "rgba(255,255,255,.7)", 1.2)
	})],
	[i("Monokel", "Monocle"), ({ k: e }) => ({ face: l(f, p, 5.6, "rgba(255,255,255,.25)", e, 1.8) + c("M61 54C66 62 62 70 58 77", "none", "#b88a2e", 1.2) })],
	[i("Brille", "Glasses"), ({ k: e }) => ({ face: l(d, p, 5, "none", e, 1.9) + l(f, p, 5, "none", e, 1.9) + c("M48 49.5Q50 47.5 52 49.5", "none", e, 1.7) })],
	[i("Augenklappe", "Eye patch"), ({ k: t }) => ({
		cover: "left",
		face: c("M34.5 37L60 35", "none", t, 1.6) + c("M38.4 46.4H47.6L46.6 53.4C45 55.2 41 55.2 39.4 53.4Z", e, t, 1.2)
	})],
	[i("Nasenbrille", "Nose glasses"), ({ k: t }) => ({
		nose: !1,
		mouth: !1,
		face: l(d, p, 5, "none", t, 2.2) + l(f, p, 5, "none", t, 2.2) + c(`M48 ${p}H52`, "none", t, 2) + c("M38 44.5L47.5 46M52.5 46L62 44.5", "none", h, 2.6) + c("M47.5 51C46 56 45.5 59 50 59.5C54.5 59 54 56 52.5 51Z", "#e8a08a", e, 1.6) + c("M42 62.5C44 60 48 60 50 61.5C52 60 56 60 58 62.5C54 64 46 64 42 62.5Z", h, e, 1.2)
	})],
	[i("Schnurrbart", "Moustache"), () => ({
		mouth: !1,
		face: c("M41 61C44 57.5 48 58 50 59.5C52 58 56 57.5 59 61C56 62.5 53 61.5 50 61C47 61.5 44 62.5 41 61Z", h, e, 1.2) + c("M46.5 64.5H53.5", "none", e, 1.8)
	})],
	[i("Bart", "Beard"), () => ({
		mouth: !1,
		face: c("M34.5 55C35 66 41 72.5 50 72.5C59 72.5 65 66 65.5 55C62 60 57 60.5 50 60C43 60.5 38 60 34.5 55Z", h, e, 1.6) + c("M45.5 64.2Q50 66.4 54.5 64.2", "none", "#e9dccb", 1.6)
	})],
	[i("Tuch", "Mask"), ({ c: t }) => ({
		mouth: !1,
		face: c("M33.5 55.5C39 58 61 58 66.5 55.5C66 66 59 72.5 50 72.5C41 72.5 34 66 33.5 55.5Z", m(t, 1.25), e, 2) + c("M38 61C44 62.5 56 62.5 62 61", "none", m(t, .8), 1.2)
	})],
	[i("Headset", "Earpiece"), () => ({ face: l(66.5, 52, 2.6, e) + c("M67.5 54.5C70 60 69 67 64 72C61 75 60 78 61 82", "none", "#2d2a26", 1.4) })]
], y = "M42.5 77L50 92L57.5 77Z", b = [
	[i("Trenchcoat", "Trench coat"), ({ c: n }) => c(y, t, e, 1.6) + c("M43 69L33 79L41 90L47 80Z", m(n, .85)) + c("M57 69L67 79L59 90L53 80Z", m(n, .85))],
	[i("Krawatte", "Tie"), ({ c: r }) => c("M40 77L50 96L60 77Z", t, e, 1.6) + c("M43 76.5L50 83L47 78.5ZM57 76.5L50 83L53 78.5Z", t, e, 1.4) + c("M48 82.5H52L53.5 97L50 100L46.5 97Z", n, e, 1.4) + c("M47.6 79.5H52.4L51.8 83H48.2Z", n, e, 1.2)],
	[i("Fliege", "Bow tie"), () => c("M42 77L50 92L58 77Z", t, e, 1.6) + c("M50 81.5L42.5 77.5V85.5ZM50 81.5L57.5 77.5V85.5Z", e, e, 1.2) + l(50, 81.5, 1.8, e)],
	[i("Rollkragen", "Turtleneck"), ({ c: e }) => c("M41.5 68.5H58.5V80.5C55 82.5 45 82.5 41.5 80.5Z", m(e, .8)) + c("M45 70V80.5M50 70V81.5M55 70V80.5", "none", m(e, .6), 1.1)],
	[i("Schal", "Scarf"), () => c("M40.5 70.5C44 74 56 74 59.5 70.5L61 78C56 81.5 44 81.5 39 78Z", n, e, 1.8) + c("M54 79L56 97L62 95L59 78.5Z", n, e, 1.8) + c("M55.5 87L60.5 86M56 92L61 91", "none", "#e9dccb", 1.2)],
	[i("Kapuzenpulli", "Hoodie"), ({ c: e }) => c("M34 79C38 70 62 70 66 79C60 76 40 76 34 79Z", m(e, .75)) + c("M45.5 78V90M54.5 78V90", "none", "#e9dccb", 1.6) + l(45.5, 90.5, 1.4, "#e9dccb") + l(54.5, 90.5, 1.4, "#e9dccb")],
	[i("Hemd", "Shirt"), () => c("M42.5 76.5L50 87L57.5 76.5Z", t, e, 1.6) + c("M42.5 76.5L38 82L46.5 83.5ZM57.5 76.5L62 82L53.5 83.5Z", t, e, 1.6)],
	[i("Ausweis", "ID badge"), () => c(y, t, e, 1.6) + c("M44 77L39.5 88M56 77L60.5 88", "none", n, 1.6) + c("M35.5 88H49V99H35.5Z", t, e, 1.4) + l(39.5, 92.5, 2, "#9aa3ad") + c("M43 91.5H47M43 94.5H46.5", "none", e, 1.1)]
], x = (e) => e.map(([e]) => e), S = {
	id: "agent",
	parts: [
		{
			name: i("Hut", "Hat"),
			options: x(g)
		},
		{
			name: i("Augen", "Eyes"),
			options: x(_)
		},
		{
			name: i("Tarnung", "Disguise"),
			options: x(v)
		},
		{
			name: i("Kragen", "Collar"),
			options: x(b)
		},
		{
			name: i("Haut", "Skin"),
			options: x(o)
		}
	],
	svg(t, { mood: n = "" } = {}) {
		let [r, i, s, l, p] = t, m = a, h = o[p]?.[1] ?? o[0][1], y = p === 5 ? "#fbf7ec" : e, x = {
			c: m,
			s: h,
			k: y
		}, S = g[r]?.[1](x) ?? {}, C = v[s]?.[1](x) ?? {}, w = n === "happy" ? 7 : i, T = (C.cover === "both" ? [] : C.cover === "left" ? [["r", f]] : [["l", d], ["r", f]]).map(([e, t]) => _[w]?.[1](x, t, e) ?? "").join(""), E = n === "happy" ? c("M45 62.5Q50 67 55 62.5", "none", y, 2.2) : c("M46.5 63.5H53.5", "none", y, 2);
		return `<svg viewBox="0 0 100 100" aria-hidden="true"><g transform="translate(50 60) scale(1.2) translate(-50 -60)">${[
			S.back ?? "",
			c("M8 101C10 85 26 77.5 50 77.5C74 77.5 90 85 92 101Z", m),
			c("M43.5 66V79H56.5V66Z", h, e, 2.2),
			b[l]?.[1](x) ?? "",
			u(33.8, 53.5, 3.2, 4.6, h),
			u(66.2, 53.5, 3.2, 4.6, h),
			u(50, 51, 16.5, 19.5, h),
			S.front ?? "",
			T,
			C.nose === !1 ? "" : c("M50 52.5L48.3 58H51.6", "none", y, 1.6),
			C.mouth === !1 ? "" : E,
			C.face ?? ""
		].join("")}</g></svg>`;
	},
	fromSeed(e) {
		return [
			e % 10,
			(e >>> 15) % 8,
			(e >>> 19) % 10,
			(e >>> 22) % 8,
			(e >>> 26) % 6
		];
	}
};
//#endregion
export { S as agent };
