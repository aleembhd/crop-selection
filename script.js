window.addEventListener('popstate', function(event) {
    window.location.href = 'https://farmai-97ff8.web.app/';
});
// State-district mapping (same as in React version)
const stateDistrictMap = {
    'Andhra Pradesh': ['Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Krishna', 'Kurnool', 'Prakasam', 'Srikakulam', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa'],
    'Telangana': ['Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagtial', 'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam', 'Kumuram Bheem', 'Mahabubabad', 'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal–Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal Rural', 'Warangal Urban', 'Yadadri Bhuvanagiri'],
    'Karnataka': ['Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura', 'Yadgir'],
    // Add more states as needed...
};

// Add this soil type mapping at the top of script.js
const soilTypeMapping = {
    'Telangana': {
        'Ranga Reddy': {
            'default': 'red',
            'villages': {
                'Yacharam': 'red',
                'Ibrahimpatnam': 'red',
                'Manchal': 'red',
                'Kandukur': 'red',
                'Amangal': 'black',
                'Shamshabad': 'black',
                'Maheshwaram': 'red'
            }
        },
        'Medchal': {
            'default': 'red',
            'villages': {
                'Kompally': 'red',
                'Shamirpet': 'red',
                'Medchal': 'red',
                'Dundigal': 'black'
            }
        },
        'Vikarabad': {
            'default': 'black',
            'villages': {
                'Vikarabad': 'black',
                'Parigi': 'black',
                'Tandur': 'black'
            }
        },
        'Medak': {
            'default': 'black',
            'villages': {
                'Medak': 'black',
                'Narsapur': 'black',
                'Toopran': 'black'
            }
        }
    }
};

// Add this at the beginning of the file, after the stateDistrictMap declaration
const locationStatus = document.getElementById('locationStatus');

// Function to normalize text for comparison
function normalizeText(text) {
    return text?.toLowerCase()
        .replace(/\s+/g, ' ')
        .trim() || '';
}

// Add this function to detect season based on current month
function detectCurrentSeason() {
    const date = new Date();
    const month = date.getMonth() + 1; // getMonth() returns 0-11

    // Season mapping based on Indian agricultural calendar
    if (month >= 6 && month <= 10) {
        return 'kharif';  // June to October
    } else if (month >= 10 || month <= 3) {
        return 'rabi';    // October to March
    } else {
        return 'zaid';    // March to June
    }
}

// Function to get user's location and reverse geocode it
async function detectUserLocation() {
    locationStatus.style.display = 'block';
    
    try {
        // Get user's current position
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        const { latitude, longitude } = position.coords;
        
        // Use OpenStreetMap Nominatim API for reverse geocoding with more detailed address
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en&addressdetails=1&zoom=18`,
            {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'CropSelectionAssistant/1.0'
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch location data');
        }

        const data = await response.json();
        
        if (data && data.address) {
            let state = data.address.state;
            // Prioritize state_district field for district detection
            let district = data.address.state_district || 
                          data.address.county || 
                          data.address.district || 
                          data.address.city_district || 
                          data.address.city || 
                          '';
            let village = data.address.village || data.address.suburb || data.address.town || '';

            console.log('Raw location data:', data.address); // For debugging

            // Find matching state in our map
            const matchingState = Object.keys(stateDistrictMap).find(s => 
                normalizeText(s) === normalizeText(state)
            );

            if (matchingState) {
                // Set the state and trigger change event
                stateSelect.value = matchingState;
                stateSelect.dispatchEvent(new Event('change'));

                // Wait for districts to be populated
                setTimeout(() => {
                    // Find and set the district using exact matching first
                    if (district) {
                        const districtNorm = normalizeText(district);
                        const exactMatch = Array.from(districtSelect.options)
                            .find(option => normalizeText(option.text) === districtNorm);

                        if (exactMatch) {
                            districtSelect.value = exactMatch.value;
                            districtSelect.dispatchEvent(new Event('change'));
                            console.log(`District matched exactly: ${exactMatch.text}`);
                        } else {
                            // If no exact match, try fuzzy matching
                            let bestMatch = null;
                            let bestMatchScore = 0;

                            Array.from(districtSelect.options).forEach(option => {
                                if (option.value) {
                                    const optionNorm = normalizeText(option.text);
                                    
                                    // Calculate match score
                                    let score = 0;
                                    if (optionNorm.includes(districtNorm)) score = 75;
                                    else if (districtNorm.includes(optionNorm)) score = 75;
                                    else {
                                        // Check for partial matches
                                        const words1 = optionNorm.split(' ');
                                        const words2 = districtNorm.split(' ');
                                        words1.forEach(w1 => {
                                            words2.forEach(w2 => {
                                                if (w1.includes(w2) || w2.includes(w1)) score += 25;
                                            });
                                        });
                                    }

                                    if (score > bestMatchScore) {
                                        bestMatchScore = score;
                                        bestMatch = option;
                                    }
                                }
                            });

                            // Set the district if we found a good match
                            if (bestMatch && bestMatchScore >= 25) {
                                districtSelect.value = bestMatch.value;
                                districtSelect.dispatchEvent(new Event('change'));
                                console.log(`District matched with score: ${bestMatch.text} (score: ${bestMatchScore})`);
                            }
                        }
                    }

                    // Set the village name if available
                    const villageInput = form.querySelector('[name="village"]');
                    if (village && villageInput) {
                        // Capitalize first letter of each word
                        village = village.split(' ')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                            .join(' ');
                        villageInput.value = village;

                        // Detect and set soil type
                        const soilType = detectSoilType(matchingState, district, village);
                        if (soilType) {
                            const soilTypeSelect = form.querySelector('[name="soilType"]');
                            soilTypeSelect.value = soilType;
                            console.log(`Soil type detected: ${soilType}`);
                        }
                    }

                    // Set the season based on current date
                    const currentSeason = detectCurrentSeason();
                    const seasonSelect = form.querySelector('[name="season"]');
                    if (currentSeason) {
                        seasonSelect.value = currentSeason;
                        console.log(`Season detected: ${currentSeason}`);
                    }

                    // Show success message
                    locationStatus.innerHTML = `
                        <div class="success-message">
                            <span>Location and season detected successfully!</span>
                        </div>
                    `;
                    setTimeout(() => {
                        locationStatus.style.display = 'none';
                    }, 2000);
                }, 100);
            } else {
                console.log('State not found in mapping:', state);
                throw new Error('Location not supported');
            }
        }
    } catch (error) {
        console.error('Error detecting location:', error);
        locationStatus.innerHTML = `
            <div class="error-message">
                <span>Unable to detect location automatically. Please select manually.</span>
            </div>
        `;
        setTimeout(() => {
            locationStatus.style.display = 'none';
        }, 3000);
    }
}

// Add success and error message styling to CSS
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
    .error-message {
        color: #dc2626;
        font-size: 0.875rem;
        text-align: center;
        padding: 0.5rem;
        background-color: #fef2f2;
        border-radius: 0.375rem;
    }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
    .success-message {
        color: #059669;
        font-size: 0.875rem;
        text-align: center;
        padding: 0.5rem;
        background-color: #ecfdf5;
        border-radius: 0.375rem;
    }
`, styleSheet.cssRules.length);

// Call the location detection function when the page loads
window.addEventListener('load', detectUserLocation);

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
        const currentSeason = detectCurrentSeason();
        
        // Get seasonal weather predictions based on season
        const seasonalPredictions = {
            'kharif': {
                rainfall: '700-1200mm',
                temperature: '25-35°C'
            },
            'rabi': {
                rainfall: '100-200mm', 
                temperature: '15-25°C'
            },
            'zaid': {
                rainfall: '200-400mm',
                temperature: '32-40°C'
            }
        };

        const weatherPrediction = seasonalPredictions[currentSeason];

        const prompt = `As an agricultural expert, analyze these farming conditions:
        {
            "location": {
                "state": "${formData.state}",
                "district": "${formData.district}",
                "season": "${currentSeason}"
            },
            "conditions": {
                "water": "${formData.waterAvailability}",
                "soil": "${formData.soilType}",
                "predictedRainfall": "${weatherPrediction.rainfall}",
                "predictedTemperature": "${weatherPrediction.temperature}",
                "previousCrop": "${formData.previousCrop}"
            }
        }

        Based on these conditions and seasonal weather predictions, recommend TOP 4 SUITABLE crops. Return ONLY a valid JSON response in exactly this format, with no additional text or markdown:
        {
            "recommendations": [
                {
                    "crop": "English Name (తెలుగు పేరు)" EXAMPLE: sunflower (పొద్దుతిరుగుడు పువ్వు),
                    "suitability": "Percentage match in english",
                    "weatherSuitability": "How well the crop matches predicted weather conditions",
                    "seasonalTiming": "Best planting time within the season"
                }
            ]
        }

        IMPORTANT:
        1. Crop name format MUST be like these examples:
           - Red Gram (కందిపప్పు)
           - Sunflower (పొద్దుతిరుగుడు పువ్వు)
           - Cotton (పత్తి)
        2. Recommend crops that are specifically suitable for the predicted rainfall and temperature
        3. Consider both weather predictions and traditional seasonal suitability
        4. Return exactly 4 recommendations`;

        // Make request to Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyC3aoeIdYGVNLsd5LQWAyUlPxnL0ZMRBww`, {
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

// Add this helper function to improve soil type matching
function findMatchingVillage(targetVillage, villageList) {
    targetVillage = normalizeText(targetVillage);
    
    // Try exact match first
    for (let village in villageList) {
        if (normalizeText(village) === targetVillage) {
            return village;
        }
    }
    
    // Try partial match
    for (let village in villageList) {
        if (normalizeText(village).includes(targetVillage) || 
            targetVillage.includes(normalizeText(village))) {
            return village;
        }
    }
    
    return null;
}

// Update the detectSoilType function
function detectSoilType(state, district, village) {
    try {
        console.log('Detecting soil type for:', { state, district, village });
        
        if (soilTypeMapping[state]) {
            // Find matching district
            const matchingDistrict = Object.keys(soilTypeMapping[state]).find(d => 
                normalizeText(d).includes(normalizeText(district)) || 
                normalizeText(district).includes(normalizeText(d))
            );

            if (matchingDistrict) {
                const districtData = soilTypeMapping[state][matchingDistrict];
                
                if (village) {
                    // Try to find matching village
                    const matchingVillage = findMatchingVillage(village, districtData.villages);
                    if (matchingVillage) {
                        console.log(`Found soil type for village ${matchingVillage}`);
                        return districtData.villages[matchingVillage];
                    }
                }
                
                console.log(`Using default soil type for district ${matchingDistrict}`);
                return districtData.default;
            }
        }
        
        console.log('No soil type mapping found');
        return null;
    } catch (error) {
        console.error('Error detecting soil type:', error);
        return null;
    }
}

// Add a function to get formatted date
function getCurrentDate() {
    const date = new Date();
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    };
    return date.toLocaleDateString('en-IN', options);
}

// Optional: Add current date display to the form
// Add this after the header in your HTML:
const dateDisplay = document.createElement('div');
dateDisplay.className = 'current-date';
dateDisplay.innerHTML = `Current Date: ${getCurrentDate()}`;
document.querySelector('.header').appendChild(dateDisplay);

// Add CSS for date display
styleSheet.insertRule(`
    .current-date {
        text-align: center;
        color: #4b5563;
        font-size: 0.875rem;
        margin-top: 0.5rem;
    }
`, styleSheet.cssRules.length);

// Add this function to your script.js
function goBack() {
    window.location.replace('https://farmai-97ff8.web.app/');
}
