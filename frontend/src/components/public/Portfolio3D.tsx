import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface PortfolioCase {
  id: string;
  title: string;
  year: string;
  url: string;
  position: [number, number, number]; // x, y, z позиция на сцене
}

interface Portfolio3DProps {
  cases: PortfolioCase[];
}

export function Portfolio3D({ cases }: Portfolio3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const carRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const [nearbyCase, setNearbyCase] = useState<PortfolioCase | null>(null);
  const [showHint, setShowHint] = useState(false);

  // Данные кейсов по умолчанию
  const defaultCases: PortfolioCase[] = [
    { id: '1', title: 'ДОМА РОССИИ', year: '2021', url: '/houses-case', position: [10, 0, 10] },
    { id: '2', title: 'ПОЛИГОН', year: '2018', url: '/polygon', position: [-15, 0, 5] },
    { id: '3', title: 'MADEO', year: '2020', url: '/madeo-case', position: [20, 0, -10] },
    { id: '4', title: 'STRAUMANN GROUP', year: '2019', url: '/straumann-case', position: [-10, 0, -15] },
    { id: '5', title: 'ALASKA FIREWOOD', year: '2022', url: '#', position: [5, 0, 20] },
    { id: '6', title: 'МЕДИЦИНСКИЙ ЦЕНТР', year: '2022', url: '#', position: [-20, 0, 10] },
    { id: '7', title: 'УРСУС', year: '2019', url: '#', position: [15, 0, -20] },
    { id: '8', title: 'STRAUMANN MOBILE', year: '2021', url: '#', position: [-5, 0, -25] },
    { id: '9', title: 'LETA', year: '2017', url: '#', position: [25, 0, 5] },
    { id: '10', title: 'WINWIN CHINA', year: '2019', url: '#', position: [-25, 0, -5] },
    { id: '11', title: 'GREENDENT', year: '2021', url: '#', position: [0, 0, 30] },
  ];

  const portfolioCases = cases.length > 0 ? cases : defaultCases;

  useEffect(() => {
    if (!containerRef.current) return;

    // Создание сцены
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Небесно-голубой цвет
    scene.fog = new THREE.Fog(0x87ceeb, 0, 200);

    // Камера
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10);

    // Рендерер
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    // Освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);

    // Создание плоскости (земля)
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x90ee90, // Светло-зеленый
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Создание машинки (упрощенная модель)
    const carGroup = new THREE.Group();
    
    // Кузов
    const carBodyGeometry = new THREE.BoxGeometry(2, 0.8, 1.2);
    const carBodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const carBody = new THREE.Mesh(carBodyGeometry, carBodyMaterial);
    carBody.position.y = 0.4;
    carBody.castShadow = true;
    carGroup.add(carBody);

    // Колеса
    const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    const positions = [
      [0.8, 0.3, 0.6],
      [-0.8, 0.3, 0.6],
      [0.8, 0.3, -0.6],
      [-0.8, 0.3, -0.6],
    ];

    positions.forEach((pos) => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos[0], pos[1], pos[2]);
      wheel.castShadow = true;
      carGroup.add(wheel);
    });

    carGroup.position.set(0, 0.5, 0);
    scene.add(carGroup);
    carRef.current = carGroup;

    // Создание маркеров для кейсов
    const caseMarkers: { mesh: THREE.Mesh; case: PortfolioCase }[] = [];
    
    portfolioCases.forEach((portfolioCase) => {
      // Создаем столб/маркер для кейса
      const markerGeometry = new THREE.CylinderGeometry(0.5, 0.5, 3, 8);
      const markerMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffbb00, // Желтый цвет PrimeCoder
        emissive: 0x442200,
        emissiveIntensity: 0.3
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(...portfolioCase.position);
      marker.castShadow = true;
      scene.add(marker);

      // Добавляем текст/название (упрощенно - просто сфера сверху)
      const textSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x222222 })
      );
      textSphere.position.set(
        portfolioCase.position[0],
        portfolioCase.position[1] + 2.5,
        portfolioCase.position[2]
      );
      textSphere.castShadow = true;
      scene.add(textSphere);

      caseMarkers.push({ mesh: marker, case: portfolioCase });
    });

    // Переменные для управления машинкой
    let carSpeed = 0;
    let carRotation = 0;
    const maxSpeed = 0.3;
    const acceleration = 0.01;
    const rotationSpeed = 0.03;

    // Обработка клавиатуры
    const handleKeyDown = (event: KeyboardEvent) => {
      keysRef.current[event.key.toLowerCase()] = true;
      if (event.key === 'Enter' && nearbyCase) {
        window.location.href = nearbyCase.url;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keysRef.current[event.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Анимация
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      if (!carRef.current || !cameraRef.current) return;

      const keys = keysRef.current;

      // Управление
      if (keys['w'] || keys['arrowup']) {
        carSpeed = Math.min(carSpeed + acceleration, maxSpeed);
      } else if (keys['s'] || keys['arrowdown']) {
        carSpeed = Math.max(carSpeed - acceleration, -maxSpeed * 0.5);
      } else {
        carSpeed *= 0.9; // Трение
      }

      if (keys['a'] || keys['arrowleft']) {
        carRotation += rotationSpeed;
      }
      if (keys['d'] || keys['arrowright']) {
        carRotation -= rotationSpeed;
      }

      // Применение движения
      if (Math.abs(carSpeed) > 0.01) {
        carRef.current.rotation.y = carRotation;
        const direction = new THREE.Vector3(
          Math.sin(carRotation),
          0,
          Math.cos(carRotation)
        );
        carRef.current.position.add(direction.multiplyScalar(carSpeed));
      }

      // Проверка близости к кейсам
      let nearestCase: PortfolioCase | null = null;
      let minDistance = Infinity;

      portfolioCases.forEach((portfolioCase) => {
        const distance = carRef.current!.position.distanceTo(
          new THREE.Vector3(...portfolioCase.position)
        );
        if (distance < 5 && distance < minDistance) {
          minDistance = distance;
          nearestCase = portfolioCase;
        }
      });

      if (nearestCase !== nearbyCase) {
        setNearbyCase(nearestCase);
        setShowHint(nearestCase !== null);
      }

      // Камера следует за машинкой
      const cameraOffset = new THREE.Vector3(
        Math.sin(carRotation) * 8,
        5,
        Math.cos(carRotation) * 8
      );
      const targetPosition = carRef.current.position.clone().add(cameraOffset);
      cameraRef.current.position.lerp(targetPosition, 0.1);
      cameraRef.current.lookAt(carRef.current.position);

      renderer.render(scene, cameraRef.current);
    };

    animate();

    // Обработка изменения размера
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Очистка
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
    };
  }, [portfolioCases, nearbyCase]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '600px' }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'none',
        }}
      />
      {showHint && nearbyCase && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#ffbb00',
            padding: '15px 30px',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 'bold',
            zIndex: 1000,
            textAlign: 'center',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div>{nearbyCase.title} ({nearbyCase.year})</div>
          <div style={{ fontSize: '14px', marginTop: '5px', color: '#fff' }}>
            Нажмите Enter для просмотра
          </div>
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: '#fff',
          padding: '15px',
          borderRadius: '8px',
          fontSize: '14px',
          zIndex: 1000,
        }}
      >
        <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Управление:</div>
        <div>W / ↑ - Вперед</div>
        <div>S / ↓ - Назад</div>
        <div>A / ← - Влево</div>
        <div>D / → - Вправо</div>
        <div style={{ marginTop: '8px', color: '#ffbb00' }}>
          Enter - Открыть кейс (при приближении)
        </div>
      </div>
    </div>
  );
}

