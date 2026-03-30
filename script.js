const emotionCards = [
  { key: 'happy', label: 'Happy', image: 'img/happy.png' },
  { key: 'sad', label: 'Sad', image: 'sad.png' },
  { key: 'angry', label: 'Angry', image: 'angry.png' },
  { key: 'funny', label: 'Funny', image: 'funny.png' },
  { key: 'scared', label: 'Scared', image: 'scared.png' },
  { key: 'sleepy', label: 'Sleepy', image: 'sleepy.png' },
  { key: 'tired', label: 'Tired', image: 'tired.png' },
];

const carouselImg = document.getElementById('carouselImg');
const carouselLabel = document.getElementById('carouselLabel');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const startBtn = document.getElementById('startBtn');
const container = document.querySelector('.container');

const targetBox = document.getElementById('targetBox');
const targetName = document.getElementById('targetName');
const scoreBox = document.getElementById('scoreBox');
const progressBox = document.getElementById('progressBox');
const summaryContainer = document.getElementById('summaryContainer');
const summaryBox = document.getElementById('summaryBox');
const choicesGrid = document.getElementById('choicesGrid');
const resultBox = document.getElementById('resultBox');
const restartBtn = document.getElementById('restartBtn');
const nextLvlBtn = document.getElementById('nextlvl');

let currentIndex = 0;
let gameTarget = null;
let gameScore = 0;
let gameFinished = false;
let gameLevel = 1;
let phaseSequence = [];
let sequenceIndex = 0;

const audioContext = window.AudioContext ? new AudioContext() : null;

function playTone(frequency, duration = 0.12, type = 'sine', timeOffset = 0) {
  if (!audioContext) {
    return;
  }

  const now = audioContext.currentTime + timeOffset;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function playSuccessSound() {
  if (!audioContext) {
    return;
  }
  playTone(740, 0.12, 'triangle');
  playTone(1040, 0.12, 'triangle', 0.08);
}

function playErrorSound() {
  if (!audioContext) {
    return;
  }
  playTone(180, 0.16, 'sawtooth');
}

function pulseTarget() {
  if (!targetBox) {
    return;
  }
  targetBox.classList.add('pulse');
  setTimeout(() => targetBox.classList.remove('pulse'), 400);
}

function animateChoice(button, result) {
  if (!button) {
    return;
  }
  button.classList.add(result);
  setTimeout(() => button.classList.remove(result), 350);
}

function updateCarousel(index) {
  const card = emotionCards[index];
  carouselImg.src = `img/${card.image}`;
  carouselImg.alt = `${card.label} face`;
  carouselLabel.textContent = card.label;
}

function changeIndex(delta) {
  currentIndex = (currentIndex + delta + emotionCards.length) % emotionCards.length;
  updateCarousel(currentIndex);
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function generateChoices(targetKey, count = 6) {
  const targetCard = emotionCards.find((item) => item.key === targetKey);
  if (!targetCard) {
    return [];
  }

  const choices = [targetCard];
  const distractors = emotionCards.filter((item) => item.key !== targetKey);

  while (choices.length < count && distractors.length > 0) {
    const randomIndex = Math.floor(Math.random() * distractors.length);
    choices.push(distractors.splice(randomIndex, 1)[0]);
  }

  return choices.sort(() => Math.random() - 0.5);
}

function renderChoices(choices, grid) {
  grid.innerHTML = '';

  choices.forEach((choice) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice';
    button.dataset.key = choice.key;

    const img = document.createElement('img');
    img.src = `img/${choice.image}`;
    img.alt = `${choice.label} face`;

    const label = document.createElement('div');
    label.textContent = choice.label;

    button.appendChild(img);
    button.appendChild(label);
    button.addEventListener('click', () => onChoiceSelected(choice.key, button));
    grid.appendChild(button);
  });
}

function updateScore() {
  if (scoreBox) {
    scoreBox.textContent = `EXP: ${gameScore} / 5`;
  }
}

function createProgressBoxes(count = 5) {
  if (!progressBox) {
    return;
  }

  progressBox.innerHTML = '';
  for (let i = 0; i < count; i += 1) {
    const item = document.createElement('div');
    item.className = 'progress-item';
    progressBox.appendChild(item);
  }
  progressBox.classList.remove('hidden');
}

function updateProgressBoxes(completed) {
  if (!progressBox) {
    return;
  }

  const items = progressBox.querySelectorAll('.progress-item');
  items.forEach((item, index) => {
    item.classList.toggle('filled', index < completed);
  });
}

function showSummaryCards(sequence) {
  if (!summaryContainer || !summaryBox) {
    return;
  }

  summaryBox.innerHTML = '';
  sequence.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'summary-card';

    const img = document.createElement('img');
    img.src = `img/${item.image}`;
    img.alt = `${item.label} face`;

    const label = document.createElement('span');
    label.textContent = item.label;

    card.appendChild(img);
    card.appendChild(label);
    summaryBox.appendChild(card);
  });

  summaryContainer.classList.remove('hidden');
}

function hideSummaryCards() {
  if (!summaryContainer || !summaryBox) {
    return;
  }

  summaryBox.innerHTML = '';
  summaryContainer.classList.add('hidden');
}

function createLevelSequence(startKey, count = 5) {
  const available = [...emotionCards];
  const sequence = [];

  const normalized = startKey ? startKey.toLowerCase() : '';
  const first = available.find((item) => item.key.toLowerCase() === normalized || item.label.toLowerCase() === normalized);
  if (first) {
    sequence.push(first);
    available.splice(available.indexOf(first), 1);
  }

  while (sequence.length < count && available.length > 0) {
    const randomIndex = Math.floor(Math.random() * available.length);
    sequence.push(available.splice(randomIndex, 1)[0]);
  }

  return sequence;
}

function setCurrentTarget(target) {
  gameTarget = target;
  if (targetName) {
    targetName.textContent = gameTarget.label;
  }
}

function chooseNewTarget() {
  const otherCards = emotionCards.filter((item) => item.key !== gameTarget.key);
  if (otherCards.length === 0) {
    return;
  }
  gameTarget = otherCards[Math.floor(Math.random() * otherCards.length)];
  if (targetName) {
    targetName.textContent = gameTarget.label;
  }
}

function endGame() {
  gameFinished = true;
  if (choicesGrid) {
    choicesGrid.querySelectorAll('button').forEach((button) => {
      button.disabled = true;
    });
  }
  if (restartBtn) {
    restartBtn.classList.remove('hidden');
  }
  if (nextLvlBtn) {
    nextLvlBtn.classList.add('hidden');
  }
}

function resolveTargetKey(targetKey) {
  if (!targetKey) {
    return emotionCards[Math.floor(Math.random() * emotionCards.length)].key;
  }

  const normalized = targetKey.trim().toLowerCase();
  const found = emotionCards.find((item) =>
    item.key.toLowerCase() === normalized || item.label.toLowerCase() === normalized
  );

  return found ? found.key : emotionCards[Math.floor(Math.random() * emotionCards.length)].key;
}

function startGamePage(targetKey) {
  const levelParam = parseInt(getQueryParam('level'), 10);
  gameLevel = levelParam === 2 ? 2 : 1;
  const validTarget = resolveTargetKey(targetKey);

  gameScore = 0;
  gameFinished = false;
  sequenceIndex = 0;
  phaseSequence = [];

  hideSummaryCards();

  if (nextLvlBtn) {
    nextLvlBtn.classList.add('hidden');
  }
  if (restartBtn) {
    restartBtn.classList.add('hidden');
  }
  if (resultBox) {
    resultBox.textContent = '';
    resultBox.classList.add('hidden');
  }

  if (gameLevel === 2) {
    phaseSequence = createLevelSequence(validTarget, 5);
    if (phaseSequence.length === 0) {
      return;
    }
    setCurrentTarget(phaseSequence[sequenceIndex]);
    if (scoreBox) {
      scoreBox.style.display = 'none';
    }
    createProgressBoxes(5);
    updateProgressBoxes(gameScore);
    if (choicesGrid) {
      renderChoices(generateChoices(gameTarget.key, 6), choicesGrid);
    }
    return;
  }

  if (scoreBox) {
    scoreBox.style.display = 'none';
  }
  if (progressBox) {
    progressBox.classList.add('hidden');
  }

  gameTarget = emotionCards.find((item) => item.key === validTarget);
  if (!gameTarget) {
    return;
  }

  if (targetName) {
    targetName.textContent = gameTarget.label;
  }

  if (choicesGrid) {
    const choices = generateChoices(gameTarget.key, 6);
    renderChoices(choices, choicesGrid);
  }
}

function onChoiceSelected(selectedKey, button) {
  if (!gameTarget || !resultBox || gameFinished) {
    return;
  }

  if (selectedKey === gameTarget.key) {
    animateChoice(button, 'correct');
    playSuccessSound();
    pulseTarget();

    if (gameLevel === 1) {
      resultBox.textContent = 'Nice work! Click Next Level to continue.';
      resultBox.style.color = '#2d6a4f';
      resultBox.classList.remove('hidden');
      if (nextLvlBtn) {
        nextLvlBtn.classList.remove('hidden');
      }
      return;
    }

    gameScore += 1;
    updateProgressBoxes(gameScore);

    if (gameScore >= 5) {
      resultBox.textContent = `Great job! You completed all 5 targets!`;
      resultBox.style.color = '#2d6a4f';
      showSummaryCards(phaseSequence);
      endGame();
    } else {
      sequenceIndex += 1;
      if (sequenceIndex < phaseSequence.length) {
        setCurrentTarget(phaseSequence[sequenceIndex]);
      }
      if (choicesGrid) {
        renderChoices(generateChoices(gameTarget.key, 6), choicesGrid);
      }
      resultBox.textContent = `Great job! ${5 - gameScore} more targets to complete.`;
      resultBox.style.color = '#2d6a4f';
    }
  } else {
    animateChoice(button, 'wrong');
    playErrorSound();
    const selected = emotionCards.find((item) => item.key === selectedKey);
    resultBox.textContent = `Not quite — that is ${selected.label}. Try again!`;
    resultBox.style.color = '#d00000';
  }

  resultBox.classList.remove('hidden');
}

function setupIndexPage() {
  if (!carouselImg || !leftBtn || !rightBtn || !startBtn) {
    return;
  }

  updateCarousel(currentIndex);
  leftBtn.addEventListener('click', () => changeIndex(-1));
  rightBtn.addEventListener('click', () => changeIndex(1));
  startBtn.addEventListener('click', () => {
    const selectedKey = emotionCards[currentIndex].key;
    window.location.href = `game.html?target=${encodeURIComponent(selectedKey)}`;
  });
}

function setupGamePage() {
  if (!choicesGrid || !targetBox || !targetName) {
    return;
  }

  const targetKey = getQueryParam('target');
  startGamePage(targetKey);

  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  if (nextLvlBtn) {
    nextLvlBtn.addEventListener('click', () => {
      window.location.href = 'game.html?level=2';
    });
  }
}

setupIndexPage();
setupGamePage();
