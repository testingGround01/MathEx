        document.addEventListener('DOMContentLoaded', () => {
            const pages = { landing: document.getElementById('landing-page'), problem: document.getElementById('problem-page'), result: document.getElementById('result-page'), profile: document.getElementById('profile-page') };
            const additionCheckbox = document.getElementById('practice-type-addition'), squaringCheckbox = document.getElementById('practice-type-squaring'), multiplicationCheckbox = document.getElementById('practice-type-multiplication'), fractionsCheckbox = document.getElementById('practice-type-fractions'), cubesCheckbox = document.getElementById('practice-type-cubes'), squareRootCheckbox = document.getElementById('practice-type-square-root'), cubeRootCheckbox = document.getElementById('practice-type-cube-root');
            const modeSelect = document.getElementById('mode'), questionsSetting = document.getElementById('questions-setting'), timeSetting = document.getElementById('time-setting');
            const startQuizBtn = document.getElementById('start-quiz-btn'), skipBtn = document.getElementById('skip-btn'), restartBtn = document.getElementById('restart-btn');
            const questionEl = document.getElementById('question'), answerInput = document.getElementById('answer-input'), timerEl = document.getElementById('timer'), progressTextEl = document.getElementById('progress-text'), progressBar = document.getElementById('progress-bar');
            
            const infoBtn = document.getElementById('info-btn'), infoModalOverlay = document.getElementById('info-modal-overlay');
            const detailsModalOverlay = document.getElementById('details-modal-overlay');

            const navLinks = { brand: document.getElementById('nav-brand-link'), practice: document.getElementById('nav-practice'), profile: document.getElementById('nav-profile') };
            
            const profileSessionsEl = document.getElementById('profile-sessions'), profileQuestionsEl = document.getElementById('profile-questions'), profileAccuracyEl = document.getElementById('profile-accuracy'), profileStreakEl = document.getElementById('profile-streak');
            const masteryAdditionEl = document.getElementById('mastery-addition'), masterySquaringEl = document.getElementById('mastery-squaring'), masteryMultiplicationEl = document.getElementById('mastery-multiplication'), masteryFractionsEl = document.getElementById('mastery-fractions'), masteryCubesEl = document.getElementById('mastery-cubes'), masterySquareRootEl = document.getElementById('mastery-square-root'), masteryCubeRootEl = document.getElementById('mastery-cube-root');
            const sessionHistoryBody = document.getElementById('session-history-body');

            const themeToggleBtn = document.getElementById('theme-toggle');
            const filterModeEl = document.getElementById('filter-mode');
            const filterDifficultyEl = document.getElementById('filter-difficulty');
            const sessionHistoryTableHeaders = document.querySelectorAll('#session-history-table th.sortable');

            let questions = [], currentQuestionIndex = 0, results = [], timer, timeElapsed = 0, questionStartTime, gameSettings = {}, profileData, isSubmitting = false;
            let currentDifficultyIndex = 0, correctStreak = 0;
            const difficultyLevels = ['easy', 'medium', 'hard'];
            let currentSort = { column: 'date', direction: 'desc' };

            // --- THEME ---
            function setInitialTheme() {
                const savedTheme = localStorage.getItem('theme') || 'light';
                document.documentElement.setAttribute('data-theme', savedTheme);
                themeToggleBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
            }

            themeToggleBtn.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                themeToggleBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
            });

            function initializeProfileData() {
                const savedData = localStorage.getItem('mathExProfile');
                profileData = savedData ? JSON.parse(savedData) : {
                    sessionHistory: []
                };
                recalculateProfileMetrics();
            }

            function updateProfileData(sessionResults, sessionMetrics) {
                if (!profileData) {
                    initializeProfileData();
                }
                const sessionEntry = {
                    summary: {
                        date: new Date().toISOString(),
                        mode: gameSettings.mode === 'fixed_questions' ? 'Questions' : 'Time',
                        questions: sessionResults.length,
                        accuracy: sessionMetrics.accuracy + '%',
                        time: sessionMetrics.totalTime + 's',
                        difficulty: gameSettings.difficulty.charAt(0).toUpperCase() + gameSettings.difficulty.slice(1)
                    },
                    details: sessionResults,
                    metrics: sessionMetrics
                };

                profileData.sessionHistory.unshift(sessionEntry);
                if (profileData.sessionHistory.length > 50) profileData.sessionHistory.pop();
                
                recalculateProfileMetrics();
                localStorage.setItem('mathExProfile', JSON.stringify(profileData));
            }

            function recalculateProfileMetrics() {
                let sessionsCompleted = 0, totalQuestionsAnswered = 0, totalCorrectAnswers = 0, allTimeBestStreak = 0;
                let topics = { 
                    addition: { answered: 0, correct: 0 }, 
                    squaring: { answered: 0, correct: 0 }, 
                    multiplication: { answered: 0, correct: 0 },
                    fractions: { answered: 0, correct: 0 },
                    cubes: { answered: 0, correct: 0 },
                    'square-root': { answered: 0, correct: 0 },
                    'cube-root': { answered: 0, correct: 0 }
                };

                profileData.sessionHistory.forEach(session => {
                    if (session.metrics && session.details) {
                        sessionsCompleted++;
                        
                        if (session.metrics.longestStreak > allTimeBestStreak) {
                            allTimeBestStreak = session.metrics.longestStreak;
                        }

                        session.details.forEach(res => {
                            if (!res.isSkipped) {
                                totalQuestionsAnswered++;
                                const type = getQuestionType(res.question);
                                if (type && topics[type]) {
                                    topics[type].answered++;
                                    if (res.isCorrect) {
                                        totalCorrectAnswers++;
                                        topics[type].correct++;
                                    }
                                }
                            }
                        });
                    }
                });
                
                profileData.sessionsCompleted = sessionsCompleted;
                profileData.totalQuestionsAnswered = totalQuestionsAnswered;
                profileData.totalCorrectAnswers = totalCorrectAnswers;
                profileData.allTimeBestStreak = allTimeBestStreak;
                profileData.topics = topics;
            }
            
            function getQuestionType(questionText) {
                if (questionText.includes('+')) return 'addition';
                if (questionText.includes('²')) return 'squaring';
                if (questionText.includes('³√')) return 'cube-root';
                if (questionText.includes('√')) return 'square-root';
                if (questionText.includes('³')) return 'cubes';
                if (questionText.includes('x')) return 'multiplication';
                if (questionText.includes('÷')) return 'fractions';
                return null;
            }

            function animateValue(el, start, end, duration, delay = 0) {
                if (!el) return;
                setTimeout(() => {
                    if (start === end) {
                        el.innerHTML = end;
                        return;
                    }
                    let startTimestamp = null;
                    const step = (timestamp) => {
                        if (!startTimestamp) startTimestamp = timestamp;
                        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                        const currentValue = progress * (end - start) + start;
                        el.innerHTML = Math.floor(currentValue);
                        if (progress < 1) {
                            window.requestAnimationFrame(step);
                        } else {
                            el.innerHTML = end;
                        }
                    };
                    window.requestAnimationFrame(step);
                }, delay);
            }

            const line = (pointA, pointB) => {
                const lengthX = pointB[0] - pointA[0];
                const lengthY = pointB[1] - pointA[1];
                return {
                    length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
                    angle: Math.atan2(lengthY, lengthX)
                };
            };

            const controlPoint = (current, previous, next, reverse) => {
                const p = previous || current;
                const n = next || current;
                const smoothing = 0.2;
                const o = line(p, n);
                const angle = o.angle + (reverse ? Math.PI : 0);
                const length = o.length * smoothing;
                const x = current[0] + Math.cos(angle) * length;
                const y = current[1] + Math.sin(angle) * length;
                return [x, y];
            };

            const svgPath = (points, command) => {
                return points.reduce((acc, point, i, a) => 
                    i === 0 ? `M ${point[0]},${point[1]}` : `${acc} ${command(point, i, a)}`, '');
            };

            const bezierCommand = (point, i, a) => {
                const [cpsX, cpsY] = controlPoint(a[i - 1], a[i - 2], point);
                const [cpeX, cpeY] = controlPoint(point, a[i - 1], a[i + 1], true);
                return `C ${cpsX},${cpsY} ${cpeX},${cpeY} ${point[0]},${point[1]}`;
            };
            
            function displayProfileData() {
                const overallAccuracy = profileData.totalQuestionsAnswered > 0 ? parseFloat(((profileData.totalCorrectAnswers / profileData.totalQuestionsAnswered) * 100).toFixed(1)) : 0;
                
                animateValue(profileSessionsEl, 0, profileData.sessionsCompleted, 1000, 0);
                animateValue(profileQuestionsEl, 0, profileData.totalQuestionsAnswered, 1000, 150);
                animateValue(profileStreakEl, 0, profileData.allTimeBestStreak, 1000, 300);
                
                const accuracySpan = document.querySelector("#profile-accuracy");
                const currentAccuracy = parseFloat(accuracySpan.textContent) || 0;
                animateValue(accuracySpan, currentAccuracy, overallAccuracy, 1000, 450);
                if (accuracySpan.nextElementSibling) accuracySpan.nextElementSibling.innerHTML = '%';

                for (const topic in profileData.topics) {
                    const el = document.getElementById(`mastery-${topic}`);
                    if (el) {
                        const { answered, correct } = profileData.topics[topic];
                        const mastery = answered > 0 ? ((correct / answered) * 100).toFixed(0) : 0;
                        el.style.width = `${mastery}%`; 
                        el.textContent = `${mastery}%`;
                        el.style.background = 'linear-gradient(to right, #e6475d, #ecdf45, #43ffa0)';
                    }
                }

                renderPerformanceTrendChart();
                renderSessionHistoryTable();
            }
            
            function renderPerformanceTrendChart() {
                const svg = document.getElementById('performance-chart-svg');
                const accuracyPath = document.getElementById('accuracy-chart-path');
                const timePath = document.getElementById('time-chart-path');
                const grid = document.getElementById('performance-chart-grid');
                const yLabelsLeft = document.getElementById('performance-chart-y-labels-left');
                const yLabelsRight = document.getElementById('performance-chart-y-labels-right');
                const xLabels = document.getElementById('performance-chart-x-labels');
                const accuracyPointsGroup = document.getElementById('accuracy-chart-points');
                const timePointsGroup = document.getElementById('time-chart-points');
                const tooltip = document.getElementById('sparkline-tooltip');
                const header = document.getElementById('performance-chart-header');
                const placeholder = document.getElementById('performance-chart-placeholder');
                const legend = document.getElementById('performance-chart-legend');
                
                if (!svg || !accuracyPath || !timePath || !grid || !yLabelsLeft || !xLabels || !header || !placeholder || !legend) return;

                const sessions = profileData.sessionHistory.filter(s => s.metrics).slice(0, 11).reverse();
                const actualSessionCount = sessions.length;

                if (actualSessionCount < 2) {
                    svg.style.display = 'none';
                    legend.style.display = 'none';
                    placeholder.style.display = 'block';
                    header.textContent = 'Performance Trend';
                    return;
                }
                
                svg.style.display = 'block';
                legend.style.display = 'flex';
                placeholder.style.display = 'none';
                header.textContent = `Performance Over Last ${actualSessionCount} Sessions`;

                const accuracyData = sessions.map(s => parseFloat(s.summary.accuracy) || 0);
                const avgTimeData = sessions.map(s => parseFloat(s.metrics.averageTime) || 0);
                const maxAvgTime = Math.max(...avgTimeData, 1);
                const yAxisTimeMax = Math.ceil(maxAvgTime);


                const yPadding = 20;
                const xPadding = 40;
                const svgWidth = svg.parentElement.clientWidth;
                const svgHeight = 250; 
                const chartWidth = svgWidth - xPadding * 2;
                const chartHeight = svgHeight - (yPadding * 2);
                svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);

                grid.innerHTML = ''; yLabelsLeft.innerHTML = ''; yLabelsRight.innerHTML = ''; xLabels.innerHTML = ''; accuracyPointsGroup.innerHTML = ''; timePointsGroup.innerHTML = '';
                legend.innerHTML = `
                    <div class="legend-item"><div class="legend-swatch swatch-accuracy"></div><span>Accuracy</span></div>
                    <div class="legend-item"><div class="legend-swatch swatch-time"></div><span>Avg. Time (s)</span></div>`;

                // Grid Lines & Y-Axes
                for (let i = 0; i <= 4; i++) {
                    const y = yPadding + i * (chartHeight / 4);
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', xPadding); line.setAttribute('y1', y); line.setAttribute('x2', chartWidth + xPadding); line.setAttribute('y2', y);
                    grid.appendChild(line);

                    // Left Y-Axis (Accuracy)
                    const textLeft = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    textLeft.setAttribute('x', xPadding - 10); textLeft.setAttribute('y', y + 3); textLeft.setAttribute('class', 'svg-grid-label y-axis');
                    textLeft.textContent = `${100 - i * 25}%`;
                    yLabelsLeft.appendChild(textLeft);
                    
                    // Right Y-Axis (Time)
                    const textRight = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    textRight.setAttribute('x', chartWidth + xPadding + 10); textRight.setAttribute('y', y + 3); textRight.setAttribute('class', 'svg-grid-label y-axis-right');
                    textRight.textContent = `${(yAxisTimeMax - i * (yAxisTimeMax / 4)).toFixed(1)}s`;
                    yLabelsRight.appendChild(textRight);
                }
                
                // X-Axis
                const numXGridLines = Math.min(actualSessionCount, 11);
                for (let i = 0; i < numXGridLines; i++) {
                    const x = xPadding + (i / (numXGridLines - 1)) * chartWidth;
                    const sessionNumber = sessions[i] ? `S${profileData.sessionHistory.indexOf(sessions[i]) + 1}` : '';
                    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    text.setAttribute('x', x); text.setAttribute('y', chartHeight + yPadding + 15); text.setAttribute('class', 'svg-grid-label x-axis');
                    text.textContent = sessionNumber;
                    xLabels.appendChild(text);
                }

                const accuracyPoints = accuracyData.map((point, index) => {
                    const x = xPadding + (index / (accuracyData.length - 1)) * chartWidth;
                    const y = yPadding + (chartHeight - (point / 100) * chartHeight);
                    return [x, y];
                });
                 accuracyPath.setAttribute('d', svgPath(accuracyPoints, bezierCommand));

                const timePoints = avgTimeData.map((point, index) => {
                    const x = xPadding + (index / (avgTimeData.length - 1)) * chartWidth;
                    const y = yPadding + (chartHeight - (point / yAxisTimeMax) * chartHeight);
                    return [x, y];
                });
                timePath.setAttribute('d', svgPath(timePoints, bezierCommand));

                // Points & Tooltips
                sessions.forEach((session, index) => {
                    const accuracyCoords = accuracyPoints[index];
                    const timeCoords = timePoints[index];

                    const accuracyCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    accuracyCircle.setAttribute('class', 'sparkline-point primary');
                    accuracyCircle.setAttribute('cx', accuracyCoords[0]);
                    accuracyCircle.setAttribute('cy', accuracyCoords[1]);
                    accuracyCircle.setAttribute('r', '4');
                    accuracyPointsGroup.appendChild(accuracyCircle);

                    const timeCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    timeCircle.setAttribute('class', 'sparkline-point secondary');
                    timeCircle.setAttribute('cx', timeCoords[0]);
                    timeCircle.setAttribute('cy', timeCoords[1]);
                    timeCircle.setAttribute('r', '4');
                    timePointsGroup.appendChild(timeCircle);
                    
                    const hoverArea = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    const hoverWidth = (index > 0) ? (accuracyPoints[1][0] - accuracyPoints[0][0]) : 40;
                    hoverArea.setAttribute('x', accuracyCoords[0] - hoverWidth / 2);
                    hoverArea.setAttribute('y', 0);
                    hoverArea.setAttribute('width', hoverWidth);
                    hoverArea.setAttribute('height', svgHeight);
                    hoverArea.style.fill = 'transparent';
                    
                    hoverArea.addEventListener('mouseover', (e) => {
                        tooltip.innerHTML = `<b>Session ${profileData.sessionHistory.indexOf(session) + 1}</b><br>Accuracy: ${accuracyData[index]}%<br>Avg Time: ${avgTimeData[index]}s`;
                        tooltip.style.visibility = 'visible';
                        tooltip.style.opacity = '1';
                    });
                    hoverArea.addEventListener('mousemove', (e) => {
                        const rect = svg.getBoundingClientRect();
                        tooltip.style.left = `${e.clientX - rect.left - tooltip.offsetWidth / 2}px`;
                        tooltip.style.top = `${e.clientY - rect.top - tooltip.offsetHeight - 15}px`;
                    });
                    hoverArea.addEventListener('mouseout', () => {
                        tooltip.style.visibility = 'hidden';
                        tooltip.style.opacity = '0';
                    });
                    
                    timePointsGroup.appendChild(hoverArea); // Add hover area to one of the groups
                });
            }

            function applyFiltersAndSort() {
                let filteredData = [...profileData.sessionHistory];
                const modeFilter = filterModeEl.value;
                const difficultyFilter = filterDifficultyEl.value;

                if (modeFilter !== 'all') {
                    filteredData = filteredData.filter(s => s.summary.mode === modeFilter);
                }
                if (difficultyFilter !== 'all') {
                    filteredData = filteredData.filter(s => s.summary.difficulty === difficultyFilter);
                }
                
                filteredData.sort((a, b) => {
                    let valA, valB;
                    switch (currentSort.column) {
                        case 'date':
                            valA = new Date(a.summary.date);
                            valB = new Date(b.summary.date);
                            break;
                        case 'accuracy':
                        case 'time':
                        case 'questions':
                             valA = parseFloat(a.summary[currentSort.column]);
                             valB = parseFloat(b.summary[currentSort.column]);
                             break;
                        default:
                            valA = a.summary[currentSort.column];
                            valB = b.summary[currentSort.column];
                    }
                    if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
                    if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
                    return 0;
                });
                
                return filteredData;
            }

            function renderSessionHistoryTable() {
                const dataToRender = applyFiltersAndSort();
                sessionHistoryBody.innerHTML = '';
                if (dataToRender.length === 0) {
                    sessionHistoryBody.innerHTML = '<tr><td colspan="9">No sessions match the current filters.</td></tr>';
                } else {
                    dataToRender.forEach((s, index) => {
                        const row = document.createElement('tr');
                        const summaryData = s.summary;
                        const hasDetails = !!s.metrics;
                        const originalIndex = profileData.sessionHistory.indexOf(s);
                        row.innerHTML = `
                            <td>${index + 1}</td>
                            <td>${new Date(summaryData.date).toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</td>
                            <td>${summaryData.mode}</td>
                            <td>${summaryData.questions}</td>
                            <td>${summaryData.accuracy}</td>
                            <td>${summaryData.time}</td>
                            <td>${summaryData.difficulty}</td>
                            <td>
                                ${hasDetails ? `<button class="view-btn" data-index="${originalIndex}">View</button>` : `<span>-</span>`}
                            </td>
                            <td>
                                <button class="delete-btn" data-index="${originalIndex}">Delete</button>
                            </td>`;
                        sessionHistoryBody.appendChild(row);
                    });
                }

                sessionHistoryTableHeaders.forEach(th => {
                    th.classList.remove('sort-asc', 'sort-desc');
                    if(th.dataset.sort === currentSort.column) {
                        th.classList.add(`sort-${currentSort.direction}`);
                    }
                });
            }

            filterModeEl.addEventListener('change', renderSessionHistoryTable);
            filterDifficultyEl.addEventListener('change', renderSessionHistoryTable);
            sessionHistoryTableHeaders.forEach(th => {
                th.addEventListener('click', () => {
                    const sortColumn = th.dataset.sort;
                    if (currentSort.column === sortColumn) {
                        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                    } else {
                        currentSort.column = sortColumn;
                        currentSort.direction = 'desc';
                    }
                    renderSessionHistoryTable();
                });
            });

            
            function deleteSessionHistory(index) {
                profileData.sessionHistory.splice(index, 1);
                recalculateProfileMetrics(); 
                localStorage.setItem('mathExProfile', JSON.stringify(profileData));
                displayProfileData();
            }
            
            function showPage(pageKey, activeLink) {
                Object.values(pages).forEach(p => p.classList.remove('active'));
                pages[pageKey].classList.add('active');
                
                document.querySelectorAll('.nav-links a').forEach(l => {
                    l.classList.remove('active');
                    l.setAttribute('aria-selected', 'false');
                });
                if (activeLink) {
                    activeLink.classList.add('active');
                    activeLink.setAttribute('aria-selected', 'true');
                }
                 if (pageKey === 'profile') { displayProfileData(); }
            }

            function resetToLanding() { clearInterval(timer); showPage('landing', navLinks.practice); }
            function checkSelections() { startQuizBtn.disabled = !additionCheckbox.checked && !squaringCheckbox.checked && !multiplicationCheckbox.checked && !fractionsCheckbox.checked && !cubesCheckbox.checked && !squareRootCheckbox.checked && !cubeRootCheckbox.checked; }

            checkSelections();
            [additionCheckbox, squaringCheckbox, multiplicationCheckbox, fractionsCheckbox, cubesCheckbox, squareRootCheckbox, cubeRootCheckbox].forEach(cb => cb.addEventListener('change', checkSelections));
            
            modeSelect.addEventListener('change', (e) => {
                const isFixedTime = e.target.value === 'fixed_time';
                document.getElementById('questions-setting').style.display = isFixedTime ? 'none' : 'block';
                document.getElementById('time-setting').style.display = isFixedTime ? 'block' : 'none';
            });

            startQuizBtn.addEventListener('click', startGame);
            answerInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitAnswer(); });
            answerInput.addEventListener('input', autoSubmitAnswer);
            
            if (skipBtn) skipBtn.addEventListener('click', skipQuestion);
            if (restartBtn) restartBtn.addEventListener('click', resetToLanding);
            navLinks.brand.addEventListener('click', resetToLanding);
            navLinks.practice.addEventListener('click', () => showPage('landing', navLinks.practice));
            navLinks.profile.addEventListener('click', () => { showPage('profile', navLinks.profile); });
            
            sessionHistoryBody.addEventListener('click', (e) => {
                const viewBtn = e.target.closest('.view-btn');
                const deleteBtn = e.target.closest('.delete-btn');

                if (viewBtn) {
                    const indexToShow = parseInt(viewBtn.dataset.index);
                    if(profileData.sessionHistory[indexToShow]) {
                        displaySessionDetails(indexToShow);
                    }
                } else if (deleteBtn) {
                    const indexToDelete = parseInt(deleteBtn.dataset.index);
                    if (confirm('Are you sure you want to delete this session entry?')) {
                        deleteSessionHistory(indexToDelete);
                    }
                }
            });
            
            function showModal(overlay) { overlay.classList.add('visible'); }
            function hideModal(overlay) { overlay.classList.remove('visible'); }

            infoBtn.addEventListener('click', () => showModal(infoModalOverlay));
            infoModalOverlay.addEventListener('click', (e) => { if (e.target === infoModalOverlay || e.target.classList.contains('modal-close-btn')) hideModal(infoModalOverlay); });
            detailsModalOverlay.addEventListener('click', (e) => { if (e.target === detailsModalOverlay || e.target.classList.contains('modal-close-btn')) hideModal(detailsModalOverlay); });

            document.addEventListener('keydown', (e) => { 
                if (e.key === 'Escape') {
                    if(infoModalOverlay.classList.contains('visible')) hideModal(infoModalOverlay);
                    if(detailsModalOverlay.classList.contains('visible')) hideModal(detailsModalOverlay);
                }
            });

            function displaySessionDetails(index) {
                const prevBtn = document.getElementById('prev-session-btn');
                const nextBtn = document.getElementById('next-session-btn');
                const dateEl = document.getElementById('details-modal-date');

                const sessionEntry = profileData.sessionHistory[index];
                if (!sessionEntry || !sessionEntry.metrics || !sessionEntry.details) return;

                const metrics = sessionEntry.metrics;
                const details = sessionEntry.details;
                
                dateEl.textContent = new Date(sessionEntry.summary.date).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' });

                document.getElementById('details-modal-accuracy').textContent = metrics.accuracy;
                document.getElementById('details-modal-longest-streak').textContent = metrics.longestStreak;
                document.getElementById('details-modal-correct-count').textContent = metrics.correctCount;
                document.getElementById('details-modal-incorrect-count').textContent = metrics.incorrectCount;
                document.getElementById('details-modal-skipped-count').textContent = metrics.skippedCount;
                document.getElementById('details-modal-total-time').textContent = metrics.totalTime;
                document.getElementById('details-modal-average-time').textContent = metrics.averageTime;
                document.getElementById('details-modal-fastest-correct').innerHTML = metrics.fastestCorrect;
                document.getElementById('details-modal-slowest-correct').innerHTML = metrics.slowestCorrect;
                document.getElementById('details-modal-mean-correct-time').innerHTML = metrics.meanCorrectTime;

                const detailsModalBody = document.getElementById('details-modal-body');
                detailsModalBody.innerHTML = '';
                details.forEach((result, index) => {
                    let resultText, resultClass;
                    if (result.isSkipped) { resultText = 'Skipped'; resultClass = 'skipped';
                    } else if (result.isCorrect) { resultText = 'Correct'; resultClass = 'correct';
                    } else { resultText = 'Incorrect'; resultClass = 'incorrect'; }
                    const row = document.createElement('tr');
                    row.innerHTML = `<td>${index + 1}</td><td>${result.question.replace(' = ?', '')}</td><td>${result.userAnswer}</td><td>${result.correctAnswer}</td><td><span class="badge ${resultClass}">${resultText}</span></td><td>${(result.timeTaken / 1000).toFixed(1)}</td>`;
                    detailsModalBody.appendChild(row);
                });

                updatePieChart(metrics.correctCount, metrics.incorrectCount, metrics.skippedCount, 'details-modal-pie-chart-area', 'details-modal-pie-chart-tooltip');
                updateBarChart(details, 'details-modal-bar-chart-container', 'bar-chart-labels-modal');
                
                // Navigation Logic
                prevBtn.disabled = index >= profileData.sessionHistory.length - 1;
                nextBtn.disabled = index <= 0;

                prevBtn.onclick = () => displaySessionDetails(index + 1);
                nextBtn.onclick = () => displaySessionDetails(index - 1);

                showModal(detailsModalOverlay);
            }

            function startGame() {
                const practiceTypes = [];
                if (additionCheckbox.checked) practiceTypes.push('addition');
                if (squaringCheckbox.checked) practiceTypes.push('squaring');
                if (multiplicationCheckbox.checked) practiceTypes.push('multiplication');
                if (fractionsCheckbox.checked) practiceTypes.push('fractions');
                if (cubesCheckbox.checked) practiceTypes.push('cubes');
                if (squareRootCheckbox.checked) practiceTypes.push('square-root');
                if (cubeRootCheckbox.checked) practiceTypes.push('cube-root');
                if (practiceTypes.length === 0) return;
                gameSettings = { practiceTypes, difficulty: document.getElementById('difficulty').value, mode: modeSelect.value, numQuestions: parseInt(document.getElementById('num-questions').value), timeLimit: parseInt(document.getElementById('time-limit').value) };
                if (gameSettings.difficulty === 'adaptive') {
                    currentDifficultyIndex = 0;
                    correctStreak = 0;
                }
                generateQuestions();
                resetGameState();
                showPage('problem', navLinks.practice);
                displayNextQuestion();
                startTimer();
            }

            function generateQuestions() {
                if (gameSettings.difficulty === 'adaptive') {
                    questions = [];
                    return;
                }
                let combinedQuestions = [];
                if (gameSettings.practiceTypes.includes('addition')) combinedQuestions.push(...generateAdditionQuestions(gameSettings.difficulty));
                if (gameSettings.practiceTypes.includes('squaring')) combinedQuestions.push(...generateSquaringQuestions(gameSettings.difficulty));
                if (gameSettings.practiceTypes.includes('multiplication')) combinedQuestions.push(...generateMultiplicationQuestions(gameSettings.difficulty));
                if (gameSettings.practiceTypes.includes('fractions')) combinedQuestions.push(...generateFractionQuestions(gameSettings.difficulty));
                if (gameSettings.practiceTypes.includes('cubes')) combinedQuestions.push(...generateCubeQuestions(gameSettings.difficulty));
                if (gameSettings.practiceTypes.includes('square-root')) combinedQuestions.push(...generateSquareRootQuestions(gameSettings.difficulty));
                if (gameSettings.practiceTypes.includes('cube-root')) combinedQuestions.push(...generateCubeRootQuestions(gameSettings.difficulty));

                combinedQuestions.sort(() => 0.5 - Math.random());
                questions = (gameSettings.mode === 'fixed_questions') ? combinedQuestions.slice(0, gameSettings.numQuestions) : combinedQuestions;
            }

            function generateAdditionQuestions(diff = gameSettings.difficulty) {
                const ranges = { easy: { r1: [10, 99], r2: [10, 99] }, medium: { r1: [10, 99], r2: [100, 999] }, hard: { r1: [100, 999], r2: [100, 999] } };
                const { r1, r2 } = ranges[diff];
                const getRandom = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
                let addQuestions = [], limit = (gameSettings.mode === 'fixed_questions') ? gameSettings.numQuestions : 50;
                for (let i = 0; i < limit; i++) {
                    let num1 = getRandom(r1[0], r1[1]), num2 = getRandom(r2[0], r2[1]);
                    if (diff === 'medium' && Math.random() > 0.5) [num1, num2] = [num2, num1];
                    addQuestions.push({ text: `${num1} + ${num2} = ?`, correctAnswer: num1 + num2, isDecimal: false });
                }
                return addQuestions;
            }
            
            function generateSquaringQuestions(diff = gameSettings.difficulty) {
                const ranges = { easy: { min: 2, max: 20 }, medium: { min: 21, max: 40 }, hard: { min: 41, max: 70 } };
                const { min, max } = ranges[diff];
                return Array.from({length: max - min + 1}, (_, i) => i + min).map(num => ({ text: `${num}² = ?`, correctAnswer: num * num, isDecimal: false }));
            }

            function generateCubeQuestions(diff = gameSettings.difficulty) {
                const ranges = { easy: { min: 1, max: 10 }, medium: { min: 11, max: 20 }, hard: { min: 21, max: 30 } };
                const { min, max } = ranges[diff];
                return Array.from({length: max - min + 1}, (_, i) => i + min).map(num => ({ text: `${num}³ = ?`, correctAnswer: num * num * num, isDecimal: false }));
            }

            function generateSquareRootQuestions(diff = gameSettings.difficulty) {
                const ranges = { easy: { min: 2, max: 20 }, medium: { min: 21, max: 40 }, hard: { min: 41, max: 70 } };
                const { min, max } = ranges[diff];
                return Array.from({length: max - min + 1}, (_, i) => i + min).map(num => ({ text: `√${num * num} = ?`, correctAnswer: num, isDecimal: false }));
            }

            function generateCubeRootQuestions(diff = gameSettings.difficulty) {
                const ranges = { easy: { min: 1, max: 10 }, medium: { min: 11, max: 20 }, hard: { min: 21, max: 30 } };
                const { min, max } = ranges[diff];
                return Array.from({length: max - min + 1}, (_, i) => i + min).map(num => ({ text: `³√${num * num * num} = ?`, correctAnswer: num, isDecimal: false }));
            }


            function generateMultiplicationQuestions(diff = gameSettings.difficulty) {
                const ranges = { easy: { r1: [2, 10], r2: [2, 12] }, medium: { r1: [2, 12], r2: [11, 30] }, hard: { r1: [11, 30], r2: [11, 40] } };
                const { r1, r2 } = ranges[diff];
                const getRandom = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
                let generatedPairs = new Set(), multQuestions = [], limit = (gameSettings.mode === 'fixed_questions') ? gameSettings.numQuestions : 100;
                while (multQuestions.length < limit) {
                    let num1 = getRandom(r1[0], r1[1]), num2 = getRandom(r2[0], r2[1]), pairKey = [num1, num2].sort().join(',');
                    if (!generatedPairs.has(pairKey)) { generatedPairs.add(pairKey); multQuestions.push({ text: `${num1} x ${num2} = ?`, correctAnswer: num1 * num2, isDecimal: false }); }
                }
                return multQuestions;
            }

            function generateFractionQuestions(diff = gameSettings.difficulty) {
                const getRandom = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
                const limit = (gameSettings.mode === 'fixed_questions') ? gameSettings.numQuestions : 50;
                let fractionQuestions = [];

                const easyDenominators = Array.from({length: 11}, (_, i) => i + 2); // 2 to 12
                const mediumDenominators = Array.from({length: 8}, (_, i) => i + 13); // 13 to 20
                
                let denominators = [];
                if (diff === 'easy') {
                    denominators = easyDenominators;
                } else if (diff === 'medium') {
                    denominators = mediumDenominators;
                } else { // hard
                    denominators = [...easyDenominators, ...mediumDenominators];
                }

                for (let i = 0; i < limit; i++) {
                    const denominator = denominators[getRandom(0, denominators.length - 1)];
                    let numerator = 1;

                    if (diff === 'hard') {
                        numerator = getRandom(2, 10);
                    }
                    
                    const correctAnswer = parseFloat((numerator / denominator).toFixed(3));
                    fractionQuestions.push({ 
                        text: `${numerator} ÷ ${denominator} = ?`, 
                        correctAnswer: correctAnswer,
                        isDecimal: true 
                    });
                }
                return fractionQuestions;
            }

            // --- Single Question Generators for Adaptive Mode ---
            function createAdditionQuestion(diff) { return generateAdditionQuestions(diff)[0]; }
            function createSquaringQuestion(diff) {
                const list = generateSquaringQuestions(diff);
                return list[Math.floor(Math.random() * list.length)];
            }
            function createCubeQuestion(diff) {
                const list = generateCubeQuestions(diff);
                return list[Math.floor(Math.random() * list.length)];
            }
            function createSquareRootQuestion(diff) {
                const list = generateSquareRootQuestions(diff);
                return list[Math.floor(Math.random() * list.length)];
            }
            function createCubeRootQuestion(diff) {
                const list = generateCubeRootQuestions(diff);
                return list[Math.floor(Math.random() * list.length)];
            }
            function createMultiplicationQuestion(diff) { return generateMultiplicationQuestions(diff)[0]; }
            function createFractionQuestion(diff) { return generateFractionQuestions(diff)[0]; }

            function getAdaptiveQuestion() {
                const diff = difficultyLevels[currentDifficultyIndex];
                const types = gameSettings.practiceTypes;
                const choice = types[Math.floor(Math.random() * types.length)];
                switch (choice) {
                    case 'addition': return createAdditionQuestion(diff);
                    case 'squaring': return createSquaringQuestion(diff);
                    case 'multiplication': return createMultiplicationQuestion(diff);
                    case 'fractions': return createFractionQuestion(diff);
                    case 'cubes': return createCubeQuestion(diff);
                    case 'square-root': return createSquareRootQuestion(diff);
                    case 'cube-root': return createCubeRootQuestion(diff);
                }
            }

            function resetGameState() {
                currentQuestionIndex = 0; results = []; timeElapsed = 0; isSubmitting = false;
                answerInput.value = '';
                document.getElementById('results-body').innerHTML = ''; 
                document.getElementById('bar-chart-container').innerHTML = ''; 
                document.getElementById('progress-bar').style.width = '0%';
                document.getElementById('timer').style.color = 'var(--text-light)'; 
                clearInterval(timer);
            }
            
            function startTimer() {
                const startTime = Date.now();
                timer = setInterval(() => {
                    timeElapsed = Math.floor((Date.now() - startTime) / 1000);
                    if (gameSettings.mode === 'fixed_time') {
                        const timeLeft = gameSettings.timeLimit - timeElapsed;
                        timerEl.textContent = `Time Left: ${timeLeft}s`;
                        if (timeLeft <= 5) timerEl.style.color = 'var(--danger-color)';
                        if (timeLeft <= 0) endGame();
                    } else { timerEl.textContent = `Time: ${timeElapsed}s`; }
                }, 1000);
            }

            function displayNextQuestion() {
                const isFixedQuestionsEnd = gameSettings.mode === 'fixed_questions' && currentQuestionIndex >= gameSettings.numQuestions;
                if (isFixedQuestionsEnd) { endGame(); return; }

                let currentQuestion;
                if (gameSettings.difficulty === 'adaptive') {
                    currentQuestion = getAdaptiveQuestion();
                    questions.push(currentQuestion);
                } else {
                    const isOutOfQuestions = currentQuestionIndex >= questions.length;
                    if (isOutOfQuestions) { endGame(); return; }
                    currentQuestion = questions[currentQuestionIndex];
                }
                questionEl.textContent = currentQuestion.text;
                
                if (currentQuestion.isDecimal) {
                    answerInput.type = 'text';
                    answerInput.inputMode = 'decimal';
                    answerInput.placeholder = 'e.g., 0.123';
                } else {
                    answerInput.type = 'number';
                    answerInput.inputMode = 'numeric';
                    answerInput.placeholder = 'Your Answer';
                }

                answerInput.disabled = false;
                answerInput.focus();
                let progressPercent = 0;
                if (gameSettings.mode === 'fixed_questions') {
                    progressTextEl.textContent = `Question ${currentQuestionIndex + 1} of ${gameSettings.numQuestions}`;
                    progressPercent = (currentQuestionIndex / gameSettings.numQuestions) * 100;
                } else { progressTextEl.textContent = `Question ${currentQuestionIndex + 1}`; }
                progressBar.style.width = `${progressPercent}%`;
                questionStartTime = Date.now();
            }
            
            function processAnswer(userAnswer) {
                if (isSubmitting) return;
                isSubmitting = true;
                answerInput.disabled = true;

                const timeForQuestion = Date.now() - questionStartTime;
                const currentQuestion = questions[currentQuestionIndex];
                
                let isCorrect = false;
                if (userAnswer !== 'Skipped') {
                    const numericUserAnswer = parseFloat(userAnswer);
                    if (!isNaN(numericUserAnswer)) {
                        isCorrect = numericUserAnswer === currentQuestion.correctAnswer;
                    }
                }

                results.push({
                    question: currentQuestion.text,
                    userAnswer,
                    correctAnswer: currentQuestion.correctAnswer,
                    isCorrect: isCorrect,
                    isSkipped: userAnswer === 'Skipped',
                    timeTaken: timeForQuestion
                });

                if (gameSettings.difficulty === 'adaptive') {
                    if (isCorrect) {
                        correctStreak++;
                        if (correctStreak >= 2 && currentDifficultyIndex < difficultyLevels.length - 1) {
                            currentDifficultyIndex++;
                            correctStreak = 0;
                        }
                    } else {
                        correctStreak = 0;
                        if (currentDifficultyIndex > 0) currentDifficultyIndex--;
                    }
                }
                
                if (isCorrect) {
                     answerInput.classList.add('correct-flash');
                }

                setTimeout(() => {
                    if (isCorrect) answerInput.classList.remove('correct-flash');
                    currentQuestionIndex++; 
                    answerInput.value = ''; 
                    displayNextQuestion();
                    isSubmitting = false;
                }, 400);
            }

            function autoSubmitAnswer() {
                if (isSubmitting || currentQuestionIndex >= questions.length) return;

                const currentQuestion = questions[currentQuestionIndex];
                const userAnswer = answerInput.value;
                const numericUserAnswer = parseFloat(userAnswer);
                
                if (userAnswer !== '' && !isNaN(numericUserAnswer) && numericUserAnswer === currentQuestion.correctAnswer) {
                    processAnswer(userAnswer);
                }
            }


            function submitAnswer() { if (answerInput.value.trim() !== '') processAnswer(answerInput.value.trim()); }
            function skipQuestion() { processAnswer('Skipped'); }
            
            function endGame() { 
                clearInterval(timer); 
                const sessionMetrics = displayResults(); 
                updateProfileData(results, sessionMetrics); 
                showPage('result', navLinks.practice); 
            }

            function displayResults() {
                const resultsBody = document.getElementById('results-body');
                let correctCount = 0, skippedCount = 0, longestStreak = 0, currentStreak = 0, totalTimeForQuestions = 0;
                resultsBody.innerHTML = '';
                results.forEach((result, index) => {
                    totalTimeForQuestions += result.timeTaken;
                    let resultText, resultClass;
                    if (result.isSkipped) { skippedCount++; if (currentStreak > longestStreak) longestStreak = currentStreak; currentStreak = 0; resultText = 'Skipped'; resultClass = 'skipped';
                    } else if (result.isCorrect) { correctCount++; currentStreak++; resultText = 'Correct'; resultClass = 'correct';
                    } else { if (currentStreak > longestStreak) longestStreak = currentStreak; currentStreak = 0; resultText = 'Incorrect'; resultClass = 'incorrect'; }
                    const row = document.createElement('tr');
                    row.innerHTML = `<td>${index + 1}</td><td>${result.question.replace(' = ?', '')}</td><td>${result.userAnswer}</td><td>${result.correctAnswer}</td><td><span class="badge ${resultClass}">${resultText}</span></td><td>${(result.timeTaken / 1000).toFixed(1)}</td>`;
                    resultsBody.appendChild(row);
                });
                if (currentStreak > longestStreak) longestStreak = currentStreak;
                
                const totalAnswered = results.length;
                const incorrectCount = totalAnswered - correctCount - skippedCount;
                const attempted = totalAnswered - skippedCount;
                const accuracy = attempted > 0 ? ((correctCount / attempted) * 100).toFixed(1) : 0;
                
                const correctAnswers = results.filter(r => r.isCorrect);
                const numCorrect = correctAnswers.length;
                const totalQuizTime = gameSettings.mode === 'fixed_time' ? gameSettings.timeLimit : timeElapsed;
                const averageTime = totalAnswered > 0 ? (totalTimeForQuestions / totalAnswered / 1000).toFixed(1) : 0;

                let fastestCorrect = 'N/A', slowestCorrect = 'N/A', meanCorrectTime = 'N/A';

                if (numCorrect > 0) {
                    const correctTimes = correctAnswers.map(r => r.timeTaken);
                    fastestCorrect = `${(Math.min(...correctTimes) / 1000).toFixed(1)}<span class="unit"> s</span>`;
                    slowestCorrect = `${(Math.max(...correctTimes) / 1000).toFixed(1)}<span class="unit"> s</span>`;
                    const avgCorrectTime = correctTimes.reduce((a, b) => a + b, 0) / numCorrect;
                    meanCorrectTime = `${(avgCorrectTime / 1000).toFixed(1)}<span class="unit"> s</span>`;
                }

                document.getElementById('accuracy').textContent = accuracy;
                document.getElementById('correct-count').textContent = correctCount;
                document.getElementById('incorrect-count').textContent = incorrectCount;
                document.getElementById('skipped-count').textContent = skippedCount;
                document.getElementById('longest-streak').textContent = longestStreak;
                document.getElementById('total-time').textContent = totalQuizTime;
                document.getElementById('average-time').textContent = averageTime;
                document.getElementById('fastest-correct').innerHTML = fastestCorrect;
                document.getElementById('slowest-correct').innerHTML = slowestCorrect;
                document.getElementById('mean-correct-time').innerHTML = meanCorrectTime;
                
                updatePieChart(correctCount, incorrectCount, skippedCount, 'pie-chart-area', 'pie-chart-tooltip');
                updateBarChart(results, 'bar-chart-container', 'bar-chart-labels-main');
                
                return {
                    accuracy, correctCount, incorrectCount, skippedCount, longestStreak,
                    totalTime: totalQuizTime, averageTime, fastestCorrect, slowestCorrect, meanCorrectTime
                };
            }

            function updatePieChart(correct, incorrect, skipped, containerId, tooltipId) {
                const container = document.getElementById(containerId);
                const tooltip = document.getElementById(tooltipId);
                if (!container || !tooltip) return;
                
                container.innerHTML = ''; // Clear previous chart
                const total = correct + incorrect + skipped;
                if (total === 0) {
                    container.innerHTML = '<svg class="pie-chart-svg" viewBox="0 0 100 100" style="width:150px; height:150px;"><circle cx="50" cy="50" r="50" fill="var(--border-color)"/></svg>';
                    return;
                }

                const data = [
                    { label: 'Correct', value: correct, color: 'var(--success-color)' },
                    { label: 'Incorrect', value: incorrect, color: 'var(--danger-color)' },
                    { label: 'Skipped', value: skipped, color: 'var(--warning-color)' },
                ];
                
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('class', 'pie-chart-svg');
                svg.setAttribute('viewBox', '0 0 100 100');
                svg.style.width = '150px';
                svg.style.height = '150px';
                
                let cumulativePercent = 0;
                const radius = 50;
                const cx = 50, cy = 50;

                data.forEach(slice => {
                    if (slice.value === 0) return;
                    
                    const percent = (slice.value / total);
                    const angleStart = cumulativePercent * 360;
                    const angleEnd = (cumulativePercent + percent) * 360;
                    cumulativePercent += percent;

                    const x1 = cx + radius * Math.cos(Math.PI * (angleStart - 90) / 180);
                    const y1 = cy + radius * Math.sin(Math.PI * (angleStart - 90) / 180);
                    const x2 = cx + radius * Math.cos(Math.PI * (angleEnd - 90) / 180);
                    const y2 = cy + radius * Math.sin(Math.PI * (angleEnd - 90) / 180);
                    const largeArcFlag = (angleEnd - angleStart) > 180 ? 1 : 0;
                    
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    const d = `M ${cx},${cy} L ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z`;
                    path.setAttribute('d', d);
                    path.setAttribute('fill', slice.color);
                    path.setAttribute('class', 'slice');
                    
                    path.addEventListener('mouseover', (e) => {
                        tooltip.innerHTML = `${slice.label}: ${slice.value}`;
                        tooltip.style.visibility = 'visible';
                        tooltip.style.opacity = '1';
                    });
                     path.addEventListener('mousemove', (e) => {
                        const rect = container.getBoundingClientRect();
                        tooltip.style.left = `${e.clientX - rect.left - tooltip.offsetWidth / 2}px`;
                        tooltip.style.top = `${e.clientY - rect.top - tooltip.offsetHeight - 10}px`;
                    });
                    path.addEventListener('mouseout', () => {
                        tooltip.style.visibility = 'hidden';
                        tooltip.style.opacity = '0';
                    });
                    svg.appendChild(path);
                });
                container.appendChild(svg);
                container.appendChild(tooltip); // Ensure tooltip is a sibling for positioning
            }
            
            function updateBarChart(resultsData, containerId, yAxisLabelsId) {
                const barContainer = document.getElementById(containerId);
                const yAxisLabelsContainer = document.getElementById(yAxisLabelsId);
                barContainer.innerHTML = '';
                if (yAxisLabelsContainer) yAxisLabelsContainer.innerHTML = '';
                if (resultsData.length === 0) return;

                const maxPixelHeight = 280;
                const maxTime = Math.max(...resultsData.map(r => r.timeTaken), 1) / 1000;
                const yAxisMax = Math.ceil(maxTime / 0.5) * 0.5;
                
                if (yAxisLabelsContainer) {
                    for(let i = 4; i >= 0; i--) {
                        const label = document.createElement('div');
                        const value = (yAxisMax / 4 * i).toFixed(1);
                        label.textContent = `${value}s`;
                        yAxisLabelsContainer.appendChild(label);
                    }
                }

                resultsData.forEach((result, index) => {
                    const barHeight = Math.max(5, (result.timeTaken / 1000 / yAxisMax) * maxPixelHeight);
                    const timeInSeconds = (result.timeTaken / 1000).toFixed(1);
                    let barClass = result.isSkipped ? 'bar-skipped' : (result.isCorrect ? 'bar-correct' : 'bar-incorrect');
                    const barWrapper = document.createElement('div'); barWrapper.className = 'bar-wrapper';
                    const bar = document.createElement('div'); bar.className = `bar ${barClass}`; bar.style.height = `${barHeight}px`;
                    const tooltip = document.createElement('span'); tooltip.className = 'tooltip'; tooltip.textContent = `${timeInSeconds}s`;
                    const label = document.createElement('div'); label.className = 'bar-label'; label.textContent = index + 1;
                    bar.appendChild(tooltip); barWrapper.appendChild(bar); barWrapper.appendChild(label); barContainer.appendChild(barWrapper);
                });
            }
            
            setInitialTheme();
            initializeProfileData();
        });
