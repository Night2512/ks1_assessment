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
    const sendEmailBtn = document.getElementById('sendEmailBtn'); // Will be hidden for auto-send
    const emailStatus = document.getElementById('emailStatus');
    const submitAssessmentBtn = document.getElementById('submitAssessmentBtn'); // Assuming you've added this ID to your submit button in index.html

    // --- User Info Storage ---
    let parentName = '';
    let childName = '';
    let parentEmail = '';
    const CURRENT_KEY_STAGE = "Key Stage 1";
    let assessmentTextResults = ''; // To store plain text results for emailing
    let assessmentHtmlResults = ''; // To store HTML results for emailing

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

    // --- Initial state for submit button ---
    // The submit button for the assessment should be disabled until Turnstile is completed.
    if (submitAssessmentBtn) {
        submitAssessmentBtn.disabled = true;
    }

    // --- Callback for Cloudflare Turnstile ---
    // This function is called by the Turnstile widget when it successfully completes its challenge.
    window.turnstileCallback = function(token) {
        if (submitAssessmentBtn) {
            submitAssessmentBtn.disabled = false; // Enable the submit button
        }
    };

    // --- Error Callback for Cloudflare Turnstile ---
    // This function is called if the Turnstile widget encounters an error.
    window.turnstileErrorCallback = function() {
        if (submitAssessmentBtn) {
            submitAssessmentBtn.disabled = true; // Keep the button disabled on error
        }
        alert('Security check failed. Please refresh the page and try again.');
        // Optionally, force a reset if the Turnstile API allows it or re-render
        if (typeof turnstile !== 'undefined' && turnstile.reset) {
            turnstile.reset();
        }
    };


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

    // 2. Assessment Form Submission (Modified for Turnstile)
    assessmentForm.addEventListener('submit', async function(event) {
        event.preventDefault(); // Prevent default form submission

        // Get the Turnstile response token
        const turnstileToken = document.querySelector('[name="cf-turnstile-response"]').value;

        if (!turnstileToken) {
            alert('Please complete the security check.');
            // Optionally, reset turnstile if it's there
            if (typeof turnstile !== 'undefined' && turnstile.reset) {
                turnstile.reset();
            }
            if (submitAssessmentBtn) {
                submitAssessmentBtn.disabled = true;
            }
            return;
        }

        // Send data to Netlify function for server-side Turnstile verification
        try {
            const verificationResponse = await fetch('/.netlify/functions/verify-turnstile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ turnstileToken: turnstileToken }),
            });

            const verificationResult = await verificationResponse.json();

            if (verificationResult.success) {
                // Turnstile verification successful, proceed with assessment submission
                clearInterval(timerInterval); // Stop the timer
                submitAssessment(); // Process results
            } else {
                alert('Security check failed. Please try again.');
                console.error('Turnstile verification failed:', verificationResult.errors);
                // Reset Turnstile widget to allow user to try again
                if (typeof turnstile !== 'undefined' && turnstile.reset) {
                    turnstile.reset();
                }
                if (submitAssessmentBtn) {
                    submitAssessmentBtn.disabled = true;
                }
            }
        } catch (error) {
            console.error('Error during Turnstile verification:', error);
            alert('An error occurred during security check. Please try again.');
            if (typeof turnstile !== 'undefined' && turnstile.reset) {
                turnstile.reset();
            }
            if (submitAssessmentBtn) {
                submitAssessmentBtn.disabled = true;
            }
        }
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
                // No alert, auto-submit
                submitAssessment();
            }
        }, 1000);
    }

    function submitAssessment() {
        let totalScore = 0;
        detailedResultsDiv.innerHTML = ''; // Clear previous results
        assessmentTextResults = `--- Assessment Results for ${childName} (Parent: ${parentName}) ---\n\n`;
        assessmentHtmlResults = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; }
                    h2, h3, h4 { color: #0056b3; }
                    .question-item { margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #eee; }
                    .question-item:last-child { border-bottom: none; }
                    .score-summary { text-align: center; margin-top: 25px; padding-top: 15px; border-top: 2px solid #007bff; }
                    .correct { color: green; }
                    .incorrect { color: red; }
                    .expectation-meets { color: #28a745; font-weight: bold; }
                    .expectation-below { color: #dc3545; font-weight: bold; }
                    .expectation-above { color: #007bff; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Key Stage 1 Assessment Results</h2>
                    <p><strong>Parent Name:</strong> ${parentName}</p>
                    <p><strong>Child Name:</strong> ${childName}</p>
                    <p><strong>Parent Email:</strong> ${parentEmail}</p>
                    <hr>
                    <h3>Detailed Results:</h3>
        `; // End of assessmentHtmlResults initial string

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

            // Append detailed results to the HTML for display on page
            detailedResultsDiv.innerHTML += `
                <div class="result-item">
                    <h4>${questionTitle}</h4>
                    <p><strong>Your Answer:</strong> ${userAnswer}</p>
                    <p><strong>Correct Answer:</strong> ${correctAns}</p>
                    <p><strong>Score:</strong> ${score}/${maxPoints}</p>
                    <p><strong>Expectations:</strong> <span class="${expectationClass}">${expectationText}</span></p>
                </div>
            `;

            // Append detailed results to the plain text summary for email
            assessmentTextResults += `Question: ${questionTitle}\n`;
            assessmentTextResults += `  Your Answer: ${userAnswer}\n`;
            assessmentTextResults += `  Correct Answer: ${correctAns}\n`;
            assessmentTextResults += `  Score: ${score}/${maxPoints}\n`;
            assessmentTextResults += `  Expectations: ${expectationText}\n\n`;

            // Append detailed results to the HTML summary for email
            assessmentHtmlResults += `
                <div class="question-item">
                    <h4>${questionTitle}</h4>
                    <p><strong>Your Answer:</strong> ${userAnswer}</p>
                    <p><strong>Correct Answer:</strong> ${correctAns}</p>
                    <p><strong>Score:</strong> ${score}/${maxPoints}</p>
                    <p><strong>Expectations:</strong> <span class="${expectationClass}">${expectationText}</span></p>
                </div>
            `;
        });

        overallScoreElement.textContent = `Overall Score: ${totalScore}/15`;
        assessmentTextResults += `\nOverall Score: ${totalScore}/15\n`;

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
        assessmentTextResults += `Overall Outcome: ${overallExpectations}\n`;

        // End of assessmentHtmlResults string
        assessmentHtmlResults += `
                    <div class="score-summary">
                        <h3>Overall Score: ${totalScore}/15</h3>
                        <h3>Overall Outcome: <span class="${overallExpectationsClass}">${overallExpectations}</span></h3>
                    </div>
                    <p>If you have any questions, please reply to this email.</p>
                    <p>Best regards,<br/>[Your Organization Name or Your Name]</p>
                </div>
            </body>
            </html>
        `;

        assessmentSectionDiv.style.display = 'none'; // Hide assessment form
        resultsDiv.style.display = 'block';   // Show results

        // --- Auto-send email and hide the button ---
        sendEmailBtn.style.display = 'none'; // Hide the button
        sendAssessmentEmail(parentName, childName, parentEmail, assessmentTextResults, assessmentHtmlResults);
    }

    // --- Send Email Function (Client-side, calls Netlify Function) ---
    async function sendAssessmentEmail(parentName, childName, parentEmail, resultsText, resultsHtml) {
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
                    resultsText: resultsText, // Pass plain text results
                    resultsHtml: resultsHtml,
                    keyStage: CURRENT_KEY_STAGE  // Pass HTML results
                }),
            });

            if (response.ok) {
                emailStatus.textContent = 'Email sent successfully!';
                emailStatus.style.color = '#28a745'; // Green for success
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