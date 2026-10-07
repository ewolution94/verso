// Verso's own texts, in English: the source every other language is typed against (de.ts).
// Song titles, artists and albums are Spotify's and never pass through here.

export const en = {
  'login.line': 'Messages spelled in song titles.',
  'login.button': 'Log in with Spotify',
  'login.unconfigured': 'Set SPOTIFY_CLIENT_ID on the server first, or run',

  'notice.denied': 'Login cancelled.',
  'notice.failed': 'That login didn’t work. Try again.',
  'notice.notAllowed': 'This Spotify account isn’t on Verso’s list yet. In development mode Spotify allows five accounts per app, added by the owner.',
  'notice.unconfigured': 'No Spotify app is set up on this server (SPOTIFY_CLIENT_ID).',
  'notice.unreachable': 'Verso can’t be reached right now.',
  'notice.expired': 'Your Spotify login has expired. Log in again.',

  'header.mock': 'Mock',
  'header.mockTitle': 'A stand-in Spotify: nothing here is real',
  'header.account': 'Account',
  'header.logout': 'Log out',

  'settings.title': 'Settings',
  'settings.general': 'General',

  'composer.label': 'Message',
  'composer.placeholder': 'Type a message',
  'composer.submit': 'Find songs',

  'playlist.label': 'Playlist',
  'playlist.songs.one': '{count} song',
  'playlist.songs.other': '{count} songs',
  'playlist.minutes': '{minutes} min',
  'playlist.length': 'Song length',
  'playlist.fewer': 'Fewer',
  'playlist.mixed': 'Mixed',
  'playlist.more': 'More',
  'playlist.shuffle': 'Shuffle',
  'playlist.track': '{title} by {artists}',
  'playlist.alternatives.one': '{track}, {count} more with this title',
  'playlist.alternatives.other': '{track}, {count} more with this title',
  'playlist.explicit': 'Explicit',
  'playlist.searching': 'Searching…',
  'playlist.gap': 'No song by this name, left out',

  'alternatives.heading': 'Songs called “{phrase}”',
  'alternatives.label': 'Songs called {phrase}',

  'save.label': 'Save to Spotify',
  'save.name': 'Playlist name',
  'save.public': 'Public',
  'save.create': 'Create playlist',
  'save.creating': 'Creating…',
  'save.gaps.one': 'One word has no song and will be left out.',
  'save.gaps.other': '{count} words have no song and will be left out.',
  'save.done': 'Saved to your Spotify.',
  'save.donePrivate': 'Saved to your Spotify (private).',
  'save.open': 'Open in Spotify',
  'save.share': 'Share',
  'save.copied': 'Link copied',

  'problem.partial': 'Spotify didn’t answer every search, so some songs may be missing. Try again in a minute.',
  'problem.offline': 'No connection. Check it and try again.',
  'problem.server': 'Something went wrong on the server. Try again.',
  'problem.offlineSave': 'No connection. The playlist wasn’t created.',
  'problem.saveFailed': 'Spotify didn’t create the playlist. Try again.',
} as const;

export type MessageKey = keyof typeof en;
