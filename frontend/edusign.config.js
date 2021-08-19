
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
  MULTISIGN_BUTTONS: process.env.MULTISIGN_BUTTONS && JSON.stringify(process.env.MULTISIGN_BUTTONS) || JSON.stringify('yes'),
}
