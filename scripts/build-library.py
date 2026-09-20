#!/usr/bin/env python3
"""Build LexiLoop's licensed, reproducible 5,000-word production library.

This maintainer-only script expects wordfreq, NLTK WordNet, the NLTK stopword corpus,
better-profanity, and the Tatoeba English CC0 export. Runtime and
deployment installs do not need Python or these source datasets; the generated JSONL
file is committed and consumed only by the database seeder.
"""

from __future__ import annotations

import argparse
import bz2
import json
import math
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from better_profanity import profanity
from nltk.corpus import stopwords, wordnet as wn
from wordfreq import top_n_list, zipf_frequency

TARGET_TOTAL = 5_000
TARGET_LEVELS = {"A2": 300, "B1": 1_200, "B2": 2_000, "C1": 1_500}
POS_NAMES = {"n": "noun", "v": "verb", "a": "adjective", "r": "adverb", "s": "adjective"}
POS_PREFERENCE = {"v": 4, "a": 3, "r": 2, "n": 1}
WORD_RE = re.compile(r"^[a-z]+(?:['-][a-z]+)*$")
UNSAFE_TEXT_RE = re.compile(r"\b(?:fuck|shit|bitch|cunt|motherfuck)\w*\b", re.I)

# Frequency lists contain many discourse particles and web tokens. They are frequent,
# but they are not useful LexiLoop vocabulary targets.
EXCLUDED = {
    "also", "already", "almost", "although", "another", "any", "because", "besides",
    "both", "com", "could", "dr", "each", "either", "enough", "etc", "even", "every",
    "few", "hello", "hey", "hi", "however", "http", "https", "least", "less", "many",
    "maybe", "might", "more", "most", "mrs", "much", "must", "neither", "okay", "only",
    "other", "perhaps", "please", "quite", "rather", "really", "same", "several", "shall",
    "should", "some", "still", "such", "thank", "thanks", "therefore", "though", "too",
    "very", "would", "www", "yeah", "yes",
}
SPECIAL_PLURALS = {"analysis", "basis", "crisis", "news", "series", "species", "status"}
OUTDATED_OR_ABBREVIATED = {
    "anime", "apr", "aug", "cia", "est", "fbi", "feb", "gdp", "gop", "inc", "john",
    "johnny", "nasa", "nov", "oct", "oscar", "ref", "ron", "sat", "sec", "sen", "sent",
    "sep", "sept", "tho",
}
PREFERRED_SENSE = {"cherry": 2, "chess": 1}


def comparable(value: str) -> str:
    return "".join(
        character
        for character in unicodedata.normalize("NFKD", value.lower().strip())
        if not unicodedata.combining(character)
    )


def clean_definition(value: str) -> str:
    value = value.replace("`", "'").replace("  ", " ").strip(" ;")
    value = re.sub(r"\s*;\s*-+\s*[^;]+$", "", value)
    value = re.sub(r"^\([^)]*\)\s*", "", value)
    # Definitions also appear as exercise options, whose schema intentionally stays compact.
    return value[:210].rstrip(" ,;")


def clean_sentence(value: str) -> str | None:
    value = re.sub(r"\s+", " ", value.replace("`", "'")).strip()
    if (
        not 18 <= len(value) <= 180
        or "http" in value.lower()
        or profanity.contains_profanity(value)
        or UNSAFE_TEXT_RE.search(value)
    ):
        return None
    if len(value.split()) < 4 or re.search(r"(.)\1{4,}", value):
        return None
    words = value.split()
    if any(token[:1].isupper() and token.strip("'\".,!?;:") != "I" for token in words[1:]):
        return None
    if value[-1] not in ".!?":
        value += "."
    return value[0].upper() + value[1:]


def exact_word(sentence: str, word: str) -> bool:
    return bool(re.search(rf"(?<![A-Za-z]){re.escape(word)}(?![A-Za-z])", sentence, re.I))


def is_surface_inflection(word: str) -> bool:
    if word in SPECIAL_PLURALS:
        return False
    if word.endswith("ies") and wn.synsets(word[:-3] + "y"):
        return True
    if word.endswith("s") and not word.endswith(("ss", "us", "is")) and wn.synsets(word[:-1]):
        return True
    if word.endswith(("ing", "ed")):
        lemma = wn.morphy(word, wn.VERB)
        if lemma and lemma != word:
            return True
    return False


def choose_pos(word: str) -> str | None:
    available = [pos for pos in "nvar" if wn.synsets(word, pos=pos)]
    if not available:
        return None
    scores = {
        pos: sum(
            lemma.count()
            for synset in wn.synsets(word, pos=pos)
            for lemma in synset.lemmas()
            if lemma.name().lower() == word
        )
        for pos in available
    }
    if max(scores.values(), default=0):
        return max(available, key=lambda pos: (scores[pos], POS_PREFERENCE[pos]))
    for suffix, pos in (
        ("ly", "r"), ("ize", "v"), ("ise", "v"), ("ify", "v"), ("tion", "n"),
        ("ment", "n"), ("ness", "n"), ("ity", "n"), ("ance", "n"), ("ence", "n"),
        ("able", "a"), ("ible", "a"), ("ive", "a"), ("ous", "a"), ("ful", "a"),
        ("less", "a"), ("al", "a"), ("ic", "a"),
    ):
        if word.endswith(suffix) and pos in available:
            return pos
    return available[0]


def choose_synset(word: str, pos: str):
    synsets = wn.synsets(word, pos=pos)
    if word in PREFERRED_SENSE and PREFERRED_SENSE[word] < len(synsets):
        return synsets[PREFERRED_SENSE[word]]
    scores = [
        sum(lemma.count() for lemma in synset.lemmas() if lemma.name().lower() == word)
        for synset in synsets
    ]
    return synsets[max(range(len(synsets)), key=lambda index: scores[index])] if max(scores) else synsets[0]


def category_for(lexname: str, pos: str) -> list[str]:
    if lexname in {"noun.communication", "verb.communication"}:
        return ["Conversation", "Everyday"]
    if lexname in {"noun.cognition", "noun.attribute", "verb.cognition"}:
        return ["Academic", "Reading"]
    if lexname in {"noun.act", "noun.group", "noun.possession", "verb.social", "verb.creation"}:
        return ["Workplace", "Everyday"]
    if lexname in {"noun.feeling", "verb.emotion"} or pos in {"a", "r"}:
        return ["Conversation", "Reading"]
    return ["Everyday", "Conversation"]


def fallback_examples(word: str, pos: str) -> list[str]:
    return {
        "n": [
            f"The {word} became an important part of their conversation.",
            f"They discussed the {word} before making a final decision.",
        ],
        "v": [
            f"They chose to {word} after discussing the situation carefully.",
            f"It may help to {word} before the group makes its final decision.",
        ],
        "a": [
            f"Her response seemed {word} once everyone understood the situation.",
            f"The group described the final decision as {word}.",
        ],
        "r": [
            f"She responded {word} when the issue came up in conversation.",
            f"They handled the unexpected change {word}.",
        ],
    }[pos]


def sentence_score(sentence: str, word: str) -> tuple[int, int]:
    words = sentence.split()
    punctuation_penalty = 60 if re.search(r'["“”:]', sentence) else 20 if ";" in sentence else 0
    length_penalty = 100 if len(sentence) > 120 else 0
    leading_penalty = 20 if words and words[0].lower().strip("'\"") == word else 0
    proper_name_penalty = 30 if any(
        token[:1].isupper() and token.strip("'\".,!?;:") != "I" for token in words[1:]
    ) else 0
    return (
        punctuation_penalty + length_penalty + leading_penalty + proper_name_penalty,
        abs(len(sentence) - 60),
    )


def make_card(entry: dict[str, Any], tatoeba: dict[str, list[str]], distractors: list[dict[str, Any]]) -> dict[str, Any]:
    word, pos, synset = entry["word"], entry["pos"], entry["synset"]
    definition = clean_definition(synset.definition())
    candidates: list[str] = []
    for raw in [*synset.examples(), *tatoeba.get(word, [])]:
        sentence = clean_sentence(raw)
        if sentence and exact_word(sentence, word) and sentence not in candidates:
            candidates.append(sentence)
    candidates.sort(key=lambda sentence: sentence_score(sentence, word))
    examples = candidates[:2]
    for fallback in fallback_examples(word, pos):
        if len(examples) == 2:
            break
        examples.append(fallback)

    synonyms = []
    for lemma in synset.lemmas():
        synonym = lemma.name().replace("_", " ").lower()
        if synonym != word and synonym not in [item["word"] for item in synonyms]:
            synonyms.append(
                {
                    "word": synonym,
                    "distinction": f"Both are related, but “{word}” here specifically means {definition}.",
                }
            )
        if len(synonyms) == 3:
            break
    antonyms = []
    family = []
    for lemma in synset.lemmas():
        for related in lemma.antonyms():
            value = related.name().replace("_", " ").lower()
            if value not in antonyms:
                antonyms.append(value)
        for related in lemma.derivationally_related_forms():
            value = related.name().replace("_", " ").lower()
            if value != word and value not in family:
                family.append(value)
    article = "an" if word[0] in "aeiou" else "a"
    grammar_article = "an" if POS_NAMES[pos][0] in "aeiou" else "a"
    patterns = {
        "n": [f"the {word}", f"{article} {word}"],
        "v": [f"to {word}", f"{word} something"],
        "a": [f"a {word} situation", f"seem {word}"],
        "r": [f"respond {word}"],
    }[pos]
    wrong = [item for item in distractors if item["word"] != word][:2]
    explanation = f"In this sentence, “{word}” means {definition}."
    synonym = synonyms[0]["word"] if synonyms else "a related word"
    distinction = synonyms[0]["distinction"] if synonyms else explanation
    return {
        "word": word,
        "pronunciation": "",
        "partOfSpeech": POS_NAMES[pos],
        "difficulty": entry["difficulty"],
        "usefulness": entry["usefulness"],
        "categories": entry["categories"],
        "register": (
            "Less common and often precise; use it when the meaning fits the situation."
            if entry["difficulty"] == "C1"
            else "Standard modern English used in conversation and writing."
        ),
        "sensitive": False,
        "meanings": [{"definition": definition, "simple": definition, "examples": examples}],
        "scenario": f'You hear someone say, “{examples[1]}” The word names the idea in that moment precisely.',
        "whenToUse": f"Use “{word}” when you want to express this idea: {definition}.",
        "commonMistake": f"Use it as {grammar_article} {POS_NAMES[pos]}. Check the full sentence so the intended meaning is clear.",
        "synonyms": synonyms,
        "antonyms": antonyms[:5],
        "family": family[:8],
        "collocations": [],
        "patterns": patterns,
        "memoryHook": f'Connect “{word}” with this line: “{examples[0]}”',
        "exercises": [
            {
                "type": "meaning",
                "prompt": f"What does “{word}” mean here?",
                "options": [wrong[0]["definition"], definition, wrong[1]["definition"]],
                "answer": 1,
                "explanation": explanation,
            },
            {
                "type": "context",
                "prompt": re.sub(rf"(?<![A-Za-z]){re.escape(word)}(?![A-Za-z])", "_____", examples[0], flags=re.I),
                "options": [word, wrong[0]["word"], wrong[1]["word"]],
                "answer": 0,
                "explanation": f"{explanation} {examples[0]}",
            },
            {
                "type": "distinction",
                "prompt": f"Which explanation best distinguishes “{word}” from “{synonym}” in this lesson?",
                "options": [wrong[1]["definition"], distinction, wrong[0]["definition"]],
                "answer": 1,
                "explanation": distinction,
            },
            {
                "type": "application",
                "prompt": f"Which situation shows “{word}” in use?",
                "options": [wrong[0]["example"], examples[1], wrong[1]["example"]],
                "answer": 1,
                "explanation": f"{examples[1]} {explanation}",
            },
        ],
    }


def read_tatoeba(path: Path, wanted: set[str]) -> dict[str, list[str]]:
    found: dict[str, list[str]] = defaultdict(list)
    opener = bz2.open if path.suffix == ".bz2" else open
    with opener(path, "rt", encoding="utf-8") as source:
        for line in source:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 3:
                continue
            sentence = clean_sentence(parts[2])
            if not sentence:
                continue
            tokens = set(re.findall(r"[a-z]+(?:['-][a-z]+)*", sentence.lower())) & wanted
            for token in tokens:
                if exact_word(sentence, token):
                    found[token].append(sentence)
    return found


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--existing", type=Path, required=True)
    parser.add_argument("--tatoeba", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    existing_rows = json.loads(args.existing.read_text())
    existing = {row["word"] for row in existing_rows}
    existing_levels = Counter(row["difficulty"] for row in existing_rows)
    needed = {level: TARGET_LEVELS[level] - existing_levels[level] for level in TARGET_LEVELS}
    if sum(needed.values()) != TARGET_TOTAL - len(existing):
        raise SystemExit("The existing catalog count does not match the 5,000-word target.")

    ignored = set(stopwords.words("english")) | EXCLUDED
    profanity.load_censor_words()
    selected: list[dict[str, Any]] = []
    for rank, word in enumerate(top_n_list("en", 100_000), 1):
        if len(selected) == sum(needed.values()):
            break
        if (
            rank < 350
            or word in existing
            or word in ignored
            or word in OUTDATED_OR_ABBREVIATED
            or profanity.contains_profanity(word)
            or not WORD_RE.fullmatch(word)
            or not 3 <= len(word) <= 18
            or is_surface_inflection(word)
        ):
            continue
        pos = choose_pos(word)
        if not pos:
            continue
        synset = choose_synset(word, pos)
        definition = clean_definition(synset.definition())
        if (
            len(definition) < 10
            or synset.instance_hypernyms()
            or any(label in definition.lower() for label in ("offensive", "derogatory", "racial slur"))
        ):
            continue
        level_index = next(
            index
            for index, level in enumerate(TARGET_LEVELS)
            if len(selected) < sum(needed[name] for name in list(TARGET_LEVELS)[: index + 1])
        )
        difficulty = list(TARGET_LEVELS)[level_index]
        selected.append(
            {
                "word": word,
                "rank": rank,
                "zipf": zipf_frequency(word, "en"),
                "pos": pos,
                "synset": synset,
                "difficulty": difficulty,
                "usefulness": max(55, min(98, round(101 - 7 * math.log10(rank)))),
                "categories": category_for(synset.lexname(), pos),
                "definition": definition,
            }
        )
    if len(selected) != sum(needed.values()):
        raise SystemExit(f"Only found {len(selected)} suitable candidates.")

    tatoeba = read_tatoeba(args.tatoeba, {entry["word"] for entry in selected})
    compact = [
        {
            "word": entry["word"],
            "definition": entry["definition"],
            "example": next(
                iter(tatoeba.get(entry["word"], [])),
                fallback_examples(entry["word"], entry["pos"])[0],
            ),
        }
        for entry in selected
    ]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as output:
        for index, entry in enumerate(selected):
            distractors = [compact[(index + 137) % len(compact)], compact[(index + 521) % len(compact)]]
            row = {
                "source": "wordnet-wordfreq",
                "frequencyRank": entry["rank"],
                "normalizedWord": comparable(entry["word"]),
                "content": make_card(entry, tatoeba, distractors),
            }
            output.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")

    print(
        json.dumps(
            {
                "existing": len(existing),
                "generated": len(selected),
                "total": len(existing) + len(selected),
                "levels": dict(existing_levels + Counter(entry["difficulty"] for entry in selected)),
                "tatoebaCoverage": sum(bool(tatoeba.get(entry["word"])) for entry in selected),
                "lastFrequencyRank": selected[-1]["rank"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    try:
        main()
    except LookupError as error:
        print("Install/download the required NLTK corpora before building the library.", file=sys.stderr)
        raise error
