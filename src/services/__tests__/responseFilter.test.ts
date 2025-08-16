import { filterClaudeResponse } from '../responseFilter';

describe('ResponseFilter', () => {
  describe('filterClaudeResponse', () => {
    test('removes italic action text patterns', () => {
      const response = '*adjusts position* Hello there! *smiles warmly* How can I help you today?';
      const filtered = filterClaudeResponse(response);
      
      expect(filtered).toBe('Hello there! How can I help you today?');
      expect(filtered).not.toContain('*adjusts position*');
      expect(filtered).not.toContain('*smiles warmly*');
    });

    test('removes underscore action text patterns', () => {
      const response = '_leans forward_ That\'s interesting! _tilts head_ Tell me more about that.';
      const filtered = filterClaudeResponse(response);
      
      expect(filtered).toBe('That\'s interesting! Tell me more about that.');
    });

    test('removes action words in asterisks', () => {
      const response = 'I understand your concern. *nods* This is a complex topic *gestures*.';
      const filtered = filterClaudeResponse(response);
      
      expect(filtered).toBe('I understand your concern. This is a complex topic.');
    });

    test('preserves legitimate asterisk emphasis', () => {
      const response = 'This is *really* important and *very* useful information.';
      const filtered = filterClaudeResponse(response);
      
      expect(filtered).toBe('This is *really* important and *very* useful information.');
    });

    test('removes multiple action patterns in one response', () => {
      const response = '*adjusts glasses* Well, _thinks carefully_ I believe *nods approvingly* that\'s correct.';
      const filtered = filterClaudeResponse(response);
      
      expect(filtered).toBe('Well, I believe that\'s correct.');
    });

    test('handles empty and whitespace responses', () => {
      expect(filterClaudeResponse('')).toBe('');
      expect(filterClaudeResponse('   ')).toBe('');
      expect(filterClaudeResponse('\n\t  \n')).toBe('');
    });

    test('removes excessive whitespace after filtering', () => {
      const response = '*action*   Multiple   spaces   *another action*   here.';
      const filtered = filterClaudeResponse(response);
      
      expect(filtered).toBe('Multiple spaces here.');
    });

    test('handles complex nested patterns', () => {
      const response = '*looks thoughtful* _hmm_ *adjusts position while thinking* That\'s a great question!';
      const filtered = filterClaudeResponse(response);
      
      expect(filtered).toBe('That\'s a great question!');
    });

    test('preserves punctuation and formatting', () => {
      const response = '*smiles* Hello! How are you today? *waves* I hope you\'re doing well.';
      const filtered = filterClaudeResponse(response);
      
      expect(filtered).toBe('Hello! How are you today? I hope you\'re doing well.');
    });

    test('handles responses with only action text', () => {
      const response = '*nods* *smiles* *waves*';
      const filtered = filterClaudeResponse(response);
      
      expect(filtered.trim()).toBe('');
    });
  });
});