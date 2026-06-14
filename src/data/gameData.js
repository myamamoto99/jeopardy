export const POINT_VALUES = [200, 400, 600, 800, 1000]

export const DEFAULT_CATEGORIES = [
  {
    name: 'History',
    clues: [
      {
        answer: 'This ancient wonder stood in Alexandria',
        question: 'What was the Lighthouse of Alexandria?',
        used: false,
      },
      {
        answer: 'He led the first circumnavigation of Earth',
        question: 'Who was Ferdinand Magellan?',
        used: false,
      },
      {
        answer: 'The year World War II ended',
        question: 'What is 1945?',
        used: false,
      },
      {
        answer: 'This empire built Machu Picchu',
        question: 'What is the Inca Empire?',
        used: false,
      },
      {
        answer: 'The first country to give women the vote',
        question: 'What is New Zealand?',
        used: false,
      },
    ],
  },
  {
    name: 'Science',
    clues: [
      {
        answer: 'The powerhouse of the cell',
        question: 'What is the mitochondria?',
        used: false,
      },
      {
        answer: 'This planet has the most moons',
        question: 'What is Saturn?',
        used: false,
      },
      {
        answer: 'The chemical symbol for gold',
        question: 'What is Au?',
        used: false,
      },
      {
        answer: 'This scientist developed the theory of relativity',
        question: 'Who is Albert Einstein?',
        used: false,
      },
      {
        answer: 'The hardest natural substance on Earth',
        question: 'What is a diamond?',
        used: false,
      },
    ],
  },
  {
    name: 'Pop Culture',
    clues: [
      {
        answer: "She sang 'Rolling in the Deep'",
        question: 'Who is Adele?',
        used: false,
      },
      {
        answer: 'This wizarding school is in Harry Potter',
        question: 'What is Hogwarts?',
        used: false,
      },
      {
        answer: 'The fictional kingdom in Frozen',
        question: 'What is Arendelle?',
        used: false,
      },
      {
        answer: 'This streaming service created Stranger Things',
        question: 'What is Netflix?',
        used: false,
      },
      {
        answer: 'He plays Iron Man in the MCU',
        question: 'Who is Robert Downey Jr.?',
        used: false,
      },
    ],
  },
  {
    name: 'Geography',
    clues: [
      {
        answer: 'The longest river in the world',
        question: 'What is the Nile?',
        used: false,
      },
      {
        answer: 'This country contains the Amazon rainforest',
        question: 'What is Brazil?',
        used: false,
      },
      {
        answer: 'The capital of Australia',
        question: 'What is Canberra?',
        used: false,
      },
      {
        answer: 'The smallest country in the world',
        question: 'What is Vatican City?',
        used: false,
      },
      {
        answer: 'This mountain range separates Europe from Asia',
        question: 'What are the Ural Mountains?',
        used: false,
      },
    ],
  },
  {
    name: 'Food & Drink',
    clues: [
      {
        answer: "This spice is the world's most expensive by weight",
        question: 'What is saffron?',
        used: false,
      },
      {
        answer: 'The main ingredient in guacamole',
        question: 'What is avocado?',
        used: false,
      },
      {
        answer: 'This country invented pizza',
        question: 'What is Italy?',
        used: false,
      },
      {
        answer: 'Sushi originated in this country',
        question: 'What is Japan?',
        used: false,
      },
      {
        answer: 'The base spirit in a margarita',
        question: 'What is tequila?',
        used: false,
      },
    ],
  },
  {
    name: 'Sports',
    clues: [
      {
        answer: 'The number of players on a basketball team',
        question: 'What is 5?',
        used: false,
      },
      {
        answer: 'This country has won the most FIFA World Cups',
        question: 'What is Brazil?',
        used: false,
      },
      {
        answer: 'The oldest tennis Grand Slam',
        question: 'What is Wimbledon?',
        used: false,
      },
      {
        answer: "Muhammad Ali's birth name",
        question: 'Who is Cassius Clay?',
        used: false,
      },
      {
        answer: 'This sport uses a shuttlecock',
        question: 'What is badminton?',
        used: false,
      },
    ],
  },
]

export function cloneDefaultCategories() {
  return JSON.parse(JSON.stringify(DEFAULT_CATEGORIES))
}