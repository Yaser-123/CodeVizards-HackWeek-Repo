const CHOICES = ['rock', 'paper', 'scissors'];
const EMOJI = { rock: '🪨', paper: '📄', scissors: '✂️' };

let playerScore = 0;
let computerScore = 0;
let round = 0;
let history = [];

function getComputerChoice() {
  return CHOICES[Math.floor(Math.random() * CHOICES.length)];
}

function getResult(player, computer) {
  if (player === computer) return 'draw';
  if (
    (player === 'rock' && computer === 'scissors') ||
    (player === 'paper' && computer === 'rock') ||
    (player === 'scissors' && computer === 'paper')
  ) return 'win';
  return 'lose';
}

function play(choice) {
  const computer = getComputerChoice();
  const result = getResult(choice, computer);

  round++;

  if (result === 'win') playerScore++;
  else if (result === 'lose') computerScore++;

  document.getElementById('playerScore').textContent = playerScore;
  document.getElementById('computerScore').textContent = computerScore;

  // Highlight selected button
  document.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
  document.querySelector(`[data-choice="${choice}"]`).classList.add('selected');

  // Animate result
  const playerEl = document.getElementById('playerChoice');
  const computerEl = document.getElementById('computerChoice');
  const resultText = document.getElementById('resultText');

  playerEl.textContent = EMOJI[choice];
  computerEl.textContent = EMOJI[computer];

  playerEl.classList.remove('animate');
  computerEl.classList.remove('animate');
  void playerEl.offsetWidth;
  playerEl.classList.add('animate');
  computerEl.classList.add('animate');

  resultText.className = 'result-text ' + result;
  if (result === 'win') resultText.textContent = 'You win this round!';
  else if (result === 'lose') resultText.textContent = 'Computer wins this round!';
  else resultText.textContent = "It's a draw!";

  // Add to history
  history.unshift({
    round,
    player: choice,
    computer,
    result
  });

  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('historyList');
  if (history.length === 0) {
    list.innerHTML = '<div class="history-empty">No rounds played yet</div>';
    return;
  }

  list.innerHTML = history.map(h => {
    const resultLabel = h.result === 'win' ? 'WIN' : h.result === 'lose' ? 'LOSS' : 'DRAW';
    return `
      <div class="history-item">
        <span class="history-round">#${h.round}</span>
        <span class="history-choices">${EMOJI[h.player]} vs ${EMOJI[h.computer]}</span>
        <span class="history-result ${h.result}">${resultLabel}</span>
      </div>
    `;
  }).join('');
}

function resetGame() {
  playerScore = 0;
  computerScore = 0;
  round = 0;
  history = [];

  document.getElementById('playerScore').textContent = '0';
  document.getElementById('computerScore').textContent = '0';
  document.getElementById('playerChoice').textContent = '?';
  document.getElementById('computerChoice').textContent = '?';
  document.getElementById('resultText').textContent = 'Pick a choice to start';
  document.getElementById('resultText').className = 'result-text';
  document.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));

  renderHistory();
}

renderHistory();
