// Names and rooms for every space, so the rail looks right before each one is filled in.
const stub = (id, name, room, seconds, extra = {}) => ({ id, name, room, seconds, widgets: [], ...extra });

export default [
  stub('s02-birch', 'Birch Inn', 'snowy-railway', 3900),
  stub('s03-nightbird', 'Nightbird', 'midnight-observatory', 6120),
  stub('s04-fieldmag', 'Field Mag', 'summer-lake', 2700, { polarity: 'light' }),
  stub('s05-northline', 'North Line', 'snowy-railway', 4500),
  stub('s06-studio', 'Studio', 'editorial', 3000),
  stub('s08-ondo', 'Ondo', 'rainy-attic', 8040),
  stub('s09-launch', 'Launch', 'midnight-observatory', 9360),
  stub('s10-essay', 'Essay', 'summer-lake', 5400),
  stub('s11-ondo-paper', 'Ondo', 'paper', 8040),
  stub('s12-ondo-aquarium', 'Ondo', 'aquarium', 8040),
  stub('s13-ondo-greenhouse', 'Ondo', 'greenhouse', 8040),
];
