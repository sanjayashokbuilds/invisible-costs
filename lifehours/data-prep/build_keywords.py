"""Builds js/keywords.js — the vocabulary used to auto-categorise what students type.

Method
1. Start from the spending categories that UK student surveys actually measure.
2. Keep only discretionary categories (essentials are flagged, not tracked).
3. Map each survey category onto the app's six categories using the first-match rule.
4. Expand each one into the words students actually type (brands, slang, items).

Sources (see SOURCES below) give the categories and amounts; the item-level words
are written by hand from those category definitions, because no survey publishes the
raw text students type.

Run: python3 data-prep/build_keywords.py
"""
import json
from pathlib import Path

SOURCES = {
    "NSMS25": "Save the Student, National Student Money Survey 2025 (1,151 students)",
    "NSMS26": "Save the Student, National Student Money Survey 2026",
    "NWSLI25": "NatWest Student Living Index 2025 (via UCAS)",
}

# Each survey category → app category, with its average monthly spend where published.
# Order inside the app is decided by categorise.js, not here.
SURVEY_CATEGORIES = [
    # ---- discretionary → tracked ----
    {"survey": "Clothes and shopping", "src": ["NSMS25", "NSMS26"], "monthly": {"NSMS25": 40, "NSMS26": 33},
     "app": "shopping", "keywords": [
        "clothes", "clothing", "outfit", "trainers", "shoes", "sliders", "boots", "hoodie", "jumper",
        "jacket", "coat", "jeans", "trousers", "joggers", "tracksuit", "dress", "shirt", "t-shirt",
        "accessories", "jewellery", "handbag", "sunglasses", "asos", "shein", "zara", "h&m",
        "primark", "uniqlo", "jd", "jd sports", "nike", "adidas", "north face", "vinted", "depop", "ebay",
        "amazon", "temu", "haul", "online shopping", "online order", "shopping spree", "merch",
        "gadget", "tech", "headphones", "airpods", "earbuds", "speaker", "phone case", "charger",
        "keyboard", "monitor", "console", "vr headset", "vinyl", "poster", "decor", "candle", "plant"]},
    {"survey": "Clothing, shoes and accessories", "src": ["NWSLI25"], "monthly": {"NWSLI25": 123.30},
     "app": "shopping", "keywords": []},  # covered above
    {"survey": "Health and wellbeing (products)", "src": ["NSMS25", "NSMS26"], "monthly": {"NSMS25": 24, "NSMS26": 21},
     "app": "shopping", "keywords": [
        "skincare", "makeup", "make up", "perfume", "aftershave", "cologne", "fragrance", "moisturiser",
        "serum", "sephora", "boots haul", "supplements", "protein powder", "creatine", "pre workout"]},
    {"survey": "Gifts and charity (gifts)", "src": ["NSMS25", "NSMS26"], "monthly": {"NSMS25": 17, "NSMS26": 16},
     "app": "shopping", "keywords": ["gift", "present", "birthday present", "flowers"]},

    {"survey": "Health and wellbeing (exercise)", "src": ["NSMS25", "NSMS26"], "monthly": None,
     "app": "active", "keywords": [
        "gym", "puregym", "the gym group", "workout", "lifting", "weights", "class", "spin", "hiit",
        "crossfit", "yoga", "pilates", "boxing", "kickboxing", "martial arts", "bjj", "run", "running",
        "parkrun", "jog", "swim", "swimming", "climbing", "bouldering", "cycling", "bike ride", "hike",
        "hiking", "walk", "football", "five a side", "5 a side", "5-a-side", "padel", "tennis", "squash",
        "badminton", "table tennis", "basketball", "netball", "rugby", "cricket", "hockey", "volleyball",
        "golf", "driving range", "topgolf", "bowling", "skate", "skating", "ice skating", "ski", "skiing",
        "snowboarding", "surfing", "rowing", "dance class", "trampoline", "sports society", "training"]},

    {"survey": "Subscriptions (streaming, apps)", "src": ["NSMS25", "NSMS26"], "monthly": {"NSMS25": 13, "NSMS26": 14},
     "app": "screen", "keywords": [
        "netflix", "disney+", "disney plus", "prime video", "now tv", "apple tv", "crunchyroll", "dazn",
        "sky sports", "youtube premium", "twitch", "patreon", "onlyfans", "streaming", "binge", "series",
        "tv", "film at home", "movie night in"]},
    {"survey": "Leisure screen time (time cost)", "src": ["NSMS25"], "monthly": None,
     "app": "screen", "keywords": [
        "tiktok", "instagram", "insta", "reels", "snapchat", "youtube", "shorts", "twitter", "x app",
        "reddit", "pinterest", "scrolling", "scroll", "doomscrolling", "phone", "online",
        "gaming", "video games", "game", "games", "fifa", "fc 25", "fc 26", "fortnite", "cod",
        "call of duty", "warzone", "valorant", "league of legends", "minecraft", "gta", "roblox", "rocket league",
        "xbox", "playstation", "ps5", "nintendo switch", "steam", "pc gaming", "in-game purchase",
        "skins", "battle pass", "v-bucks", "loot box",
        "online betting", "betting app", "online casino", "bet365", "sky bet", "paddy power app", "sports bet",
        "online poker", "stake", "slots"]},

    {"survey": "Going out", "src": ["NSMS25", "NSMS26", "NWSLI25"], "monthly": {"NSMS25": 61, "NSMS26": 60},
     "app": "social", "keywords": [
        "pub", "spoons", "wetherspoons", "club", "clubbing", "night out", "nightout", "going out", "pres",
        "predrinks", "pre drinks", "afters", "party", "house party", "bar", "cocktails", "drinks", "pints",
        "pint", "shots", "social", "society social", "su", "union", "students union", "bop",
        "fabric", "ministry", "karaoke", "comedy", "gig", "concert", "festival", "rave", "cinema", "theatre",
        "date", "birthday", "birthday drinks", "with friends", "with mates", "with flatmates", "with the boys",
        "with the girls", "catch up", "hang out", "hangout", "bottomless brunch", "escape room",
        "darts", "pool", "board games", "board game night", "mini golf", "axe throwing", "quiz", "pub quiz", "boat party", "uber home"]},
    {"survey": "Holidays and events (events)", "src": ["NSMS25", "NSMS26"], "monthly": {"NSMS25": 32, "NSMS26": 32},
     "app": "social", "keywords": ["ball", "formal", "gala", "event tickets", "tickets"]},

    {"survey": "Takeaways and eating out", "src": ["NSMS25", "NSMS26", "NWSLI25"], "monthly": {"NSMS25": 49, "NSMS26": 45},
     "app": "food", "keywords": [
        "takeaway", "take away", "deliveroo", "uber eats", "ubereats", "just eat", "food delivery",
        "mcdonalds", "maccies", "maccas", "kfc", "burger king", "nandos", "five guys", "wingstop",
        "popeyes", "subway", "dominos", "papa johns", "pizza", "pizza hut", "burger", "chicken shop",
        "chippy", "fish and chips", "kebab", "curry", "indian", "chinese", "thai", "sushi", "wagamama",
        "ramen", "tacos", "burrito", "chipotle", "greggs", "sausage roll", "pret", "leon", "itsu",
        "wasabi", "meal deal", "coffee", "latte", "flat white", "iced coffee", "matcha", "starbucks",
        "costa", "caffe nero", "gail's", "gails", "bubble tea", "boba", "smoothie", "energy drink",
        "monster", "red bull", "snack", "snacks", "crisps", "chocolate", "sweets", "dessert", "cake",
        "ice cream", "milkshake", "krispy kreme", "doughnut", "donut", "cookie", "brunch", "breakfast",
        "lunch", "dinner", "restaurant", "eating out", "eat out", "cheat meal", "food", "late night food",
        "vending machine", "canteen"]},
    {"survey": "Alcohol (top spending error, 32%)", "src": ["NWSLI25"], "monthly": None,
     "app": "food", "keywords": ["wine", "beer", "cans", "vodka", "gin", "rum", "buzzballz", "alcohol", "booze"]},

    {"survey": "Holidays and events (trips)", "src": ["NSMS25", "NSMS26"], "monthly": None,
     "app": "other", "keywords": [
        "holiday", "trip", "weekend away", "city break", "flight", "ryanair", "easyjet", "airbnb", "hostel",
        "hotel", "train to", "uber", "day trip", "museum", "gallery", "exhibition", "zoo", "theme park"]},
    {"survey": "Health and wellbeing (services)", "src": ["NSMS25", "NSMS26"], "monthly": None,
     "app": "other", "keywords": ["haircut", "barber", "barbers", "hairdresser", "nails", "lashes",
                                 "brows", "tan", "massage", "spa", "tattoo", "piercing"]},
    {"survey": "Other (hobbies)", "src": ["NSMS25", "NSMS26"], "monthly": {"NSMS25": 26, "NSMS26": 16},
     "app": "other", "keywords": ["hobby", "art supplies", "pottery class", "art class", "cooking class", "life drawing", "painting", "pottery", "photography", "film camera",
                                 "instrument", "guitar", "lesson", "bookies", "betting shop", "scratch card",
                                 "lottery", "casino", "arcade"]},

    # ---- essentials → flagged, not tracked (no opportunity cost to reveal) ----
    {"survey": "Rent", "src": ["NSMS25", "NSMS26", "NWSLI25"], "monthly": {"NSMS25": 529, "NSMS26": 551},
     "app": "essential", "keywords": ["rent", "deposit", "accommodation", "halls"]},
    {"survey": "Groceries", "src": ["NSMS25", "NSMS26", "NWSLI25"], "monthly": {"NSMS25": 146, "NSMS26": 155},
     "app": "essential", "keywords": ["groceries", "grocery", "food shop", "weekly shop", "big shop", "tesco",
                                     "sainsburys", "aldi", "lidl", "asda", "morrisons", "co-op", "coop",
                                     "waitrose", "ocado"]},
    {"survey": "Bills", "src": ["NSMS25", "NSMS26", "NWSLI25"], "monthly": {"NSMS25": 69, "NSMS26": 68},
     "app": "essential", "keywords": ["bills", "electric", "electricity", "gas bill", "energy bill", "wifi",
                                     "broadband", "water bill", "tv licence", "council tax"]},
    {"survey": "Transport", "src": ["NSMS25", "NSMS26"], "monthly": {"NSMS25": 67, "NSMS26": 73},
     "app": "essential", "keywords": ["bus", "tube", "oyster", "train ticket", "railcard", "travel to uni",
                                     "commute", "petrol", "fuel", "parking"]},
    {"survey": "Mobile phone", "src": ["NSMS25", "NSMS26"], "monthly": {"NSMS25": 15, "NSMS26": 15},
     "app": "essential", "keywords": ["phone bill", "phone contract", "sim", "data plan", "top up"]},
    {"survey": "Course materials", "src": ["NSMS25", "NSMS26"], "monthly": {"NSMS25": 20, "NSMS26": 16},
     "app": "essential", "keywords": ["textbook", "textbooks", "course materials", "printing", "stationery",
                                     "lab coat", "laptop for uni"]},
    {"survey": "Interest payments", "src": ["NSMS25", "NSMS26"], "monthly": {"NSMS25": 15, "NSMS26": 16},
     "app": "essential", "keywords": ["interest", "overdraft", "credit card bill", "klarna payment", "loan repayment"]},
    # Deliberately excluded: "Drugs" (NSMS) — safeguarding; not vocabulary we want to prompt.
]


def build():
    vocab = {}
    seen = {}
    for row in SURVEY_CATEGORIES:
        for kw in row["keywords"]:
            k = kw.lower().strip()
            if k in seen and seen[k] != row["app"]:
                raise ValueError(f'"{k}" is in both {seen[k]} and {row["app"]} — pick one')
            seen[k] = row["app"]
            vocab.setdefault(row["app"], set()).add(k)

    out = {cat: sorted(words) for cat, words in vocab.items()}
    provenance = [{"survey": r["survey"], "sources": r["src"], "monthly": r["monthly"], "app": r["app"]}
                  for r in SURVEY_CATEGORIES]

    js = (
        "/* keywords.js — GENERATED by data-prep/build_keywords.py. Do not edit by hand. */\n"
        "(function (root) {\n"
        f"  const KEYWORDS = {json.dumps(out, indent=2)};\n"
        f"  const PROVENANCE = {json.dumps(provenance)};\n"
        f"  const SOURCES = {json.dumps(SOURCES)};\n"
        "  root.LH = root.LH || {};\n"
        "  root.LH.keywords = { KEYWORDS, PROVENANCE, SOURCES };\n"
        "})(typeof window !== 'undefined' ? window : globalThis);\n"
    )
    target = Path(__file__).resolve().parent.parent / "js" / "keywords.js"
    target.write_text(js, encoding="utf-8")
    total = sum(len(v) for v in out.values())
    print(f"Wrote {target.name}: {total} keywords")
    for cat, words in out.items():
        print(f"  {cat:<10} {len(words)}")


if __name__ == "__main__":
    build()
