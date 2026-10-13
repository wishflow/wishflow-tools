export type Language = 'en' | 'zh';

export interface LocalizedText {
  en: string;
  zh: string;
}

export interface SiteProject {
  slug: string;
  title: string;
  titleZh?: string;
}

export interface LocalePattern {
  pattern: RegExp;
  en: (match: RegExpMatchArray) => string;
  zh: (match: RegExpMatchArray) => string;
}

export declare const LANGUAGE_STORAGE_KEY: string;
export declare const LANGUAGE_CHANGE_EVENT: string;
export declare function normalizeLanguage(value: unknown): Language;
export declare function getLanguage(): Language;
export declare function initializeLanguage(): Language;
export declare function localize(text: LocalizedText | string, language?: Language): string;
export declare function setLanguage(value: unknown): Language;
export declare function subscribeLanguage(listener: (language: Language) => void): () => void;
export declare function registerMessages(
  appSlug: string,
  messages: Record<string, LocalizedText | string>,
  patterns?: LocalePattern[],
): void;
