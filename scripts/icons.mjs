import sharp from 'sharp';
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#334de8"/><path d="M165 157v205h183" fill="none" stroke="#d8fa6b" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/><circle cx="342" cy="162" r="34" fill="#d8fa6b"/></svg>';
for (const [name, size] of [
  ['icon-192', 192],
  ['icon-512', 512],
  ['apple-touch-icon', 180],
])
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/${name}.png`);
