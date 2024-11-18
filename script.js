  // State-district mapping (same as in React version)
  const stateDistrictMap = {
    'Andhra Pradesh': ['Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Krishna', 'Kurnool', 'Prakasam', 'Srikakulam', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa'],
    // ... (add all other states and districts as in the React version)
};

// Initialize form elements
const form = document.getElementById('cropForm');
const stateSelect = form.querySelector('[name="state"]');
const districtSelect = form.querySelector('[name="district"]');
const submitButton = form.querySelector('button[type="submit"]');
const recommendationsDiv = document.getElementById('recommendations');
const errorDiv = document.getElementById('error');

// Populate state dropdown
Object.keys(stateDistrictMap).forEach(state => {
    const option = document.createElement('option');
    option.value = state;
    option.textContent = state;
    stateSelect.appendChild(option);
});

// Handle state selection
stateSelect.addEventListener('change', (e) => {
    const districts = stateDistrictMap[e.target.value] || [];
    districtSelect.innerHTML = '<option value="">Select district</option>';
    districts.forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        districtSelect.appendChild(option);
    });
    districtSelect.disabled = !e.target.value;
});

// Trigger confetti
function triggerConfetti() {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
    });
}

// Handle form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitButton.disabled = true;
    submitButton.innerHTML = `
        <div class="loading">
            <svg class="spinner" width="20" height="20" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Getting Recommendations...
        </div>
    `;
    recommendationsDiv.style.display = 'none';
    errorDiv.style.display = 'none';

    try {
        const formData = Object.fromEntries(new FormData(form));
        
        // Construct the AI prompt
        const prompt = `Based on these farming conditions:
        {
            "location": {
                "state": "${formData.state}",
                "district": "${formData.district}",
                "season": "${formData.season}"
            },
            "conditions": {
                "water": "${formData.waterAvailability}",
                "soil": "${formData.soilType}",
                "rainfall": "${formData.rainfall}",
                "temperature": "${formData.temperature}",
                "previousCrop": "${formData.previousCrop}"
            }
        }

        Based on these conditions, recommend TOP 4 SUITABLE crops. Return ONLY a valid JSON response in exactly this format, with no additional text or markdown:
        {
            "recommendations": [
                {
                    "crop": "English Name (తెలుగు పేరు)" EXAMPLE: sunflower (పొద్దుతిరుగుడు పువ్వు),,
                    "suitability": "Percentage match in english"
                }
            ]
        }

        IMPORTANT:
        1. Crop name format MUST be like these examples:
           - Red Gram (కందిపప్పు)
           - Sunflower (పొద్దుతిరుగుడు పువ్వు)
           - Cotton (పత్తి)
        2. Recommand the top & most accurate suitable crops
        3. Return exactly 4 recommendations`;
        

        // Make request to Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyDQOfndlSBt50Fo-ULVzGufmM_ucLhSgng`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        
        // Safe parsing of the AI response
        let aiResponse;
        try {
            const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!responseText) {
                throw new Error('Invalid API response format');
            }
            
            // Clean the response text before parsing
            const cleanedResponse = responseText
                .replace(/```json/g, '')  // Remove JSON code block markers
                .replace(/```/g, '')      // Remove any remaining code block markers
                .replace(/\n/g, '')       // Remove newlines
                .trim();                  // Remove extra whitespace
            
            // Try to find valid JSON in the response
            const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                aiResponse = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No valid JSON found in response');
            }
            
            // Validate the response structure
            if (!aiResponse.recommendations || !Array.isArray(aiResponse.recommendations)) {
                throw new Error('Invalid recommendations format');
            }
        } catch (parseError) {
            console.error('Failed to parse AI response:', parseError);
            console.log('Raw response:', data.candidates?.[0]?.content?.parts?.[0]?.text);
            throw new Error('Failed to parse AI recommendations');
        }
        
        if (aiResponse?.recommendations?.length) {
            recommendationsDiv.innerHTML = `
                <div class="recommendations">
                    <h3 class="recommendations-title">🌱 Recommended Crops 🌾</h3>
                    <div class="recommendations-grid">
                        ${aiResponse.recommendations.map((rec, index) => `
                            <div class="recommendation-card" onclick="triggerConfetti()">
                                <div class="recommendation-content">
                                    <span class="recommendation-number">${index + 1}</span>
                                    <div>
                                        <p class="crop-name">${rec.crop}</p>
                                        <p class="suitability">Suitability: ${rec.suitability}</p>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            recommendationsDiv.style.display = 'block';
        } else {
            throw new Error('No recommendations received');
        }
    } catch (error) {
        console.error('Error:', error);
        errorDiv.innerHTML = `
            <div class="error">
                <h3 class="error-title">❌ Error ❌</h3>
                <p class="error-message">Failed to get recommendations. Please try again.</p>
            </div>
        `;
        errorDiv.style.display = 'block';
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Get Recommendations';
    }
});