"""
Random suffix generator for test titles/names, deliberately letters-only.

Background (see TEST_PLAN.md Finding F6): the prohibited-keyword matcher
(app/core/text_matching.py) leetspeak-normalizes digits to letters before
matching (0->o, 1->l, 3->e, 4->a, 5->s, 6->g, 7->t, 8->b, 9->g). A random hex
suffix (uuid.uuid4().hex[:N]) is ~56% digits, so it has a real, structural
chance of coincidentally normalizing into a seeded keyword — this suite hit
that in practice ("b0b0" in a random hex slice normalizes to "bobo", which
matched a real seeded keyword). A letters-only suffix has no digits to
leetspeak-substitute, removing that specific collision channel. It can still
coincidentally spell something as a raw substring, same as any random text,
but that risk is orders of magnitude smaller than the digit-driven one.
"""
import random
import string
import time


def unique_suffix(length=8):
    return "".join(random.choices(string.ascii_lowercase, k=length))


def unique_tag():
    """timestamp + letters-only random suffix, e.g. '1732650000-qxjfzwrk'."""
    return f"{int(time.time())}-{unique_suffix()}"
