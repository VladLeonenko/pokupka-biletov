// Zero Block - пиксельная верстка с Fabric.js

import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { Canvas, IText, Image, Rect, Circle } from 'fabric';

interface ZeroBlockProps {
  width: number;
  height: number;
  onUpdate?: (canvas: Canvas) => void;
}

export function ZeroBlock({ width, height, onUpdate }: ZeroBlockProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
    });

    fabricCanvasRef.current = canvas;

    // Добавляем инструменты
    const addText = () => {
      const text = new IText('Двойной клик для редактирования', {
        left: 100,
        top: 100,
        fontSize: 20,
        fontFamily: 'Geologica',
      });
      canvas.add(text);
      canvas.setActiveObject(text);
    };

    const addImage = (url: string) => {
      Image.fromURL(url, (img: Image) => {
        img.scaleToWidth(200);
        canvas.add(img);
        canvas.setActiveObject(img);
      });
    };

    const addRectangle = () => {
      const rect = new Rect({
        left: 100,
        top: 100,
        width: 200,
        height: 100,
        fill: '#1976d2',
      });
      canvas.add(rect);
      canvas.setActiveObject(rect);
    };

    const addCircle = () => {
      const circle = new Circle({
        left: 100,
        top: 100,
        radius: 50,
        fill: '#1976d2',
      });
      canvas.add(circle);
      canvas.setActiveObject(circle);
    };

    // Сохраняем функции в canvas для доступа извне
    (canvas as any).addText = addText;
    (canvas as any).addImage = addImage;
    (canvas as any).addRectangle = addRectangle;
    (canvas as any).addCircle = addCircle;

    // Вызываем callback при изменениях
    canvas.on('object:modified', () => {
      if (onUpdate) {
        onUpdate(canvas);
      }
    });

    canvas.on('object:added', () => {
      if (onUpdate) {
        onUpdate(canvas);
      }
    });

    canvas.on('object:removed', () => {
      if (onUpdate) {
        onUpdate(canvas);
      }
    });

    return () => {
      canvas.dispose();
    };
  }, [width, height, onUpdate]);

  return (
    <Box sx={{ border: '1px solid #ddd', borderRadius: 1, overflow: 'hidden' }}>
      <canvas ref={canvasRef} />
    </Box>
  );
}
