import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

function imageDataToUrl(data) {
    return api.apiURL(
        `/view?filename=${encodeURIComponent(data.filename)}&type=${data.type}&subfolder=${data.subfolder}${app.getPreviewFormatParam()}${app.getRandParam()}`
    );
}

const NODE_NAME = "Slimy_ImageComparer";
const DEFAULT_MODE = "Slide";

const COLOR_A = "rgba(100,200,255,1)";
const COLOR_A_DIM = "rgba(100,200,255,0.3)";
const COLOR_B = "rgba(255,180,80,1)";
const COLOR_B_DIM = "rgba(255,180,80,0.3)";

const TOOLBAR_H = 52;
const BOTTOM_BAR_H = 12;  // 下部A/Bバー（半分に縮小）
const TOP_BAR_H = 12;     // 上部A/Bバー（新規追加）
const BTN_BAR_H = 22;     // モードボタンバー高さ
const MODES = ["A", "B", "Slide"];

app.registerExtension({
    name: "Slimy.ImageComparer",

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_NAME) return;

        const origOnNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            origOnNodeCreated?.call(this);

            this._slimy = {
                imgA: null, imgB: null,
                sizeA: null, sizeB: null,
                isPointerOver: false,
                isPointerDown: false,
                pointerX: 0,
                lastExitSide: null,
            };

            this.properties = this.properties || {};
            this.properties["comparer_mode"] = DEFAULT_MODE;
            this.serialize_widgets = true;

            // ポートの色設定
            if (this.inputs) {
                if (this.inputs[0]) {
                    this.inputs[0].color_on  = "rgba(100,200,255,1)";
                    this.inputs[0].color_off = "rgba(100,200,255,0.4)";
                    this.inputs[0].label_color = "rgba(100,200,255,1)";
                }
                if (this.inputs[1]) {
                    this.inputs[1].color_on  = "rgba(255,180,80,1)";
                    this.inputs[1].color_off = "rgba(255,180,80,0.4)";
                    this.inputs[1].label_color = "rgba(255,180,80,1)";
                }
            }

            this.setSize([400, 480]);
            this.setDirtyCanvas(true, true);
        };

        nodeType.prototype.onExecuted = function (output) {
            const s = this._slimy;
            s.imgA = null; s.imgB = null;
            s.sizeA = output.a_size?.[0] || null;
            s.sizeB = output.b_size?.[0] || null;

            const aImgs = output.a_images || [];
            const bImgs = output.b_images || [];

            if (aImgs.length > 0) {
                s.imgA = new Image();
                s.imgA.src = imageDataToUrl(aImgs[0]);
                s.imgA.onload = () => this.setDirtyCanvas(true, false);
            }
            if (bImgs.length > 0) {
                s.imgB = new Image();
                s.imgB.src = imageDataToUrl(bImgs[0]);
                s.imgB.onload = () => this.setDirtyCanvas(true, false);
            }
            this.setDirtyCanvas(true, false);
        };

        nodeType.prototype.onDrawForeground = function (ctx) {
            const s = this._slimy;
            if (!s) return;

            const [nodeW, nodeH] = this.size;
            const btnBarY = TOOLBAR_H;
            const imgY = TOOLBAR_H + BTN_BAR_H + TOP_BAR_H;
            const imgH = nodeH - TOOLBAR_H - BTN_BAR_H - TOP_BAR_H - BOTTOM_BAR_H;
            const mode = this.properties?.["comparer_mode"] || DEFAULT_MODE;

            // 上部余白
            ctx.save();
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.fillRect(0, 0, nodeW, TOOLBAR_H);
            ctx.restore();

            if (!s.imgA && !s.imgB) {
                ctx.save();
                ctx.fillStyle = "#333";
                ctx.fillRect(0, imgY, nodeW, imgH);
                ctx.fillStyle = "#666";
                ctx.font = "13px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("画像A/Bを接続して実行", nodeW / 2, imgY + imgH / 2);
                ctx.restore();
                this._drawModeButtons(ctx, nodeW, nodeH, btnBarY);
                this._drawTopBar(ctx, nodeW, nodeH, nodeW / 2);
                this._drawBottomBar(ctx, nodeW, nodeH, nodeW / 2);
                return;
            }

            function calcDraw(img, nodeW, imgY, imgH) {
                if (!img?.naturalWidth) return null;
                const iAspect = img.naturalWidth / img.naturalHeight;
                const wAspect = nodeW / imgH;
                let dw, dh;
                if (iAspect > wAspect) { dw = nodeW; dh = nodeW / iAspect; }
                else { dh = imgH; dw = imgH * iAspect; }
                return { dx: (nodeW - dw) / 2, dy: imgY + (imgH - dh) / 2, dw, dh };
            }

            const dA = calcDraw(s.imgA, nodeW, imgY, imgH);
            const dB = calcDraw(s.imgB, nodeW, imgY, imgH);

            if (mode === "A") {
                if (s.imgA && dA) {
                    ctx.save();
                    ctx.drawImage(s.imgA, dA.dx, dA.dy, dA.dw, dA.dh);
                    ctx.restore();
                }
                this._drawModeButtons(ctx, nodeW, nodeH, btnBarY);
                this._drawTopBar(ctx, nodeW, nodeH, nodeW);
                this._drawBottomBar(ctx, nodeW, nodeH, nodeW);
            } else if (mode === "B") {
                if (s.imgB && dB) {
                    ctx.save();
                    ctx.drawImage(s.imgB, dB.dx, dB.dy, dB.dw, dB.dh);
                    ctx.restore();
                }
                this._drawModeButtons(ctx, nodeW, nodeH, btnBarY);
                this._drawTopBar(ctx, nodeW, nodeH, 0);
                this._drawBottomBar(ctx, nodeW, nodeH, 0);
            } else if (mode === "Click") {
                const showB = s.isPointerDown && s.imgB;
                const img = showB ? s.imgB : s.imgA;
                const d = showB ? dB : dA;
                if (img && d) {
                    ctx.save();
                    ctx.drawImage(img, d.dx, d.dy, d.dw, d.dh);
                    ctx.restore();
                }
                this._drawModeButtons(ctx, nodeW, nodeH, btnBarY);
                this._drawTopBar(ctx, nodeW, nodeH, showB ? 0 : nodeW);
                this._drawBottomBar(ctx, nodeW, nodeH, showB ? 0 : nodeW);
            } else {
                let splitX;
                if (s.isPointerOver) {
                    splitX = s.pointerX;
                } else if (s.lastExitSide === "right") {
                    splitX = nodeW;  // 右に出た → 全A
                } else if (s.lastExitSide === "left") {
                    splitX = 0;      // 左に出た → 全B
                } else {
                    splitX = nodeW / 2;
                }

                if (s.imgA && dA) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(0, imgY, splitX, imgH);
                    ctx.clip();
                    ctx.drawImage(s.imgA, dA.dx, dA.dy, dA.dw, dA.dh);
                    ctx.restore();
                }

                if (s.imgB && dB) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(splitX, imgY, nodeW - splitX, imgH);
                    ctx.clip();
                    ctx.drawImage(s.imgB, dB.dx, dB.dy, dB.dw, dB.dh);
                    if (s.isPointerOver) {
                        ctx.beginPath();
                        ctx.moveTo(splitX, imgY);
                        ctx.lineTo(splitX, imgY + imgH);
                        ctx.globalCompositeOperation = "difference";
                        ctx.strokeStyle = "rgba(255,255,255,1)";
                        ctx.stroke();
                    }
                    ctx.restore();
                } else if (s.isPointerOver) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(splitX, imgY);
                    ctx.lineTo(splitX, imgY + imgH);
                    ctx.globalCompositeOperation = "difference";
                    ctx.strokeStyle = "rgba(255,255,255,1)";
                    ctx.stroke();
                    ctx.restore();
                }

                this._drawModeButtons(ctx, nodeW, nodeH, btnBarY);
                this._drawTopBar(ctx, nodeW, nodeH, splitX);
                this._drawBottomBar(ctx, nodeW, nodeH, splitX);
            }
        };

        nodeType.prototype._drawModeButtons = function (ctx, nodeW, nodeH, btnBarY) {
            const mode = this.properties?.["comparer_mode"] || DEFAULT_MODE;
            const barY = btnBarY;
            const btnW = Math.floor(nodeW / MODES.length);

            ctx.save();
            ctx.font = "bold 11px sans-serif";
            ctx.textBaseline = "middle";
            ctx.textAlign = "center";

            this._slimy._btnAreas = [];

            MODES.forEach((m, i) => {
                const x = i * btnW;
                const w = i === MODES.length - 1 ? nodeW - x : btnW;
                const isActive = mode === m;

                ctx.fillStyle = isActive ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.4)";
                ctx.fillRect(x, barY, w, BTN_BAR_H);

                // セパレータ
                if (i > 0) {
                    ctx.fillStyle = "rgba(255,255,255,0.15)";
                    ctx.fillRect(x, barY, 1, BTN_BAR_H);
                }

                // 文字色: AはCOLOR_A、BはCOLOR_B、SlideはWhite
                if (m === "A") {
                    ctx.fillStyle = isActive ? COLOR_A : COLOR_A_DIM;
                } else if (m === "B") {
                    ctx.fillStyle = isActive ? COLOR_B : COLOR_B_DIM;
                } else {
                    ctx.fillStyle = isActive ? "#fff" : "rgba(255,255,255,0.5)";
                }
                ctx.fillText(m, x + w / 2, barY + BTN_BAR_H / 2);

                this._slimy._btnAreas.push({ x, y: barY, w, h: BTN_BAR_H, mode: m });
            });

            ctx.restore();
        };

        nodeType.prototype._drawLabelBar = function (ctx, nodeW, barY, barH, splitX, labelA, labelB, imgA, imgB) {
            const s = this._slimy;
            const midY = barY + barH / 2;

            ctx.save();

            const aW = Math.max(0, Math.min(splitX, nodeW));
            if (aW > 0) {
                ctx.fillStyle = imgA ? COLOR_A : COLOR_A_DIM;
                ctx.fillRect(0, barY, aW, barH);
            }

            const bW = Math.max(0, nodeW - splitX);
            if (bW > 0) {
                ctx.fillStyle = imgB ? COLOR_B : COLOR_B_DIM;
                ctx.fillRect(splitX, barY, bW, barH);
            }

            ctx.font = "bold 10px monospace";
            ctx.textBaseline = "middle";
            const PAD = 6;

            ctx.textAlign = "left";
            const aTextW = ctx.measureText(labelA).width;
            if (aW >= aTextW + PAD * 2) {
                ctx.fillStyle = "rgba(0,0,0,0.85)";
                ctx.fillText(labelA, PAD, midY);
            }

            ctx.textAlign = "right";
            const bTextW = ctx.measureText(labelB).width;
            if (bW >= bTextW + PAD * 2) {
                ctx.fillStyle = "rgba(0,0,0,0.85)";
                ctx.fillText(labelB, nodeW - PAD, midY);
            }

            ctx.restore();
        };

        nodeType.prototype._drawTopBar = function (ctx, nodeW, nodeH, splitX) {
            const s = this._slimy;
            const barY = TOOLBAR_H + BTN_BAR_H;
            const labelA = s.sizeA ? `A: ${s.sizeA.w}×${s.sizeA.h}` : "A";
            const labelB = s.sizeB ? `B: ${s.sizeB.w}×${s.sizeB.h}` : "B";
            this._drawLabelBar(ctx, nodeW, barY, TOP_BAR_H, splitX, labelA, labelB, s.imgA, s.imgB);
        };

        nodeType.prototype._drawBottomBar = function (ctx, nodeW, nodeH, splitX) {
            const s = this._slimy;
            const barY = nodeH - BOTTOM_BAR_H;
            const labelA = s.sizeA ? `A: ${s.sizeA.w}×${s.sizeA.h}` : "A";
            const labelB = s.sizeB ? `B: ${s.sizeB.w}×${s.sizeB.h}` : "B";
            this._drawLabelBar(ctx, nodeW, barY, BOTTOM_BAR_H, splitX, labelA, labelB, s.imgA, s.imgB);
        };

        nodeType.prototype.onMouseEnter = function () {
            if (!this._slimy) return;
            this._slimy.isPointerOver = true;
            this._slimy.lastExitSide = null;
            this.setDirtyCanvas(true, false);
        };

        nodeType.prototype.onMouseLeave = function () {
            if (!this._slimy) return;
            this._slimy.isPointerOver = false;
            this._slimy.isPointerDown = false;
            const [nodeW] = this.size;
            this._slimy.lastExitSide = this._slimy.pointerX > nodeW / 2 ? "right" : "left";
            this.setDirtyCanvas(true, false);
        };

        nodeType.prototype.onMouseMove = function (event, pos) {
            if (!this._slimy) return;
            this._slimy.pointerX = pos[0];
            this.setDirtyCanvas(true, false);
        };

        nodeType.prototype.onMouseDown = function (event, pos) {
            if (!this._slimy) return;

            // モードボタンのクリック判定
            const btnAreas = this._slimy._btnAreas || [];
            for (const btn of btnAreas) {
                if (pos[0] >= btn.x && pos[0] <= btn.x + btn.w &&
                    pos[1] >= btn.y && pos[1] <= btn.y + btn.h) {
                    this.properties["comparer_mode"] = btn.mode;
                    this.setDirtyCanvas(true, false);
                    return true;  // イベント消費
                }
            }

            this._slimy.isPointerDown = true;
            this._slimy.pointerX = pos[0];
            this.setDirtyCanvas(true, false);

            const checkUp = () => {
                if (!app.canvas.pointer_is_down) {
                    this._slimy.isPointerDown = false;
                    this.setDirtyCanvas(true, false);
                } else {
                    requestAnimationFrame(checkUp);
                }
            };
            requestAnimationFrame(checkUp);
            return false;
        };
    },
});
