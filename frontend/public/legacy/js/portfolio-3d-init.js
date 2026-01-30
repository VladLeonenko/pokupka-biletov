// Инициализация 3D портфолио
(function() {
  'use strict';
  
  // Данные кейсов
  const portfolioCases = [
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

  function initPortfolio3D() {
    var container = document.getElementById('portfolio-3d-container');
    if (!container) {
      // Пробуем еще раз через небольшую задержку
      setTimeout(initPortfolio3D, 100);
      return;
    }

    // Проверяем, что Three.js доступен
    if (typeof THREE === 'undefined') {
      console.error('[Portfolio3D] Three.js не загружен. Ожидаем загрузки...');
      // Пробуем еще раз через небольшую задержку
      setTimeout(initPortfolio3D, 100);
      return;
    }

    initPortfolio3DScene(container);
  }

  function initPortfolio3DScene(container) {
    // Создание сцены
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 0, 200);

    // Камера
    var camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10);

    // Рендерер
    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Освещение
    var ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    var directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Создание плоскости (земля)
    var groundGeometry = new THREE.PlaneGeometry(200, 200);
    var groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x90ee90,
      roughness: 0.8,
      metalness: 0.2
    });
    var ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Создание машинки
    var carGroup = new THREE.Group();
    
    // Кузов
    var carBodyGeometry = new THREE.BoxGeometry(2, 0.8, 1.2);
    var carBodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    var carBody = new THREE.Mesh(carBodyGeometry, carBodyMaterial);
    carBody.position.y = 0.4;
    carBody.castShadow = true;
    carGroup.add(carBody);

    // Колеса
    var wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
    var wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    var wheelPositions = [
      [0.8, 0.3, 0.6],
      [-0.8, 0.3, 0.6],
      [0.8, 0.3, -0.6],
      [-0.8, 0.3, -0.6],
    ];

    wheelPositions.forEach(function(pos) {
      var wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos[0], pos[1], pos[2]);
      wheel.castShadow = true;
      carGroup.add(wheel);
    });

    carGroup.position.set(0, 0.5, 0);
    scene.add(carGroup);

    // Создание маркеров для кейсов
    var caseMarkers = [];
    
    portfolioCases.forEach(function(portfolioCase) {
      // Столб/маркер
      var markerGeometry = new THREE.CylinderGeometry(0.5, 0.5, 3, 8);
      var markerMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffbb00,
        emissive: 0x442200,
        emissiveIntensity: 0.3
      });
      var marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(portfolioCase.position[0], portfolioCase.position[1], portfolioCase.position[2]);
      marker.castShadow = true;
      scene.add(marker);

      // Сфера сверху
      var textSphere = new THREE.Mesh(
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

    // Управление
    var keys = {};
    var carSpeed = 0;
    var carRotation = 0;
    var maxSpeed = 0.3;
    var acceleration = 0.01;
    var rotationSpeed = 0.03;
    var nearbyCase = null;

    // Подсказка
    var hintDiv = document.createElement('div');
    hintDiv.style.cssText = 'position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(0, 0, 0, 0.8); color: #ffbb00; padding: 15px 30px; border-radius: 8px; font-size: 18px; font-weight: bold; z-index: 1000; text-align: center; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3); display: none;';
    container.parentElement.style.position = 'relative';
    container.parentElement.appendChild(hintDiv);

    // Обработка клавиатуры
    function handleKeyDown(event) {
      keys[event.key.toLowerCase()] = true;
      if (event.key === 'Enter' && nearbyCase) {
        window.location.href = nearbyCase.url;
      }
    }

    function handleKeyUp(event) {
      keys[event.key.toLowerCase()] = false;
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Анимация
    function animate() {
      requestAnimationFrame(animate);

      // Управление
      if (keys['w'] || keys['arrowup']) {
        carSpeed = Math.min(carSpeed + acceleration, maxSpeed);
      } else if (keys['s'] || keys['arrowdown']) {
        carSpeed = Math.max(carSpeed - acceleration, -maxSpeed * 0.5);
      } else {
        carSpeed *= 0.9;
      }

      if (keys['a'] || keys['arrowleft']) {
        carRotation += rotationSpeed;
      }
      if (keys['d'] || keys['arrowright']) {
        carRotation -= rotationSpeed;
      }

      // Применение движения
      if (Math.abs(carSpeed) > 0.01) {
        carGroup.rotation.y = carRotation;
        var direction = new THREE.Vector3(
          Math.sin(carRotation),
          0,
          Math.cos(carRotation)
        );
        carGroup.position.add(direction.multiplyScalar(carSpeed));
      }

      // Проверка близости к кейсам
      var nearestCase = null;
      var minDistance = Infinity;

      portfolioCases.forEach(function(portfolioCase) {
        var distance = carGroup.position.distanceTo(
          new THREE.Vector3(portfolioCase.position[0], portfolioCase.position[1], portfolioCase.position[2])
        );
        if (distance < 5 && distance < minDistance) {
          minDistance = distance;
          nearestCase = portfolioCase;
        }
      });

      if (nearestCase !== nearbyCase) {
        nearbyCase = nearestCase;
        if (nearbyCase) {
          hintDiv.innerHTML = '<div>' + nearbyCase.title + ' (' + nearbyCase.year + ')</div><div style="font-size: 14px; margin-top: 5px; color: #fff;">Нажмите Enter для просмотра</div>';
          hintDiv.style.display = 'block';
        } else {
          hintDiv.style.display = 'none';
        }
      }

      // Камера следует за машинкой
      var cameraOffset = new THREE.Vector3(
        Math.sin(carRotation) * 8,
        5,
        Math.cos(carRotation) * 8
      );
      var targetPosition = carGroup.position.clone().add(cameraOffset);
      camera.position.lerp(targetPosition, 0.1);
      camera.lookAt(carGroup.position);

      renderer.render(scene, camera);
    }

    animate();

    // Обработка изменения размера
    function handleResize() {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }

    window.addEventListener('resize', handleResize);
  }

  // Инициализация после загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPortfolio3D);
  } else {
    initPortfolio3D();
  }
})();

