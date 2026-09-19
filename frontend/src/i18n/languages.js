// Single registry of every supported UI language.
// English ('en') is ALWAYS the default and the fallback for any missing key.
export const DEFAULT_LANG = 'en';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'mr', label: 'मराठी' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'or', label: 'ଓଡ଼ିଆ' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
  { code: 'as', label: 'অসমীয়া' },
  { code: 'ur', label: 'اردو' },
  { code: 'sa', label: 'संस्कृतम्' },
  { code: 'kok', label: 'कोंकणी' },
  { code: 'mai', label: 'मैथिली' },
  { code: 'sd', label: 'سنڌي' },
  { code: 'ne', label: 'नेपाली' },
  { code: 'ks', label: 'کٲشُر' },
  { code: 'mni', label: 'মণিপুরী' },
  { code: 'doi', label: 'डोगरी' },
  { code: 'sat', label: 'ᱥᱟᱱᱛᱟᱲᱤ' },
  { code: 'bo', label: 'བོད་སྐད་' },
];

export const isSupportedLang = (code) => LANGUAGES.some((l) => l.code === code);
