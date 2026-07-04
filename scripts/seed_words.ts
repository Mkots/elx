import { sql } from "drizzle-orm";
import { closeDatabase, type Database, db } from "../db/client.ts";
import { words } from "../db/schema.ts";

export interface WordSeed {
  value: string;
  isReal: boolean;
  difficulty: number;
  synonyms: string[];
  antonyms: string[];
  definition: string | null;
}

const realWords: WordSeed[] = [
  {
    "value": "window",
    "isReal": true,
    "difficulty": 1,
    "synonyms": [
      "windowpane",
    ],
    "antonyms": [],
    "definition": "The inedible parts of a grain-producing plant.",
  },
  {
    "value": "garden",
    "isReal": true,
    "difficulty": 1,
    "synonyms": [],
    "antonyms": [],
    "definition":
      "An outdoor area containing one or more types of plants, usually plants grown for food or ornamental purposes.",
  },
  {
    "value": "kitten",
    "isReal": true,
    "difficulty": 1,
    "synonyms": [
      "kitty",
    ],
    "antonyms": [],
    "definition":
      "A young cat, especially before sexual maturity (reached at about seven months).",
  },
  {
    "value": "spider",
    "isReal": true,
    "difficulty": 1,
    "synonyms": [],
    "antonyms": [],
    "definition":
      "Any of various eight-legged, predatory arthropods, of the order Araneae, most of which spin webs to catch prey.",
  },
  {
    "value": "harvest",
    "isReal": true,
    "difficulty": 1,
    "synonyms": [
      "glean",
      "crop",
      "reap",
      "harvesting",
      "harvest home",
    ],
    "antonyms": [],
    "definition": "The third season of the year; autumn; fall.",
  },
  {
    "value": "breeding",
    "isReal": true,
    "difficulty": 1,
    "synonyms": [
      "nurture",
      "nurturing",
      "refinement",
      "gentility",
      "fruitful",
    ],
    "antonyms": [],
    "definition": "Propagation of offspring through sexual reproduction.",
  },
  {
    "value": "festival",
    "isReal": true,
    "difficulty": 1,
    "synonyms": [
      "fete",
      "fiesta",
      "feast",
    ],
    "antonyms": [],
    "definition":
      "An event or community gathering, usually staged by a local community, which centers on some theme, sometimes on some unique aspect of the community.",
  },
  {
    "value": "morning",
    "isReal": true,
    "difficulty": 1,
    "synonyms": [
      "dayspring",
      "sunrise",
      "dawning",
      "first light",
      "forenoon",
    ],
    "antonyms": [
      "sundown",
      "sunset",
    ],
    "definition": "The part of the day from dawn to noon.",
  },
  {
    "value": "bottle",
    "isReal": true,
    "difficulty": 1,
    "synonyms": [
      "bottleful",
    ],
    "antonyms": [],
    "definition":
      "A container, typically made of glass or plastic and having a tapered neck, used primarily for holding liquids.",
  },
  {
    "value": "candle",
    "isReal": true,
    "difficulty": 1,
    "synonyms": [
      "taper",
      "cd",
      "standard candle",
      "wax light",
      "candela",
    ],
    "antonyms": [],
    "definition":
      "A light source consisting of a wick embedded in a solid, flammable substance such as wax, tallow, or paraffin.",
  },
  {
    "value": "denial",
    "isReal": true,
    "difficulty": 2,
    "synonyms": [
      "abnegation",
      "demurrer",
      "self-abnegation",
      "defence",
      "defense",
    ],
    "antonyms": [
      "prosecution",
    ],
    "definition": "The negation in logic.",
  },
  {
    "value": "generic",
    "isReal": true,
    "difficulty": 2,
    "synonyms": [
      "general",
      "nonproprietary",
    ],
    "antonyms": [],
    "definition": "A product sold under a generic name.",
  },
  {
    "value": "hasty",
    "isReal": true,
    "difficulty": 2,
    "synonyms": [
      "headlong",
      "precipitate",
      "hurried",
      "precipitant",
      "overhasty",
    ],
    "antonyms": [],
    "definition": "Acting in haste; being too hurried or quick",
  },
  {
    "value": "lengthy",
    "isReal": true,
    "difficulty": 2,
    "synonyms": [
      "prolonged",
      "protracted",
      "extended",
      "long",
      "drawn-out",
    ],
    "antonyms": [],
    "definition":
      "Having length; long and overextended, especially in time rather than dimension.",
  },
  {
    "value": "fluid",
    "isReal": true,
    "difficulty": 2,
    "synonyms": [
      "unstable",
      "smooth",
      "fluent",
      "graceful",
      "flowing",
    ],
    "antonyms": [],
    "definition":
      "Any substance which can flow with relative ease, tends to assume the shape of its container, and obeys Bernoulli's principle; a liquid, gas or plasma.",
  },
  {
    "value": "allied",
    "isReal": true,
    "difficulty": 2,
    "synonyms": [
      "related",
      "aligned",
      "confederative",
      "confederate",
      "united",
    ],
    "antonyms": [],
    "definition": "Joined as allies.",
  },
  {
    "value": "dispatch",
    "isReal": true,
    "difficulty": 2,
    "synonyms": [
      "discharge",
      "complete",
      "expedition",
      "hit",
      "remove",
    ],
    "antonyms": [],
    "definition":
      "A message sent quickly, as a shipment, a prompt settlement of a business, or an important official message sent by a diplomat, or military officer.",
  },
  {
    "value": "slain",
    "isReal": true,
    "difficulty": 2,
    "synonyms": [
      "dead",
    ],
    "antonyms": [],
    "definition": '(with "the") Those who have been killed.',
  },
  {
    "value": "platform",
    "isReal": true,
    "difficulty": 2,
    "synonyms": [
      "program",
      "chopine",
      "platforms",
      "political platform",
      "political program",
    ],
    "antonyms": [],
    "definition":
      "A raised stage from which speeches are made and on which musical and other performances are made.",
  },
  {
    "value": "gravy",
    "isReal": true,
    "difficulty": 2,
    "synonyms": [
      "windfall",
      "godsend",
      "bunce",
    ],
    "antonyms": [],
    "definition":
      "A thick sauce made from the fat or juices that come out from meat or vegetables as they are being cooked.",
  },
  {
    "value": "scornful",
    "isReal": true,
    "difficulty": 3,
    "synonyms": [
      "scurrilous",
      "disdainful",
      "opprobrious",
      "contemptuous",
      "offensive",
    ],
    "antonyms": [],
    "definition": "Showing scorn or disrespect; contemptuous.",
  },
  {
    "value": "ablaze",
    "isReal": true,
    "difficulty": 3,
    "synonyms": [
      "aroused",
      "passionate",
      "blazing",
      "alight",
      "aflame",
    ],
    "antonyms": [],
    "definition": "Burning fiercely; in a blaze; on fire.",
  },
  {
    "value": "stoutly",
    "isReal": true,
    "difficulty": 3,
    "synonyms": [],
    "antonyms": [],
    "definition": "In a stout manner; lustily; boldly; obstinately.",
  },
  {
    "value": "recipient",
    "isReal": true,
    "difficulty": 3,
    "synonyms": [
      "receiver",
    ],
    "antonyms": [],
    "definition": "One who receives.",
  },
  {
    "value": "bewitch",
    "isReal": true,
    "difficulty": 3,
    "synonyms": [
      "charm",
      "glamour",
      "beguile",
      "hex",
      "entrance",
    ],
    "antonyms": [],
    "definition": "To cast a spell upon.",
  },
  {
    "value": "evasive",
    "isReal": true,
    "difficulty": 3,
    "synonyms": [
      "ambiguous",
      "artful",
      "elusive",
      "equivocal",
      "protective",
    ],
    "antonyms": [],
    "definition":
      "Tending to avoid speaking openly or making revelations about oneself.",
  },
  {
    "value": "quaint",
    "isReal": true,
    "difficulty": 3,
    "synonyms": [
      "strange",
      "unusual",
      "old-time",
      "nonmodern",
    ],
    "antonyms": [],
    "definition": "Of a person: cunning, crafty.",
  },
  {
    "value": "shabby",
    "isReal": true,
    "difficulty": 3,
    "synonyms": [
      "ratty",
      "dishonorable",
      "tatty",
      "worn",
      "dishonourable",
    ],
    "antonyms": [],
    "definition": "Torn or worn; unkempt.",
  },
  {
    "value": "screech",
    "isReal": true,
    "difficulty": 3,
    "synonyms": [
      "shriek",
      "shrill",
      "scream",
      "squeak",
      "squawk",
    ],
    "antonyms": [],
    "definition":
      "A high-pitched strident or piercing sound, such as that between a moving object and any surface.",
  },
  {
    "value": "savoury",
    "isReal": true,
    "difficulty": 3,
    "synonyms": [
      "piquant",
      "zesty",
      "tasteful",
      "spicy",
      "appetizing",
    ],
    "antonyms": [
      "offensive",
      "unsavory",
      "unsavoury",
    ],
    "definition": "A savory snack.",
  },
  {
    "value": "eloquence",
    "isReal": true,
    "difficulty": 4,
    "synonyms": [
      "fluency",
    ],
    "antonyms": [],
    "definition":
      "The quality of artistry and persuasiveness in speech or writing.",
  },
  {
    "value": "cleanliness",
    "isReal": true,
    "difficulty": 4,
    "synonyms": [],
    "antonyms": [
      "uncleanliness",
    ],
    "definition":
      "The property of being cleanly, or habitually clean; good hygiene.",
  },
  {
    "value": "ingenious",
    "isReal": true,
    "difficulty": 4,
    "synonyms": [
      "cunning",
      "artful",
      "adroit",
      "clever",
      "inventive",
    ],
    "antonyms": [],
    "definition": "Displaying genius or brilliance; tending to invent.",
  },
  {
    "value": "eradicate",
    "isReal": true,
    "difficulty": 4,
    "synonyms": [
      "extirpate",
      "eliminate",
      "annihilate",
      "extinguish",
      "decimate",
    ],
    "antonyms": [],
    "definition": "To pull up by the roots; to uproot.",
  },
  {
    "value": "kindergarten",
    "isReal": true,
    "difficulty": 4,
    "synonyms": [],
    "antonyms": [],
    "definition":
      "An educational institution for young children, usually between ages 4 and 6; nursery school.",
  },
  {
    "value": "plaintive",
    "isReal": true,
    "difficulty": 4,
    "synonyms": [
      "sorrowful",
      "mournful",
    ],
    "antonyms": [],
    "definition": "Sounding sorrowful, mournful or melancholic.",
  },
  {
    "value": "mortgage",
    "isReal": true,
    "difficulty": 4,
    "synonyms": [],
    "antonyms": [],
    "definition":
      "A special form of secured loan where the purpose of the loan must be specified to the lender, to purchase assets that must be fixed (not movable) property, such as a house or piece of farm land. The assets are registered as the legal property of the borrower but the lender can seize them and dispose of them if they are not satisfied with the manner in which the repayment of the loan is conducted by the borrower. Once the loan is fully repaid, the lender loses this right of seizure and the assets are then deemed to be unencumbered.",
  },
  {
    "value": "censorship",
    "isReal": true,
    "difficulty": 4,
    "synonyms": [
      "censoring",
      "security review",
    ],
    "antonyms": [],
    "definition":
      "The use of state or group power to control freedom of expression or press, such as passing laws to prevent media from being published or propagated.",
  },
  {
    "value": "conjuror",
    "isReal": true,
    "difficulty": 4,
    "synonyms": [
      "conjurer",
      "prestidigitator",
      "magician",
      "illusionist",
      "conjure man",
    ],
    "antonyms": [],
    "definition": "One who conjures, a magician.",
  },
  {
    "value": "mucilage",
    "isReal": true,
    "difficulty": 4,
    "synonyms": [
      "gum",
      "glue",
    ],
    "antonyms": [],
    "definition":
      "A thick gluey substance (gum) produced by many plants and some microorganisms.",
  },
  {
    "value": "caudal",
    "isReal": true,
    "difficulty": 5,
    "synonyms": [
      "posterior",
      "caudate",
      "caudated",
      "taillike",
    ],
    "antonyms": [
      "cephalic",
    ],
    "definition": "A caudal vertebra.",
  },
  {
    "value": "fealty",
    "isReal": true,
    "difficulty": 5,
    "synonyms": [
      "allegiance",
    ],
    "antonyms": [],
    "definition":
      "Fidelity to one's lord or master; the feudal obligation by which the tenant or vassal was bound to be faithful to his lord",
  },
  {
    "value": "obsequious",
    "isReal": true,
    "difficulty": 5,
    "synonyms": [
      "servile",
      "insincere",
      "fawning",
      "sycophantic",
      "bootlicking",
    ],
    "antonyms": [],
    "definition": "Obedient; compliant with someone else's orders or wishes.",
  },
  {
    "value": "perspicacious",
    "isReal": true,
    "difficulty": 5,
    "synonyms": [
      "sagacious",
      "discerning",
      "sapient",
      "wise",
      "clear-sighted",
    ],
    "antonyms": [],
    "definition":
      "Of acute discernment; having keen insight; mentally perceptive.",
  },
  {
    "value": "lugubrious",
    "isReal": true,
    "difficulty": 5,
    "synonyms": [
      "sorrowful",
    ],
    "antonyms": [],
    "definition":
      "Gloomy, mournful or dismal, especially to an exaggerated degree.",
  },
  {
    "value": "sycophant",
    "isReal": true,
    "difficulty": 5,
    "synonyms": [
      "toady",
      "crawler",
      "lackey",
    ],
    "antonyms": [],
    "definition":
      "One who uses obsequious compliments to gain self-serving favor or advantage from another; a servile flatterer.",
  },
  {
    "value": "ineffable",
    "isReal": true,
    "difficulty": 5,
    "synonyms": [
      "sacred",
      "indefinable",
      "untellable",
      "unspeakable",
      "indescribable",
    ],
    "antonyms": [],
    "definition": "Beyond expression in words; unspeakable.",
  },
  {
    "value": "parsimony",
    "isReal": true,
    "difficulty": 5,
    "synonyms": [
      "niggardliness",
      "closeness",
      "parsimoniousness",
      "tightness",
      "niggardness",
    ],
    "antonyms": [],
    "definition": "Great reluctance to spend money unnecessarily.",
  },
  {
    "value": "quixotic",
    "isReal": true,
    "difficulty": 5,
    "synonyms": [
      "impractical",
      "wild-eyed",
      "romantic",
    ],
    "antonyms": [],
    "definition":
      "Possessing or acting with the desire to do noble and romantic deeds, without thought of realism and practicality; exceedingly idealistic.",
  },
  {
    "value": "mellifluous",
    "isReal": true,
    "difficulty": 5,
    "synonyms": [
      "dulcet",
      "sweet",
      "mellisonant",
      "melodious",
      "honeyed",
    ],
    "antonyms": [],
    "definition": "Flowing like honey.",
  },
];

const pseudoWords: WordSeed[] = [
  {
    "value": "plimber",
    "isReal": false,
    "difficulty": 2,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "snerdle",
    "isReal": false,
    "difficulty": 2,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "prabble",
    "isReal": false,
    "difficulty": 2,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "sprockle",
    "isReal": false,
    "difficulty": 2,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "flonker",
    "isReal": false,
    "difficulty": 2,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "chindle",
    "isReal": false,
    "difficulty": 2,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "plound",
    "isReal": false,
    "difficulty": 2,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "gondle",
    "isReal": false,
    "difficulty": 2,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "brastle",
    "isReal": false,
    "difficulty": 2,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "florant",
    "isReal": false,
    "difficulty": 3,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "crastic",
    "isReal": false,
    "difficulty": 3,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "thurpid",
    "isReal": false,
    "difficulty": 3,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "korvent",
    "isReal": false,
    "difficulty": 3,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "slimper",
    "isReal": false,
    "difficulty": 3,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "frabant",
    "isReal": false,
    "difficulty": 3,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "zibrant",
    "isReal": false,
    "difficulty": 3,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "twindle",
    "isReal": false,
    "difficulty": 3,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "morfent",
    "isReal": false,
    "difficulty": 3,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "quolent",
    "isReal": false,
    "difficulty": 4,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "glimber",
    "isReal": false,
    "difficulty": 4,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "vantric",
    "isReal": false,
    "difficulty": 4,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "perlnack",
    "isReal": false,
    "difficulty": 4,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "drantive",
    "isReal": false,
    "difficulty": 4,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "harnel",
    "isReal": false,
    "difficulty": 4,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
  {
    "value": "glunth",
    "isReal": false,
    "difficulty": 4,
    "synonyms": [],
    "antonyms": [],
    "definition": null,
  },
];
export const wordSeeds: WordSeed[] = [...realWords, ...pseudoWords];

export async function seedWords(db: Database): Promise<number> {
  await db
    .insert(words)
    .values(wordSeeds)
    .onConflictDoUpdate({
      target: words.value,
      set: {
        isReal: sql`excluded.is_real`,
        difficulty: sql`excluded.difficulty`,
        synonyms: sql`excluded.synonyms`,
        antonyms: sql`excluded.antonyms`,
        definition: sql`excluded.definition`,
      },
    });

  return wordSeeds.length;
}

if (import.meta.main) {
  try {
    const count = await seedWords(db);
    console.log(`Seeded ${count} words (real + pseudowords).`);
  } finally {
    await closeDatabase();
  }
}
