import { describe, expect, it } from 'vitest';
import { hostOf, toAddress } from './browserAddress';

describe('toAddress', () => {
  it('adds a scheme to a bare host', () => {
    expect(toAddress('youtube.com')).toBe('https://youtube.com');
    expect(toAddress('  music.youtube.com  ')).toBe('https://music.youtube.com');
    expect(toAddress('example.co.uk/path?a=1')).toBe('https://example.co.uk/path?a=1');
  });

  it('leaves a full address alone', () => {
    expect(toAddress('https://x.com/a')).toBe('https://x.com/a');
    expect(toAddress('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('takes localhost and bare IPs as addresses', () => {
    expect(toAddress('localhost:5173')).toBe('https://localhost:5173');
    expect(toAddress('127.0.0.1:8080')).toBe('https://127.0.0.1:8080');
  });

  it('searches for anything that is not a host', () => {
    expect(toAddress('youtube')).toBe('https://www.google.com/search?q=youtube');
    expect(toAddress('electron webview popup')).toBe(
      'https://www.google.com/search?q=electron%20webview%20popup'
    );
    // A dot inside a sentence must not turn it into a website.
    expect(toAddress('hello world.com')).toBe(
      'https://www.google.com/search?q=hello%20world.com'
    );
    // A colon that is not a scheme is still just typing.
    expect(toAddress('note: buy milk')).toBe('https://www.google.com/search?q=note%3A%20buy%20milk');
  });

  it('is empty for empty input', () => {
    expect(toAddress('')).toBe('');
    expect(toAddress('   ')).toBe('');
  });
});

describe('hostOf', () => {
  it('drops the www', () => {
    expect(hostOf('https://www.figma.com/files')).toBe('figma.com');
    expect(hostOf('https://music.youtube.com')).toBe('music.youtube.com');
  });

  it('hands back what it cannot parse', () => {
    expect(hostOf('not a url')).toBe('not a url');
  });
});
