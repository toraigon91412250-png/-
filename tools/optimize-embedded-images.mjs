import sharp from 'sharp';

// APNG must retain every frame. libvips can otherwise read only its first frame.
function isAnimatedPng(bytes) {
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    if (bytes.toString('ascii', offset + 4, offset + 8) === 'acTL') return true;
    offset += length + 12;
  }
  return false;
}

export async function optimizeEmbeddedImage(bytes, type) {
  const original = reason => ({bytes, type, optimized: false, reason});
  if (type !== 'image/png') return original('format-preserved');
  if (isAnimatedPng(bytes)) return original('animation-preserved');
  const metadata = await sharp(bytes).metadata();
  if (metadata.depth !== 'uchar' || (metadata.orientation && metadata.orientation !== 1)) {
    return original('precision-or-orientation-preserved');
  }
  // PNG and WebP alpha decoders can round premultiplication differently in a
  // browser. Preserve PNG for alpha images, using only lossless PNG compression.
  const candidate = await (metadata.hasAlpha
    ? sharp(bytes).keepMetadata().png({compressionLevel: 9, adaptiveFiltering: true})
    : sharp(bytes).keepMetadata().webp({lossless: true, effort: 6})).toBuffer();
  if (candidate.length >= bytes.length) return original('no-size-benefit');
  const decode = input => sharp(input).toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject: true});
  const before = await decode(bytes), after = await decode(candidate);
  if (before.info.width !== after.info.width || before.info.height !== after.info.height ||
      before.info.channels !== 4 || after.info.channels !== 4 || before.data.length !== after.data.length) {
    return original('dimensions-not-identical');
  }
  for (let i = 0; i < before.data.length; i += 4) {
    if (before.data[i + 3] !== after.data[i + 3]) return original('alpha-not-identical');
    // RGB under alpha=0 is invisible; its normalization cannot affect compositing.
    if (before.data[i + 3] && (before.data[i] !== after.data[i] ||
        before.data[i + 1] !== after.data[i + 1] || before.data[i + 2] !== after.data[i + 2])) {
      return original('visible-pixels-not-identical');
    }
  }
  return {bytes: candidate, type: metadata.hasAlpha ? 'image/png' : 'image/webp', optimized: true, reason: 'lossless-pixels-verified'};
}
