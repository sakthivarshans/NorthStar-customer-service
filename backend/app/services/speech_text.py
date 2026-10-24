"""Turn a markdown answer into plain text suitable for speech, deterministically."""
import hashlib
import re


def clean_text_for_speech(text: str) -> str:
    if not text:
        return ""
    t = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    t = re.sub(r"`([^`]+)`", r"\1", t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"\1", t)
    t = re.sub(r"\*([^*]+)\*", r"\1", t)
    t = re.sub(r"^#{1,6}\s+", "", t, flags=re.M)
    t = re.sub(r"^\s*[-*]\s+", "", t, flags=re.M)
    t = re.sub(r"^[-\s:|]+$", "", t, flags=re.M)
    t = t.replace("|", ", ")
    lines = []
    for line in t.splitlines():
        line = re.sub(r"\s{2,}", " ", line).strip()
        if line:
            lines.append(line if line[-1] in ".!?:;" else line + ".")
    return " ".join(lines).strip()


def speech_hash(text: str) -> str:
    return hashlib.sha256(clean_text_for_speech(text).casefold().encode()).hexdigest()
