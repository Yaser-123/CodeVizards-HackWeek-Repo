document.addEventListener('DOMContentLoaded', () => {
    // Screens
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const leaderboardScreen = document.getElementById('leaderboard-screen');
    
    // Buttons
    const startBtn = document.getElementById('start-btn');
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    const backBtn = document.getElementById('back-btn');
    const choiceBtns = document.querySelectorAll('.choice-btn');
    const nextBtn = document.getElementById('next-btn');

    // UI Elements
    const mediaContainer = document.getElementById('media-container');
    const scoreEl = document.getElementById('score');
    const streakEl = document.getElementById('streak');
    const currentRoundEl = document.getElementById('current-round');
    const homeHighscoreEl = document.getElementById('home-highscore');
    const leaderboardList = document.getElementById('leaderboard-list');

    // Modal
    const resultModal = document.getElementById('result-modal');
    const resultIcon = document.getElementById('result-icon');
    const resultTitle = document.getElementById('result-title');
    const resultExplanation = document.getElementById('result-explanation');

    // Game State
    let roundsData = [];
    let currentRoundIndex = 0;
    let score = 0;
    let streak = 0;
    const MAX_ROUNDS = 5;

    // Load Highscore on Start
    updateHomeHighscore();

    // Fetch Data
    fetch('data.json')
        .then(res => res.json())
        .then(data => {
            roundsData = data;
        })
        .catch(err => console.error("Error loading game data:", err));

    // Screen Navigation
    function showScreen(screen) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        screen.classList.add('active');
    }

    startBtn.addEventListener('click', startGame);
    leaderboardBtn.addEventListener('click', showLeaderboard);
    backBtn.addEventListener('click', () => showScreen(startScreen));

    // Game Logic
    function startGame() {
        score = 0;
        streak = 0;
        currentRoundIndex = 0;
        updateScoreboard();
        
        // Shuffle rounds and pick MAX_ROUNDS
        roundsData.sort(() => Math.random() - 0.5);
        
        showScreen(gameScreen);
        loadRound();
    }

    function loadRound() {
        if (currentRoundIndex >= MAX_ROUNDS || currentRoundIndex >= roundsData.length) {
            endGame();
            return;
        }

        currentRoundEl.textContent = currentRoundIndex + 1;
        document.getElementById('total-rounds').textContent = Math.min(MAX_ROUNDS, roundsData.length);
        
        const round = roundsData[currentRoundIndex];
        mediaContainer.innerHTML = '';

        if (round.type === 'text') {
            const p = document.createElement('p');
            p.className = 'media-content-text';
            p.textContent = round.content;
            mediaContainer.appendChild(p);
        } else if (round.type === 'code') {
            const pre = document.createElement('pre');
            pre.className = 'media-content-code';
            pre.textContent = round.content;
            mediaContainer.appendChild(pre);
        } else if (round.type === 'image') {
            const img = document.createElement('img');
            img.className = 'media-content-img';
            img.src = round.content;
            mediaContainer.appendChild(img);
        } else if (round.type === 'audio') {
            const audio = document.createElement('audio');
            audio.className = 'media-content-audio';
            audio.controls = true;
            audio.src = round.content;
            mediaContainer.appendChild(audio);
        }
    }

    choiceBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const choice = e.currentTarget.getAttribute('data-choice');
            handleChoice(choice);
        });
    });

    function handleChoice(choice) {
        const round = roundsData[currentRoundIndex];
        const isCorrect = (choice === 'ai' && round.is_ai) || (choice === 'human' && !round.is_ai);

        if (isCorrect) {
            score += 100 + (streak * 20); // Bonus for streak
            streak++;
            showModal(true, round.explanation);
        } else {
            streak = 0;
            showModal(false, round.explanation);
        }
        
        updateScoreboard();
    }

    function updateScoreboard() {
        scoreEl.textContent = score;
        streakEl.textContent = streak;
    }

    // Modal Logic
    function showModal(isCorrect, explanation) {
        resultModal.classList.add('show');
        
        if (isCorrect) {
            resultIcon.innerHTML = '<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
            resultIcon.className = 'result-icon correct';
            resultTitle.textContent = "Correct!";
        } else {
            resultIcon.innerHTML = '<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
            resultIcon.className = 'result-icon wrong';
            resultTitle.textContent = "Incorrect!";
        }

        resultExplanation.textContent = explanation;
    }

    nextBtn.addEventListener('click', () => {
        resultModal.classList.remove('show');
        currentRoundIndex++;
        loadRound();
    });

    // End Game & Leaderboard
    function endGame() {
        saveHighscore(score);
        updateHomeHighscore();
        showLeaderboard();
    }

    function saveHighscore(newScore) {
        let scores = JSON.parse(localStorage.getItem('aiDetectorScores') || '[]');
        const date = new Date().toLocaleDateString();
        scores.push({ score: newScore, date: date });
        scores.sort((a, b) => b.score - a.score);
        scores = scores.slice(0, 10); // Keep top 10
        localStorage.setItem('aiDetectorScores', JSON.stringify(scores));
    }

    function showLeaderboard() {
        showScreen(leaderboardScreen);
        const scores = JSON.parse(localStorage.getItem('aiDetectorScores') || '[]');
        
        leaderboardList.innerHTML = '';
        if (scores.length === 0) {
            leaderboardList.innerHTML = '<div class="lb-item">No scores yet. Play a game!</div>';
            return;
        }

        scores.forEach((s, index) => {
            const div = document.createElement('div');
            div.className = 'lb-item';
            div.innerHTML = `<span>#${index + 1} &nbsp;&nbsp; ${s.date}</span> <strong>${s.score} pts</strong>`;
            leaderboardList.appendChild(div);
        });
    }

    function updateHomeHighscore() {
        const scores = JSON.parse(localStorage.getItem('aiDetectorScores') || '[]');
        if (scores.length > 0) {
            homeHighscoreEl.textContent = `High Score: ${scores[0].score}`;
        }
    }
});
