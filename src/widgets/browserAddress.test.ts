import { describe, expect, it } from 'vitest';
import { addressToSave, hostOf, toAddress } from './browserAddress';

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

describe('addressToSave', () => {
  it('keeps the page a Google block page was guarding, not the block page', () => {
    const blocked =
      'https://www.google.com/sorry/index?continue=' +
      encodeURIComponent('https://www.google.com/search?q=major+7&ei=zR2Mau6TG&sxsrf=APpeQ&sca_esv=6712') +
      '&q=EhAkBlkAEF_0YpC4eUgq8DP3';
    expect(addressToSave(blocked)).toBe('https://www.google.com/search?q=major+7');
  });

  it('falls back to the Google home page when the block page guards nothing', () => {
    expect(addressToSave('https://www.google.com/sorry/index?q=abc')).toBe('https://www.google.com/');
  });

  it('drops per-visit parameters from a Google search and keeps the query', () => {
    expect(
      addressToSave('https://www.google.com/search?q=focus+desk&tbm=isch&ei=abc&sei=def&ved=0ah&oq=focus')
    ).toBe('https://www.google.com/search?q=focus+desk&tbm=isch');
  });

  it('drops Cloudflare challenge parameters on any site', () => {
    expect(addressToSave('https://www.producthunt.com/?__cf_chl_tk=abc&ref=home')).toBe(
      'https://www.producthunt.com/?ref=home'
    );
  });

  it('leaves every other address exactly as it was', () => {
    const url = 'https://www.youtube.com/watch?v=abc&ei=keep';
    expect(addressToSave(url)).toBe(url);
    expect(addressToSave('https://www.google.com/maps?ei=keep')).toBe('https://www.google.com/maps?ei=keep');
    expect(addressToSave('not a url')).toBe('not a url');
  });
});
