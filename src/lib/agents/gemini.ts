// ============================================================
// OpenArg — Gemini Client Configuration
// Shared Gemini 2.5 client for all agents
// ============================================================

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
    if (!genAI) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
}

/**
 * Get a Gemini model instance with a specific system instruction
 * (Dynamic Re-roling pattern from the paper)
 */
export function getModel(systemInstruction: string): GenerativeModel {
    return getClient().getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
        },
    });
}

/**
 * Get a Gemini model for structured JSON output
 */
export function getStructuredModel(systemInstruction: string): GenerativeModel {
    return getClient().getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction,
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
        },
    });
}
