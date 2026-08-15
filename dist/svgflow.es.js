//#region src/styles/defaults.ts
var e = {
	node: {
		fill: "#ffffff",
		stroke: "#2980b9",
		strokeWidth: 2,
		rx: 8,
		ry: 8,
		labelColor: "#333333",
		labelFontSize: 14,
		labelOffsetY: 6,
		shadowFilter: "url(#node-shadow)",
		selectedShadowFilter: "url(#node-selected-glow)",
		selectedStroke: "#ff6b6b",
		selectedStrokeWidth: 3
	},
	anchor: {
		radius: 5,
		fill: "#ffffff",
		stroke: "#5470c6",
		strokeWidth: 2,
		hoverStroke: "#ff6b6b",
		hoverStrokeWidth: 3,
		hoverRadiusMultiplier: 1.6,
		hoverShadow: "drop-shadow(0 0 8px rgba(255,107,107,0.5))"
	},
	connection: {
		connectorType: "flowchart",
		stroke: "#27ae60",
		strokeWidth: 2,
		selectedStroke: "#ff6622",
		selectedStrokeWidth: 4,
		strokeLinecap: "butt",
		strokeLinejoin: "round",
		stub: 5,
		gap: 0,
		maxConnections: 4
	},
	arrow: {
		type: "triangle",
		length: 12,
		width: 8,
		foldback: .623,
		color: "#27ae60"
	},
	label: {
		color: "#333333",
		fontSize: 12,
		offsetX: 0,
		offsetY: -10,
		fontFamily: "sans-serif"
	},
	zIndexBase: 100
};
//#endregion
//#region src/calc/anchor/position.ts
function t(e, t) {
	let o = {
		x: e.x,
		y: e.y,
		width: e.width,
		height: e.height
	}, s = e.shape, c = t.position;
	if (!s) throw Error("节点缺少 shape 属性，请确保节点包含正确的形状（rectangle/circle/diamond/ellipse）");
	if (!c) throw Error("锚点缺少 position 属性，请确保锚点包含正确的位置（top/right/bottom/left等）");
	let l;
	switch (s) {
		case "circle":
			l = r(o, c);
			break;
		case "ellipse":
			l = i(o, c);
			break;
		case "diamond":
			l = a(o, c);
			break;
		default: l = n(o, c);
	}
	return l;
}
function n(e, t) {
	let n = e.x + e.width / 2, r = e.y + e.height / 2;
	switch (t) {
		case "top-left": return {
			x: e.x,
			y: e.y
		};
		case "top": return {
			x: n,
			y: e.y
		};
		case "top-right": return {
			x: e.x + e.width,
			y: e.y
		};
		case "right": return {
			x: e.x + e.width,
			y: r
		};
		case "bottom-right": return {
			x: e.x + e.width,
			y: e.y + e.height
		};
		case "bottom": return {
			x: n,
			y: e.y + e.height
		};
		case "bottom-left": return {
			x: e.x,
			y: e.y + e.height
		};
		case "left": return {
			x: e.x,
			y: r
		};
		default: return {
			x: n,
			y: r
		};
	}
}
function r(e, t) {
	let n = e.x + e.width / 2, r = e.y + e.height / 2, i = Math.min(e.width, e.height) / 2, a = o(t);
	return {
		x: n + i * Math.cos(a),
		y: r + i * Math.sin(a)
	};
}
function i(e, t) {
	let n = e.x + e.width / 2, r = e.y + e.height / 2, i = e.width / 2, a = e.height / 2, s = o(t);
	return {
		x: n + i * Math.cos(s),
		y: r + a * Math.sin(s)
	};
}
function a(e, t) {
	let n = e.x + e.width / 2, r = e.y + e.height / 2, i = e.width / 2, a = e.height / 2, o = {
		x: n,
		y: r - a
	}, s = {
		x: n + i,
		y: r
	}, c = {
		x: n,
		y: r + a
	}, l = {
		x: n - i,
		y: r
	}, u = (e, t) => ({
		x: (e.x + t.x) / 2,
		y: (e.y + t.y) / 2
	});
	switch (t) {
		case "top-left": return u(l, o);
		case "top": return o;
		case "top-right": return u(o, s);
		case "right": return s;
		case "bottom-right": return u(s, c);
		case "bottom": return c;
		case "bottom-left": return u(c, l);
		case "left": return l;
		default: return {
			x: n,
			y: r
		};
	}
}
function o(e) {
	switch (e) {
		case "top-left": return -Math.PI * .75;
		case "top": return -Math.PI / 2;
		case "top-right": return -Math.PI * .25;
		case "right": return 0;
		case "bottom-right": return Math.PI * .25;
		case "bottom": return Math.PI / 2;
		case "bottom-left": return Math.PI * .75;
		case "left": return Math.PI;
		default: return 0;
	}
}
//#endregion
//#region src/calc/geometry.ts
var s = {
	direction(e, t) {
		let n = t.x - e.x, r = t.y - e.y, i = Math.hypot(n, r);
		return i < 1e-10 ? {
			dx: 0,
			dy: 0
		} : {
			dx: n / i,
			dy: r / i
		};
	},
	normalizeDirection(e) {
		let t = Math.hypot(e.dx, e.dy);
		return t < 1e-10 ? {
			dx: 0,
			dy: 0
		} : {
			dx: e.dx / t,
			dy: e.dy / t
		};
	}
};
//#endregion
//#region src/calc/anchor/orientation.ts
function c(e, n) {
	let r = e.shape, i = n.position;
	if (!i) throw Error("锚点缺少 position 属性");
	if (!r) throw Error("节点缺少 shape 属性");
	switch (r) {
		case "rectangle": return l(i);
		case "circle":
		case "ellipse":
		case "diamond":
			if ([
				"top",
				"right",
				"bottom",
				"left"
			].includes(i)) return u(i);
			let r = t(e, n), a = {
				x: e.x + e.width / 2,
				y: e.y + e.height / 2
			};
			return s.direction(a, r);
		default: throw Error("节点 shape 属性不正确");
	}
}
function l(e) {
	switch (e) {
		case "top":
		case "top-left":
		case "top-right": return {
			dx: 0,
			dy: -1
		};
		case "bottom":
		case "bottom-left":
		case "bottom-right": return {
			dx: 0,
			dy: 1
		};
		case "left": return {
			dx: -1,
			dy: 0
		};
		case "right": return {
			dx: 1,
			dy: 0
		};
		default: return {
			dx: 0,
			dy: 1
		};
	}
}
function u(e) {
	switch (e) {
		case "top": return {
			dx: 0,
			dy: -1
		};
		case "right": return {
			dx: 1,
			dy: 0
		};
		case "bottom": return {
			dx: 0,
			dy: 1
		};
		case "left": return {
			dx: -1,
			dy: 0
		};
		default: return {
			dx: 0,
			dy: 1
		};
	}
}
//#endregion
//#region src/calc/connector/straight.ts
function d(e, t) {
	return {
		path: `M ${e.x} ${e.y} L ${t.x} ${t.y}`,
		startDirection: s.direction(t, e),
		endDirection: s.direction(e, t)
	};
}
//#endregion
//#region src/calc/connector/bezier.ts
function f(e, t, n = .5, r = 40) {
	let i = t.x - e.x, a = Math.max(Math.abs(i) * n, r), o = {
		x: e.x + a,
		y: e.y
	}, c = {
		x: t.x - a,
		y: t.y
	};
	return {
		path: `M ${e.x} ${e.y} C ${o.x} ${o.y}, ${c.x} ${c.y}, ${t.x} ${t.y}`,
		startDirection: s.direction(o, e),
		endDirection: s.direction(c, t)
	};
}
//#endregion
//#region src/calc/connector/flowchart.ts
function p(e, t, n = .5) {
	let r = t.x - e.x, i = t.y - e.y;
	if (Math.abs(r) < .001 && Math.abs(i) < .001) return {
		path: `M ${e.x} ${e.y} L ${t.x} ${t.y}`,
		startDirection: s.direction(t, e),
		endDirection: s.direction(e, t)
	};
	let a = e.x + (t.x - e.x) * n, o = e.y + (t.y - e.y) * n, c = Math.abs(t.x - e.x), l = Math.abs(t.y - e.y), u, d, f;
	return c > l ? (u = `M ${e.x} ${e.y} L ${a} ${e.y} L ${a} ${t.y} L ${t.x} ${t.y}`, d = s.direction({
		x: a,
		y: e.y
	}, e), f = s.direction({
		x: a,
		y: t.y
	}, t)) : (u = `M ${e.x} ${e.y} L ${e.x} ${o} L ${t.x} ${o} L ${t.x} ${t.y}`, d = s.direction({
		x: e.x,
		y: o
	}, e), f = s.direction({
		x: t.x,
		y: o
	}, t)), {
		path: u,
		startDirection: d,
		endDirection: f
	};
}
//#endregion
//#region src/calc/connector/generator.ts
function m(n, r, i) {
	if (!n.sourceAnchorId || !n.targetAnchorId) return null;
	let a = i(n.sourceAnchorId), o = i(n.targetAnchorId);
	if (!a || !o) return null;
	let s = r(a.nodeId), l = r(o.nodeId);
	if (!s || !l) return null;
	let u = n.gap ?? e.connection.gap, m = n.stub ?? e.connection.stub, h = t(s, a), g = t(l, o), _ = c(s, a), v = c(l, o), y = {
		x: h.x + _.dx * u,
		y: h.y + _.dy * u
	}, b = {
		x: h.x + _.dx * (u + m),
		y: h.y + _.dy * (u + m)
	}, x = {
		x: g.x + v.dx * (u + m),
		y: g.y + v.dy * (u + m)
	}, S = {
		x: g.x + v.dx * u,
		y: g.y + v.dy * u
	}, C = n.connectorType ?? e.connection.connectorType, w;
	w = C === "flowchart" ? p(b, x) : C === "bezier" ? f(b, x) : d(b, x);
	let T = w.path, E = w.startDirection, D = w.endDirection, O = T.replace(/^M/, "L");
	return {
		pathD: ` M ${y.x} ${y.y} ${O} L ${S.x} ${S.y}`,
		startDirection: E,
		endDirection: D,
		rawStart: h,
		rawEnd: g,
		start: b,
		end: x
	};
}
//#endregion
//#region src/core/store/Store.ts
var h = class {
	constructor() {
		this.nodes = /* @__PURE__ */ new Map(), this.anchors = /* @__PURE__ */ new Map(), this.connections = /* @__PURE__ */ new Map(), this.listeners = /* @__PURE__ */ new Set();
	}
	subscribe(e) {
		return this.listeners.add(e), () => this.listeners.delete(e);
	}
	notify(e) {
		this.listeners.forEach((t) => t(e));
	}
	addNode(e) {
		let t = {
			...e,
			zIndex: e.zIndex ?? this.getNextZIndex()
		};
		return this.nodes.set(e.id, structuredClone(t)), this.notify("node"), t;
	}
	getNode(e) {
		let t = this.nodes.get(e);
		return t ? structuredClone(t) : void 0;
	}
	updateNode(e, t) {
		let n = this.nodes.get(e);
		n && (Object.assign(n, t), this.notify("node"));
	}
	removeNode(e) {
		this.removeAllAnchors(e), this.nodes.delete(e), this.notify("node");
	}
	getAllNodes() {
		return [...this.nodes.values()].map((e) => structuredClone(e));
	}
	addAnchor(e) {
		let t = { ...e };
		return this.anchors.set(t.id, structuredClone(t)), this.notify("anchor"), t;
	}
	getAnchor(e) {
		let t = this.anchors.get(e);
		return t ? structuredClone(t) : void 0;
	}
	updateAnchor(e, t) {
		let n = this.anchors.get(e);
		n && (Object.assign(n, t), this.notify("anchor"));
	}
	removeAnchor(e) {
		this.anchors.delete(e);
		for (let [t, n] of this.connections) (n.sourceAnchorId === e || n.targetAnchorId === e) && this.connections.delete(t);
		this.notify("anchor");
	}
	removeAllAnchors(e) {
		let t = this.getNodeAnchors(e);
		for (let e of t) this.removeAnchor(e.id);
	}
	getNodeAnchors(e) {
		return [...this.anchors.values()].filter((t) => t.nodeId === e).map((e) => structuredClone(e));
	}
	getAllAnchors() {
		return [...this.anchors.values()].map((e) => structuredClone(e));
	}
	addConnection(t) {
		if (t.sourceAnchorId && !this.getAnchor(t.sourceAnchorId)) return console.error(`源锚点 ${t.sourceAnchorId} 不存在，连线创建失败`), t;
		if (t.targetAnchorId && !this.getAnchor(t.targetAnchorId)) return console.error(`目标锚点 ${t.targetAnchorId} 不存在，连线创建失败`), t;
		t.connectorType ||= e.connection.connectorType;
		let n = {
			...t,
			zIndex: t.zIndex ?? this.getNextZIndex()
		};
		return this.connections.set(n.id, structuredClone(n)), this.notify("connection"), n;
	}
	getConnection(e) {
		let t = this.connections.get(e);
		return t ? structuredClone(t) : void 0;
	}
	removeConnection(e) {
		this.connections.delete(e), this.notify("connection");
	}
	getAllConnections() {
		return [...this.connections.values()].map((e) => structuredClone(e));
	}
	findConnectionByAnchor(e) {
		for (let t of this.connections.values()) if (t.sourceAnchorId === e || t.targetAnchorId === e) return structuredClone(t);
	}
	updateConnection(e, t) {
		let n = this.connections.get(e);
		n && (Object.assign(n, t), this.notify("connection"));
	}
	computeConnectionPath(e) {
		return m(e, this.getNode.bind(this), this.getAnchor.bind(this));
	}
	calcAnchorPosForNode(e, n) {
		return t(e, n);
	}
	deleteSelected(e, t) {
		e === "node" ? this.removeNode(t) : e === "anchor" ? this.removeAnchor(t) : e === "connection" && this.removeConnection(t);
	}
	exportData() {
		return {
			nodes: this.getAllNodes(),
			anchors: this.getAllAnchors(),
			connections: this.getAllConnections()
		};
	}
	importData(e) {
		this.nodes.clear(), this.anchors.clear(), this.connections.clear(), e.nodes.forEach((e) => this.addNode(e)), e.anchors.forEach((e) => this.addAnchor(e)), e.connections.forEach((e) => this.addConnection(e)), this.notify("node");
	}
	updateConnectionSource(e, t) {
		let n = this.connections.get(e);
		return !n || n.sourceAnchorId === t || this.getAllConnections().some((r) => r.id !== e && r.sourceAnchorId === t && r.targetAnchorId === n.targetAnchorId) ? !1 : (n.sourceAnchorId = t, this.notify("connection"), !0);
	}
	updateConnectionTarget(e, t) {
		let n = this.connections.get(e);
		return !n || n.targetAnchorId === t || this.getAllConnections().some((r) => r.id !== e && r.sourceAnchorId === n.sourceAnchorId && r.targetAnchorId === t) ? !1 : (n.targetAnchorId = t, this.notify("connection"), !0);
	}
	isAnchorFull(t) {
		let n = e.connection.maxConnections;
		return n <= 0 ? !1 : Array.from(this.connections.values()).filter((e) => e.sourceAnchorId === t || e.targetAnchorId === t).length >= n;
	}
	updateAllNodes(e) {
		for (let [t, n] of this.nodes) Object.assign(n, e);
		this.notify("node");
	}
	updateAllConnections(e) {
		for (let [t, n] of this.connections) {
			e.arrow && typeof e.arrow == "object" && (n.arrow = {
				...n.arrow || {},
				...e.arrow
			}), e.label && typeof e.label == "object" && (n.label = {
				...n.label || {},
				...e.label
			});
			let { arrow: t, label: r, ...i } = e;
			Object.assign(n, i);
		}
		this.notify("connection");
	}
	updateAllAnchors(e) {
		for (let [t, n] of this.anchors) Object.assign(n, e);
		this.notify("anchor");
	}
	getMaxZIndex() {
		let t = e.zIndexBase - 1;
		for (let e of this.nodes.values()) e.zIndex !== void 0 && e.zIndex > t && (t = e.zIndex);
		for (let e of this.connections.values()) e.zIndex !== void 0 && e.zIndex > t && (t = e.zIndex);
		return t;
	}
	getNextZIndex() {
		return this.getMaxZIndex() + 1;
	}
	updateNodeZIndex(e, t) {
		let n = this.nodes.get(e);
		n && (n.zIndex = t, this.notify("node"));
	}
	updateConnectionZIndex(e, t) {
		let n = this.connections.get(e);
		n && (n.zIndex = t, this.notify("connection"));
	}
	getCurrentMaxZIndex() {
		return this.getMaxZIndex();
	}
	getCurrentMinZIndex() {
		let t = Infinity;
		for (let e of this.nodes.values()) e.zIndex !== void 0 && e.zIndex < t && (t = e.zIndex);
		for (let e of this.connections.values()) e.zIndex !== void 0 && e.zIndex < t && (t = e.zIndex);
		return t === Infinity ? e.zIndexBase : t;
	}
};
//#endregion
//#region src/utils/dom.ts
function g(e) {
	return document.createElementNS("http://www.w3.org/2000/svg", e);
}
//#endregion
//#region src/core/viewport/ViewportManager.ts
var _ = class {
	constructor(e) {
		this.translate = {
			x: 0,
			y: 0
		}, this.scale = 1, this.spacePressed = !1, this.dragStart = null, this.viewChangeCallbacks = [], this.gridSize = 20, this.gridColor = "#e5e7eb", this.svg = e, this.svg.style.width = "100%", this.svg.style.height = "100%", this.contentGroup = g("g"), this.gridLayer = g("g"), this.renderGrid(), this.contentGroup.prepend(this.gridLayer), this.svg.appendChild(this.contentGroup), this.bindEvents(), this.applyTransform();
	}
	subscribe(e) {
		return this.viewChangeCallbacks.push(e), () => {
			let t = this.viewChangeCallbacks.indexOf(e);
			t > -1 && this.viewChangeCallbacks.splice(t, 1);
		};
	}
	triggerChange() {
		this.viewChangeCallbacks.forEach((e) => e());
	}
	setTransform(e, t, n) {
		this.translate.x = e, this.translate.y = t, this.scale = Math.max(.3, Math.min(3, n)), this.applyTransform(), this.triggerChange();
	}
	getTranslate() {
		return { ...this.translate };
	}
	getScale() {
		return this.scale;
	}
	renderGrid() {
		this.gridLayer.innerHTML = "";
		let e = g("defs"), t = g("pattern");
		t.setAttribute("id", "gridPattern"), t.setAttribute("width", String(this.gridSize)), t.setAttribute("height", String(this.gridSize)), t.setAttribute("patternUnits", "userSpaceOnUse");
		let n = g("path");
		n.setAttribute("d", `M ${this.gridSize} 0 L 0 0 L 0 ${this.gridSize}`), n.setAttribute("stroke", this.gridColor), n.setAttribute("stroke-width", "0.5"), n.setAttribute("fill", "none"), t.appendChild(n), e.appendChild(t), this.gridLayer.appendChild(e);
		let r = g("rect");
		r.setAttribute("x", "-100000"), r.setAttribute("y", "-100000"), r.setAttribute("width", "200000"), r.setAttribute("height", "200000"), r.setAttribute("fill", "url(#gridPattern)"), r.setAttribute("pointer-events", "none"), this.gridLayer.appendChild(r);
	}
	bindEvents() {
		window.addEventListener("keydown", this.onKeyDown.bind(this), !0), window.addEventListener("keyup", this.onKeyUp.bind(this), !0), this.svg.addEventListener("mousedown", this.onMouseDown.bind(this)), window.addEventListener("mousemove", this.onMouseMove.bind(this)), this.svg.addEventListener("wheel", this.onWheel.bind(this), { passive: !1 }), window.addEventListener("resize", this.renderGrid.bind(this));
	}
	onKeyDown(e) {
		e.code === "Space" && (e.preventDefault(), e.stopPropagation(), this.spacePressed = !0, this.svg.style.cursor = "grab", console.log("🔑 空格按下，spacePressed =", this.spacePressed));
	}
	onKeyUp(e) {
		e.code === "Space" && (e.preventDefault(), e.stopPropagation(), this.spacePressed = !1, this.dragStart = null, this.svg.style.cursor = "", console.log("🔑 空格释放，spacePressed =", this.spacePressed));
	}
	onMouseDown(e) {
		this.spacePressed && (e.preventDefault(), e.stopPropagation(), this.dragStart = {
			x: e.clientX,
			y: e.clientY
		}, this.svg.style.cursor = "grabbing", console.log("🖱️ 空格拖拽开始，dragStart =", this.dragStart));
	}
	onMouseMove(e) {
		if (!this.spacePressed || !this.dragStart) {
			(this.svg.style.cursor === "grabbing" || this.svg.style.cursor === "grab") && (this.svg.style.cursor = "");
			return;
		}
		let t = e.clientX - this.dragStart.x, n = e.clientY - this.dragStart.y;
		this.translate.x += t, this.translate.y += n, this.dragStart = {
			x: e.clientX,
			y: e.clientY
		}, this.applyTransform(), this.triggerChange(), console.log("🔄 平移:", this.translate);
	}
	onWheel(e) {
		e.preventDefault(), e.stopPropagation();
		let t = e.deltaY > 0 ? -.08 : .08, n = Math.max(.3, Math.min(3, this.scale + t)), r = {
			x: e.clientX,
			y: e.clientY
		}, i = this.screenToCanvas(r);
		this.scale = n;
		let a = this.screenToCanvas(r);
		this.translate.x += i.x - a.x, this.translate.y += i.y - a.y, this.applyTransform(), this.triggerChange(), console.log("🔄 缩放:", this.scale, "translate:", this.translate);
	}
	applyTransform() {
		this.contentGroup.setAttribute("transform", `translate(${this.translate.x} ${this.translate.y}) scale(${this.scale})`);
	}
	screenToCanvas(e) {
		let t = this.svg.getBoundingClientRect(), n = e.x - t.left, r = e.y - t.top;
		return {
			x: (n - this.translate.x) / this.scale,
			y: (r - this.translate.y) / this.scale
		};
	}
	canvasToScreen(e) {
		let t = this.svg.getBoundingClientRect();
		return {
			x: e.x * this.scale + this.translate.x + t.left,
			y: e.y * this.scale + this.translate.y + t.top
		};
	}
	isSpaceActive() {
		return this.spacePressed;
	}
	getContentGroup() {
		return this.contentGroup;
	}
	destroy() {
		window.removeEventListener("keydown", this.onKeyDown.bind(this)), window.removeEventListener("keyup", this.onKeyUp.bind(this)), this.svg.removeEventListener("mousedown", this.onMouseDown.bind(this)), window.removeEventListener("mousemove", this.onMouseMove.bind(this)), this.svg.removeEventListener("wheel", this.onWheel), window.removeEventListener("resize", this.renderGrid.bind(this)), this.viewChangeCallbacks = [];
	}
}, v = class {
	constructor() {
		this.selectedType = null, this.selectedId = null, this.listeners = /* @__PURE__ */ new Set();
	}
	subscribe(e) {
		return this.listeners.add(e), () => this.listeners.delete(e);
	}
	notify() {
		this.listeners.forEach((e) => e());
	}
	getSelection() {
		return {
			type: this.selectedType,
			id: this.selectedId
		};
	}
	select(e, t) {
		this.selectedType = e, this.selectedId = t, this.notify();
	}
	clear() {
		this.selectedType = null, this.selectedId = null, this.notify();
	}
	isSelected(e, t) {
		return this.selectedType === e && this.selectedId === t;
	}
}, y = class {
	constructor(e) {
		this.dragManager = e, this.SE = e.SE;
	}
	get store() {
		return this.SE.store;
	}
	get viewport() {
		return this.SE.viewport;
	}
	get selection() {
		return this.SE.selection;
	}
	get renderer() {
		return this.SE.renderer;
	}
	start(e) {
		if (this.dragManager.state !== "idle") return;
		let t = e.target, n, r = t;
		for (; r && !n;) {
			n = r.getAttribute("data-node-id") ?? void 0;
			let e = r.parentElement;
			if (!e) break;
			r = e;
		}
		if (!n) return;
		let i = this.store.getNode(n);
		if (!i) return;
		let a = this.viewport.screenToCanvas({
			x: e.clientX,
			y: e.clientY
		});
		this.dragManager.nodeDragData = {
			nodeId: n,
			offset: {
				x: a.x - i.x,
				y: a.y - i.y
			}
		}, this.selection.select("node", n), this.dragManager.state = "node_dragging";
	}
	processMove(e) {
		let t = this.dragManager.nodeDragData;
		if (!t) return !1;
		let { nodeId: n, offset: r } = t, i = e.x - r.x, a = e.y - r.y;
		return this.store.updateNode(n, {
			x: i,
			y: a
		}), !0;
	}
	end(e) {
		let t = this.dragManager.nodeDragData;
		t && (this.selection.select("node", t.nodeId), this.dragManager.nodeDragData = null, this.dragManager.state = "idle");
	}
	cancel() {
		this.dragManager.nodeDragData = null;
	}
}, b = class {
	findNearestAnchor(e, t, n, r = 15) {
		let i = t.getAllAnchors(), a = null, o = r;
		for (let s of i) {
			if (n && s.id === n) continue;
			let i = t.getNode(s.nodeId);
			if (!i) continue;
			let c = t.calcAnchorPosForNode(i, s);
			(s.position?.includes("top") && s.position?.includes("left") || s.position?.includes("top") && s.position?.includes("right") || s.position?.includes("bottom") && s.position?.includes("left") || s.position?.includes("bottom") && s.position?.includes("right")) && r * 1.5;
			let l = Math.hypot(e.x - c.x, e.y - c.y);
			l < o && (o = l, a = s);
		}
		return a;
	}
}, x = class {
	constructor(e) {
		this.hitTest = new b(), this.dragManager = e, this.SE = e.SE;
	}
	get store() {
		return this.SE.store;
	}
	get viewport() {
		return this.SE.viewport;
	}
	get selection() {
		return this.SE.selection;
	}
	get renderer() {
		return this.SE.renderer;
	}
	start(e, t) {
		if (this.viewport.isSpaceActive() || this.dragManager.state !== "idle") return;
		let n = this.store.isAnchorFull(e.id);
		if (n) {
			console.warn(`锚点 ${e.id} 已满，不能拖拽`);
			return;
		}
		let r = this.store.findConnectionByAnchor(e.id), i = r !== void 0 && !n;
		if (i && r?.fixed === !0) {
			console.warn("连线已固定，不可重连");
			return;
		}
		let a = this.store.getNode(e.nodeId);
		if (!a) return;
		let o = this.store.calcAnchorPosForNode(a, e);
		this.dragManager.pendingDrag = {
			anchor: e,
			startPos: o,
			evt: t,
			isReconnect: i
		}, this.dragManager.state = "link_dragging";
	}
	startDragging() {
		let e = this.dragManager.pendingDrag;
		if (!e) return;
		let { anchor: t, startPos: n, evt: r, isReconnect: i } = e;
		if (i) {
			let e = this.store.findConnectionByAnchor(t.id);
			if (!e) {
				console.warn("重连时未找到现有连线"), this._resetDragState();
				return;
			}
			this.handleReconnect(t, e, n, r);
		} else this.handleCreate(t, n, r);
		this.dragManager.pendingDrag = null, this.SE.getSvgRoot().style.cursor = "grabbing", this.clearHighlight();
	}
	handleCreate(t, n, r) {
		let i = this.store.getNode(t.nodeId);
		if (!i) return;
		let a = c(i, t);
		this.dragManager.linkDragData = {
			sourceAnchorId: t.id,
			startX: n.x,
			startY: n.y,
			endX: n.x,
			endY: n.y,
			type: "create",
			dragDirection: "output",
			orientation: a,
			connectorType: "straight",
			stroke: e.connection.stroke,
			strokeWidth: e.connection.strokeWidth
		};
	}
	handleReconnect(t, n, r, i) {
		let a, o;
		if (n.sourceAnchorId === t.id) a = "output", o = n.targetAnchorId;
		else if (n.targetAnchorId === t.id) a = "input", o = n.sourceAnchorId;
		else return;
		let s = this.store.getAnchor(o);
		if (!s) return;
		let l = this.store.getNode(s.nodeId);
		if (!l) return;
		let u = this.store.calcAnchorPosForNode(l, s), d = c(l, s), f = n.stroke || e.connection.stroke, p = n.strokeWidth || e.connection.strokeWidth, m = n.connectorType;
		this.dragManager.linkDragData = {
			sourceAnchorId: t.id,
			startX: u.x,
			startY: u.y,
			endX: r.x,
			endY: r.y,
			type: "reconnect",
			connectionId: n.id,
			oldSourceAnchorId: n.sourceAnchorId,
			oldTargetAnchorId: n.targetAnchorId,
			dragDirection: a,
			orientation: d,
			stroke: f,
			strokeWidth: p,
			connectorType: m,
			fixedAnchorId: o
		}, this.renderer.setReconnecting(n.id, !0), this.renderer.highlightAnchor(t.id, !0);
	}
	processMove(e) {
		let t = this.dragManager.linkDragData;
		if (!t) return !1;
		t.endX = e.x, t.endY = e.y, t.type, this._updateTempLine(t, e);
		let n = this.hitTest.findNearestAnchor(e, this.store, t.sourceAnchorId), r = this.store.getAnchor(t.sourceAnchorId), i = r ? this.store.getNode(r.nodeId) : null, a = n && i && n.id !== t.sourceAnchorId;
		return a && n !== this.dragManager.highlightedAnchor ? (this.clearHighlight(), this.dragManager.highlightedAnchor = n, this.renderer.highlightAnchor(n.id, !0), this.dragManager.state = "hovering") : !a && this.dragManager.highlightedAnchor && (this.clearHighlight(), this.dragManager.state = "link_dragging"), !0;
	}
	end(e) {
		let t = this.dragManager.linkDragData;
		if (!t) return;
		let n = this.viewport.screenToCanvas({
			x: e.clientX,
			y: e.clientY
		}), r = this.hitTest.findNearestAnchor(n, this.store, t.sourceAnchorId), i = this.store.getAnchor(t.sourceAnchorId), a = t.type === "reconnect", o = t.dragDirection;
		console.log(`[onMouseUp] 目标锚点: ${r?.id || "无"}`), r && i ? r.id === i.id ? console.warn("⏭️ 目标锚点与源锚点相同，取消操作") : this._handleDrop(i, r, a) : console.warn(`⏭️ 未命中有效目标锚点，取消操作。拖拽端方向=${o}`), a && t.connectionId && this.renderer.setReconnecting(t.connectionId, !1), this.clearHighlight(), this.renderer.clearTempLine(), this._resetDragState();
	}
	cancel() {
		this._resetDragState(), this.renderer.clearTempLine(), this.clearHighlight();
	}
	_updateTempLine(e, t) {
		let n = e.type === "reconnect", r = e.connectorType || "flowchart", i = e.orientation;
		this.renderer.setTempLine({
			x1: e.startX,
			y1: e.startY,
			x2: t.x,
			y2: t.y
		}, r, n, e.stroke, e.strokeWidth, i);
	}
	_handleDrop(e, t, n) {
		return n ? this._handleReconnectDrop(e, t) : this._handleCreateDrop(e, t);
	}
	_handleCreateDrop(t, n) {
		return this.store.getAllConnections().some((e) => e.sourceAnchorId === t.id && e.targetAnchorId === n.id) ? (console.warn("连线已存在，创建取消"), !1) : (this.store.addConnection({
			id: crypto.randomUUID(),
			connectorType: "straight",
			sourceAnchorId: t.id,
			targetAnchorId: n.id,
			stroke: e.connection.stroke,
			strokeWidth: e.connection.strokeWidth,
			stub: e.connection.stub,
			gap: 0
		}), console.log(`✅ 新建连线成功: 源锚点=${t.id}, 目标锚点=${n.id}`), !0);
	}
	_handleReconnectDrop(e, t) {
		let n = this.dragManager.linkDragData;
		if (!n) return !1;
		let r = n.connectionId, i = this.store.getConnection(r);
		if (!i) return !1;
		let a = n.dragDirection, o = i.sourceAnchorId, s = i.targetAnchorId;
		return a === "output" ? o = t.id : s = t.id, o === i.sourceAnchorId && s === i.targetAnchorId ? (console.log("⏭️ 目标未变化，取消重连"), !1) : this.store.getAllConnections().some((e) => e.id !== r && e.sourceAnchorId === o && e.targetAnchorId === s) ? (console.warn("连线已存在，重连取消"), !1) : (this.store.updateConnection(r, {
			sourceAnchorId: o,
			targetAnchorId: s
		}), console.log("✅ 重连成功"), !0);
	}
	_resetDragState() {
		this.dragManager.linkDragData = null, this.dragManager.pendingDrag = null, this.dragManager.state = "idle";
	}
	clearHighlight() {
		this.dragManager.highlightedAnchor && (this.renderer.highlightAnchor(this.dragManager.highlightedAnchor.id, !1), this.dragManager.highlightedAnchor = null);
	}
}, S = class {
	get isDragging() {
		return this.state !== "idle";
	}
	constructor(e) {
		this.state = "idle", this.nodeDragData = null, this.linkDragData = null, this.highlightedAnchor = null, this.pendingDrag = null, this.rafId = null, this.lastMoveEvent = null, this.dragEventsBound = !1, this.currentExecutor = null, this.SE = e;
	}
	startNodeDrag(e) {
		this.state === "idle" && (this.currentExecutor = new y(this), this.currentExecutor.start(e), this.bindDragEvents(), e.preventDefault());
	}
	startLinkDrag(e, t) {
		this.state === "idle" && (this.store.findConnectionByAnchor(e.id) !== void 0 && this.store.isAnchorFull(e.id), this.currentExecutor = new x(this), this.currentExecutor.start(e, t), this.bindDragEvents(), t.preventDefault());
	}
	cancelDrag() {
		this._cancelDrag();
	}
	bindDragEvents() {
		this.dragEventsBound ||= (window.addEventListener("mousemove", this.onMouseMove.bind(this), { passive: !0 }), window.addEventListener("mouseup", this.onMouseUp.bind(this)), window.addEventListener("keydown", this.onKeyDown.bind(this)), window.addEventListener("blur", this._cancelDrag.bind(this)), !0);
	}
	unbindDragEvents() {
		this.dragEventsBound &&= (window.removeEventListener("mousemove", this.onMouseMove.bind(this)), window.removeEventListener("mouseup", this.onMouseUp.bind(this)), window.removeEventListener("keydown", this.onKeyDown.bind(this)), window.removeEventListener("blur", this._cancelDrag.bind(this)), !1);
	}
	onMouseMove(e) {
		if (this.pendingDrag) {
			let t = this.viewport.screenToCanvas({
				x: e.clientX,
				y: e.clientY
			}), n = t.x - this.pendingDrag.startPos.x, r = t.y - this.pendingDrag.startPos.y;
			Math.sqrt(n * n + r * r) > 5 && (this.currentExecutor && "startDragging" in this.currentExecutor && this.currentExecutor.startDragging(), this.lastMoveEvent = e, this.rafId === null && (this.rafId = requestAnimationFrame(() => this.processMove())));
			return;
		}
		this.lastMoveEvent = e, this.rafId === null && (this.rafId = requestAnimationFrame(() => this.processMove()));
	}
	onMouseUp(e) {
		if (this.pendingDrag) {
			let { anchor: e } = this.pendingDrag;
			console.log("🔍 [点击锚点] (未拖拽) 锚点:", e.id), this.pendingDrag = null, this.SE.getSvgRoot().style.cursor = "", this.unbindDragEvents();
			return;
		}
		if (this.SE.getSvgRoot().style.cursor = "", this.rafId !== null && (cancelAnimationFrame(this.rafId), this.rafId = null), this.state === "node_dragging" && this.nodeDragData) {
			this.currentExecutor?.end?.(e), this.unbindDragEvents();
			return;
		}
		if ((this.state === "link_dragging" || this.state === "hovering") && this.linkDragData) {
			this.currentExecutor?.end?.(e), this.unbindDragEvents();
			return;
		}
		this.unbindDragEvents();
	}
	processMove() {
		if (this.rafId = null, !this.lastMoveEvent) return;
		let e = this.lastMoveEvent;
		this.lastMoveEvent = null;
		let t = this.viewport.screenToCanvas({
			x: e.clientX,
			y: e.clientY
		});
		this.currentExecutor && typeof this.currentExecutor.processMove == "function" && this.currentExecutor.processMove(t);
	}
	onKeyDown(e) {
		if (e.key === "Escape") {
			this._cancelDrag();
			return;
		}
		if (e.key === "Delete" || e.key === "Backspace") {
			let e = this.selection.getSelection();
			if (!e.type || e.type === "anchor" || !e.id) return;
			let t = e.type === "node" ? "确定删除节点（关联锚点、连线会一并清除）？" : "确定删除当前连线？";
			if (!window.confirm(t)) return;
			e.type === "node" ? this.store.removeNode(e.id) : e.type === "connection" && this.store.removeConnection(e.id), this.selection.clear();
		}
	}
	_cancelDrag() {
		this.rafId !== null && (cancelAnimationFrame(this.rafId), this.rafId = null), this.linkDragData?.connectionId && this.renderer.setReconnecting(this.linkDragData.connectionId, !1), this.currentExecutor?.cancel?.(), this.renderer.clearTempLine(), this.SE.getSvgRoot().style.cursor = "", this.nodeDragData = null, this.linkDragData = null, this.pendingDrag = null, this.state = "idle", this.currentExecutor = null, this.unbindDragEvents();
	}
	get store() {
		return this.SE.store;
	}
	get viewport() {
		return this.SE.viewport;
	}
	get selection() {
		return this.SE.selection;
	}
	get renderer() {
		return this.SE.renderer;
	}
	destroy() {
		this._cancelDrag(), this.unbindDragEvents();
	}
}, C = class {
	constructor(e) {
		this.rootGroup = g("g"), this.bgLayer = g("g"), this.elementLayer = g("g"), this.tempLayer = g("g"), this.rootGroup.append(this.bgLayer, this.elementLayer, this.tempLayer), e.appendChild(this.rootGroup);
	}
	destroy() {
		this.rootGroup.remove();
	}
}, w = class {
	constructor(e, t, n) {
		this.store = e, this.selection = t, this.elementLayer = n;
	}
	render() {
		let t = [...this.store.getAllNodes()].sort((t, n) => (t.zIndex ?? e.zIndexBase) - (n.zIndex ?? e.zIndexBase));
		for (let n of t) {
			let t = n.zIndex ?? e.zIndexBase, r = g("g");
			r.setAttribute("data-node-id", n.id), r.dataset.zIndex = String(t);
			let i = this.selection.isSelected("node", n.id), a = e.node.stroke, o = e.node.strokeWidth, s = i ? e.node.selectedStroke : n.stroke || a, c = i ? e.node.selectedStrokeWidth : n.strokeWidth || o, l;
			switch (n.shape) {
				case "circle":
					l = this.createCircle(n, s, c, i);
					break;
				case "diamond":
					l = this.createDiamond(n, s, c, i);
					break;
				case "ellipse":
					l = this.createEllipse(n, s, c, i);
					break;
				default: l = this.createRect(n, s, c, i);
			}
			if (r.appendChild(l), n.label) {
				let t = g("text"), i = n.x + n.width / 2, a = n.y + n.height / 2 + e.node.labelOffsetY;
				t.setAttribute("x", String(i)), t.setAttribute("y", String(a)), t.setAttribute("text-anchor", "middle"), t.setAttribute("fill", e.node.labelColor), t.setAttribute("font-size", String(e.node.labelFontSize)), t.setAttribute("font-family", "sans-serif"), t.textContent = n.label, r.appendChild(t);
			}
			this.elementLayer.appendChild(r);
			let u = this.store.getNodeAnchors(n.id);
			for (let r of u) {
				let i = this.store.calcAnchorPosForNode(n, r), a = g("circle"), o = r.radius ?? e.anchor.radius;
				a.setAttribute("cx", String(i.x)), a.setAttribute("cy", String(i.y)), a.setAttribute("r", String(o)), a.style.cursor = "default", a.style.transition = "all 0.15s ease-out", a.dataset.anchorId = r.id, a.dataset.zIndex = String(t + 1), a.dataset.nodeId = n.id, a.setAttribute("fill", r.fill ?? e.anchor.fill), a.setAttribute("stroke", r.stroke ?? e.anchor.stroke), a.setAttribute("stroke-width", String(r.strokeWidth ?? e.anchor.strokeWidth)), this.elementLayer.appendChild(a);
			}
		}
	}
	highlightAnchor(t, n) {
		let r = this.elementLayer.querySelectorAll(`circle[data-anchor-id="${t}"]`);
		for (let i of r) {
			let r = this.store.getAnchor(t), a = r?.radius ?? e.anchor.radius;
			if (n) {
				let t = a * e.anchor.hoverRadiusMultiplier;
				i.setAttribute("r", String(t)), i.setAttribute("stroke", e.anchor.hoverStroke), i.setAttribute("stroke-width", String(e.anchor.hoverStrokeWidth)), i.setAttribute("filter", e.anchor.hoverShadow);
			} else i.setAttribute("r", String(a)), i.setAttribute("stroke", r?.stroke ?? e.anchor.stroke), i.setAttribute("fill", r?.fill ?? e.anchor.fill), i.setAttribute("stroke-width", String(r?.strokeWidth ?? e.anchor.strokeWidth)), i.setAttribute("filter", "none");
		}
	}
	createRect(t, n, r, i) {
		let a = g("rect");
		return a.setAttribute("x", String(t.x)), a.setAttribute("y", String(t.y)), a.setAttribute("width", String(t.width)), a.setAttribute("height", String(t.height)), a.setAttribute("rx", String(e.node.rx)), a.setAttribute("ry", String(e.node.ry)), a.setAttribute("fill", t.fill || e.node.fill), a.setAttribute("stroke", n), a.setAttribute("stroke-width", String(r)), a.setAttribute("filter", i ? e.node.selectedShadowFilter : e.node.shadowFilter), a;
	}
	createCircle(t, n, r, i) {
		let a = g("circle"), o = t.x + t.width / 2, s = t.y + t.height / 2, c = Math.min(t.width, t.height) / 2;
		return a.setAttribute("cx", String(o)), a.setAttribute("cy", String(s)), a.setAttribute("r", String(c)), a.setAttribute("fill", t.fill || e.node.fill), a.setAttribute("stroke", n), a.setAttribute("stroke-width", String(r)), a.setAttribute("filter", i ? e.node.selectedShadowFilter : e.node.shadowFilter), a;
	}
	createDiamond(t, n, r, i) {
		let a = g("polygon"), o = t.x + t.width / 2, s = t.y + t.height / 2, c = t.width / 2, l = t.height / 2, u = `${o},${s - l} ${o + c},${s} ${o},${s + l} ${o - c},${s}`;
		return a.setAttribute("points", u), a.setAttribute("fill", t.fill || e.node.fill), a.setAttribute("stroke", n), a.setAttribute("stroke-width", String(r)), a.setAttribute("filter", i ? e.node.selectedShadowFilter : e.node.shadowFilter), a;
	}
	createEllipse(t, n, r, i) {
		let a = g("ellipse"), o = t.x + t.width / 2, s = t.y + t.height / 2, c = t.width / 2, l = t.height / 2;
		return a.setAttribute("cx", String(o)), a.setAttribute("cy", String(s)), a.setAttribute("rx", String(c)), a.setAttribute("ry", String(l)), a.setAttribute("fill", t.fill || e.node.fill), a.setAttribute("stroke", n), a.setAttribute("stroke-width", String(r)), a.setAttribute("filter", i ? e.node.selectedShadowFilter : e.node.shadowFilter), a;
	}
}, T = class {
	constructor(e, t, n) {
		this.store = e, this.selection = t, this.elementLayer = n;
	}
	render(t) {
		let n = [...this.store.getAllConnections()].sort((t, n) => (t.zIndex ?? e.zIndexBase) - (n.zIndex ?? e.zIndexBase));
		for (let r of n) {
			if (t && t.has(r.id)) continue;
			let n = this.store.computeConnectionPath(r);
			if (!n) continue;
			let { start: i, end: a, pathD: o, startDirection: c, endDirection: l } = n, u = g("g");
			u.dataset.connectionId = r.id, u.style.cursor = "pointer", u.dataset.zIndex = String(r.zIndex ?? e.zIndexBase);
			let d = g("path");
			d.setAttribute("d", o), d.setAttribute("fill", "none");
			let f = this.selection.isSelected("connection", r.id), p = e.connection.stroke, m = e.connection.strokeWidth, h = f ? e.connection.selectedStroke : r.stroke || p, _ = f ? e.connection.selectedStrokeWidth : r.strokeWidth || m;
			if (d.setAttribute("stroke", h), d.setAttribute("stroke-width", String(_)), d.setAttribute("stroke-linecap", e.connection.strokeLinecap), d.setAttribute("stroke-linejoin", e.connection.strokeLinejoin), u.appendChild(d), r.arrow && r.arrow.direction !== "none") {
				let e = r.arrow;
				if (e.direction === "target" || e.direction === "both") {
					let t = s.normalizeDirection(l), n = this.renderArrow(e, a, t, e.color || h);
					n && u.appendChild(n);
				}
				if (e.direction === "source" || e.direction === "both") {
					let t = s.normalizeDirection(c), n = this.renderArrow(e, i, t, e.color || h);
					n && u.appendChild(n);
				}
			}
			if (r.label) {
				let e = this.renderLabel(r.label, {
					start: i,
					end: a,
					pathD: o
				});
				e && u.appendChild(e);
			}
			this.elementLayer.appendChild(u);
		}
	}
	renderArrow(t, n, r, i) {
		let a = t.length || e.arrow.length, o = t.width || e.arrow.width, c = t.type || e.arrow.type, l = s.normalizeDirection(r);
		if (l.dx === 0 && l.dy === 0) return null;
		let u = l.dx, d = l.dy, f = {
			x: n.x - u * a,
			y: n.y - d * a
		}, p = o / 2, m = {
			x: f.x + d * p,
			y: f.y - u * p
		}, h = {
			x: f.x - d * p,
			y: f.y + u * p
		}, _ = g("path"), v = "";
		return c === "fork" ? (v = `M ${n.x.toFixed(2)} ${n.y.toFixed(2)} L ${m.x.toFixed(2)} ${m.y.toFixed(2)} M ${n.x.toFixed(2)} ${n.y.toFixed(2)} L ${h.x.toFixed(2)} ${h.y.toFixed(2)}`, _.setAttribute("stroke", i), _.setAttribute("stroke-width", String(o / 3)), _.setAttribute("fill", "none")) : (v += `M ${n.x.toFixed(2)} ${n.y.toFixed(2)} L ${m.x.toFixed(2)} ${m.y.toFixed(2)} L ${h.x.toFixed(2)} ${h.y.toFixed(2)} Z`, _.setAttribute("fill", i), _.setAttribute("stroke", "none")), _.setAttribute("d", v.trim()), _.setAttribute("pointer-events", "none"), _;
	}
	renderLabel(t, n) {
		let r = this.getPathMidPoint(n.start, n.end), i = g("text"), a = t.offset?.x ?? e.label.offsetX, o = t.offset?.y ?? e.label.offsetY;
		return i.setAttribute("x", String(r.x + a)), i.setAttribute("y", String(r.y + o)), i.setAttribute("text-anchor", "middle"), i.setAttribute("dominant-baseline", "middle"), i.setAttribute("fill", t.color ?? e.label.color), i.setAttribute("font-size", String(t.fontSize ?? e.label.fontSize)), i.setAttribute("font-family", e.label.fontFamily), i.textContent = t.text, i;
	}
	getPathMidPoint(e, t) {
		return {
			x: (e.x + t.x) / 2,
			y: (e.y + t.y) / 2
		};
	}
}, E = class {
	constructor(e) {
		this.tempLayer = e, this.group = null, this.pathEl = null, this.dotEl = null;
	}
	setTempLine(e, t, n = !1, r, i, a) {
		this.group || (this.group = g("g"), this.group.setAttribute("pointer-events", "none"), this.pathEl = g("path"), this.pathEl.setAttribute("fill", "none"), this.group.appendChild(this.pathEl), this.dotEl = g("circle"), this.dotEl.setAttribute("r", "6"), this.dotEl.setAttribute("fill", "rgba(150,150,150,0.5)"), this.dotEl.setAttribute("stroke", "none"), this.group.appendChild(this.dotEl), this.tempLayer.appendChild(this.group)), n && r ? (this.pathEl.setAttribute("stroke", r), this.pathEl.setAttribute("stroke-width", String(i || 2)), this.pathEl.setAttribute("stroke-dasharray", "none")) : (this.pathEl.setAttribute("stroke", "rgba(150,150,150,0.7)"), this.pathEl.setAttribute("stroke-width", "2.5"), this.pathEl.setAttribute("stroke-dasharray", "8 4"));
		let o = {
			x: e.x1,
			y: e.y1
		}, s = {
			x: e.x2,
			y: e.y2
		}, c;
		c = t === "flowchart" ? p(o, s).path : t === "bezier" ? f(o, s).path : d(o, s).path, this.pathEl.setAttribute("d", c), this.dotEl.setAttribute("cx", String(e.x2)), this.dotEl.setAttribute("cy", String(e.y2));
	}
	clear() {
		this.group && (this.group.remove(), this.group = null, this.pathEl = null, this.dotEl = null);
	}
	getGroup() {
		return this.group;
	}
	exists() {
		return this.group !== null;
	}
	destroy() {
		this.clear();
	}
}, D = class {
	constructor(e) {
		this.reconnectingIds = /* @__PURE__ */ new Set(), this.SE = e, this.svgRoot = e.getSvgRoot(), this.viewport = e.viewport, this.selection = e.selection, this.layerManager = new C(this.viewport.getContentGroup()), this.nodeRenderer = new w(this.SE.store, this.selection, this.layerManager.elementLayer), this.connectionRenderer = new T(this.SE.store, this.selection, this.layerManager.elementLayer), this.tempLineManager = new E(this.layerManager.tempLayer), this.SE.store.subscribe(() => this.renderAll()), this.selection.subscribe(() => this.renderAll());
	}
	renderAll() {
		let e = this.tempLineManager.getGroup();
		this.layerManager.elementLayer.innerHTML = "", e && this.layerManager.elementLayer.appendChild(e), this.connectionRenderer.render(this.reconnectingIds), this.nodeRenderer.render(), this.sortElementsByZIndex();
	}
	setReconnecting(e, t) {
		t ? this.reconnectingIds.add(e) : this.reconnectingIds.delete(e), this.renderAll();
	}
	setTempLine(e, t, n = !1, r, i, a) {
		this.tempLineManager.setTempLine(e, t, n, r, i, a);
	}
	clearTempLine() {
		this.tempLineManager.clear();
	}
	getTempLineExists() {
		return this.tempLineManager.exists();
	}
	highlightAnchor(e, t) {
		this.nodeRenderer.highlightAnchor(e, t);
	}
	sortElementsByZIndex() {
		let e = Array.from(this.layerManager.elementLayer.children);
		e.sort((e, t) => parseInt(e.dataset.zIndex ?? "100", 10) - parseInt(t.dataset.zIndex ?? "100", 10));
		for (let t of e) this.layerManager.elementLayer.appendChild(t);
	}
	destroy() {
		this.layerManager.destroy(), this.tempLineManager.destroy(), this.reconnectingIds.clear();
	}
}, O = class {
	constructor(e) {
		this.isMenuVisible = !1, this.SE = e, this.store = e.store, this.selection = e.selection, this.dragManager = e.dragManager, this.bindEvents();
	}
	bindEvents() {
		let e = this.SE.getSvgRoot();
		e.addEventListener("mousedown", this.onMouseDown.bind(this)), e.addEventListener("click", this.onClick.bind(this)), e.addEventListener("contextmenu", this.onContextMenu.bind(this)), document.addEventListener("mousedown", this.hideMenu.bind(this));
	}
	onMouseDown(e) {
		if (e.button !== 0 || this.SE.viewport.isSpaceActive()) return;
		let t = e.target;
		if (t.tagName === "circle" && t.hasAttribute("data-anchor-id")) {
			let n = t.getAttribute("data-anchor-id"), r = this.store.getAnchor(n);
			if (r) {
				this.dragManager.startLinkDrag(r, e), e.stopPropagation(), e.preventDefault();
				return;
			}
		}
		let n, r = t;
		for (; r && !n;) {
			n = r.getAttribute("data-connection-id") ?? void 0;
			let e = r.parentElement;
			if (!e) break;
			r = e;
		}
		if (n) {
			this.selection.select("connection", n), e.stopPropagation(), e.preventDefault();
			return;
		}
		let i;
		for (r = t; r && !i;) {
			i = r.getAttribute("data-node-id") ?? void 0;
			let e = r.parentElement;
			if (!e) break;
			r = e;
		}
		if (!i) {
			this.selection.clear();
			return;
		}
		this.dragManager.startNodeDrag(e), e.stopPropagation(), e.preventDefault();
	}
	onClick(e) {}
	onContextMenu(e) {
		e.preventDefault(), this.isMenuVisible = !0, this.SE.contextMenu.show(e);
	}
	hideMenu(e) {
		if (!this.isMenuVisible) return;
		let t = e.target;
		t.closest && t.closest(".context-menu") || (this.isMenuVisible = !1, this.SE.contextMenu.hide());
	}
	destroy() {
		let e = this.SE.getSvgRoot();
		e.removeEventListener("mousedown", this.onMouseDown.bind(this)), e.removeEventListener("click", this.onClick.bind(this)), e.removeEventListener("contextmenu", this.onContextMenu.bind(this)), document.removeEventListener("mousedown", this.hideMenu.bind(this));
	}
};
//#endregion
//#region src/core/interaction/ContextMenu.ts
function k() {
	let e = document.createElement("div");
	return e.style.position = "fixed", e.style.zIndex = "9999", e.style.background = "#fff", e.style.boxShadow = "0 2px 12px rgba(0,0,0,0.15)", e.style.borderRadius = "6px", e.style.padding = "4px 0", e.style.minWidth = "130px", e.style.display = "none", e.style.userSelect = "none", e;
}
function A(e, t, n = !1) {
	let r = document.createElement("div");
	return r.textContent = e, r.style.padding = "6px 16px", r.style.cursor = "pointer", r.style.fontSize = "13px", r.style.color = n ? "#c62828" : "#333", r.addEventListener("mouseenter", () => {
		r.style.background = n ? "#ffebee" : "#eef5ff";
	}), r.addEventListener("mouseleave", () => {
		r.style.background = "transparent";
	}), r.addEventListener("click", (e) => {
		e.stopPropagation(), t();
	}), r;
}
function j() {
	let e = document.createElement("div");
	return e.style.height = "1px", e.style.background = "#e0e0e0", e.style.margin = "4px 8px", e;
}
var M = class {
	constructor(e, t, n) {
		this.SE = e, this.store = t, this.selection = n, this.menuEl = k(), this.menuEl.classList.add("context-menu"), document.body.appendChild(this.menuEl);
	}
	show(e) {
		e.preventDefault();
		let t = e.target, n = e.clientX, r = e.clientY;
		this.menuEl.innerHTML = "";
		let i, a, o, s = t;
		for (; s;) {
			o ||= s.getAttribute("data-anchor-id") ?? void 0, i ||= s.getAttribute("data-node-id") ?? void 0, a ||= s.getAttribute("data-connection-id") ?? void 0;
			let e = s.parentElement;
			if (!e) break;
			s = e;
		}
		if (o) {
			if (this.store.getAnchor(o)) {
				this.selection.isSelected("anchor", o) || this.selection.select("anchor", o);
				let e = A("🗑 删除锚点及关联连线", () => {
					this.store.removeAnchor(o), this.selection.clear(), this.hide();
				}, !0);
				this.menuEl.appendChild(e);
			}
		} else if (i) {
			if (this.store.getNode(i)) {
				this.selection.isSelected("node", i) || this.selection.select("node", i), this.addLayerMenuItems(() => this.moveNode(i, "up"), () => this.moveNode(i, "down"), () => this.moveNode(i, "top"), () => this.moveNode(i, "bottom")), this.menuEl.appendChild(j());
				let e = A("🗑 删除节点及关联锚点/连线", () => {
					this.store.removeNode(i), this.selection.clear(), this.hide();
				}, !0);
				this.menuEl.appendChild(e);
			}
		} else if (a) {
			if (this.store.getConnection(a)) {
				this.selection.isSelected("connection", a) || this.selection.select("connection", a), this.addLayerMenuItems(() => this.moveConnection(a, "up"), () => this.moveConnection(a, "down"), () => this.moveConnection(a, "top"), () => this.moveConnection(a, "bottom")), this.menuEl.appendChild(j());
				let e = A("🗑 删除连线", () => {
					this.store.removeConnection(a), this.selection.clear(), this.hide();
				}, !0);
				this.menuEl.appendChild(e);
			}
		} else {
			this.hide();
			return;
		}
		let c = this.menuEl.children.length * 36 + 16, l = n, u = r;
		n + 150 > window.innerWidth && (l = n - 150), r + c > window.innerHeight && (u = r - c), this.menuEl.style.left = l + "px", this.menuEl.style.top = u + "px", this.menuEl.style.display = "block";
	}
	addLayerMenuItems(e, t, n, r) {
		let i = A("⬆ 上移一层", () => {
			e(), this.hide();
		}), a = A("⬇ 下移一层", () => {
			t(), this.hide();
		}), o = A("⬆⬆ 置顶", () => {
			n(), this.hide();
		}), s = A("⬇⬇ 置底", () => {
			r(), this.hide();
		});
		this.menuEl.appendChild(i), this.menuEl.appendChild(a), this.menuEl.appendChild(o), this.menuEl.appendChild(s);
	}
	moveNode(e, t) {
		let n = this.store.getNode(e);
		if (!n) return;
		let r = n.zIndex ?? 100, i = this.store.getAllNodes().filter((t) => t.id !== e), a = i.map((e) => e.zIndex ?? 100);
		switch (t) {
			case "up": {
				let t = a.filter((e) => e > r).sort((e, t) => e - t);
				if (t.length > 0) {
					let n = t[0], a = i.find((e) => (e.zIndex ?? 100) === n);
					a && (this.store.updateNodeZIndex(e, n), this.store.updateNodeZIndex(a.id, r));
				}
				break;
			}
			case "down": {
				let t = a.filter((e) => e < r).sort((e, t) => t - e);
				if (t.length > 0) {
					let n = t[0], a = i.find((e) => (e.zIndex ?? 100) === n);
					a && (this.store.updateNodeZIndex(e, n), this.store.updateNodeZIndex(a.id, r));
				}
				break;
			}
			case "top": {
				let t = Math.max(...a, r);
				this.store.updateNodeZIndex(e, t + 1);
				break;
			}
			case "bottom": {
				let t = Math.min(...a, r);
				this.store.updateNodeZIndex(e, t - 1);
				break;
			}
		}
	}
	moveConnection(e, t) {
		let n = this.store.getConnection(e);
		if (!n) return;
		let r = n.zIndex ?? 100, i = this.store.getAllConnections().filter((t) => t.id !== e), a = i.map((e) => e.zIndex ?? 100);
		switch (t) {
			case "up": {
				let t = a.filter((e) => e > r).sort((e, t) => e - t);
				if (t.length > 0) {
					let n = t[0], a = i.find((e) => (e.zIndex ?? 100) === n);
					a && (this.store.updateConnectionZIndex(e, n), this.store.updateConnectionZIndex(a.id, r));
				}
				break;
			}
			case "down": {
				let t = a.filter((e) => e < r).sort((e, t) => t - e);
				if (t.length > 0) {
					let n = t[0], a = i.find((e) => (e.zIndex ?? 100) === n);
					a && (this.store.updateConnectionZIndex(e, n), this.store.updateConnectionZIndex(a.id, r));
				}
				break;
			}
			case "top": {
				let t = Math.max(...a, r);
				this.store.updateConnectionZIndex(e, t + 1);
				break;
			}
			case "bottom": {
				let t = Math.min(...a, r);
				this.store.updateConnectionZIndex(e, t - 1);
				break;
			}
		}
	}
	hide() {
		this.menuEl.style.display = "none";
	}
	destroy() {
		this.menuEl.remove();
	}
}, N = class {
	constructor(e) {
		let t = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		e.appendChild(t), this.svgRoot = t, this.addDefs(t), this.store = new h(), this.viewport = new _(this.svgRoot), this.selection = new v(), this.dragManager = new S(this), this.renderer = new D(this), this.contextMenu = new M(this, this.store, this.selection), this.eventBus = new O(this);
	}
	addDefs(e) {
		let t = document.createElementNS("http://www.w3.org/2000/svg", "defs"), n = document.createElementNS("http://www.w3.org/2000/svg", "filter");
		n.setAttribute("id", "node-shadow"), n.setAttribute("x", "-10%"), n.setAttribute("y", "-10%"), n.setAttribute("width", "130%"), n.setAttribute("height", "130%"), n.innerHTML = "<feDropShadow dx=\"0\" dy=\"2\" stdDeviation=\"3\" flood-color=\"rgba(0,0,0,0.10)\"/>", t.appendChild(n);
		let r = document.createElementNS("http://www.w3.org/2000/svg", "filter");
		r.setAttribute("id", "node-selected-glow"), r.setAttribute("x", "-20%"), r.setAttribute("y", "-20%"), r.setAttribute("width", "140%"), r.setAttribute("height", "140%"), r.innerHTML = "<feDropShadow dx=\"0\" dy=\"0\" stdDeviation=\"6\" flood-color=\"#ff6b6b\" flood-opacity=\"0.6\"/>", t.appendChild(r), e.prepend(t);
	}
	getSvgRoot() {
		return this.svgRoot;
	}
	addNode(e) {
		let t = {
			id: `node-${crypto.randomUUID()}`,
			...e
		};
		return this.store.addNode(t);
	}
	getNode(e) {
		return this.store.getNode(e);
	}
	getAllNodes() {
		return this.store.getAllNodes();
	}
	updateNode(e, t) {
		this.store.updateNode(e, t);
	}
	removeNode(e) {
		this.store.removeNode(e);
	}
	addConnection(e) {
		let t = {
			id: `connect-${crypto.randomUUID()}`,
			...e
		};
		return this.store.addConnection(t);
	}
	getConnection(e) {
		return this.store.getConnection(e);
	}
	getAllConnections() {
		return this.store.getAllConnections();
	}
	updateConnection(e, t) {
		this.store.updateConnection(e, t);
	}
	removeConnection(e) {
		this.store.removeConnection(e);
	}
	addAnchor(e) {
		if (Array.isArray(e.position)) {
			let { nodeId: t, position: n, ...r } = e;
			return n.map((e) => this.addAnchor({
				nodeId: t,
				position: e,
				...r
			}));
		}
		let t = {
			id: `anchor-${crypto.randomUUID()}`,
			...e
		};
		return this.store.addAnchor(t);
	}
	getAllAnchors() {
		return this.store.getAllAnchors();
	}
	getNodeAnchors(e) {
		return this.store.getNodeAnchors(e);
	}
	removeAnchor(e) {
		this.store.removeAnchor(e);
	}
	updateAnchor(e, t) {
		this.store.updateAnchor(e, t);
	}
	updateAllNodes(e) {
		this.store.updateAllNodes(e);
	}
	updateAllConnections(e) {
		this.store.updateAllConnections(e);
	}
	updateAllAnchors(e) {
		this.store.updateAllAnchors(e);
	}
	zoomIn(e = .1) {
		let t = this.viewport.getScale(), n = Math.min(t + e, 3);
		this.viewport.setTransform(this.viewport.getTranslate().x, this.viewport.getTranslate().y, n);
	}
	zoomOut(e = .1) {
		let t = this.viewport.getScale(), n = Math.max(t - e, .3);
		this.viewport.setTransform(this.viewport.getTranslate().x, this.viewport.getTranslate().y, n);
	}
	zoomTo(e) {
		let t = Math.max(.3, Math.min(3, e));
		this.viewport.setTransform(this.viewport.getTranslate().x, this.viewport.getTranslate().y, t);
	}
	resetView() {
		this.viewport.setTransform(0, 0, 1);
	}
	fitToView(e = 50) {
		let t = this.store.getAllNodes();
		if (t.length === 0) {
			this.resetView();
			return;
		}
		let n = Infinity, r = Infinity, i = -Infinity, a = -Infinity;
		for (let e of t) n = Math.min(n, e.x), r = Math.min(r, e.y), i = Math.max(i, e.x + e.width), a = Math.max(a, e.y + e.height);
		let o = i - n, s = a - r;
		if (o === 0 || s === 0) {
			this.resetView();
			return;
		}
		let c = this.svgRoot.getBoundingClientRect(), l = c.width, u = c.height, d = (l - e * 2) / o, f = (u - e * 2) / s, p = Math.min(d, f, 1), m = (n + i) / 2, h = (r + a) / 2, g = l / 2 - m * p, _ = u / 2 - h * p;
		this.viewport.setTransform(g, _, p);
	}
	exportData() {
		return this.store.exportData();
	}
	importData(e) {
		this.store.importData(e);
	}
	destroy() {
		this.dragManager.destroy(), this.renderer.destroy(), this.viewport.destroy(), this.contextMenu.destroy(), this.svgRoot.remove();
	}
};
//#endregion
export { e as Defaults, N as SvgEngine };

//# sourceMappingURL=svgflow.es.js.map