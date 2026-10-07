import type { MessageKey } from './en';

export const de: Record<MessageKey, string> = {
  'login.line': 'Nachrichten aus Songtiteln.',
  'login.button': 'Mit Spotify anmelden',
  'login.unconfigured': 'Setz zuerst SPOTIFY_CLIENT_ID auf dem Server, oder starte',

  'notice.denied': 'Anmeldung abgebrochen.',
  'notice.failed': 'Die Anmeldung hat nicht geklappt. Versuch es noch einmal.',
  'notice.notAllowed': 'Dieses Spotify-Konto steht noch nicht auf Versos Liste. Im Entwicklungsmodus lässt Spotify pro App nur fünf Konten zu, die der Betreiber einträgt.',
  'notice.unconfigured': 'Auf diesem Server ist keine Spotify-App eingerichtet (SPOTIFY_CLIENT_ID).',
  'notice.unreachable': 'Verso ist gerade nicht erreichbar.',
  'notice.expired': 'Deine Spotify-Anmeldung ist abgelaufen. Melde dich noch einmal an.',

  'header.mock': 'Mock',
  'header.mockTitle': 'Ein Spotify-Ersatz: Hier ist nichts echt',
  'header.account': 'Konto',
  'header.logout': 'Abmelden',

  'settings.title': 'Einstellungen',
  'settings.general': 'Allgemein',

  'composer.label': 'Nachricht',
  'composer.placeholder': 'Schreib eine Nachricht',
  'composer.submit': 'Songs finden',

  'playlist.label': 'Playlist',
  'playlist.songs.one': '{count} Song',
  'playlist.songs.other': '{count} Songs',
  'playlist.minutes': '{minutes} Min.',
  'playlist.length': 'Songlänge',
  'playlist.fewer': 'Weniger',
  'playlist.mixed': 'Gemischt',
  'playlist.more': 'Mehr',
  'playlist.shuffle': 'Neu mischen',
  'playlist.track': '{title} von {artists}',
  'playlist.alternatives.one': '{track}, {count} weiterer mit diesem Titel',
  'playlist.alternatives.other': '{track}, {count} weitere mit diesem Titel',
  'playlist.explicit': 'Explizit',
  'playlist.searching': 'Suche läuft…',
  'playlist.gap': 'Kein Song mit diesem Titel, wird ausgelassen',

  'alternatives.heading': 'Songs mit dem Titel „{phrase}“',
  'alternatives.label': 'Songs mit dem Titel {phrase}',

  'save.label': 'In Spotify speichern',
  'save.name': 'Name der Playlist',
  'save.public': 'Öffentlich',
  'save.create': 'Playlist erstellen',
  'save.creating': 'Wird erstellt…',
  'save.gaps.one': 'Für ein Wort gibt es keinen Song, es wird ausgelassen.',
  'save.gaps.other': 'Für {count} Wörter gibt es keinen Song, sie werden ausgelassen.',
  'save.done': 'In deinem Spotify gespeichert.',
  'save.donePrivate': 'In deinem Spotify gespeichert (privat).',
  'save.open': 'In Spotify öffnen',
  'save.share': 'Teilen',
  'save.copied': 'Link kopiert',

  'problem.partial': 'Spotify hat nicht jede Suche beantwortet, es können Songs fehlen. Versuch es in einer Minute noch einmal.',
  'problem.offline': 'Keine Verbindung. Prüf sie und versuch es noch einmal.',
  'problem.server': 'Auf dem Server ist etwas schiefgegangen. Versuch es noch einmal.',
  'problem.offlineSave': 'Keine Verbindung. Die Playlist wurde nicht erstellt.',
  'problem.saveFailed': 'Spotify hat die Playlist nicht erstellt. Versuch es noch einmal.',
};
