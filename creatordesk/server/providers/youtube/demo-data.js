// Deterministic demo channel + video dataset for the mock YouTube provider.
// Theme: music production & gigging (matches the iConnect creator audience).

export const DEMO_CHANNEL = {
  id: 'UC-demo-studio-stage',
  title: 'Studio & Stage',
  description: 'Practical home studio, mixing, and gigging advice for independent musicians.',
  thumbnail: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2288%22%20height%3D%2288%22%3E%3Crect%20width%3D%2288%22%20height%3D%2288%22%20fill%3D%22%230f172a%22%2F%3E%3Ctext%20x%3D%2244%22%20y%3D%2254%22%20text-anchor%3D%22middle%22%20font-size%3D%2236%22%20fill%3D%22%23f97316%22%3ESS%3C%2Ftext%3E%3C%2Fsvg%3E',
  stats: { subscriberCount: 12400, viewCount: 486000, videoCount: 5 },
};

export const DEMO_VIDEOS = [
  {
    id: 'demo-home-studio-101',
    title: 'Home Studio on a Budget: The Only Gear You Actually Need',
    description: 'Building a home studio without wasting money.',
    publishedAt: '2026-09-20T10:00:00Z',
    duration: 812,
    thumbnailUrl: '',
    tags: ['home studio', 'music production', 'audio gear'],
    stats: { viewCount: 8400, likeCount: 610, commentCount: 54 },
    transcript: {
      segments: [
        { start: 0, text: 'You do NOT need a $2000 studio to make release-ready music. Here is the exact gear I would buy today.' },
        { start: 55, text: 'First, the audio interface. Why the cheap two-channel options are enough, and which specs actually matter.' },
        { start: 168, text: 'Microphones compared: the one dynamic mic that beats condensers in untreated rooms.' },
        { start: 305, text: 'Headphones versus monitors, and why your room is the real problem you should fix first.' },
        { start: 470, text: 'Free and paid software: the DAW choices, plugins worth owning, and the ones to skip.' },
        { start: 640, text: 'The full signal chain, cable checklist, and how to set levels so nothing clips on day one.' },
      ],
    },
  },
  {
    id: 'demo-afrobeats-drums',
    title: 'Afrobeats Drum Patterns That Hit Harder',
    description: 'Drum programming tips.',
    publishedAt: '2026-09-12T10:00:00Z',
    duration: 645,
    thumbnailUrl: '',
    tags: ['afrobeats', 'drums', 'music production'],
    stats: { viewCount: 15200, likeCount: 1210, commentCount: 132 },
    transcript: {
      segments: [
        { start: 0, text: 'Why do some Afrobeats drums feel alive while others sound flat? It comes down to three patterns I will show you now.' },
        { start: 48, text: 'Pattern one: the log drum bounce. Grid placement, velocity curves, and the ghost notes nobody programs.' },
        { start: 175, text: 'Pattern two: shaker and percussion layers that create the swing everyone calls groove.' },
        { start: 320, text: 'Pattern three: kick and bass sidechain relationships, with the exact settings I use.' },
        { start: 470, text: 'Putting it together: a full loop built from scratch in real time.' },
        { start: 585, text: 'One mistake to avoid with quantize, and how to humanize the final loop.' },
      ],
    },
  },
  {
    id: 'demo-mixing-vocals',
    title: 'Mixing Vocals: From Raw Take to Radio Polish',
    description: 'A vocal mixing walkthrough.',
    publishedAt: '2026-09-02T10:00:00Z',
    duration: 1104,
    thumbnailUrl: '',
    tags: ['mixing', 'vocals', 'music production'],
    stats: { viewCount: 6100, likeCount: 420, commentCount: 38 },
    transcript: {
      segments: [
        { start: 0, text: 'A raw vocal take can sound finished in twelve minutes. Watch this full chain, step by step.' },
        { start: 90, text: 'Editing and comping first: why clean takes beat any plugin fix you can buy.' },
        { start: 260, text: 'Subtractive EQ: the three cuts I make on almost every vocal, and how to find them by ear.' },
        { start: 430, text: 'Compression in two stages, with the ratio and attack settings that keep vocals natural.' },
        { start: 640, text: 'Saturation, de-essing, and the short reverb trick that pushes the vocal forward.' },
        { start: 860, text: 'Automation passes: the quiet edit that separates demo mixes from released records.' },
        { start: 1010, text: 'Before and after, plus the checklist I use on every session.' },
      ],
    },
  },
  {
    id: 'demo-first-gig-checklist',
    title: 'Your First Paid Gig: A Complete Checklist',
    description: 'Getting ready for your first show.',
    publishedAt: '2026-08-24T10:00:00Z',
    duration: 522,
    thumbnailUrl: '',
    tags: ['gigs', 'live music', 'performing'],
    stats: { viewCount: 4900, likeCount: 380, commentCount: 41 },
    transcript: {
      segments: [
        { start: 0, text: 'Booked your first paid gig? Do these seven things before you leave the house or the show falls apart.' },
        { start: 62, text: 'The contract basics: deposit, cancellation terms, and who brings what gear.' },
        { start: 175, text: 'Your setlist structure: opening song, energy curve, and the two-song encore plan.' },
        { start: 290, text: 'Soundcheck etiquette that sound engineers actually appreciate.' },
        { start: 390, text: 'Merger table, QR codes, and turning one gig into three bookings.' },
        { start: 465, text: 'The post-show follow up template that converts venues into regulars.' },
      ],
    },
  },
  {
    id: 'demo-phone-music-videos',
    title: 'Film a Music Video With Just Your Phone',
    description: 'Phone videography tips for musicians.',
    publishedAt: '2026-08-10T10:00:00Z',
    duration: 738,
    thumbnailUrl: '',
    tags: ['music video', 'videography', 'smartphone'],
    stats: { viewCount: 3300, likeCount: 210, commentCount: 19 },
    transcript: {
      segments: [
        { start: 0, text: 'Your phone shoots better footage than the cameras behind half the videos online. Here is how to use it properly.' },
        { start: 70, text: 'Settings first: frame rate, exposure lock, and why auto mode ruins performance shots.' },
        { start: 210, text: 'Lighting with what you own: window light, one lamp, and the ten-dollar upgrade.' },
        { start: 385, text: 'Five shot types that make an edit feel professional, with camera movement you can do handheld.' },
        { start: 545, text: 'Audio matters even in a video: syncing clean takes and hiding room noise.' },
        { start: 660, text: 'Editing on the phone: pacing to the beat, color in thirty seconds, and export settings for YouTube.' },
      ],
    },
  },
];
