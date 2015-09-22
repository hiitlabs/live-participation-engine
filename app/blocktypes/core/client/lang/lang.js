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
// that can inform about missing translations.
// Here we'll use a simple object for now.

function extend(targetObj, translations) {
  for (var translationKey in translations) {
    // translations.hasOwnProperty check perhaps
    // Uncomment the following to allow overwriting translations for this block
    if (typeof targetObj[translationKey] !== 'undefined') {
      throw new Error('translationKey already defined');
    }
    targetObj[translationKey] = translations[translationKey];
  }
  return targetObj;
}


if (__FI__) {
  extend(exports, {
    NOTIFY_REOPENING: 'Yhteysongelma. Yrittää uudelleen ',
    NOTIFY_OPEN: 'Yhdistetty',
    NOTIFY_RELOADING: 'Uudelleenlataus ',

    DISCONNECTED_LABEL: 'Yhteys katkennut.',
    //DISCONNECTED_TEXT: 'Yhteys katkaistu: ',
    DISCONNECTED_BTN: 'Lataa uudelleen',

    USERNAME_WELCOME: 'Tervetuloa!',
    USERNAME_ALREADY_TAKEN: 'Nimi on jo varattu.',
    USERNAME_PLACEHOLDER: 'Nimi',
    USERNAME_BEGIN: 'Aloita',
    ACTIVITY_POINTS: 'Aktiivisuuspisteet',
    POINTS_TITLE: 'Pistetilanne',
    POINTS_AMOUNT: 'pistettä',
    POINTS_HELP_TITLE: 'Aktiivisuuspisteiden laskenta',
    POINTS_HELP: 'Yksi piste jokaisesta toimesta',

    NETWORKING_WELCOME: 'Tervetuloa verkostoitumispeliin!',
    NETWORKING_START1: 'Aloita peli kirjoittamalla sähköpostiosoitteesi ja nimesi.',
    NETWORKING_START2: 'Osoitetta ei näytetä muille pelaajille.',

    EMAIL_REQUIRED: 'Täytä sähköpostiosoite',
    USERNAME_REQUIRED: 'Täytä nimi',
    INVALID_USERPIN: 'Virheellinen sähköpostiosoite',
    USERPIN_ALREADY_TAKEN: 'Sähköpostiosoite on jo käytössä.',

    INVALID_CODE: 'Virheellinen koodi',
    OWN_CODE: 'Et voi verkostoitua itsesi kanssa',
    ALREADY_ADDED_CODE: 'Tämä koodi on jo verkostossasi',

    NETWORKING_OWN_CODE: 'Oma verkostoitumiskoodisi:',
    COLLECT_NETWORKING_CODE: 'Kerää verkostoitumiskoodeja vierailta tai ständeiltä. Syötä koodi:',
    COLLECT_NETWORKING_CODE_BTN: 'Lähetä',
    OWN_NETWORK: 'Verkostosi:',
    OWN_NETWORK2: 'Vierailut:',
    NETWORKING_REMAINING: 'muuta'
  });
}

if (__EN__) {
  extend(exports, {
    NOTIFY_REOPENING: 'Connection problem. Reconnecting in ',
    NOTIFY_OPEN: 'Connected',
    NOTIFY_RELOADING: 'Reloading in ',

    DISCONNECTED_LABEL: 'Disconnected.',
    //DISCONNECTED_TEXT: 'Disconnected due to ',
    DISCONNECTED_BTN: 'Reload',

    USERNAME_WELCOME: 'Welcome!',
    USERNAME_ALREADY_TAKEN: 'Username is already in use.',
    USERNAME_PLACEHOLDER: 'Name',
    USERNAME_BEGIN: 'Begin',
    ACTIVITY_POINTS: 'Activity points',
    POINTS_TITLE: 'Leaderboard',
    POINTS_AMOUNT: 'points',
    POINTS_HELP_TITLE: 'Activity points calculation',
    POINTS_HELP: 'One point from each activity.',

    NETWORKING_WELCOME: 'Welcome to networking game!',
    NETWORKING_START1: 'Begin by writing your email address and name.',
    NETWORKING_START2: 'Your email is not shown to other players.',

    EMAIL_REQUIRED: 'Fill email address',
    USERNAME_REQUIRED: 'Fill your name',
    INVALID_USERPIN: 'Invalid email',
    USERPIN_ALREADY_TAKEN: 'Email address is already in use.',

    INVALID_CODE: 'Invalid code',
    OWN_CODE: 'You cannot network with yourself',
    ALREADY_ADDED_CODE: 'This code is already in your network',

    NETWORKING_OWN_CODE: 'Your networking code:',
    COLLECT_NETWORKING_CODE: 'Collect networking codes from guests and stands. Insert code:',
    COLLECT_NETWORKING_CODE_BTN: 'Send',
    OWN_NETWORK: 'Your network:',
    OWN_NETWORK2: 'Visits:',
    NETWORKING_REMAINING: 'others'
  });
}

if (__CONTROL__ && __FI__) {
  extend(exports, {
    SHOW_HOVER: 'Näytä webissä',
    SHOW_BTN: 'Web',
    HIDE_HOVER: 'Piilota webistä',
    HIDE_BTN: 'Web',
    SELECT_HOVER: 'Näytä screenillä',
    SELECT_BTN: 'Screen',
    UNSELECT_HOVER: 'Piilota screeniltä',
    UNSELECT_BTN: 'Screen',

    BLOCKTYPE_HOVER: 'Aktiviteetti',
    COUNT_HOVER: 'Osallistujia',
    ACTIVITY_HOVER: 'Viimeksi aktiivinen',
    ACTIVITY_AGO: ' sitten',

    OPTIONS_HOVER: 'Valinnat',
    COPY_BTN: 'Monista',
    COPY_HOVER: 'Monista tämä lohko muokattavaksi',
    EXPORT_BTN: 'Tallenna',
    EXPORT_HOVER: 'Tallenna tämä lohko CSV-muodossa',
    ARCHIVE_BTN: 'Arkistoi',
    ARCHIVE_HOVER: 'Siirrä tämä lohko arkisto-alueelle',
    DUPLICATE_BTN: 'Monista',
    DUPLICATE_HOVER: 'Monista tämä lohko',
    CLEAR_BTN: 'Tyhjennä',
    CLEAR_HOVER: 'Tyhjennä tämä lohko',
    CLEAR_NOTE: 'Haluatko varmasti tyhjentää tämän lohkon?',
    DELETE_BTN: 'Poista',
    DELETE_HOVER: 'Poista tämä lohko kokonaan',
    DELETE_NOTE: 'Haluatko varmasti poistaa tämän lohkon?',
    BLOCKGROUP_BTN: 'Ryhmittele',
    BLOCKGROUP_HOVER: 'Määritä tämän lohkon ryhmä',
    BLOCKGROUP_NOTE: 'Anna lohkoryhmän tunniste',

    COLLAPSE_HOVER: 'Pienennä tässä',
    EXPAND_HOVER: 'Laajenna tässä',

    LIFT_HOVER: 'Nosta ylemmäs',
    LOWER_HOVER: 'Laske alemmas',

    CREATE: 'Luo',
    CREATE_LABEL: 'Luo...',
    SCREEN_GRAPHICS: 'Screen:',
    SESSION_URL: 'Session osoite',
    SESSION_URL_HOVER: 'Näytä session osoite screenillä',
    PARTICIPANT_COUNT: 'Osallistujamäärä',
    PARTICIPANT_COUNT_HOVER: 'Näytä osallistujamäärä screenillä',
    EXPORT_TITLE: 'Raportti',
    EXPORT_HOVER: 'Tallenna raportti',
    USERNAMES_TITLE: 'Nimimerkit',
    USERNAMES_HOVER: 'Salli nimimerkit',

    REPORTING_LABEL: 'Kopioi raportti talteen tai',
    REPORTING_DOWNLOAD: 'lataa raportti CSV-tiedostona',
    REPORTING_CLOSE_BTN: 'Sulje'

  });
}
//} else if (__SV__) {
if (__CONTROL__ && __EN__) {
  // DEFAULTS
  extend(exports, {
    SHOW_HOVER: 'Show in web',
    SHOW_BTN: 'Web',
    HIDE_HOVER: 'Hide in web',
    HIDE_BTN: 'Web',
    SELECT_HOVER: 'Show on screen',
    SELECT_BTN: 'Screen',
    UNSELECT_HOVER: 'Hide on screen',
    UNSELECT_BTN: 'Screen',

    BLOCKTYPE_HOVER: 'Activity name',
    COUNT_HOVER: 'Participants',
    ACTIVITY_HOVER: 'Last activity',
    ACTIVITY_AGO: ' ago',

    OPTIONS_HOVER: 'Operations',
    COPY_BTN: 'Copy',
    COPY_HOVER: 'Duplicate this block for editing',
    EXPORT_BTN: 'Save',
    EXPORT_HOVER: 'Save this block in CSV-format',
    ARCHIVE_BTN: 'Archive',
    ARCHIVE_HOVER: 'Move this block to the archive tab',
    DUPLICATE_BTN: 'Duplicate',
    DUPLICATE_HOVER: 'Duplicate this block',
    CLEAR_BTN: 'Clear',
    CLEAR_HOVER: 'Clear this block',
    CLEAR_NOTE: 'Are you sure to clear this block?',
    DELETE_BTN: 'Delete',
    DELETE_HOVER: 'Delete this whole block',
    DELETE_NOTE: 'Are you sure to delete this whole block?',
    BLOCKGROUP_BTN: 'Group',
    BLOCKGROUP_HOVER: 'Assign this block to group',
    BLOCKGROUP_NOTE: 'Give block group id',

    COLLAPSE_HOVER: 'Collapse here',
    EXPAND_HOVER: 'Expand here',

    LIFT_HOVER: 'Move up',
    LOWER_HOVER: 'Move down',

    CREATE: 'Create',
    CREATE_LABEL: 'Create...',
    SCREEN_GRAPHICS: 'On-screen graphics:',
    SESSION_URL: 'Session url',
    SESSION_URL_HOVER: 'Show session url on screen',
    PARTICIPANT_COUNT: 'Participant count',
    PARTICIPANT_COUNT_HOVER: 'Show participant count on screen',
    EXPORT_TITLE: 'Export',
    EXPORT_HOVER: 'Export data',
    USERNAMES_TITLE: 'Usernames',
    USERNAMES_HOVER: 'Allow usernames',

    REPORTING_LABEL: 'Copy report from below or',
    REPORTING_DOWNLOAD: 'download report as CSV',
    REPORTING_CLOSE_BTN: 'Close'

  });
}

if ((__SCREEN__ || __CONTROL__) && __FI__) {
  extend(exports, {
    PARTICIPANT: 'online', //osallistuja
    PARTICIPANTS: 'online' //osallistujaa
  });
}

if ((__SCREEN__ || __CONTROL__) && __EN__) {
  extend(exports, {
    PARTICIPANT: 'online', //participant
    PARTICIPANTS: 'online' //participants
  });
}

/*

    exports.en = {
      'Your nickname': 'Your nickname',
      'total': 'total',
      'Lift': 'Lift',
      'Show': 'Show',
      'Hide': 'Hide',
      'Enable': 'Enable',
      'Disable': 'Disable',
      'delete': 'Delete',
      'present': 'Present',
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
    exports.fi = {
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
