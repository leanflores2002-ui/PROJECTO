function sharePrices(product) {
  const normalize = value => String(value && typeof value === 'object' ? value.size ?? value.value ?? value.label ?? '' : value ?? '').trim();
  const sizes = [...new Set((product.sizes || []).map(normalize).filter(Boolean))];
  if (sizes.every(size => /^\d+$/.test(size))) sizes.sort((a, b) => Number(a) - Number(b));
  const prices = product.priceByGroup || {};
  const second = product.specialSizes2 || product.superSpecialSizes;
  const includes = (list, size) => Array.isArray(list) && list.some(value => normalize(value).toUpperCase() === size.toUpperCase());
  const priceFor = size => {
    let group;
    if (includes(second, size) && prices.special2 != null) group = 'special2';
    else if (includes(product.specialSizes, size) && prices.special != null) group = 'special';
    else if ((Array.isArray(product.specialSizes) || Array.isArray(second)) && prices.common != null) group = 'common';
    else if (Object.keys(prices).length === 1 && prices.common != null) group = 'common';
    else {
      const number = Number(size);
      if (['mujer', 'hombre'].includes(String(product.section).toLowerCase())) {
        group = number >= 1 && number <= 5 ? 'common' : number >= 6 && number <= 8 ? 'special' : [9, 10].includes(number) ? 'special2' : undefined;
      } else if (['ninos', 'niños', 'nino'].includes(String(product.section).toLowerCase())) {
        group = [2, 4, 6, 8, 10].includes(number) ? 'common' : [12, 14, 16].includes(number) ? 'special' : undefined;
      }
    }
    return Number(prices[group] ?? product.price ?? 0);
  };
  const money = value => '$' + value.toLocaleString('es-AR');
  if (!sizes.length || (sizes.length === 1 && sizes[0].toUpperCase() === 'U')) {
    const price = Number(product.price || prices.common || Object.values(prices)[0] || 0);
    return Number.isFinite(price) && price > 0 ? money(price) : '';
  }
  const groups = [];
  for (const size of sizes) {
    const price = priceFor(size);
    if (!Number.isFinite(price) || !(price > 0)) continue;
    const last = groups[groups.length - 1];
    if (last && last.price === price) last.sizes.push(size);
    else groups.push({ price, sizes: [size] });
  }
  return groups.map(group => {
    const values = group.sizes;
    const step = values.length > 1 ? Number(values[1]) - Number(values[0]) : 0;
    const continuous = [1, 2].includes(step) && values.every((value, index) => /^\d+$/.test(value) && (!index || Number(value) - Number(values[index - 1]) === step));
    const label = continuous ? `T${values[0]}-${values[values.length - 1]}` : values.map(value => `T${value}`).join(', ');
    return `${label} ${money(group.price)}`;
  }).join(' · ');
}
module.exports = { sharePrices };
