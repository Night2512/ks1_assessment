document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const infoCollectionDiv = document.getElementById('infoCollection');
    const infoForm = document.getElementById('infoForm');
    const assessmentSectionDiv = document.getElementById('assessmentSection');
    const assessmentForm = document.getElementById('assessmentForm');
    const resultsDiv = document.getElementById('results');
    const detailedResultsDiv = document.getElementById('detailedResults');
    const overallScoreElement = document.getElementById('overallScore');
    const overallExpectationsElement = document.getElementById('overallExpectations');
    const timerDisplay = document.getElementById('time');
    const sendEmailBtn = document.getElementById('sendEmailBtn');
    const emailStatus = document.getElementById('emailStatus');

    // --- User Info Storage ---
    let parentName = '';
    let childName = '';
    let parentEmail = '';
    let assessmentSummary = ''; // To store results for emailing

    // --- Timer Variables ---
    const totalTime = 15 * 60; // 15 minutes in seconds
    let timeLeft = totalTime;
    let timerInterval;

    // --- Assessment Data ---
    const correctAnswers = {
        // English
        q1: 'b', // Snowdrop
        q2: 'c', // White
        q3: 'cats',  // Plural of cat (case-insensitive in check)
        q4: 'dog',   // Spelling (case-insensitive in check)
        q5: 'Buster loves to run in the park.', // Sentence construction (case-sensitive for Above)

        // Maths
        q6: 'b', // 13 apples
        q7: 12,   // 7 + 5
        q8: 7,    // 10 - 3
        q9: 5,    // 5 + 5 = 10
        q10: 'b', // 3 o'clock
        q11: 10,  // 6 + 4
        q12: 'c'  // 1/4
    };

    const questionPoints = {
        q1: 1, q2: 1, q3: 1, q4: 1, q5: 3, // English (1+1+1+1+3 = 7 points)
        q6: 1, q7: 1, q8: 1, q9: 1, q10: 1, q11: 2, q12: 1  // Maths (1+1+1+1+1+2+1 = 8 points)
    };
    // Total possible score is 7 + 8 = 15 points.

    // --- Event Listeners ---

    // 1. Info Form Submission (Start Assessment)
    infoForm.addEventListener('submit', function(event) {
        event.preventDefault();

        // Get user input
        parentName = document.getElementById('parentName').value.trim();
        childName = document.getElementById('childName').value.trim();
        parentEmail = document.getElementById('parentEmail').value.trim();

        if (parentName && childName && parentEmail) {
            infoCollectionDiv.style.display = 'none'; // Hide info form
            assessmentSectionDiv.style.display = 'block'; // Show assessment
            startTimer(); // Start the timer ONLY when the assessment begins
        } else {
            alert('Please fill in all required information.');
        }
    });

    // 2. Assessment Form Submission
    assessmentForm.addEventListener('submit', function(event) {
        event.preventDefault();
        clearInterval(timerInterval); // Stop the timer
        submitAssessment(); // Process results
    });

    // 3. Send Email Button Click
    sendEmailBtn.addEventListener('click', function() {
        sendAssessmentEmail(parentName, childName, parentEmail, assessmentSummary);
    });

    // --- Functions ---

    function startTimer() {
        timerInterval = setInterval(() => {
            timeLeft--;
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                alert("Time's up! Submitting your assessment.");
                submitAssessment();
            }
        }, 1000);
    }

    function submitAssessment() {
        let totalScore = 0;
        detailedResultsDiv.innerHTML = ''; // Clear previous results
        assessmentSummary = `--- Assessment Results for ${childName} (Parent: ${parentName}) ---\n\n`;

        const questions = [
            'q1', 'q2', 'q3', 'q4', 'q5',
            'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12'
        ];

        questions.forEach(qId => {
            let userAnswer;
            let isCorrect = false;
            let score = 0;
            const correctAns = correctAnswers[qId];
            const maxPoints = questionPoints[qId];
            let expectationText = '';
            let expectationClass = '';

            const qElement = document.getElementById(qId);
            const questionTitle = qElement ? qElement.querySelector('h3').textContent : `Question ${qId.toUpperCase()}`;

            // Handle different input types
            if (['q1', 'q2', 'q6', 'q10', 'q12'].includes(qId)) { // Radio buttons
                const selectedRadio = document.querySelector(`input[name="${qId}_answer"]:checked`);
                userAnswer = selectedRadio ? selectedRadio.value : 'No Answer';
                isCorrect = (userAnswer === correctAns);
            } else if (['q3', 'q4', 'q5'].includes(qId)) { // Text inputs
                userAnswer = document.querySelector(`input[name="${qId}_answer"]`).value.trim();
                // For text answers, make comparison case-insensitive
                isCorrect = (userAnswer.toLowerCase() === String(correctAns).toLowerCase());
            } else if (['q7', 'q8', 'q9', 'q11'].includes(qId)) { // Number inputs
                userAnswer = parseInt(document.querySelector(`input[name="${qId}_answer"]`).value, 10);
                isCorrect = (userAnswer === correctAns);
            }

            if (isCorrect) {
                score = maxPoints;
                totalScore += score;
                expectationText = 'Meets Expectations';
                expectationClass = 'expectation-meets';
                // Specific "Above Expectations" logic for Sentence Construction (q5)
                if (qId === 'q5' && userAnswer === correctAns) { // Case-sensitive check for q5's "Above Expectations"
                    expectationText = 'Above Expectations';
                    expectationClass = 'expectation-above';
                }
            } else {
                score = 0;
                expectationText = 'Below Expectations';
                expectationClass = 'expectation-below';
            }

            // Append detailed results to the HTML
            detailedResultsDiv.innerHTML += `
                <div class="result-item">
                    <h4>${questionTitle}</h4>
                    <p><strong>Your Answer:</strong> ${userAnswer}</p>
                    <p><strong>Correct Answer:</strong> ${correctAns}</p>
                    <p><strong>Score:</strong> ${score}/${maxPoints}</p>
                    <p><strong>Expectations:</strong> <span class="${expectationClass}">${expectationText}</span></p>
                </div>
            `;

            // Append detailed results to the assessmentSummary string for email
            assessmentSummary += `Question: ${questionTitle}\n`;
            assessmentSummary += `  Your Answer: ${userAnswer}\n`;
            assessmentSummary += `  Correct Answer: ${correctAns}\n`;
            assessmentSummary += `  Score: ${score}/${maxPoints}\n`;
            assessmentSummary += `  Expectations: ${expectationText}\n\n`;
        });

        overallScoreElement.textContent = `Overall Score: ${totalScore}/15`;
        assessmentSummary += `\nOverall Score: ${totalScore}/15\n`;

        let overallExpectations = '';
        let overallExpectationsClass = '';
        if (totalScore >= 13) {
            overallExpectations = 'Above Expectations (Excellent understanding)';
            overallExpectationsClass = 'expectation-above';
        } else if (totalScore >= 9) {
            overallExpectations = 'Meets Expectations (Good understanding)';
            overallExpectationsClass = 'expectation-meets';
        } else {
            overallExpectations = 'Below Expectations (Needs more support)';
            overallExpectationsClass = 'expectation-below';
        }
        overallExpectationsElement.innerHTML = `Overall Outcome: <span class="${overallExpectationsClass}">${overallExpectations}</span>`;
        assessmentSummary += `Overall Outcome: ${overallExpectations}\n`;


        assessmentSectionDiv.style.display = 'none'; // Hide assessment form
        resultsDiv.style.display = 'block';   // Show results
        sendEmailBtn.style.display = 'block'; // Show the send email button
    }

    // --- Send Email Function (Client-side, calls Netlify Function) ---
    async function sendAssessmentEmail(parentName, childName, parentEmail, assessmentResults) {
        emailStatus.textContent = 'Sending email...';
        emailStatus.style.color = '#007bff'; // Blue for sending

        try {
            const response = await fetch('/.netlify/functions/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    parentName: parentName,
                    childName: childName,
                    parentEmail: parentEmail,
                    results: assessmentResults
                }),
            });

            if (response.ok) {
                emailStatus.textContent = 'Email sent successfully!';
                emailStatus.style.color = '#28a745'; // Green for success
                sendEmailBtn.disabled = true; // Disable button after successful send
            } else {
                const errorData = await response.json();
                console.error('Error sending email:', errorData.message);
                emailStatus.textContent = `Failed to send email: ${errorData.message || 'Server error'}`;
                emailStatus.style.color = '#dc3545'; // Red for error
            }
        } catch (error) {
            console.error('Network or unexpected error:', error);
            emailStatus.textContent = `Failed to send email: Network error`;
            emailStatus.style.color = '#dc3545'; // Red for error
        }
    }
});