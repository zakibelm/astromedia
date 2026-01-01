const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

interface FetchOptions extends RequestInit {
    errorMessage?: string;
}

export async function apiRequest<T>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<T> {
    const { errorMessage, ...fetchOptions } = options;

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...fetchOptions.headers,
            },
            ...fetchOptions,
        });

        if (!response.ok) {
            const statusText = response.statusText || `HTTP ${response.status}`;
            throw new Error(errorMessage || `API request failed: ${statusText}`);
        }

        return await response.json();
    } catch (error) {
        // Préserver l'erreur originale si c'est déjà une erreur HTTP lancée par nous
        if (error instanceof Error && error.message.includes('API request failed')) {
            throw error;
        }

        // Erreur de parsing JSON ou autre erreur réseau
        console.error(`[apiHelper] Error for ${endpoint}:`, error);
        throw new Error(
            `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}
