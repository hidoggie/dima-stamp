import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'
import { getDefaultCrop } from '@8thwall/image-target-cli/src/crop.js'
import { applyCrop } from '@8thwall/image-target-cli/src/apply.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  const srcPath = path.join(__dirname, '..', 'assets', 'tiger-target.png')
  const outFolder = path.join(__dirname, '..', 'image-targets')

  const srcMeta = await sharp(srcPath).metadata()
  console.log('source:', srcMeta.width, srcMeta.height)

  // Upscale so the image comfortably clears 8th Wall's minimum
  // (480 wide / 640 tall), preserving exact aspect ratio.
  const scale = Math.max(480 / srcMeta.width, 640 / srcMeta.height) * 1.5
  const targetWidth = Math.round(srcMeta.width * scale)
  const targetHeight = Math.round(srcMeta.height * scale)

  const resizedBuffer = await sharp(srcPath)
    .resize(targetWidth, targetHeight, { fit: 'fill', kernel: 'lanczos3' })
    .png()
    .toBuffer()

  const resizedImage = sharp(resizedBuffer)
  const resizedMeta = await resizedImage.metadata()
  console.log('resized:', resizedMeta.width, resizedMeta.height)

  const sourceIsLandscape = resizedMeta.width >= resizedMeta.height
  const geometry = getDefaultCrop(resizedMeta, false)
  console.log('crop geometry:', geometry, 'landscape:', sourceIsLandscape)

  const { dataPath } = await applyCrop(
    resizedImage,
    { type: 'PLANAR', geometry },
    outFolder,
    'tiger-target',
    true
  )

  console.log('Wrote image target data to:', dataPath)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
