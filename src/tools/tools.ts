import { IconType } from "react-icons";
import { RiDragMove2Line, RiEraserFill, RiPencilFill, RiSipFill } from "react-icons/ri";
import { useToolboxState } from "../state/toolboxState";
import { drawLine, erasePixel, paintPixel, Point } from "../utils/canvas";
import { BsSlash, IoColorFill, IoEllipseOutline, IoSquareOutline } from "react-icons/all";
import { Colord } from "colord";
import { getPixelColor } from "../utils/colors";

export type ToolAction = (points: Point[], workingCanvas: HTMLCanvasElement, originalCanvas: HTMLCanvasElement) => void;

export type Tool = {
  use: ToolAction;
  name: string;
  icon: IconType;
};

export type Color = string;

export const Pen = (): Tool => ({
  use: (points, canvas) => {
    const { fgColor, brushSize } = useToolboxState.getState();

    for (let i = 0; i < points.length; i++) {
      drawLine(points[i === 0 ? 0 : i - 1], points[i], fgColor, brushSize, canvas);
    }
  },
  name: "Pen",
  icon: RiPencilFill,
});

export const Move = (): Tool => ({
  use: (points, workingCanvas, originalCanvas) => {
    const ctx = workingCanvas.getContext("2d")!;
    const startPoint = points[0];
    const xOffset = points[points.length - 1].x - startPoint.x;
    const yOffset = points[points.length - 1].y - startPoint.y;

    ctx.clearRect(0, 0, workingCanvas.width, workingCanvas.height);
    ctx.translate(xOffset, yOffset);
    ctx.drawImage(originalCanvas, 0, 0);
    ctx.resetTransform();
  },
  name: "Move",
  icon: RiDragMove2Line,
});

export const Line = (): Tool => ({
  use: (points, canvas) => {
    const { fgColor, brushSize } = useToolboxState.getState();

    drawLine(points[points.length > 1 ? 1 : 0], points[Math.max(0, points.length - 2)], fgColor, brushSize, canvas);
  },
  name: "Line",
  icon: BsSlash,
});

export const Rectangle = (): Tool => ({
  use: (points, canvas) => {
    const { fgColor, bgColor, brushSize } = useToolboxState.getState();

    const { start, end } = getBoundingBoxIncludingBrush(points, brushSize);

    const width = end.x - start.x + 1;
    const height = end.y - start.y + 1;

    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = bgColor;
    ctx.fillRect(start.x, start.y, width, height);

    ctx.fillStyle = fgColor;
    ctx.fillRect(start.x, start.y, width, brushSize);
    ctx.fillRect(end.x + 1, end.y + 1, -width, -brushSize);
    ctx.fillRect(start.x, start.y, brushSize, height);
    ctx.fillRect(end.x + 1, end.y + 1, -brushSize, -height);
  },
  name: "Rectangle",
  icon: IoSquareOutline,
});

export const Ellipse = (): Tool => ({
  use: (points, canvas) => {
    const { fgColor, bgColor, brushSize } = useToolboxState.getState();

    const { start, end } = { start: points[0], end: points[points.length - 1] };

    const xRadius = (end.x - start.x + 1) / 2;
    const yRadius = (end.y - start.y + 1) / 2;
    const center = { x: (end.x - start.x) / 2, y: (end.y - start.y) / 2 };

    const ctx = canvas.getContext("2d")!;

    const fill = true;

    // strokeEllipse(center, xRadius, yRadius, brushSize, ctx, fgColor);
    ctx.fillStyle = bgColor;
    ellipse(points, brushSize, ctx, fill);
    ctx.fillStyle = fgColor;
    ellipse(points, brushSize, ctx, !fill);
  },
  name: "Ellipse",
  icon: IoEllipseOutline,
});

export const Eraser = (): Tool => ({
  use: (points, canvas) => {
    const { brushSize } = useToolboxState.getState();
    const ctx = canvas.getContext("2d")!;

    for (let i = 0; i < points.length; i++) {
      ctx.clearRect(points[i].x - brushSize + 1, points[i].y - brushSize + 1, brushSize, brushSize);
    }
  },
  name: "Eraser",
  icon: RiEraserFill,
});

export const Eyedropper = (): Tool => ({
  use: (points, canvas) => {
    const ctx = canvas.getContext("2d")!;
    const lastPoint = points[points.length - 1];
    const [r, g, b, a] = ctx.getImageData(lastPoint.x, lastPoint.y, 1, 1).data;

    const color = [r, g, b, a].map((i) => i.toString(16).padStart(2, "0")).join("");

    const { setFgColor } = useToolboxState.getState();
    if (color === "00000000") {
      return;
    }
    setFgColor(`#${color}`);
  },
  name: "Eyedropper",
  icon: RiSipFill,
});

export const Bucket = (): Tool => ({
  use: (points, canvas) => {
    const ctx = canvas.getContext("2d")!;
    const { fgColor } = useToolboxState.getState();
    ctx.fillStyle = fgColor;

    const lastPoint = points[points.length - 1];

    floodFill(ctx, lastPoint);
  },
  name: "Bucket",
  icon: IoColorFill,
});

const floodFill = (ctx: CanvasRenderingContext2D, point: Point, searchColor?: Colord) => {
  if (!inCanvas(point, ctx)) {
    return;
  }

  const color = getPixelColor(point, ctx);

  if (searchColor && !color.isEqual(searchColor)) {
    return;
  }

  erasePixel(point, ctx);
  paintPixel(point, ctx);

  floodFill(ctx, { ...point, x: point.x - 1 }, color);
  floodFill(ctx, { ...point, x: point.x + 1 }, color);
  floodFill(ctx, { ...point, y: point.y - 1 }, color);
  floodFill(ctx, { ...point, y: point.y + 1 }, color);
};

const inCanvas = (point: Point, ctx: CanvasRenderingContext2D) =>
  point.x >= 0 && point.x < ctx.canvas.width && point.y >= 0 && point.y < ctx.canvas.height;

const getBoundingBoxIncludingBrush = (points: Point[], brushSize: number) => {
  const startPoint = points[0];
  const endPoint = points[points.length - 1];
  const xValues = [startPoint.x, startPoint.x - brushSize + 1, endPoint.x, endPoint.x - brushSize + 1];
  const startX = Math.min(...xValues);
  const endX = Math.max(...xValues);
  const yValues = [startPoint.y, startPoint.y - brushSize + 1, endPoint.y, endPoint.y - brushSize + 1];
  const startY = Math.min(...yValues);
  const endY = Math.max(...yValues);

  return { start: { x: startX, y: startY }, end: { x: endX, y: endY } };
};

const getBoundingBox = (points: Point[]) => {
  const startPoint = points[0];
  const endPoint = points[points.length - 1];
  const xValues = [startPoint.x, startPoint.x, endPoint.x, endPoint.x];
  const x0 = Math.min(...xValues);
  const x1 = Math.max(...xValues);
  const yValues = [startPoint.y, startPoint.y, endPoint.y, endPoint.y];
  const y0 = Math.min(...yValues);
  const y1 = Math.max(...yValues);

  return { x0: x0, y0: y0, x1: x1, y1: y1 };
};

const ellipse = (points: Point[], brushSize: number, ctx: CanvasRenderingContext2D, fill: boolean) => {
  const coords = getBoundingBox(points);

  let xC = Math.round((coords.x0 + coords.x1) / 2);
  let yC = Math.round((coords.y0 + coords.y1) / 2);
  let evenX = (coords.x0 + coords.x1) % 2;
  let evenY = (coords.y0 + coords.y1) % 2;
  let rX = coords.x1 - xC;
  let rY = coords.y1 - yC;

  let x;
  let y;
  let angle;
  let r;

  //inner ellipse axis
  let iX = fill ? 0 : Math.max(rX - brushSize, 0);
  let iY = fill ? 0 : Math.max(rY - brushSize, 0);

  // iterate over a quadrant pixels
  for (x = 0; x <= rX; x++) {
    for (y = 0; y <= rY; y++) {
      angle = Math.atan(y / x);
      r = Math.sqrt(x * x + y * y);
      if (
        (fill ||
          rX <= brushSize ||
          rY <= brushSize ||
          r > (iX * iY) / Math.sqrt(iY * iY * Math.pow(Math.cos(angle), 2) + iX * iX * Math.pow(Math.sin(angle), 2)) + 0.5) &&
        r < (rX * rY) / Math.sqrt(rY * rY * Math.pow(Math.cos(angle), 2) + rX * rX * Math.pow(Math.sin(angle), 2)) + 0.5
      ) {
        // fill pixels in all quadrants
        ctx.fillRect(xC + x, yC + y, 1, 1);
        ctx.fillRect(xC - x - evenX, yC + y, 1, 1);
        ctx.fillRect(xC + x, yC - y - evenY, 1, 1);
        ctx.fillRect(xC - x - evenX, yC - y - evenY, 1, 1);
      }
    }
  }
};
