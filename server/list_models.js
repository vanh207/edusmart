const apiKey = 'AIzaSyCvNwNAbcHvPduQ0Q5TD_isIX_PR16chH4';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
    console.log('Fetching available models...');
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            console.log('\n--- AVAILABLE MODELS ---');
            if (data.models) {
                data.models.forEach(m => {
                    // Only show models that support content generation
                    if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                        console.log(`- ${m.name.replace('models/', '')}`);
                    }
                });
            } else {
                console.log('No models list found in response.');
                console.log(JSON.stringify(data, null, 2));
            }
        } else {
            console.error('FAILED TO LIST MODELS:', response.status);
            console.error(JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('Network Error:', error);
    }
}

listModels();
