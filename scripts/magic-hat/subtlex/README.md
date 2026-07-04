# SUBTLEX-US Frequency Data

This directory contains the SUBTLEX-US frequency database used for difficulty
and Zipf calculations during vocabulary enrichment.

## Data Source & License

- **Source**: Ghent University, Department of Experimental Psychology
- **Official URL**:
  https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexus
- **GitHub mirror raw URL**:
  https://raw.githubusercontent.com/cltl/python-for-text-analysis/master/Data/SUBTLEX-US/SUBTLEXus74286wordstextversion.txt
- **File Name**: `SUBTLEXus74286wordstextversion.txt`
- **Format**: Tab-separated values (TSV) with a header row.

## Manual Download Instructions

To fetch the file manually, run the following command in the repository root:

```bash
mkdir -p scripts/magic-hat/subtlex
curl -sSfL "https://raw.githubusercontent.com/cltl/python-for-text-analysis/master/Data/SUBTLEX-US/SUBTLEXus74286wordstextversion.txt" -o scripts/magic-hat/subtlex/SUBTLEXus74286wordstextversion.txt
```
