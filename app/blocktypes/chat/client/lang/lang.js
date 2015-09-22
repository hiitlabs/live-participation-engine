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
    BLOCKTYPE: 'Keskustelu',
    HEADING_HOVER: 'Klikkaa muokataksesi, esc peruuttaaksesi',
    DESCRIPTION_HOVER: 'Klikkaa muokataksesi, esc peruuttaaksesi',
    SEND_BTN: 'Lähetä',
    SENDWITHUSERNAME_BTN: 'Lähetä nimellä',
    NOTIFYWRITING_TEXT: '...',
    NOTIFYWRITING_HOVER: 'Joku kirjoittaa'

    //SENDWITHUSERNAME_BTN: 'Lähetä ryhmän nimellä'
  });
//} else if (__SV__) {
//
} else {
  // DEFAULTS
  extend(exports, {
    BLOCKTYPE: 'Chat',
    HEADING_HOVER: 'Click to edit, esc to cancel',
    DESCRIPTION_HOVER: 'Click to edit, esc to cancel',
    SEND_BTN: 'Send',
    SENDWITHUSERNAME_BTN: 'Send with name',
    NOTIFYWRITING_TEXT: '...',
    NOTIFYWRITING_HOVER: 'Somebody is writing'
    //SENDWITHUSERNAME_BTN: 'Send with group name'
  });
}

if (__CONTROL__ && __FI__) {
  // TODO hovers and translations
  extend(exports, {
    CREATE_HEADING: 'Otsikko',
    CREATE_HEADING_PLACEHOLDER: 'Otsikko (Alaotsikko seuraavalle riville)',
    CREATE_BTN: 'Luo',

    MAGIC_HOVER: 'Muuta asetuksia:',
    // TODO translations
    DISABLE_BTN: 'Kirjoitus',
    DISABLE_HOVER: 'Estä kirjoittaminen',
    ENABLE_BTN: 'Kirjoitus',
    ENABLE_HOVER: 'Salli kirjoittaminen',

    WEBMSGS_BTN_ON: 'Viestit',
    WEBMSGS_BTN_ON_HOVER: 'Piilota viestit webistä',
    WEBMSGS_BTN_OFF: 'Viestit',
    WEBMSGS_BTN_OFF_HOVER: 'Näytä viestit webissä',

    LARGEMSGS_BTN_ON: 'Laaja',
    LARGEMSGS_BTN_ON_HOVER: 'Viestit screenin alakulmaan',
    LARGEMSGS_BTN_OFF: 'Laaja',
    LARGEMSGS_BTN_OFF_HOVER: 'Viestit koko screenille',
    SCREENMSGS_BTN_ON: 'Viestit',
    SCREENMSGS_BTN_ON_HOVER: 'Piilota viestit screeniltä',
    SCREENMSGS_BTN_OFF: 'Viestit',
    SCREENMSGS_BTN_OFF_HOVER: 'Näytä viestit screenillä',
    SCREENHIGHLIGHTS_BTN_ON: 'Nostot',
    SCREENHIGHLIGHTS_BTN_ON_HOVER: 'Piilota nostot screeniltä',
    SCREENHIGHLIGHTS_BTN_OFF: 'Nostot',
    SCREENHIGHLIGHTS_BTN_OFF_HOVER: 'Näytä nostot screenillä',
    CLEARHIGHLIGHTS_BTN: 'Nostot',
    CLEARHIGHLIGHTS_BTN_HOVER: 'Tyhjennä nostovalinnat',

    CLEARPICKS_BTN: 'Poiminnat',
    CLEARPICKS_BTN_HOVER: 'Tyhjennä poiminnat',

    MODERATION_BTN_ON: 'Moderointi',
    MODERATION_BTN_ON_HOVER: 'Näytä uudet viestit heti',
    MODERATION_BTN_OFF: 'Moderointi',
    MODERATION_BTN_OFF_HOVER: 'Näytä uudet viestit vasta hyväksymisen jälkeen',

    USERNAMES_BTN_ON: 'Nimet',
    USERNAMES_BTN_ON_HOVER: 'Salli vain nimetön viestintä',
    USERNAMES_BTN_OFF: 'Nimet',
    USERNAMES_BTN_OFF_HOVER: 'Salli nimimerkit',

    EDITINGBUTTONS_BTN_ON: 'Muokkaus',
    EDITINGBUTTONS_BTN_ON_HOVER: 'Estä viestien muokkaus',
    EDITINGBUTTONS_BTN_OFF: 'Muokkaus',
    EDITINGBUTTONS_BTN_OFF_HOVER: 'Salli viestien muokkaus',

    ONLYONESEND_BTN_ON: 'Yksi viesti',
    ONLYONESEND_BTN_ON_HOVER: 'Salli useamman viestin lähettäminen',
    ONLYONESEND_BTN_OFF: 'Yksi viesti',
    ONLYONESEND_BTN_OFF_HOVER: 'Salli vain yhden viestin lähettäminen',

    //HIDE: 'Piilota',
    HIDEMSG_HOVER: 'Piilota viesti',
    SHOWMSG_HOVER: 'Näytä viesti'
  });
}
if (__CONTROL__ && __EN__) {
  extend(exports, {
    CREATE_HEADING: 'Heading',
    CREATE_HEADING_PLACEHOLDER: 'Heading (Description on the second line)',
    CREATE_BTN: 'Create',

    MAGIC_HOVER: 'Change modes:',
    DISABLE_BTN: 'Writing',
    DISABLE_HOVER: 'Deny writing',
    ENABLE_BTN: 'Writing',
    ENABLE_HOVER: 'Allow writing',

    WEBMSGS_BTN_ON: 'Messages',
    WEBMSGS_BTN_ON_HOVER: 'Hide messages from web',
    WEBMSGS_BTN_OFF: 'Messages',
    WEBMSGS_BTN_OFF_HOVER: 'Show messages on web',

    LARGEMSGS_BTN_ON: 'Large',
    LARGEMSGS_BTN_ON_HOVER: 'Shrink messages on screen',
    LARGEMSGS_BTN_OFF: 'Large',
    LARGEMSGS_BTN_OFF_HOVER: 'Enlarge messages on screen',
    SCREENMSGS_BTN_ON: 'Messages',
    SCREENMSGS_BTN_ON_HOVER: 'Hide messages from screen',
    SCREENMSGS_BTN_OFF: 'Messages',
    SCREENMSGS_BTN_OFF_HOVER: 'Show messages on screen',
    SCREENHIGHLIGHTS_BTN_ON: 'Highlights',
    SCREENHIGHLIGHTS_BTN_ON_HOVER: 'Hide highlights from screen',
    SCREENHIGHLIGHTS_BTN_OFF: 'Highlights',
    SCREENHIGHLIGHTS_BTN_OFF_HOVER: 'Show highlights on screen',
    CLEARHIGHLIGHTS_BTN: 'Highlights',
    CLEARHIGHLIGHTS_BTN_HOVER: 'Clear highlight selection',

    CLEARPICKS_BTN: 'Picks',
    CLEARPICKS_BTN_HOVER: 'Clear pick selection',

    MODERATION_BTN_ON: 'Moderation',
    MODERATION_BTN_ON_HOVER: 'Show new messages by default',
    MODERATION_BTN_OFF: 'Moderation',
    MODERATION_BTN_OFF_HOVER: 'Show new messages only after approval',

    USERNAMES_BTN_ON: 'Names',
    USERNAMES_BTN_ON_HOVER: 'Allow only anonymous messaging',
    USERNAMES_BTN_OFF: 'Names',
    USERNAMES_BTN_OFF_HOVER: 'Allow usernames',

    EDITINGBUTTONS_BTN_ON: 'Editing',
    EDITINGBUTTONS_BTN_ON_HOVER: 'Deny editing of messages',
    EDITINGBUTTONS_BTN_OFF: 'Editing',
    EDITINGBUTTONS_BTN_OFF_HOVER: 'Allow editing of messages',

    ONLYONESEND_BTN_ON: 'One message',
    ONLYONESEND_BTN_ON_HOVER: 'Allow sending many messages',
    ONLYONESEND_BTN_OFF: 'One message',
    ONLYONESEND_BTN_OFF_HOVER: 'Allow sending only one message',

    //HIDE: 'Hide',
    HIDEMSG_HOVER: 'Hide message',
    SHOWMSG_HOVER: 'Show message'

  });
}
if ((__CONTROL__ || __STAGE__) && __FI__) {
  extend(exports, {
    HIGHLIGHTMSG_BTN: 'Nosto',
    HIGHLIGHTMSG_HOVER: 'Nosta viesti screenillä',
    UNHIGHLIGHTMSG_HOVER: 'Poista nosto screeniltä',

    PICKMSG_BTN: 'Poiminta',
    PICKMSG_HOVER: 'Poimi viesti',
    UNPICKMSG_HOVER: 'Poista viestin poiminta',

    REPLYMSG_BTN: 'Vastaa',
    REPLYMSG_HOVER: 'Vastaa viestiin'
  });
}
if ((__CONTROL__ || __STAGE__) && __EN__) {
  extend(exports, {
    HIGHLIGHTMSG_BTN: 'Highlight',
    HIGHLIGHTMSG_HOVER: 'Highlight message on screen',
    UNHIGHLIGHTMSG_HOVER: 'Remove highlight from screen',

    PICKMSG_BTN: 'Pick',
    PICKMSG_HOVER: 'Pick message',
    UNPICKMSG_HOVER: 'Unpick message',

    REPLYMSG_BTN: 'Reply',
    REPLYMSG_HOVER: 'Reply to message'
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
