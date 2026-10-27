import { createRandom } from '@/engine/random';

export interface Quote {
  id: string;
  text: string;
  author: string;
  source: string;
}

/**
 * Public-domain excerpts, chosen to stay within a comfortable one- or
 * two-minute run and to avoid punctuation a standard keyboard cannot type.
 * Text and ids are stable: they are part of personal-best categories.
 */
export const QUOTES: readonly Quote[] = [
  {
    id: 'austen-pride-01',
    text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
    author: 'Jane Austen',
    source: 'Pride and Prejudice',
  },
  {
    id: 'melville-moby-01',
    text: 'Call me Ishmael. Some years ago, never mind how long precisely, having little or no money in my purse, I thought I would sail about a little and see the watery part of the world.',
    author: 'Herman Melville',
    source: 'Moby-Dick',
  },
  {
    id: 'twain-huck-01',
    text: "You don't know about me without you have read a book by the name of The Adventures of Tom Sawyer; but that ain't no matter.",
    author: 'Mark Twain',
    source: 'Adventures of Huckleberry Finn',
  },
  {
    id: 'dickinson-hope-01',
    text: 'Hope is the thing with feathers that perches in the soul, and sings the tune without the words, and never stops at all.',
    author: 'Emily Dickinson',
    source: 'Hope is the thing with feathers',
  },
  {
    id: 'whitman-multitudes-01',
    text: 'Do I contradict myself? Very well then I contradict myself, I am large, I contain multitudes.',
    author: 'Walt Whitman',
    source: 'Song of Myself',
  },
  {
    id: 'shakespeare-hamlet-01',
    text: 'There are more things in heaven and earth, Horatio, than are dreamt of in your philosophy.',
    author: 'William Shakespeare',
    source: 'Hamlet',
  },
  {
    id: 'shakespeare-tempest-01',
    text: 'We are such stuff as dreams are made on, and our little life is rounded with a sleep.',
    author: 'William Shakespeare',
    source: 'The Tempest',
  },
  {
    id: 'thoreau-walden-01',
    text: 'I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach.',
    author: 'Henry David Thoreau',
    source: 'Walden',
  },
  {
    id: 'emerson-selfreliance-01',
    text: 'Nothing is at last sacred but the integrity of your own mind. Absolve you to yourself, and you shall have the suffrage of the world.',
    author: 'Ralph Waldo Emerson',
    source: 'Self-Reliance',
  },
  {
    id: 'doyle-bohemia-01',
    text: 'It is a capital mistake to theorize before one has data. Insensibly one begins to twist facts to suit theories, instead of theories to suit facts.',
    author: 'Arthur Conan Doyle',
    source: 'A Scandal in Bohemia',
  },
  {
    id: 'carroll-looking-01',
    text: "Why, sometimes I've believed as many as six impossible things before breakfast.",
    author: 'Lewis Carroll',
    source: 'Through the Looking-Glass',
  },
  {
    id: 'bronte-jane-01',
    text: 'I am no bird; and no net ensnares me: I am a free human being with an independent will.',
    author: 'Charlotte Bronte',
    source: 'Jane Eyre',
  },
  {
    id: 'shelley-frankenstein-01',
    text: 'Nothing is so painful to the human mind as a great and sudden change.',
    author: 'Mary Shelley',
    source: 'Frankenstein',
  },
  {
    id: 'poe-raven-01',
    text: 'Once upon a midnight dreary, while I pondered, weak and weary, over many a quaint and curious volume of forgotten lore.',
    author: 'Edgar Allan Poe',
    source: 'The Raven',
  },
  {
    id: 'douglass-narrative-01',
    text: 'You have seen how a man was made a slave; you shall see how a slave was made a man.',
    author: 'Frederick Douglass',
    source: 'Narrative of the Life of Frederick Douglass',
  },
  {
    id: 'lincoln-gettysburg-01',
    text: 'The world will little note, nor long remember what we say here, but it can never forget what they did here.',
    author: 'Abraham Lincoln',
    source: 'Gettysburg Address',
  },
  {
    id: 'dickens-two-cities-01',
    text: 'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.',
    author: 'Charles Dickens',
    source: 'A Tale of Two Cities',
  },
  {
    id: 'wilde-dorian-01',
    text: 'The books that the world calls immoral are books that show the world its own shame.',
    author: 'Oscar Wilde',
    source: 'The Picture of Dorian Gray',
  },
  {
    id: 'wilde-earnest-01',
    text: 'I never travel without my diary. One should always have something sensational to read in the train.',
    author: 'Oscar Wilde',
    source: 'The Importance of Being Earnest',
  },
  {
    id: 'kipling-if-01',
    text: 'If you can keep your head when all about you are losing theirs and blaming it on you, if you can trust yourself when all men doubt you, but make allowance for their doubting too.',
    author: 'Rudyard Kipling',
    source: 'If',
  },
  {
    id: 'yeats-cloths-01',
    text: 'But I, being poor, have only my dreams; I have spread my dreams under your feet; tread softly because you tread on my dreams.',
    author: 'W. B. Yeats',
    source: 'He Wishes for the Cloths of Heaven',
  },
  {
    id: 'frost-road-01',
    text: 'Two roads diverged in a wood, and I, I took the one less traveled by, and that has made all the difference.',
    author: 'Robert Frost',
    source: 'The Road Not Taken',
  },
  {
    id: 'chopin-awakening-01',
    text: 'The voice of the sea is seductive; never ceasing, whispering, clamoring, murmuring, inviting the soul to wander for a spell in abysses of solitude.',
    author: 'Kate Chopin',
    source: 'The Awakening',
  },
  {
    id: 'hawthorne-scarlet-01',
    text: 'No man, for any considerable period, can wear one face to himself and another to the multitude, without finally getting bewildered as to which may be the true.',
    author: 'Nathaniel Hawthorne',
    source: 'The Scarlet Letter',
  },
  {
    id: 'james-middle-years-01',
    text: 'We work in the dark, we do what we can, we give what we have. Our doubt is our passion, and our passion is our task.',
    author: 'Henry James',
    source: 'The Middle Years',
  },
  {
    id: 'tolstoy-anna-01',
    text: 'All happy families are alike; each unhappy family is unhappy in its own way.',
    author: 'Leo Tolstoy',
    source: 'Anna Karenina',
  },
  {
    id: 'dickens-carol-01',
    text: 'I will honour Christmas in my heart, and try to keep it all the year.',
    author: 'Charles Dickens',
    source: 'A Christmas Carol',
  },
  {
    id: 'bronte-wuthering-01',
    text: "He's more myself than I am. Whatever our souls are made of, his and mine are the same.",
    author: 'Emily Bronte',
    source: 'Wuthering Heights',
  },
  {
    id: 'conrad-darkness-01',
    text: "It is impossible to convey the life-sensation of any given epoch of one's existence, that which makes its truth, its meaning, its subtle and penetrating essence.",
    author: 'Joseph Conrad',
    source: 'Heart of Darkness',
  },
  {
    id: 'stevenson-treasure-01',
    text: "Fifteen men on the dead man's chest, yo ho ho, and a bottle of rum!",
    author: 'Robert Louis Stevenson',
    source: 'Treasure Island',
  },
];

const QUOTES_BY_ID = new Map(QUOTES.map((quote) => [quote.id, quote]));

export function getQuoteById(id: string): Quote | null {
  return QUOTES_BY_ID.get(id) ?? null;
}

/**
 * Pick a quote for a seed. Passing the current quote id guarantees the next
 * run shows a different quote whenever the library has an alternative.
 */
export function pickQuote(seed: number, excludeId?: string): Quote {
  const random = createRandom(seed);
  const index = Math.min(QUOTES.length - 1, Math.floor(random() * QUOTES.length));
  const picked = QUOTES[index] ?? QUOTES[0];

  if (picked === undefined) {
    throw new Error('The quote library is empty.');
  }

  if (excludeId !== undefined && picked.id === excludeId && QUOTES.length > 1) {
    return QUOTES[(index + 1) % QUOTES.length] ?? picked;
  }

  return picked;
}

export function formatQuoteAttribution(quote: Quote): string {
  return `${quote.author}, ${quote.source}`;
}
