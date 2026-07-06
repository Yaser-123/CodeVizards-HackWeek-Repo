const GRADE_REVERSE = { 10: 'S', 9: 'A', 8: 'B', 7: 'C', 6: 'D', 5: 'E', 0: 'F' };

let state = {
  semesters: [],
  whatIf: [],
  whatIfOn: false,
  currentSemester: 1,
};

function getGradeLabel(val) {
  return GRADE_REVERSE[val] || '?';
}

function getGradeClass(val) {
  const label = GRADE_REVERSE[val] || 'F';
  return `grade-${label}`;
}

function addSubject() {
  const name = document.getElementById('subjectName').value.trim();
  const credits = parseInt(document.getElementById('subjectCredits').value);
  const grade = parseInt(document.getElementById('subjectGrade').value);

  if (!name) { alert('Please enter a subject name.'); return; }
  if (!credits || credits < 1) { alert('Credits must be at least 1.'); return; }

  let sem = state.semesters.find(s => s.id === state.currentSemester);
  if (!sem) {
    sem = { id: state.currentSemester, subjects: [] };
    state.semesters.push(sem);
  }
  sem.subjects.push({ name, credits, grade });
  document.getElementById('subjectName').value = '';
  render();
}

function removeSubject(semId, index) {
  const sem = state.semesters.find(s => s.id === semId);
  if (!sem) return;
  sem.subjects.splice(index, 1);
  if (sem.subjects.length === 0) {
    state.semesters = state.semesters.filter(s => s.id !== semId);
  }
  render();
}

function nextSemester() {
  state.currentSemester++;
  document.getElementById('semesterLabel').textContent = `Semester ${state.currentSemester}`;
  render();
}

function clearAll() {
  if (!confirm('Remove all subjects and semesters?')) return;
  state.semesters = [];
  state.currentSemester = 1;
  document.getElementById('semesterLabel').textContent = 'Semester 1';
  render();
}

function toggleWhatIf() {
  state.whatIfOn = !state.whatIfOn;
  document.getElementById('whatifToggle').classList.toggle('active', state.whatIfOn);
  document.getElementById('whatifSection').style.display = state.whatIfOn ? 'block' : 'none';
  if (!state.whatIfOn) {
    document.getElementById('whatifDisplay').textContent = '\u2014';
  }
  render();
}

function addWhatIf() {
  const credits = parseInt(document.getElementById('whatifCredits').value);
  const grade = parseInt(document.getElementById('whatifGrade').value);
  if (!credits || credits < 1) { alert('Credits must be at least 1.'); return; }
  state.whatIf.push({ credits, grade });
  render();
}

function removeWhatIf(index) {
  state.whatIf.splice(index, 1);
  render();
}

function calcSemGpa(subjects) {
  if (!subjects || subjects.length === 0) return 0;
  let totalPoints = 0, totalCredits = 0;
  for (const s of subjects) {
    totalPoints += s.grade * s.credits;
    totalCredits += s.credits;
  }
  return totalCredits > 0 ? totalPoints / totalCredits : 0;
}

function calcOverallCgpa() {
  let totalPoints = 0, totalCredits = 0;
  for (const sem of state.semesters) {
    for (const s of sem.subjects) {
      totalPoints += s.grade * s.credits;
      totalCredits += s.credits;
    }
  }
  return totalCredits > 0 ? totalPoints / totalCredits : 0;
}

function calcWhatIfCgpa(whatIfList) {
  let totalPoints = 0, totalCredits = 0;
  for (const sem of state.semesters) {
    for (const s of sem.subjects) {
      totalPoints += s.grade * s.credits;
      totalCredits += s.credits;
    }
  }
  for (const w of whatIfList) {
    totalPoints += w.grade * w.credits;
    totalCredits += w.credits;
  }
  return totalCredits > 0 ? totalPoints / totalCredits : 0;
}

function totalCredits() {
  let c = 0;
  for (const sem of state.semesters) {
    for (const s of sem.subjects) c += s.credits;
  }
  return c;
}

function render() {
  const sem = state.semesters.find(s => s.id === state.currentSemester);
  const subjects = sem ? sem.subjects : [];

  const gpa = calcSemGpa(subjects);
  document.getElementById('gpaDisplay').textContent = gpa.toFixed(2);

  const cgpa = calcOverallCgpa();
  document.getElementById('cgpaDisplay').textContent = cgpa.toFixed(2);

  document.getElementById('creditsDisplay').textContent = totalCredits();

  const tbody = document.getElementById('subjectTable');
  if (subjects.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">No subjects added yet</td></tr>';
  } else {
    tbody.innerHTML = subjects.map((s, i) => {
      const gradeLabel = getGradeLabel(s.grade);
      const gradeClass = getGradeClass(s.grade);
      return `<tr>
        <td>${escHtml(s.name)}</td>
        <td>${s.credits}</td>
        <td><span class="grade-dot ${gradeClass}">${gradeLabel}</span></td>
        <td><button class="delete-btn" onclick="removeSubject(${state.currentSemester}, ${i})" title="Remove">\u2715</button></td>
      </tr>`;
    }).join('');
  }

  const whatTbody = document.getElementById('whatifTable');
  if (state.whatIf.length === 0) {
    whatTbody.innerHTML = '<tr><td colspan="4" class="empty-msg">No simulated semesters</td></tr>';
  } else {
    whatTbody.innerHTML = state.whatIf.map((w, i) => {
      return `<tr>
        <td>Future Semester ${i + 1}</td>
        <td>${w.credits}</td>
        <td class="sem-gpa">${w.grade.toFixed(2)}</td>
        <td><button class="delete-btn" onclick="removeWhatIf(${i})" title="Remove">\u2715</button></td>
      </tr>`;
    }).join('');
  }

  if (state.whatIfOn && state.whatIf.length > 0) {
    const projected = calcWhatIfCgpa(state.whatIf);
    document.getElementById('whatifDisplay').textContent = projected.toFixed(2);
  } else if (state.whatIfOn) {
    document.getElementById('whatifDisplay').textContent = cgpa.toFixed(2);
  }
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

render();
