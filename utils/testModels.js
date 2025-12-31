// Utilitaire pour tester les modèles OpenRouter disponibles
const API_KEY = "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";

const modelsToTest = [
    "mistralai/mistral-7b-instruct:free",
    "google/gemma-2-9b-it:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "qwen/qwen-2-7b-instruct:free",
    "openai/gpt-3.5-turbo"
];

async function testModel(model) {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://astromedia.ai',
                'X-Title': 'AstroMedia'
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: "user", content: "Test simple: réponds juste 'OK'" }],
                max_tokens: 10
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log(`✅ ${model}: DISPONIBLE`);
            return true;
        } else {
            const error = await response.text();
            console.log(`❌ ${model}: ${response.status} - ${error}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${model}: Erreur - ${error.message}`);
        return false;
    }
}

async function testAllModels() {
    console.log('🔍 Test des modèles OpenRouter...\n');
    
    const results = {};
    for (const model of modelsToTest) {
        results[model] = await testModel(model);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Pause pour éviter le rate limiting
    }
    
    console.log('\n📊 Résumé:');
    const available = Object.entries(results).filter(([, isAvailable]) => isAvailable);
    console.log(`${available.length}/${modelsToTest.length} modèles disponibles`);
    
    if (available.length > 0) {
        console.log('\n✅ Modèles recommandés:');
        available.forEach(([model]) => console.log(`  - ${model}`));
    }
}

testAllModels();