from backend.app import media_paths


def test_imported_png_resolves_to_existing_webp(tmp_path,monkeypatch):
    (tmp_path/'images').mkdir()
    (tmp_path/'images'/'prenda.webp').write_bytes(b'image')
    monkeypatch.setattr(media_paths,'PUBLIC_ROOT',tmp_path)
    assert media_paths.resolve_image_path('images/prenda.png?v=1') == 'images/prenda.webp?v=1'
    assert media_paths.resolve_image_path('/images/prenda.png') == '/images/prenda.webp'


def test_existing_original_and_remote_storage_urls_are_preserved(tmp_path,monkeypatch):
    (tmp_path/'images').mkdir()
    for extension in ['png','webp']:
        (tmp_path/'images'/f'prenda.{extension}').write_bytes(b'image')
    monkeypatch.setattr(media_paths,'PUBLIC_ROOT',tmp_path)
    assert media_paths.resolve_image_path('images/prenda.png') == 'images/prenda.png'
    remote='https://storage.example.test/prenda.png?token=example'
    assert media_paths.resolve_image_path(remote) == remote
    assert media_paths.resolve_image_path('images/missing.png') == 'images/missing.png'
    assert media_paths.resolve_image_path('images/../../outside.png') == 'images/../../outside.png'
