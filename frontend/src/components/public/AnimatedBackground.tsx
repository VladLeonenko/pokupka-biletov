import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

interface AnimatedBackgroundProps {
  children?: React.ReactNode;
}

export function AnimatedBackground({ children }: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Включаем антиалиасинг для плавных линий
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Устанавливаем размер canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Параметры для 3D комнаты
    const roomSize = 2000; // Размер комнаты в 3D пространстве
    const gridSize = 200; // Размер сетки
    const perspective = 800; // Расстояние до камеры
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const floorY = centerY + 300; // Позиция пола

    // Функция проекции 3D в 2D
    const project3D = (x: number, y: number, z: number) => {
      const scale = perspective / (perspective + z);
      return {
        x: centerX + (x - centerX) * scale,
        y: centerY + (y - centerY) * scale,
        scale: scale,
      };
    };

    let angle = 0;
    const rotationSpeed = 0.002;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      angle += rotationSpeed;

      // Вычисляем cos и sin один раз для всех циклов
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      // Рисуем пол (сетка)
      ctx.strokeStyle = '#141414';
      ctx.lineWidth = 0.5;
      ctx.lineCap = 'round';
      
      const gridLines = 20;
      for (let i = -gridLines; i <= gridLines; i++) {
        // Линии, идущие от нас (вертикальные на полу)
        const x1 = i * gridSize;
        const z1 = -roomSize;
        const x2 = i * gridSize;
        const z2 = roomSize;

        // Применяем вращение вокруг Y оси
        const rotX1 = x1 * cos - z1 * sin;
        const rotZ1 = x1 * sin + z1 * cos;
        const rotX2 = x2 * cos - z2 * sin;
        const rotZ2 = x2 * sin + z2 * cos;

        const proj1 = project3D(centerX + rotX1, floorY, rotZ1);
        const proj2 = project3D(centerX + rotX2, floorY, rotZ2);

        if (proj1.scale > 0 && proj2.scale > 0) {
          ctx.beginPath();
          ctx.moveTo(proj1.x, proj1.y);
          ctx.lineTo(proj2.x, proj2.y);
          ctx.globalAlpha = Math.min(proj1.scale, proj2.scale) * 0.3;
          ctx.stroke();
        }

        // Линии, идущие в стороны (горизонтальные на полу)
        const z1h = i * gridSize;
        const x1h = -roomSize;
        const z2h = i * gridSize;
        const x2h = roomSize;

        const rotX1h = x1h * cos - z1h * sin;
        const rotZ1h = x1h * sin + z1h * cos;
        const rotX2h = x2h * cos - z2h * sin;
        const rotZ2h = x2h * sin + z2h * cos;

        const proj1h = project3D(centerX + rotX1h, floorY, rotZ1h);
        const proj2h = project3D(centerX + rotX2h, floorY, rotZ2h);

        if (proj1h.scale > 0 && proj2h.scale > 0) {
          ctx.beginPath();
          ctx.moveTo(proj1h.x, proj1h.y);
          ctx.lineTo(proj2h.x, proj2h.y);
          ctx.globalAlpha = Math.min(proj1h.scale, proj2h.scale) * 0.3;
          ctx.stroke();
        }
      }

      // Рисуем стены (боковые)
      const wallHeight = 1500;
      const wallDepth = roomSize;

      // Левая стена
      for (let i = 0; i <= 10; i++) {
        const y = floorY - (i * wallHeight / 10);
        const z = -wallDepth;
        const x = -roomSize;

        const rotX = x * cos - z * sin;
        const rotZ = x * sin + z * cos;

        const proj1 = project3D(centerX + rotX, y, rotZ);
        const proj2 = project3D(centerX + rotX, floorY, rotZ);

        if (proj1.scale > 0 && proj2.scale > 0) {
          ctx.beginPath();
          ctx.moveTo(proj1.x, proj1.y);
          ctx.lineTo(proj2.x, proj2.y);
          ctx.globalAlpha = Math.min(proj1.scale, proj2.scale) * 0.2;
          ctx.stroke();
        }
      }

      // Правая стена
      for (let i = 0; i <= 10; i++) {
        const y = floorY - (i * wallHeight / 10);
        const z = -wallDepth;
        const x = roomSize;

        const rotX = x * cos - z * sin;
        const rotZ = x * sin + z * cos;

        const proj1 = project3D(centerX + rotX, y, rotZ);
        const proj2 = project3D(centerX + rotX, floorY, rotZ);

        if (proj1.scale > 0 && proj2.scale > 0) {
          ctx.beginPath();
          ctx.moveTo(proj1.x, proj1.y);
          ctx.lineTo(proj2.x, proj2.y);
          ctx.globalAlpha = Math.min(proj1.scale, proj2.scale) * 0.2;
          ctx.stroke();
        }
      }

      // Задняя стена
      for (let i = -10; i <= 10; i++) {
        const x = i * (roomSize / 10);
        const z = -wallDepth;
        const y1 = floorY - wallHeight;
        const y2 = floorY;

        const rotX = x * cos - z * sin;
        const rotZ = x * sin + z * cos;

        const proj1 = project3D(centerX + rotX, y1, rotZ);
        const proj2 = project3D(centerX + rotX, y2, rotZ);

        if (proj1.scale > 0 && proj2.scale > 0) {
          ctx.beginPath();
          ctx.moveTo(proj1.x, proj1.y);
          ctx.lineTo(proj2.x, proj2.y);
          ctx.globalAlpha = Math.min(proj1.scale, proj2.scale) * 0.2;
          ctx.stroke();
        }
      }

      // Потолок (сетка)
      const ceilingY = floorY - wallHeight;
      for (let i = -gridLines; i <= gridLines; i++) {
        // Горизонтальные линии потолка
        const x1 = i * gridSize;
        const z1 = -roomSize;
        const x2 = i * gridSize;
        const z2 = roomSize;

        const rotX1 = x1 * cos - z1 * sin;
        const rotZ1 = x1 * sin + z1 * cos;
        const rotX2 = x2 * cos - z2 * sin;
        const rotZ2 = x2 * sin + z2 * cos;

        const proj1 = project3D(centerX + rotX1, ceilingY, rotZ1);
        const proj2 = project3D(centerX + rotX2, ceilingY, rotZ2);

        if (proj1.scale > 0 && proj2.scale > 0) {
          ctx.beginPath();
          ctx.moveTo(proj1.x, proj1.y);
          ctx.lineTo(proj2.x, proj2.y);
          ctx.globalAlpha = Math.min(proj1.scale, proj2.scale) * 0.25;
          ctx.stroke();
        }

        // Вертикальные линии потолка
        const z1h = i * gridSize;
        const x1h = -roomSize;
        const z2h = i * gridSize;
        const x2h = roomSize;

        const rotX1h = x1h * cos - z1h * sin;
        const rotZ1h = x1h * sin + z1h * cos;
        const rotX2h = x2h * cos - z2h * sin;
        const rotZ2h = x2h * sin + z2h * cos;

        const proj1h = project3D(centerX + rotX1h, ceilingY, rotZ1h);
        const proj2h = project3D(centerX + rotX2h, ceilingY, rotZ2h);

        if (proj1h.scale > 0 && proj2h.scale > 0) {
          ctx.beginPath();
          ctx.moveTo(proj1h.x, proj1h.y);
          ctx.lineTo(proj2h.x, proj2h.y);
          ctx.globalAlpha = Math.min(proj1h.scale, proj2h.scale) * 0.25;
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          minHeight: '100vh',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

