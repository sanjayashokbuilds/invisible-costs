"""Starting forecasts (before a user has any ratings), from UK time-use enjoyment data.

Source: UK Time Use Survey 2014-15 (Centre for Time Use Research). Respondents rated
how much they enjoyed each diary activity from 1 (not at all) to 7 (very much).
Group averages as compiled in "Enjoyment of different activities in the UK"
(UC3M Computational Social Science lab, 2025), built from the survey summary table:
https://csslab.uc3m.es/dataviz/projects/2025/100572934/

Caveats (also in the README):
- These are averages for broad activity groups, not for individual activities.
- They measure enjoyment in the moment, not regret afterwards, so they run high.
- They're only a starting point: a user's own ratings replace them after one log.

Run: python3 data-prep/build_priors.py
"""
import json
from pathlib import Path

# Survey activity group → mean enjoyment, 1–7
UKTUS_GROUPS = {
    "Social / Out-of-home": 6.07,
    "Leisure (Active)": 5.98,
    "Leisure (Passive)": 5.75,
    "Personal & Wellbeing": 5.64,
    "Communication & Media": 5.57,
    "Domestic / Household": 4.82,
}

# App category → survey group, following how time-use surveys code each activity
MAPPING = {
    "social": "Social / Out-of-home",   # socialising, going out
    "active": "Leisure (Active)",       # sport and exercise
    "other": "Leisure (Passive)",       # hobbies, culture, trips
    "food": "Personal & Wellbeing",     # eating is coded as personal care
    "screen": "Communication & Media",  # TV, internet, games
    "shopping": "Domestic / Household", # shopping is coded as a household activity
}


def to_ten(x):
    """Rescale 1–7 to the app's 1–10."""
    return round(1 + (x - 1) * 9 / 6, 1)


def build():
    priors = {cat: to_ten(UKTUS_GROUPS[group]) for cat, group in MAPPING.items()}
    for cat, group in MAPPING.items():
        print(f"  {cat:<9} {group:<24} {UKTUS_GROUPS[group]:.2f}/7 → {priors[cat]}/10")
    out = Path(__file__).resolve().parent / "priors.json"
    out.write_text(json.dumps(priors, indent=2))
    return priors


if __name__ == "__main__":
    build()
