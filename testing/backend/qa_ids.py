"""
Random suffix generator for test titles/names, deliberately letters-only.

The prohibited-keyword matcher (app/core/text_matching.py) leetspeak-normalizes
digits to letters before matching (0->o, 1->l, 3->e, 4->a, 5->s, 6->g, 7->t,
8->b, 9->g). A hex suffix (uuid.uuid4().hex[:N]) is ~56% digits, giving it a
real chance of normalizing into a seeded keyword -- this suite hit that in
practice ("b0b0" -> "bobo" matched a real seeded keyword). Letters-only removes
that collision channel; it can still coincidentally spell something, same as
any random text, but far less often. See TEST_PLAN.md Finding F6.
"""
import random
import string
import time


def unique_suffix(length=8):
    return "".join(random.choices(string.ascii_lowercase, k=length))


def unique_tag():
    """timestamp + letters-only random suffix, e.g. '1732650000-qxjfzwrk'."""
    return f"{int(time.time())}-{unique_suffix()}"
