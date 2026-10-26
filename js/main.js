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

  let activeIndex = 0;
  let currentPosition = null;
  let departurePosition = null;
  let movementStarted = 0;
  let arrivedAt = 0;
  let animationFrame = 0;
  let isInteracting = false;

  // Координаты относительно композиции остаются точными при любом её масштабе.
  const getDestination = (index) => {
    const bounds = ecosystem.getBoundingClientRect();
    const bubble = services[index].querySelector('.ecosystem__bubble').getBoundingClientRect();
    return {
      x: bubble.left - bounds.left + bubble.width * .86,
      y: bubble.top - bounds.top + bubble.height * .16,
      size: bubble.width * .52,
    };
  };

  const selectService = (index, timestamp) => {
    activeIndex = index;
    departurePosition = currentPosition ? { ...currentPosition } : getDestination(index);
    movementStarted = timestamp;
    arrivedAt = 0;
    services.forEach((service, serviceIndex) => {
      service.classList.toggle('ecosystem__service--highlighted', serviceIndex === index);
    });
  };

  const renderFrame = (timestamp) => {
    const destination = getDestination(activeIndex);
    const progress = Math.min((timestamp - movementStarted) / 1700, 1);
    const easedProgress = progress * progress * (3 - 2 * progress);
    const bounds = ecosystem.getBoundingClientRect();
    const middleX = (departurePosition.x + destination.x) / 2;
    const middleY = (departurePosition.y + destination.y) / 2;
    // Дуга огибает центральный логотип, а не пересекает его по прямой.
    const controlX = middleX + (middleX - bounds.width / 2) * .6;
    const controlY = middleY + (middleY - bounds.height / 2) * .6;
    const remaining = 1 - easedProgress;
    currentPosition = {
      x: remaining ** 2 * departurePosition.x + 2 * remaining * easedProgress * controlX + easedProgress ** 2 * destination.x,
      y: remaining ** 2 * departurePosition.y + 2 * remaining * easedProgress * controlY + easedProgress ** 2 * destination.y,
    };
    traveler.style.width = `${destination.size}px`;
    traveler.style.height = `${destination.size}px`;
    traveler.style.transform = `translate(${currentPosition.x}px, ${currentPosition.y}px) translate(-50%, -50%)`;
    traveler.classList.toggle('ecosystem__traveler--docked', progress === 1);

    if (progress === 1) {
      if (!arrivedAt) arrivedAt = timestamp;
      if (!isInteracting && timestamp - arrivedAt > 2300) {
        selectService((activeIndex + 1) % services.length, timestamp);
      }
    }
    animationFrame = requestAnimationFrame(renderFrame);
  };

  const synchronizeMotion = () => {
    cancelAnimationFrame(animationFrame);
    traveler.hidden = reducedMotion.matches;
    if (reducedMotion.matches || document.hidden) {
      services.forEach((service) => service.classList.remove('ecosystem__service--highlighted'));
      return;
    }
    currentPosition = getDestination(activeIndex);
    selectService(activeIndex, performance.now());
    animationFrame = requestAnimationFrame(renderFrame);
  };

  services.forEach((service, index) => {
    const followService = () => {
      isInteracting = true;
      if (!reducedMotion.matches) selectService(index, performance.now());
    };
    const resumeJourney = () => {
      isInteracting = ecosystem.matches(':hover') || ecosystem.contains(document.activeElement);
      arrivedAt = performance.now();
    };
    service.addEventListener('pointerenter', followService);
    service.addEventListener('focus', followService);
    service.addEventListener('pointerleave', resumeJourney);
    service.addEventListener('blur', resumeJourney);
  });

  ecosystem.addEventListener('pointerleave', () => {
    isInteracting = ecosystem.contains(document.activeElement);
    arrivedAt = performance.now();
  });
  ecosystem.addEventListener('focusout', (event) => {
    if (!ecosystem.contains(event.relatedTarget)) isInteracting = false;
  });
  window.addEventListener('resize', synchronizeMotion);
  document.addEventListener('visibilitychange', synchronizeMotion);
  reducedMotion.addEventListener('change', synchronizeMotion);
  synchronizeMotion();
};

initializeEcosystemMotion();
