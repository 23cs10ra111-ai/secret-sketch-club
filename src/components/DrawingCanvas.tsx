import { useRef, useEffect, useState, useCallback } from "react";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Stroke {
  x: number;
  y: number;
  type: "start" | "draw" | "end";
}

interface DrawingCanvasProps {
  isArtist: boolean;
  onStroke: (stroke: Stroke) => void;
  onClear: () => void;
  incomingStrokes: Stroke[];
  clearSignal: number;
}

const DrawingCanvas = ({ isArtist, onStroke, onClear, incomingStrokes, clearSignal }: DrawingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastProcessed = useRef(0);

  const getCtx = () => canvasRef.current?.getContext("2d");

  const clearCanvas = useCallback(() => {
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    lastProcessed.current = 0;
  }, []);

  useEffect(() => {
    clearCanvas();
  }, [clearSignal, clearCanvas]);

  // Process incoming strokes from other players
  useEffect(() => {
    const ctx = getCtx();
    if (!ctx) return;

    for (let i = lastProcessed.current; i < incomingStrokes.length; i++) {
      const s = incomingStrokes[i];
      if (s.type === "start") {
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
      } else if (s.type === "draw") {
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#000000";
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }
    }
    lastProcessed.current = incomingStrokes.length;
  }, [incomingStrokes]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isArtist) return;
    e.preventDefault();
    isDrawing.current = true;
    const pos = getPos(e);
    const ctx = getCtx();
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
    onStroke({ ...pos, type: "start" });
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isArtist || !isDrawing.current) return;
    e.preventDefault();
    const pos = getPos(e);
    const ctx = getCtx();
    if (ctx) {
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#000000";
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
    onStroke({ ...pos, type: "draw" });
  };

  const handleEnd = () => {
    if (!isArtist) return;
    isDrawing.current = false;
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full sketch-border bg-card touch-none"
        style={{ aspectRatio: "800/500", cursor: isArtist ? "crosshair" : "default" }}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
      {isArtist && (
        <Button onClick={onClear} variant="outline" size="sm" className="font-hand">
          <Eraser className="mr-2 h-4 w-4" /> Clear Canvas
        </Button>
      )}
    </div>
  );
};

export default DrawingCanvas;
