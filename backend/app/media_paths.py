"""Resolve imported local image names against the files actually shipped."""
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

PUBLIC_ROOT = Path(__file__).resolve().parents[2] / 'frontend' / 'public'


def resolve_image_path(value: str) -> str:
    if not value:
        return value
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc:
        return value
    relative = parsed.path.lstrip('/')
    root = PUBLIC_ROOT.resolve()
    candidate = (root / relative).resolve()
    if not candidate.is_relative_to(root) or not relative.startswith('images/'):
        return value
    if candidate.is_file():
        return value
    if candidate.suffix.lower() in {'.png', '.jpg', '.jpeg', '.avif'}:
        webp = candidate.with_suffix('.webp')
        if webp.is_file():
            return urlunsplit(('', '', str(Path(parsed.path).with_suffix('.webp')).replace('\\', '/'), parsed.query, parsed.fragment))
    return value
