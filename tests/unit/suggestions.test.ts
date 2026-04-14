import { describe, expect, it } from 'vitest';

import { parseConfiguredSuggestions } from '@/lib/chat/suggestions';

describe('parseConfiguredSuggestions', () => {
    it('returns a clean string list from JSON arrays', () => {
        expect(parseConfiguredSuggestions('[" Uno ","",2,"Dos"]')).toEqual(['Uno', 'Dos']);
    });

    it('returns an empty list for invalid payloads', () => {
        expect(parseConfiguredSuggestions('{bad json')).toEqual([]);
        expect(parseConfiguredSuggestions('"not-an-array"')).toEqual([]);
    });
});

