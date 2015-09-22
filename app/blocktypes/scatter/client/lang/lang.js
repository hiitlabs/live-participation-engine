/**
  Presemo 4 - Live Participation Engine
  Copyright (C) 2013-2015 Screen.io

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as
  published by the Free Software Foundation, either version 3 of the
  License, or (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/**
 * Each block localizes itself to available languages
 */

// One can also define a translation function __t('translate me');
// that can pass through default English and also inform about missing translations.
// Here we'll use a simple object for now.

function extend(targetObj, translations) {
  for (var translationKey in translations) {
    // translations.hasOwnProperty check perhaps
    // Uncomment the following to allow overwriting translations for this block
    if (typeof targetObj[translationKey] !== 'undefined') throw new Error('translationKey already defined');
    targetObj[translationKey] = translations[translationKey];
  }
  return targetObj;
}

// Needed?
var coreTranslations = require('/core/lang');

// Get basic translations from core
extend(exports, coreTranslations);

if (__FI__) {
  extend(exports, {
    BLOCKTYPE: 'Sironta',
    HEADING_HOVER: 'Klikkaa muokataksesi, esc peruuttaaksesi',
    DESCRIPTION_HOVER: 'Klikkaa muokataksesi, esc peruuttaaksesi',
    SEND_BTN: 'Lähetä',
    POLL_RESULTS: 'Vastaukset:',

    SCATTER_SEND_BTN: 'Lähetä',
    SCATTER_SENT_TXT: 'Kiitos vastauksesta!',

    SCATTER_WAITING_RESULTS: 'Odotetaan vastauksia' // for screen

  });
//} else if (SV) {
//
} else {
  // DEFAULTS
  extend(exports, {
    BLOCKTYPE: 'Scatter',
    HEADING_HOVER: 'Click to edit, esc to cancel',
    DESCRIPTION_HOVER: 'Click to edit, esc to cancel',
    SEND_BTN: 'Send',
    POLL_RESULTS: 'Current results:',

    SCATTER_SEND_BTN: 'Send',
    SCATTER_SENT_TXT: 'Thank you for your answer!',

    SCATTER_WAITING_RESULTS: 'Waiting for answers' // for screen

  });
}

if (__CONTROL__ && __FI__) {
  // TODO hovers and translations
  extend(exports, {
    DISABLE_BTN: 'Valinnat esillä',
    ENABLE_BTN: 'Valinnat esillä',
    DISABLE_HOVER: 'Piilota webistä',
    ENABLE_HOVER: 'Näytä webissä',
    CREATE_HEADING: 'Otsikko',
    CREATE_HEADING_PLACEHOLDER: 'Otsikko (Alaotsikko seuraavalle riville)',
    //CREATE_OPTIONS: 'Vaihtoehdot',
    //CREATE_OPTIONS_FIELD: 'Vaihtoehdot (yksi per rivi)',
    CREATE_OPTIONS: 'Akselit',
    CREATE_OPTIONS_FIELD: 'Kaksi akselia (yksi per rivi)',
    CREATE_BTN: 'Luo',

    MEANVAR_BTN_ON: 'Keskiarvo',
    MEANVAR_BTN_ON_HOVER: 'Piilota keskiarvo screeniltä',
    MEANVAR_BTN_OFF: 'Keskiarvo',
    MEANVAR_BTN_OFF_HOVER: 'Näytä keskiarvo screenillä',

    REALTIME_BTN_ON: 'Realtime (kokeellinen)',
    REALTIME_BTN_ON_HOVER: 'Lähetä tulokset vain kerran',
    REALTIME_BTN_OFF: 'Realtime (kokeellinen)',
    REALTIME_BTN_OFF_HOVER: 'Lähetä tulos jatkuvasti (ei vielä optimoitu usealle käyttäjälle)'
  });
}
if (__CONTROL__ && __EN__) {
  extend(exports, {
    DISABLE_BTN: 'Voting on',
    ENABLE_BTN: 'Voting on',
    DISABLE_BTN_HOVER: 'Hide in web',
    ENABLE_BTN_HOVER: 'Show in web',
    CREATE_HEADING: 'Heading',
    CREATE_HEADING_PLACEHOLDER: 'Heading (Description on the second line)',
    // CREATE_OPTIONS: 'Options',
    // CREATE_OPTIONS_FIELD: 'Options (one per row)',
    CREATE_OPTIONS: 'Axes',
    CREATE_OPTIONS_FIELD: 'Two axes (one per row)',
    CREATE_BTN: 'Create',

    MEANVAR_BTN_ON: 'Mean',
    MEANVAR_BTN_ON_HOVER: 'Hide mean from screen',
    MEANVAR_BTN_OFF: 'Mean',
    MEANVAR_BTN_OFF_HOVER: 'Show mean on screen',

    REALTIME_BTN_ON: 'Realtime (experimental)',
    REALTIME_BTN_ON_HOVER: 'Send results only on form submit',
    REALTIME_BTN_OFF: 'Realtime (experimental)',
    REALTIME_BTN_OFF_HOVER: 'Stream sliders in realtime (hasn\'t been optimized yet for many users)'

  });
}

/*
    exports.en = {
      'Your nickname': 'Your nickname',
      'total': 'total',
      'Send': 'Send',
      'Give vote': 'Select',
      'Vote': 'Vote',
      'Create': 'Create',
      'Heading': 'Heading',
      'Save': 'Save',
      'Saved': 'Saved',
      'Discussion': 'Discussion',
      'Show names': 'Show names',
      'Poll': 'Poll',
      'Options': 'Options',
      'Options (one per row)': 'Options (one per row)',
      'Rating': 'Rating',
      'Image': 'Image',
      'Html': 'Html',
      'Proper html': 'Proper html',
      'Url': 'Url',
      'http://': 'http://',
      'Form': 'Form',
      'Questions': 'Questions',
      'Questions (one per row)': 'Questions (one per row)'
    };
    dict.fi = {
      'Your nickname': 'Nimimerkkisi',
      'total': 'yhteensä',
      'Lift': 'nosta',
      'Show': 'näytä',
      'Hide': 'piilota',
      'Enable': 'aktivoi',
      'Disable': 'arkistoi',
      'delete': 'poista',
      'present': 'ruudulle',
      'Send': 'Lähetä',
      'Give vote': 'Valitse',
      'Vote': 'Kannata',
      'Create': 'Luo',
      'Heading': 'Otsikko',
      'Save': 'Tallenna',
      'Saved': 'tallennettu',
      'Discussion': 'Keskustelu',
      'Show names': 'Näytä nimet',
      'Poll': 'Äänestys',
      'Options': 'Vaihtoehdot',
      'Options (one per row)': 'Vaihtoehdot (yksi per rivi)',
      'Rating': 'Järjestely',
      'Image': 'Kuva',
      'Html': 'Html',
      'Proper html': 'validi html',
      'Url': 'Url',
      'http://': 'http://',
      'Form': 'Kysely',
      'Questions': 'Kysymykset',
      'Questions (one per row)': 'Avoimet kysymykset (yksi per rivi)'
    };

*/
