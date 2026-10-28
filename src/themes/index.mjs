import { bubble } from './bubble.mjs';
import { document } from './document.mjs';
import { book } from './book.mjs';

const THEMES = new Map([bubble, document, book].map((theme) => [theme.name, theme]));

export const DEFAULT_THEME = book.name;

export function getTheme(name) {
  return THEMES.get(String(name ?? '')) ?? book;
}

export function themeNames() {
  const names = [...THEMES.keys()];
  return [DEFAULT_THEME, ...names.filter((name) => name !== DEFAULT_THEME)];
}
