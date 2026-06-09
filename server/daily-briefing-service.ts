/**
 * Daily Briefing Service
 *
 * Haalt parallel op:
 * 1. Actueel weer voor Bottighofen, Zwitserland (Open-Meteo, gratis, geen API key)
 * 2. Wereldnieuws top 3 via LLM
 * 3. AI & Blockchain nieuws via LLM
 * 4. Dagelijkse wijze spreuk (wisselend per dag van het jaar)
 */

import { invokeLLM } from "./_core/llm";

// ─── Weer ────────────────────────────────────────────────────────────────────
// Bottighofen, Zwitserland (Frank's locatie)
const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=47.66&longitude=9.19" +
  "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m" +
  "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max" +
  "&timezone=Europe%2FZurich&forecast_days=1";

const WMO_CODES: Record<number, { nl: string; de: string; en: string; icon: string }> = {
  0:  { nl: "Helder",           de: "Klar",              en: "Clear sky",        icon: "☀️" },
  1:  { nl: "Overwegend helder",de: "Überwiegend klar",  en: "Mainly clear",     icon: "🌤️" },
  2:  { nl: "Gedeeltelijk bewolkt", de: "Teilweise bewölkt", en: "Partly cloudy", icon: "⛅" },
  3:  { nl: "Bewolkt",          de: "Bewölkt",           en: "Overcast",         icon: "☁️" },
  45: { nl: "Mist",             de: "Nebel",             en: "Fog",              icon: "🌫️" },
  48: { nl: "IJsmist",          de: "Eisnebel",          en: "Icy fog",          icon: "🌫️" },
  51: { nl: "Lichte motregen",  de: "Leichter Nieselregen", en: "Light drizzle", icon: "🌦️" },
  61: { nl: "Lichte regen",     de: "Leichter Regen",   en: "Light rain",       icon: "🌧️" },
  63: { nl: "Regen",            de: "Regen",             en: "Rain",             icon: "🌧️" },
  65: { nl: "Zware regen",      de: "Starker Regen",    en: "Heavy rain",       icon: "⛈️" },
  71: { nl: "Lichte sneeuw",    de: "Leichter Schnee",  en: "Light snow",       icon: "🌨️" },
  73: { nl: "Sneeuw",           de: "Schnee",            en: "Snow",             icon: "❄️" },
  80: { nl: "Regenbuien",       de: "Regenschauer",     en: "Rain showers",     icon: "🌦️" },
  95: { nl: "Onweer",           de: "Gewitter",          en: "Thunderstorm",     icon: "⛈️" },
};

function getWeatherDescription(code: number, lang: string): string {
  const entry = WMO_CODES[code] ?? WMO_CODES[0];
  return entry[lang as "nl" | "de" | "en"] ?? entry.en;
}

function getWeatherIcon(code: number): string {
  return (WMO_CODES[code] ?? WMO_CODES[0]).icon;
}

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  tempMax: number;
  tempMin: number;
  description: string;
  icon: string;
  windSpeed: number;
  humidity: number;
  uvIndex: number;
  precipitation: number;
  location: string;
}

async function fetchWeather(lang: string): Promise<WeatherData | null> {
  try {
    const res = await fetch(WEATHER_URL);
    if (!res.ok) return null;
    const data = await res.json();
    const c = data.current;
    const d = data.daily;
    return {
      temperature: Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      tempMax: Math.round(d.temperature_2m_max[0]),
      tempMin: Math.round(d.temperature_2m_min[0]),
      description: getWeatherDescription(c.weather_code, lang),
      icon: getWeatherIcon(c.weather_code),
      windSpeed: Math.round(c.wind_speed_10m),
      humidity: Math.round(c.relative_humidity_2m),
      uvIndex: Math.round(d.uv_index_max[0]),
      precipitation: Math.round(d.precipitation_sum[0] * 10) / 10,
      location: "Bottighofen, CH",
    };
  } catch (e) {
    console.error("[briefing] Weer ophalen mislukt:", e);
    return null;
  }
}

// ─── Wijze spreuken ───────────────────────────────────────────────────────────
const QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "It is not the strongest of the species that survives, but the most adaptable.", author: "Charles Darwin" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "The measure of intelligence is the ability to change.", author: "Albert Einstein" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "Logic will get you from A to B. Imagination will take you everywhere.", author: "Albert Einstein" },
  { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela" },
  { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "If life were predictable it would cease to be life, and be without flavor.", author: "Eleanor Roosevelt" },
  { text: "If you look at what you have in life, you'll always have more.", author: "Oprah Winfrey" },
  { text: "If you set your goals ridiculously high and it's a failure, you will fail above everyone else's success.", author: "James Cameron" },
  { text: "Life is not measured by the number of breaths we take, but by the moments that take our breath away.", author: "Maya Angelou" },
  { text: "If you want to live a happy life, tie it to a goal, not to people or things.", author: "Albert Einstein" },
  { text: "Never let the fear of striking out keep you from playing the game.", author: "Babe Ruth" },
  { text: "Money and success don't change people; they merely amplify what is already there.", author: "Will Smith" },
  { text: "Your most unhappy customers are your greatest source of learning.", author: "Bill Gates" },
  { text: "We need to accept that we won't always make the right decisions.", author: "Arianna Huffington" },
  { text: "When you cease to dream you cease to live.", author: "Malcolm Forbes" },
  { text: "Too many of us are not living our dreams because we are living our fears.", author: "Les Brown" },
  { text: "I have learned over the years that when one's mind is made up, this diminishes fear.", author: "Rosa Parks" },
  { text: "I didn't fail the test. I just found 100 ways to do it wrong.", author: "Benjamin Franklin" },
  { text: "You may say I'm a dreamer, but I'm not the only one.", author: "John Lennon" },
  { text: "I alone cannot change the world, but I can cast a stone across the water to create many ripples.", author: "Mother Teresa" },
  { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
  { text: "Spread love everywhere you go. Let no one ever come to you without leaving happier.", author: "Mother Teresa" },
  { text: "When you reach the end of your rope, tie a knot in it and hang on.", author: "Franklin D. Roosevelt" },
  { text: "Always remember that you are absolutely unique. Just like everyone else.", author: "Margaret Mead" },
  { text: "Do not go where the path may lead, go instead where there is no path and leave a trail.", author: "Ralph Waldo Emerson" },
  { text: "You will face many defeats in life, but never let yourself be defeated.", author: "Maya Angelou" },
  { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela" },
  { text: "In the end, it's not the years in your life that count. It's the life in your years.", author: "Abraham Lincoln" },
  { text: "Never let the fear of striking out keep you from playing the game.", author: "Babe Ruth" },
  { text: "Life is either a daring adventure or nothing at all.", author: "Helen Keller" },
  { text: "Many of life's failures are people who did not realize how close they were to success when they gave up.", author: "Thomas A. Edison" },
  { text: "You have brains in your head. You have feet in your shoes. You can steer yourself any direction you choose.", author: "Dr. Seuss" },
  { text: "If life were predictable it would cease to be life, and be without flavor.", author: "Eleanor Roosevelt" },
  { text: "The real test is not whether you avoid failure, because you won't. It's whether you let it harden or shame you into inaction.", author: "Barack Obama" },
  { text: "Definiteness of purpose is the starting point of all achievement.", author: "W. Clement Stone" },
  { text: "We must be willing to let go of the life we planned so as to have the life that is waiting for us.", author: "Joseph Campbell" },
  { text: "The biggest adventure you can take is to live the life of your dreams.", author: "Oprah Winfrey" },
  { text: "I am not a product of my circumstances. I am a product of my decisions.", author: "Stephen Covey" },
  { text: "Every child is an artist. The problem is how to remain an artist once he grows up.", author: "Pablo Picasso" },
  { text: "You can never cross the ocean until you have the courage to lose sight of the shore.", author: "Christopher Columbus" },
  { text: "I've learned that people will forget what you said, people will forget what you did, but people will never forget how you made them feel.", author: "Maya Angelou" },
  { text: "Either you run the day, or the day runs you.", author: "Jim Rohn" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
  { text: "The two most important days in your life are the day you are born and the day you find out why.", author: "Mark Twain" },
  { text: "Whatever the mind of man can conceive and believe, it can achieve.", author: "Napoleon Hill" },
  { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
  { text: "Two roads diverged in a wood, and I took the one less traveled by, and that has made all the difference.", author: "Robert Frost" },
  { text: "I attribute my success to this: I never gave or took any excuse.", author: "Florence Nightingale" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "I've missed more than 9000 shots in my career. I've lost almost 300 games. I've failed over and over again in my life. And that is why I succeed.", author: "Michael Jordan" },
  { text: "The most common way people give up their power is by thinking they don't have any.", author: "Alice Walker" },
  { text: "The mind is everything. What you think you become.", author: "Buddha" },
  { text: "The best revenge is massive success.", author: "Frank Sinatra" },
  { text: "People who are crazy enough to think they can change the world, are the ones who do.", author: "Rob Siltanen" },
  { text: "Failure will never overtake me if my determination to succeed is strong enough.", author: "Og Mandino" },
  { text: "Entrepreneurs are great at dealing with uncertainty and also very good at making something out of nothing.", author: "Naveen Jain" },
  { text: "We may encounter many defeats but we must not be defeated.", author: "Maya Angelou" },
  { text: "Knowing is not enough; we must apply. Wishing is not enough; we must do.", author: "Johann Wolfgang Von Goethe" },
  { text: "Imagine your life is perfect in every respect; what would it look like?", author: "Brian Tracy" },
  { text: "We generate fears while we sit. We overcome them by action.", author: "Dr. Henry Link" },
  { text: "Whether you are moving forward or backward, you are moving. The key is to keep moving.", author: "Oprah Winfrey" },
  { text: "Security is mostly a superstition. Life is either a daring adventure or nothing.", author: "Helen Keller" },
  { text: "The person who says it cannot be done should not interrupt the person who is doing it.", author: "Chinese Proverb" },
  { text: "There is only one way to avoid criticism: do nothing, say nothing, and be nothing.", author: "Aristotle" },
  { text: "Ask and it will be given to you; search, and you will find; knock and the door will be opened for you.", author: "Jesus Christ" },
  { text: "The secret of success is to do the common thing uncommonly well.", author: "John D. Rockefeller Jr." },
  { text: "I find that the harder I work, the more luck I seem to have.", author: "Thomas Jefferson" },
  { text: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
  { text: "Just when the caterpillar thought the world was ending, he turned into a butterfly.", author: "Proverb" },
  { text: "An unexamined life is not worth living.", author: "Socrates" },
  { text: "Eighty percent of success is showing up.", author: "Woody Allen" },
  { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "Winning isn't everything, but wanting to win is.", author: "Vince Lombardi" },
  { text: "You become what you believe.", author: "Oprah Winfrey" },
  { text: "The most difficult thing is the decision to act, the rest is merely tenacity.", author: "Amelia Earhart" },
  { text: "How wonderful it is that nobody need wait a single moment before starting to improve the world.", author: "Anne Frank" },
  { text: "When I stand before God at the end of my life, I would hope that I would not have a single bit of talent left.", author: "Erma Bombeck" },
  { text: "Few things can help an individual more than to place responsibility on him, and to let him know that you trust him.", author: "Booker T. Washington" },
  { text: "Certain things catch your eye, but pursue only those that capture the heart.", author: "Ancient Indian Proverb" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "We know what we are, but know not what we may be.", author: "William Shakespeare" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "When one door of happiness closes, another opens, but often we look so long at the closed door that we do not see the one that has been opened for us.", author: "Helen Keller" },
  { text: "Dream big and dare to fail.", author: "Norman Vaughan" },
  { text: "You can't use up creativity. The more you use, the more you have.", author: "Maya Angelou" },
  { text: "Do one thing every day that scares you.", author: "Eleanor Roosevelt" },
  { text: "What's money? A man is a success if he gets up in the morning and goes to bed at night and in between does what he wants to do.", author: "Bob Dylan" },
  { text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas A. Edison" },
  { text: "A person who never made a mistake never tried anything new.", author: "Albert Einstein" },
  { text: "The person who says it cannot be done should not interrupt the person who is doing it.", author: "Chinese Proverb" },
  { text: "There are no traffic jams along the extra mile.", author: "Roger Staubach" },
  { text: "It takes 20 years to build a reputation and five minutes to ruin it.", author: "Warren Buffett" },
  { text: "Challenges are what make life interesting and overcoming them is what makes life meaningful.", author: "Joshua J. Marine" },
  { text: "If you want to lift yourself up, lift up someone else.", author: "Booker T. Washington" },
  { text: "I am not a product of my circumstances. I am a product of my decisions.", author: "Stephen Covey" },
  { text: "Creativity is intelligence having fun.", author: "Albert Einstein" },
  { text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson" },
  { text: "You may be disappointed if you fail, but you are doomed if you don't try.", author: "Beverly Sills" },
  { text: "Remember that not getting what you want is sometimes a wonderful stroke of luck.", author: "Dalai Lama" },
  { text: "You can't go back and change the beginning, but you can start where you are and change the ending.", author: "C.S. Lewis" },
  { text: "If you're offered a seat on a rocket ship, don't ask what seat! Just get on.", author: "Sheryl Sandberg" },
  { text: "I learned that courage was not the absence of fear, but the triumph over it.", author: "Nelson Mandela" },
  { text: "Life shrinks or expands in proportion to one's courage.", author: "Anais Nin" },
  { text: "If you look at what you have in life, you'll always have more. If you look at what you don't have in life, you'll never have enough.", author: "Oprah Winfrey" },
  { text: "Remember no one can make you feel inferior without your consent.", author: "Eleanor Roosevelt" },
  { text: "Keep your face always toward the sunshine, and shadows will fall behind you.", author: "Walt Whitman" },
  { text: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson" },
  { text: "Go confidently in the direction of your dreams! Live the life you've imagined.", author: "Henry David Thoreau" },
  { text: "When I was 5 years old, my mother always told me that happiness was the key to life.", author: "John Lennon" },
  { text: "Once you choose hope, anything's possible.", author: "Christopher Reeve" },
  { text: "Don't judge each day by the harvest you reap but by the seeds that you plant.", author: "Robert Louis Stevenson" },
  { text: "Build your own dreams, or someone else will hire you to build theirs.", author: "Farrah Gray" },
  { text: "The battles that count aren't the ones for gold medals. The struggles within yourself, the invisible battles inside all of us, that's where it's at.", author: "Jesse Owens" },
  { text: "Education costs money. But then so does ignorance.", author: "Sir Claus Moser" },
  { text: "I have learned over the years that when one's mind is made up, this diminishes fear; knowing what must be done does away with fear.", author: "Rosa Parks" },
  { text: "It does not matter how slowly you does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "If you genuinely want something, don't wait for it – teach yourself to be impatient.", author: "Gurbaksh Chahal" },
  { text: "If you're not stubborn, you'll give up on experiments too soon. And if you're not flexible, you'll pound your head against the wall and you won't see a different solution to a problem you're trying to solve.", author: "Jeff Bezos" },
  { text: "If you want to achieve excellence, you can get there today. As of this second, quit doing less-than-excellent work.", author: "Thomas J. Watson" },
  { text: "All our dreams can come true, if we have the courage to pursue them.", author: "Walt Disney" },
  { text: "Good things come to people who wait, but better things come to those who go out and get them.", author: "Anonymous" },
  { text: "If you do what you always did, you will get what you always got.", author: "Anonymous" },
  { text: "Success is not how high you have climbed, but how you make a positive difference to the world.", author: "Roy T. Bennett" },
  { text: "Try to be a rainbow in someone's cloud.", author: "Maya Angelou" },
  { text: "If you can dream it, you can achieve it.", author: "Zig Ziglar" },
  { text: "Whatever you can do, or dream you can, begin it. Boldness has genius, power and magic in it.", author: "Johann Wolfgang von Goethe" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "An unexamined life is not worth living.", author: "Socrates" },
  { text: "Spread love everywhere you go.", author: "Mother Teresa" },
  { text: "When you reach the end of your rope, tie a knot in it and hang on.", author: "Franklin D. Roosevelt" },
  { text: "Always remember that you are absolutely unique. Just like everyone else.", author: "Margaret Mead" },
  { text: "Don't judge each day by the harvest you reap but by the seeds that you plant.", author: "Robert Louis Stevenson" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Tell me and I forget. Teach me and I remember. Involve me and I learn.", author: "Benjamin Franklin" },
  { text: "The best and most beautiful things in the world cannot be seen or even touched — they must be felt with the heart.", author: "Helen Keller" },
  { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
  { text: "Whoever is happy will make others happy too.", author: "Anne Frank" },
  { text: "You have brains in your head. You have feet in your shoes. You can steer yourself any direction you choose.", author: "Dr. Seuss" },
  { text: "If you want to live a happy life, tie it to a goal, not to people or things.", author: "Albert Einstein" },
  { text: "Never let the fear of striking out keep you from playing the game.", author: "Babe Ruth" },
  { text: "Money and success don't change people; they merely amplify what is already there.", author: "Will Smith" },
  { text: "Your most unhappy customers are your greatest source of learning.", author: "Bill Gates" },
  { text: "We need to accept that we won't always make the right decisions, that we'll screw up royally sometimes.", author: "Arianna Huffington" },
  { text: "I can't change the direction of the wind, but I can adjust my sails to always reach my destination.", author: "Jimmy Dean" },
  { text: "Happiness is not something readymade. It comes from your own actions.", author: "Dalai Lama" },
  { text: "If the wind will not serve, take to the oars.", author: "Latin Proverb" },
  { text: "You can't fall if you don't climb. But there's no joy in living your whole life on the ground.", author: "Unknown" },
  { text: "We must believe that we are gifted for something, and that this thing, at whatever cost, must be attained.", author: "Marie Curie" },
  { text: "Too many of us are not living our dreams because we are living our fears.", author: "Les Brown" },
  { text: "Challenges are what make life interesting and overcoming them is what makes life meaningful.", author: "Joshua J. Marine" },
  { text: "If you want to lift yourself up, lift up someone else.", author: "Booker T. Washington" },
  { text: "I have been impressed with the urgency of doing. Knowing is not enough; we must apply.", author: "Leonardo da Vinci" },
  { text: "Limitations live only in our minds. But if we use our imaginations, our possibilities become limitless.", author: "Jamie Paolinetti" },
  { text: "You take your life in your own hands, and what happens? A terrible thing: no one to blame.", author: "Erica Jong" },
  { text: "What's money? A man is a success if he gets up in the morning and goes to bed at night and in between does what he wants to do.", author: "Bob Dylan" },
  { text: "I didn't fail the test. I just found 100 ways to do it wrong.", author: "Benjamin Franklin" },
  { text: "In order to succeed, your desire for success should be greater than your fear of failure.", author: "Bill Cosby" },
  { text: "A person who never made a mistake never tried anything new.", author: "Albert Einstein" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It's not whether you get knocked down, it's whether you get up.", author: "Vince Lombardi" },
  { text: "People who wonder if the glass is half empty or half full miss the point. The glass is refillable.", author: "Unknown" },
  { text: "The question isn't who is going to let me; it's who is going to stop me.", author: "Ayn Rand" },
  { text: "When everything seems to be going against you, remember that the airplane takes off against the wind, not with it.", author: "Henry Ford" },
  { text: "It's not what you look at that matters, it's what you see.", author: "Henry David Thoreau" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "If you can't explain it simply, you don't understand it well enough.", author: "Albert Einstein" },
  { text: "The real opportunity for success lies within the person and not in the job.", author: "Zig Ziglar" },
  { text: "It is never too late to be what you might have been.", author: "George Eliot" },
  { text: "Life is what we make it, always has been, always will be.", author: "Grandma Moses" },
  { text: "The road to success and the road to failure are almost exactly the same.", author: "Colin R. Davis" },
  { text: "I believe every human has a finite number of heartbeats. I don't intend to waste any of mine.", author: "Neil Armstrong" },
  { text: "Begin anywhere.", author: "John Cage" },
  { text: "We become what we think about.", author: "Earl Nightingale" },
  { text: "Twenty years from now you will be more disappointed by the things that you didn't do than by the ones you did do.", author: "Mark Twain" },
  { text: "Life is not measured by the number of breaths we take, but by the moments that take our breath away.", author: "Maya Angelou" },
  { text: "Happiness is not something readymade. It comes from your own actions.", author: "Dalai Lama" },
  { text: "First, have a definite, clear practical ideal; a goal, an objective. Second, have the necessary means to achieve your ends.", author: "Aristotle" },
  { text: "If the shoe doesn't fit, must we change the foot?", author: "Gloria Steinem" },
  { text: "When you reach the end of your rope, tie a knot in it and hang on.", author: "Franklin D. Roosevelt" },
  { text: "Perfection is not attainable, but if we chase perfection we can catch excellence.", author: "Vince Lombardi" },
  { text: "Life is 10% what happens to me and 90% of how I react to it.", author: "Charles Swindoll" },
  { text: "The most common way people give up their power is by thinking they don't have any.", author: "Alice Walker" },
  { text: "The mind is everything. What you think you become.", author: "Buddha" },
  { text: "The best revenge is massive success.", author: "Frank Sinatra" },
  { text: "An unexamined life is not worth living.", author: "Socrates" },
  { text: "Spread love everywhere you go. Let no one ever come to you without leaving happier.", author: "Mother Teresa" },
];

export function getDailyQuote(): { text: string; author: string } {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return QUOTES[dayOfYear % QUOTES.length];
}

// ─── Nieuws via LLM ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Je bent Higgins, de persoonlijke AI-assistent van Frank van Carpe Diem GmbH.
Je spreekt beknopt en professioneel. Je geeft actuele, feitelijke informatie.
Vandaag is het ${new Date().toLocaleDateString("nl-NL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;

async function fetchWorldNews(lang: string): Promise<string[]> {
  const prompts: Record<string, string> = {
    nl: `Geef precies 3 van de meest relevante wereldnieuws headlines van vandaag voor een internationale ondernemer. Formaat: JSON array van strings, elke string max 15 woorden. Alleen de headlines, geen uitleg.`,
    de: `Gib genau 3 der relevantesten Weltnachrichten-Schlagzeilen von heute für einen internationalen Unternehmer. Format: JSON-Array von Strings, jeder String max 15 Wörter. Nur die Schlagzeilen, keine Erklärung.`,
    en: `Give exactly 3 of the most relevant world news headlines of today for an international entrepreneur. Format: JSON array of strings, each string max 15 words. Headlines only, no explanation.`,
  };
  try {
    const res = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompts[lang] ?? prompts.nl },
      ],
    });
    const raw = res?.choices?.[0]?.message?.content;
    const text = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.map((c: any) => c?.text ?? c).join("") : "";
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed.slice(0, 3).map(String);
    }
  } catch (e) {
    console.error("[briefing] Wereldnieuws ophalen mislukt:", e);
  }
  return lang === "de"
    ? ["Keine aktuellen Nachrichten verfügbar."]
    : lang === "en"
    ? ["No current news available."]
    : ["Geen actueel nieuws beschikbaar."];
}

async function fetchTechNews(lang: string): Promise<string[]> {
  const prompts: Record<string, string> = {
    nl: `Geef precies 3 van de meest innovatieve AI of blockchain nieuws headlines van vandaag. Formaat: JSON array van strings, elke string max 15 woorden. Alleen headlines.`,
    de: `Gib genau 3 der innovativsten KI- oder Blockchain-Nachrichten-Schlagzeilen von heute. Format: JSON-Array von Strings, max 15 Wörter pro String. Nur Schlagzeilen.`,
    en: `Give exactly 3 of the most innovative AI or blockchain news headlines of today. Format: JSON array of strings, max 15 words each. Headlines only.`,
  };
  try {
    const res = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompts[lang] ?? prompts.nl },
      ],
    });
    const raw = res?.choices?.[0]?.message?.content;
    const text = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.map((c: any) => c?.text ?? c).join("") : "";
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed.slice(0, 3).map(String);
    }
  } catch (e) {
    console.error("[briefing] Tech nieuws ophalen mislukt:", e);
  }
  return lang === "de"
    ? ["Keine aktuellen Tech-Nachrichten verfügbar."]
    : lang === "en"
    ? ["No current tech news available."]
    : ["Geen actueel tech nieuws beschikbaar."];
}

// ─── Hoofd export ─────────────────────────────────────────────────────────────
export interface DailyBriefingData {
  weather: WeatherData | null;
  worldNews: string[];
  techNews: string[];
  quote: { text: string; author: string };
  generatedAt: string;
}

export async function getDailyBriefing(lang: string = "nl"): Promise<DailyBriefingData> {
  const [weather, worldNews, techNews] = await Promise.allSettled([
    fetchWeather(lang),
    fetchWorldNews(lang),
    fetchTechNews(lang),
  ]);

  return {
    weather: weather.status === "fulfilled" ? weather.value : null,
    worldNews: worldNews.status === "fulfilled" ? worldNews.value : [],
    techNews: techNews.status === "fulfilled" ? techNews.value : [],
    quote: getDailyQuote(),
    generatedAt: new Date().toISOString(),
  };
}
