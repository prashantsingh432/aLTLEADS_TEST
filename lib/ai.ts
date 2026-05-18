
import { AIModel, Team, User } from '../types';

interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export const generateAIResponse = async (
    team: Team,
    model: AIModel,
    messages: Message[],
    config: { temperature?: number; maxTokens?: number } = {},
    user?: User // Added optional user context for API key overrides
): Promise<string> => {
    
    // 1. Get API Key based on provider (User Preference > Team Default)
    const getApiKey = (provider: string) => {
        if (provider === 'groq') return user?.apiKeys?.groq || team.defaultApiKeys.groq || '';
        if (provider === 'openrouter') return user?.apiKeys?.openrouter || team.defaultApiKeys.openrouter || '';
        if (provider === 'gemini') return user?.apiKeys?.gemini || team.defaultApiKeys.gemini || '';
        return '';
    };

    const apiKey = getApiKey(model.provider);

    if (!apiKey) {
        throw new Error(`Missing API Key for provider: ${model.provider}. Please configure it in Settings (Personal) or Team Settings.`);
    }

    const temperature = config.temperature ?? 0.7;

    try {
        // --- GROQ ---
        if (model.provider === 'groq') {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: messages,
                    model: model.modelId,
                    temperature: temperature,
                    max_tokens: config.maxTokens || 1024
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'Groq API Error');
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || '';
        }

        // --- OPENROUTER ---
        if (model.provider === 'openrouter') {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://amplior.com', // Required by OpenRouter
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: messages,
                    model: model.modelId,
                    temperature: temperature
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'OpenRouter API Error');
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || '';
        }

        // --- GEMINI (REST) ---
        if (model.provider === 'gemini') {
            // Mapping OpenAI messages format to Gemini format
            const chatMsgs = messages.filter(m => m.role !== 'system').map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

            const systemMsg = messages.find(m => m.role === 'system');

            const payload: any = {
                contents: chatMsgs,
                generationConfig: {
                    temperature: temperature,
                    maxOutputTokens: config.maxTokens || 1024
                }
            };

            if (systemMsg) {
                payload.systemInstruction = {
                    parts: [{ text: systemMsg.content }]
                };
            }

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.modelId}:generateContent?key=${apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'Gemini API Error');
            }

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }

        throw new Error(`Provider ${model.provider} not implemented.`);

    } catch (error) {
        console.error("AI Generation Failed:", error);
        throw error;
    }
};
