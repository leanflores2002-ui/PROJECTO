(function(){
  const DIACRITICS_RE = /[\u0300-\u036f]/g;
  const MEDIA_NAMES = [
    'CALZA LYCRA CHUPIN',
    'CALZA LYCRA DOBLE CINTURA',
    'CALZA LYCRA DOBLE CINTURA JASPEADO',
    'CALZA LYCRA RECTA',
    'CALZA SAPLEX JASPEADO CHUPIN',
    'CALZA SAPLEX JASPEADO RECTA',
    'CALZA OXFORD',
    'CALZA OXFORD JASPEADO SAPLEX',
    'CALZA LYCRA ESTAMPADO',
    'CALZA LYCRA ARRUGADO',
    'CALZA LYCRA COMBINADO',
    'CALZA ALGODON/LYCRA CHUPIN',
    'CALZA ALGODON /LYCRA RECTA',
    'CALZA LYCRA FRUNCE LEVANTA COLA',
    'CALZA GOFRADA LYCRA DAMA',
    'CALZA LYCRA MORLEY DAMA',
    'CALZA OXFORD LYCRA MORLEY DAMA',
    'PANTALON JOGGER RUSTICO/LYCRA DAMA',
    'BABUCHA JOGGER ALGODON RUSTICO CARGO DAMA',
    'PANTALON RUSTICO RECTO DAMA',
    'BABUCHA MODAL CON PUNO',
    'PANTALON JOGGER DE LYCRA DAMA',
    'PANTALON JOGGER DE LYCRA JASPEADO DAMA',
    'PANTALON MODAL CON TIRA',
    'PANTALON MORLEY LIVIANO',
    'PALAZO MORLEY LIVIANO DAMA',
    'TOP LISO Y JASPEADO',
    'TOP ESTAMPADO',
    'TOP GOFRADA LYCRA DAMA',
    'TOP LYCRA MORLEY DAMA',
    'CAMPERA LYCRA DAMA',
    'CAMPERA LYCRA ESTAMPADO DAMA',
    'CAMPERA JASPEADO SAPLEX DAMA',
    'CAMPERA MODAL DAMA',
    'CAMPERA LYCRA MORLEY',
    'CAMPERA RUSTICO C/LYCRA DAMA',
    'REMERA CON MANGA LARGA MORLEY VISCOSA DAMA',
    'CALZA NENA LYCRA LISO',
    'CALZA NENA JAPEADO',
    'CALZA NENA ALGODON /LYCRA',
    'BABUCHA RUSTICO /LYCRA HOMBRE',
    'BABUCHA JOGGER LYCRA HOMBRE',
    'PANTALON RUSTICO C/CIERRE DE HOMBRE',
    'BABUCHA JOGGER LYCRA JASPEADO HOMBRE',
    'CAMPERA LYCRA HOMBRE',
    'CAMPERA RUSTICO HOMBRE',
    'CAMPERA JASPEADO HOMBRE'
  ];

  function normalizeText(value){
    const raw = value === null || value === undefined ? '' : String(value);
    return raw.normalize ? raw.normalize('NFD').replace(DIACRITICS_RE, '').toLowerCase() : raw.toLowerCase();
  }

  function normalizeName(value){
    return normalizeText(value).replace(/[^a-z0-9]+/g, ' ').trim();
  }

  const MEDIA_SET = new Set(MEDIA_NAMES.map(normalizeName).filter(Boolean));

  function isMediaEstacionProduct(product){
    if (!product || !product.name) return false;
    const normalized = normalizeName(product.name);
    return !!normalized && MEDIA_SET.has(normalized);
  }

  function isVeranoProduct(product){
    return seasonKeyForProduct(product) === 'verano';
  }

  function normalizeSeason(value){
    const normalized = normalizeName(value);
    if (!normalized) return '';
    if (normalized.replace(/\s+/g, '') === 'mediaestacion') return 'media-estacion';
    return normalized.replace(/\s+/g, '-');
  }

  function seasonKeyForProduct(product){
    if (product && product.season) return normalizeSeason(product.season);
    return '';
  }

  function seasonLabelFromKey(key){
    if (key === 'media-estacion') return 'Media estacion';
    if (key === 'invierno') return 'Invierno';
    if (key === 'verano') return 'Verano';
    return key || '';
  }

  window.romixSeasonFilter = {
    normalizeName,
    isMediaEstacionProduct,
    isVeranoProduct,
    seasonKeyForProduct,
    seasonLabelFromKey,
    mediaSet: MEDIA_SET,
    veranoSet: MEDIA_SET
  };
})();
