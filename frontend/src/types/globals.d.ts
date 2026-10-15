// Constants injected by webpack's DefinePlugin (and jest's `globals`), with
// the values from edusign.config.js.

/** [code, display name] per available language, e.g. ["en", "English"]. */
declare const AVAILABLE_LANGUAGES: [string, string][];

/** Translated messages, by language code and then by message id. */
declare const LOCALIZED_MESSAGES: Record<string, Record<string, string>>;

/** Delay in ms before a help popover is shown. */
declare const DELAY_SHOW_HELP: number;

/** Delay in ms before a help popover is hidden. */
declare const DELAY_HIDE_HELP: number;
