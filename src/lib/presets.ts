import type { GroupInput } from "./schemas";

/** Synthetic demo groups only. No real people's data. */
export interface Preset {
  id: string;
  label: string;
  blurb: string;
  emoji: string;
  group: GroupInput;
}

export const PRESETS: Preset[] = [
  {
    id: "nyc-tech-team",
    label: "Tech team social · New York",
    blurb: "Five coworkers, one Thursday night, one tricky vegetarian.",
    emoji: "💻",
    group: {
      eventType: "team social",
      city: "New York",
      budget: "$$",
      constraints: "One vegetarian. Venue should be step-free.",
      people: [
        { name: "Priya", favorites: [
          { name: "Radiohead", category: "music" }, { name: "Severance", category: "tv" },
          { name: "Dishoom", category: "food" }, { name: "Dune", category: "film" } ] },
        { name: "Marcus", favorites: [
          { name: "Kendrick Lamar", category: "music" }, { name: "The Bear", category: "tv" },
          { name: "Shake Shack", category: "food" }, { name: "Nike", category: "brand" } ] },
        { name: "Chen", favorites: [
          { name: "Tame Impala", category: "music" }, { name: "Blade Runner 2049", category: "film" },
          { name: "Ippudo", category: "food" }, { name: "Muji", category: "brand" } ] },
        { name: "Sofia", favorites: [
          { name: "Bad Bunny", category: "music" }, { name: "Succession", category: "tv" },
          { name: "Joe's Pizza", category: "food" }, { name: "The Strand", category: "place" } ] },
        { name: "Dev", favorites: [
          { name: "Daft Punk", category: "music" }, { name: "Ted Lasso", category: "tv" },
          { name: "Levain Bakery", category: "food" }, { name: "Dune", category: "film" } ] },
      ],
    },
  },
  {
    id: "london-birthday",
    label: "Birthday night · London",
    blurb: "Four friends celebrating Aisha's 30th.",
    emoji: "🎂",
    group: {
      eventType: "birthday",
      city: "London",
      budget: "$$$",
      constraints: "No shellfish (one allergy).",
      people: [
        { name: "Aisha", favorites: [
          { name: "Beyoncé", category: "music" }, { name: "Fleabag", category: "tv" },
          { name: "Dishoom", category: "food" }, { name: "Little Women", category: "film" } ] },
        { name: "Tom", favorites: [
          { name: "Arctic Monkeys", category: "music" }, { name: "Peaky Blinders", category: "tv" },
          { name: "Padella", category: "food" }, { name: "Adidas", category: "brand" } ] },
        { name: "Lena", favorites: [
          { name: "Florence + the Machine", category: "music" }, { name: "Normal People", category: "tv" },
          { name: "Barbican Centre", category: "place" } ] },
        { name: "Jamal", favorites: [
          { name: "Stormzy", category: "music" }, { name: "Top Boy", category: "tv" },
          { name: "Brick Lane Beigel Bake", category: "food" }, { name: "Spider-Man: Into the Spider-Verse", category: "film" } ] },
      ],
    },
  },
  {
    id: "lisbon-remote",
    label: "Remote team meetup · Lisbon",
    blurb: "Five teammates from four countries meet in person for the first time.",
    emoji: "🌍",
    group: {
      eventType: "offsite",
      city: "Lisbon",
      budget: "$$",
      constraints: "One person doesn't drink alcohol.",
      people: [
        { name: "Ana", favorites: [
          { name: "Caetano Veloso", category: "music" }, { name: "Money Heist", category: "tv" },
          { name: "Pastéis de Belém", category: "food" } ] },
        { name: "Liam", favorites: [
          { name: "Bon Iver", category: "music" }, { name: "Chef's Table", category: "tv" },
          { name: "Time Out Market", category: "place" }, { name: "Patagonia", category: "brand" } ] },
        { name: "Yuki", favorites: [
          { name: "Ryuichi Sakamoto", category: "music" }, { name: "Spirited Away", category: "film" },
          { name: "Ippudo", category: "food" }, { name: "Muji", category: "brand" } ] },
        { name: "Omar", favorites: [
          { name: "Khruangbin", category: "music" }, { name: "The Grand Budapest Hotel", category: "film" },
          { name: "Nando's", category: "food" } ] },
        { name: "Greta", favorites: [
          { name: "Lana Del Rey", category: "music" }, { name: "Lost in Translation", category: "film" },
          { name: "Eataly", category: "food" }, { name: "Haruki Murakami", category: "book" } ] },
      ],
    },
  },
];
