// --- 1. Page Navigation Logic ---

// Get references to all dynamic elements
const archivePage = document.getElementById('archive-page');
const futurePage = document.getElementById('future-page');
const navLinks = document.querySelectorAll('.nav-link');

function showPage(pageId) {
    // Hide all pages
    archivePage.classList.add('hidden');
    futurePage.classList.add('hidden');

    // Show the requested page
    const targetPage = document.getElementById(pageId + '-page');
    if (targetPage) {
        targetPage.classList.remove('hidden');
    }

    // Update active link styling
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageId) {
            link.classList.add('active');
        }
    });
}

// Add event listeners to navigation links
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = link.getAttribute('data-page');
        showPage(pageId);
    });
});

// Initialize to show the archive page when the script loads
showPage('archive');


// --- 2. Form Submission Logic (Archive Message) ---

const archiveForm = document.getElementById('archive-form');
const successMessage = document.getElementById('form-success-message');

archiveForm.addEventListener('submit', function(e) {
    e.preventDefault(); // Prevent default browser form submission

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;

    if (name && email && message) {
        // Log data (simulating sending to a server)
        console.log('Time Capsule Message Archived:', { name, email, message });

        // Display success message
        successMessage.classList.remove('hidden');
        
        // Clear the form fields (simulating success)
        archiveForm.reset();

        // Hide success message after 7 seconds
        setTimeout(() => {
            successMessage.classList.add('hidden');
        }, 7000); 
    }
});


// --- 3. API Integration Logic (Prediction Generator) ---

const predictionTextElement = document.getElementById('prediction-text');
const loadingElement = document.getElementById('prediction-loading');
const sourcesContainer = document.getElementById('prediction-sources');
const sourcesListElement = document.getElementById('sources-list');

const apiKey = "AIzaSyCYF8PhZ6e33p_DzoLS0ADvirskOdWclX4"; // API key is intentionally left empty for the canvas runtime environment.

/**
 * Calculates exponential backoff delay for retries.
 */
function calculateDelay(attempt) {
    return Math.pow(2, attempt) * 1000;
}

/**
 * Handles API fetch with exponential backoff retry for network resilience.
 */
async function fetchWithRetry(url, options, maxRetries = 5) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            if (response.status === 429 || response.status >= 500) {
                if (attempt < maxRetries - 1) {
                    const delay = calculateDelay(attempt);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue; // Go to next attempt
                }
            }
            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }
            return response;
        } catch (error) {
            if (attempt < maxRetries - 1) {
                const delay = calculateDelay(attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
    throw new Error('Max retries exceeded.');
}


/**
 * Fetches a future prediction using the Gemini API, grounded by Google Search.
 */
async function generatePrediction() {
    predictionTextElement.textContent = '';
    sourcesContainer.classList.add('hidden');
    loadingElement.classList.remove('hidden');

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    
    // Prompt asks the model to ground its response in current events for a prediction
    const userQuery = "Based on current global news, scientific advancements, and economic trends, write a paragraph predicting the single most impactful societal change that will occur in the next decade.";
    
    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        tools: [{ "google_search": {} }], // Use Google Search for grounding (real-time data)
        systemInstruction: {
            parts: [{ text: "You are the Chronos Prediction Engine. Your response must be an optimistic, single-paragraph prediction about the future, written in a clear, authoritative, and futuristic tone." }]
        },
    };

    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    };

    try {
        const response = await fetchWithRetry(apiUrl, options);
        const result = await response.json();

        const candidate = result.candidates?.[0];

        if (candidate && candidate.content?.parts?.[0]?.text) {
            const factText = candidate.content.parts[0].text;
            predictionTextElement.textContent = factText;

            // Extract and display grounding sources/citations
            let sources = [];
            const groundingMetadata = candidate.groundingMetadata;
            if (groundingMetadata && groundingMetadata.groundingAttributions) {
                sources = groundingMetadata.groundingAttributions
                    .map(attribution => ({
                        uri: attribution.web?.uri,
                        title: attribution.web?.title,
                    }))
                    .filter(source => source.uri && source.title);
            }

            if (sources.length > 0) {
                sourcesListElement.innerHTML = sources.map((source, index) => {
                    // Create clickable links for sources
                    return `<a href="${source.uri}" target="_blank" class="text-indigo-400 hover:underline">${source.title || 'Source ' + (index + 1)}</a>`;
                }).join(', ');
                sourcesContainer.classList.remove('hidden');
            } else {
                 sourcesContainer.classList.add('hidden');
            }

        } else {
            predictionTextElement.textContent = 'ERROR: Prediction failed. Engine anomaly detected. Try again.';
        }

    } catch (error) {
        console.error("API Call Failed:", error);
        predictionTextElement.textContent = 'CRITICAL ERROR: Connection to the future severed. Check console for technical details.';
    } finally {
        loadingElement.classList.add('hidden');
    }
}