const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.navigation');
const quoteDialog = document.querySelector('.quote');
const policyDialog = document.querySelector('.policy');
const caseDialog = document.querySelector('.case-dialog');
const cookieNotice = document.querySelector('.cookies');
const quoteForm = document.querySelector('.quote__form');
const quoteStatus = document.querySelector('.quote__status');

const setMenuState = (isOpen) => {
  navigation.classList.toggle('navigation--open', isOpen);
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
};

const openDialog = (dialog) => {
  document.querySelectorAll('dialog[open]').forEach((openDialog) => openDialog.close());
  setMenuState(false);
  dialog.showModal();
};

// Настройка сохраняется локально; недоступное хранилище не блокирует интерфейс.
const readCookieChoice = () => {
  try {
    return localStorage.getItem('sibiks-cookie-choice');
  } catch {
    return null;
  }
};

const saveCookieChoice = (choice) => {
  try {
    localStorage.setItem('sibiks-cookie-choice', choice);
  } catch {
    // В приватном режиме уведомление скрывается только до перезагрузки.
  }
  cookieNotice.hidden = true;
};

menuButton.addEventListener('click', () => {
  setMenuState(menuButton.getAttribute('aria-expanded') !== 'true');
});

navigation.addEventListener('click', (event) => {
  if (event.target.closest('a')) setMenuState(false);
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.navigation, .menu-toggle')) setMenuState(false);
  if (event.target.closest('[data-open-quote]')) openDialog(quoteDialog);
  if (event.target.closest('[data-open-policy]')) openDialog(policyDialog);
  if (event.target.closest('[data-open-case]') && caseDialog) openDialog(caseDialog);

  const closeButton = event.target.closest('[data-close-dialog]');
  if (closeButton) closeButton.closest('dialog').close();

  const cookieButton = event.target.closest('[data-cookie-choice]');
  if (cookieButton) saveCookieChoice(cookieButton.dataset.cookieChoice);

  if (event.target.closest('[data-cookie-reset]')) {
    policyDialog.close();
    cookieNotice.hidden = false;
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setMenuState(false);
});

// Обработчик отправки нужно заменить запросом к API после подключения сервера.
quoteForm.addEventListener('submit', (event) => {
  event.preventDefault();
  quoteStatus.textContent = 'Демонстрационный режим: данные не отправлены. Для получения заявок необходимо подключить обработчик формы.';
  quoteStatus.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

quoteForm.addEventListener('input', () => {
  quoteStatus.textContent = '';
});

cookieNotice.hidden = Boolean(readCookieChoice());

const initializeEcosystemMotion = () => {
  const ecosystem = document.querySelector('.ecosystem');
  if (!ecosystem) return;

  const services = [...ecosystem.querySelectorAll('.ecosystem__service')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const traveler = document.createElement('span');
  traveler.className = 'ecosystem__traveler';
  traveler.setAttribute('aria-hidden', 'true');
  ecosystem.append(traveler);

  const fullTurn = Math.PI * 2;
  const normalizeAngle = (angle) => ((angle % fullTurn) + fullTurn) % fullTurn;
  let orbitPoints = [];
  let orbitCenter = { x: 0, y: 0 };
  let activeIndex = 0;
  let currentAngle = 0;
  let departureAngle = 0;
  let destinationAngle = 0;
  let movementStarted = 0;
  let movementDuration = 0;
  let arrivedAt = 0;
  let animationFrame = 0;
  let hoveredIndex = null;
  let focusedIndex = null;

  const measureOrbit = () => {
    const bounds = ecosystem.getBoundingClientRect();
    const center = ecosystem.querySelector('.ecosystem__center').getBoundingClientRect();
    orbitCenter = {
      x: center.left - bounds.left + center.width / 2,
      y: center.top - bounds.top + center.height / 2,
    };
    orbitPoints = services.map((service, index) => {
      const bubble = service.querySelector('.ecosystem__bubble').getBoundingClientRect();
      const offsetX = bubble.left - bounds.left + bubble.width / 2 - orbitCenter.x;
      const offsetY = bubble.top - bounds.top + bubble.height / 2 - orbitCenter.y;
      return {
        index,
        angle: normalizeAngle(Math.atan2(offsetY, offsetX)),
        radius: Math.hypot(offsetX, offsetY),
        size: bubble.width * 1.2,
      };
    }).sort((first, second) => first.angle - second.angle);
    traveler.style.width = `${orbitPoints[0].size}px`;
    traveler.style.height = `${orbitPoints[0].size}px`;
  };

  // Радиус плавно меняется между пунктами: траектория проходит через все иконки,
  // но всегда огибает центр по орбите, в том числе при смене цели на полпути.
  const getOrbitRadius = (angle) => {
    const normalized = normalizeAngle(angle);
    const nextIndex = orbitPoints.findIndex((point) => point.angle > normalized);
    const next = orbitPoints[nextIndex === -1 ? 0 : nextIndex];
    const previous = orbitPoints[(nextIndex === -1 ? orbitPoints.length : nextIndex || orbitPoints.length) - 1];
    const segmentLength = normalizeAngle(next.angle - previous.angle);
    const progress = normalizeAngle(normalized - previous.angle) / segmentLength;
    const blend = progress * progress * (3 - 2 * progress);
    return previous.radius + (next.radius - previous.radius) * blend;
  };

  const selectService = (index, timestamp, clockwise = false) => {
    activeIndex = index;
    departureAngle = currentAngle;
    const target = orbitPoints.find((point) => point.index === index);
    let distance = normalizeAngle(target.angle - currentAngle);
    if (!clockwise && distance > Math.PI) distance -= fullTurn;
    destinationAngle = currentAngle + distance;
    movementStarted = timestamp;
    movementDuration = Math.max(650, Math.abs(distance) * 1000);
    arrivedAt = 0;
    services.forEach((service) => service.classList.remove('ecosystem__service--highlighted'));
  };

  const renderFrame = (timestamp) => {
    const progress = Math.min((timestamp - movementStarted) / movementDuration, 1);
    const easedProgress = progress * progress * (3 - 2 * progress);
    currentAngle = departureAngle + (destinationAngle - departureAngle) * easedProgress;
    const radius = getOrbitRadius(currentAngle);
    const positionX = orbitCenter.x + Math.cos(currentAngle) * radius;
    const positionY = orbitCenter.y + Math.sin(currentAngle) * radius;
    traveler.style.transform = `translate(${positionX}px, ${positionY}px) translate(-50%, -50%)`;

    if (progress === 1) {
      if (!arrivedAt) {
        arrivedAt = timestamp;
        services[activeIndex].classList.add('ecosystem__service--highlighted');
      }
      if (hoveredIndex === null && focusedIndex === null && timestamp - arrivedAt > 1100) {
        selectService((activeIndex + 1) % services.length, timestamp, true);
      }
    }
    animationFrame = requestAnimationFrame(renderFrame);
  };

  const synchronizeMotion = () => {
    cancelAnimationFrame(animationFrame);
    traveler.hidden = reducedMotion.matches;
    services.forEach((service) => service.classList.remove('ecosystem__service--highlighted'));
    if (reducedMotion.matches || document.hidden) return;
    measureOrbit();
    currentAngle = orbitPoints.find((point) => point.index === activeIndex).angle;
    selectService(activeIndex, performance.now());
    animationFrame = requestAnimationFrame(renderFrame);
  };

  const followInteraction = () => {
    const selectedIndex = hoveredIndex ?? focusedIndex;
    if (selectedIndex !== null && !reducedMotion.matches) {
      selectService(selectedIndex, performance.now());
    } else {
      arrivedAt = 0;
    }
  };

  services.forEach((service, index) => {
    service.addEventListener('pointerenter', () => {
      hoveredIndex = index;
      followInteraction();
    });
    service.addEventListener('pointerleave', () => {
      hoveredIndex = null;
      followInteraction();
    });
    service.addEventListener('focus', () => {
      focusedIndex = index;
      followInteraction();
    });
    service.addEventListener('blur', () => {
      focusedIndex = null;
      followInteraction();
    });
  });

  window.addEventListener('resize', synchronizeMotion);
  document.addEventListener('visibilitychange', synchronizeMotion);
  reducedMotion.addEventListener('change', synchronizeMotion);
  synchronizeMotion();
};

initializeEcosystemMotion();
