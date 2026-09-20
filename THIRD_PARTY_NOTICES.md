# Third-party data notices

LexiLoop's application code is licensed under the repository's MIT License. The generated vocabulary dataset in `data/library.generated.jsonl` also incorporates or is derived from the sources below. Redistributors should retain this file.

## wordfreq 3.1.1

The catalog-building script uses word frequencies and rankings from [wordfreq](https://github.com/rspeer/wordfreq). The wordfreq software is available under Apache License 2.0. Its combined data is distributed under Creative Commons Attribution-ShareAlike 4.0, with source-specific attribution documented by that project. LexiLoop distributes the generated JSONL dataset under CC BY-SA 4.0 to preserve those terms.

## Princeton WordNet 3.0 through NLTK 3.9.2

Definitions, senses and lexical relationships in generated cards derive from [Princeton WordNet](https://wordnet.princeton.edu/). WordNet permits use, copying, modification and distribution provided its copyright notice and license are retained. The full current notice is available on the [WordNet license page](https://wordnet.princeton.edu/license-and-commercial-use). NLTK provides the corpus reader used during the maintainer-only build.

## Tatoeba English CC0 export

Some example sentences come from the English `sentences_CC0` export published on [Tatoeba's downloads page](https://tatoeba.org/en/downloads). Those exported sentences are dedicated to the public domain under CC0. LexiLoop's generator filters and selects examples; the runtime does not call Tatoeba.

## Generated dataset terms

`data/library.generated.jsonl` is offered under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The 401 editorial cards in the TypeScript catalog remain covered by the repository license. Dataset licenses do not change the licenses of wordfreq, WordNet, Tatoeba, NLTK, or their original source material.
