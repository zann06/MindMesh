import { describe, expect, it } from 'vitest';
import { parseMarkdownSource } from '@/services/document-parser/markdown';

describe('parseMarkdownSource', () => {
  it('splits heading sections with reproducible offsets', () => {
    const source = ['# One', '', 'Body one.', '', '## Two', '', 'Body two.'].join('\n');
    const parsed = parseMarkdownSource(source);
    expect(parsed.processingStatus).toBe('ready');
    expect(parsed.warnings).toEqual([]);
    expect(parsed.sections).toHaveLength(2);
    expect(parsed.sections[0].heading).toBe('One');
    expect(parsed.sections[0].headingLevel).toBe(1);
    expect(parsed.sections[1].heading).toBe('Two');

    for (const section of parsed.sections) {
      const slice = parsed.extractedText.slice(section.startOffset, section.endOffset);
      expect(slice.length).toBe(section.endOffset - section.startOffset);
      expect(slice.trim().length).toBeGreaterThan(0);
      expect(section.excerpt).toBe(slice.trim().slice(0, 1200));
    }
    expect(parsed.sections[0].startOffset).toBe(0);
    expect(parsed.sections[0].endOffset).toBeLessThanOrEqual(parsed.sections[1].startOffset);
  });

  it('flattens emphasis, links, code, lists, and tables into plain text', () => {
    const source = [
      '# Formats',
      '',
      'A **bold** and *italic* and `inline` and [link](https://example.com).',
      '',
      '- first item',
      '- second item',
      '',
      '| A | B |',
      '| --- | --- |',
      '| one | two |',
      '',
      '```js',
      'const value = 1;',
      '```',
    ].join('\n');
    const parsed = parseMarkdownSource(source);
    const text = parsed.extractedText;
    expect(text).toContain('bold');
    expect(text).toContain('italic');
    expect(text).toContain('inline');
    expect(text).toContain('link (https://example.com)');
    expect(text).toContain('- first item');
    expect(text).toContain('A | B');
    expect(text).toContain('one | two');
    expect(text).toContain('const value = 1;');
    expect(text).not.toContain('**');
  });

  it('strips raw HTML and script content', () => {
    const source = '# Safety\n\nHello <script>alert("x")</script> <b>world</b>';
    const parsed = parseMarkdownSource(source);
    expect(parsed.extractedText).toContain('Hello');
    expect(parsed.extractedText).toContain('world');
    expect(parsed.extractedText).not.toContain('alert');
    expect(parsed.extractedText).not.toContain('<b>');
  });

  it('falls back to a single section when no headings exist', () => {
    const parsed = parseMarkdownSource('Just a paragraph with no heading.');
    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sections[0].heading).toBeUndefined();
    expect(parsed.processingStatus).toBe('warning');
    expect(parsed.warnings.join(' ')).toMatch(/No Markdown headings/);
  });

  it('reports empty documents without throwing', () => {
    const parsed = parseMarkdownSource('   \n\n');
    expect(parsed.extractedText).toBe('');
    expect(parsed.sections).toEqual([]);
    expect(parsed.processingStatus).toBe('warning');
    expect(parsed.warnings).toHaveLength(1);
  });
});
