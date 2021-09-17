
const langs = [
  ["en", "English"],
  ["sv", "Svenska"],
];

const messages = {};

langs.forEach((lang) => {
  messages[lang[0]] = require("./translations/" + lang[0]);
});

module.exports = {
  AVAILABLE_LANGUAGES: JSON.stringify(langs),
  LOCALIZED_MESSAGES: JSON.stringify(messages),
  DELAY_SHOW_HELP: 250,
  DELAY_HIDE_HELP: 50,
}
