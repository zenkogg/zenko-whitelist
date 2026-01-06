# Images

Place all static images for the whitelist app here.

## Supported Formats
- SVG (vector graphics, logos, icons)
- PNG (transparent images)
- JPG/JPEG (photos)
- GIF (animations)
- WebP (optimized images)

## Usage in Components
```tsx
import Image from 'next/image'

// For images in this folder:
<Image
  src="/images/logo.svg"
  alt="Zenko Logo"
  width={200}
  height={50}
/>
```

## Organization
Organize by type:
- `/images/logos/` - Brand logos
- `/images/icons/` - UI icons
- `/images/backgrounds/` - Background images
- `/images/screenshots/` - Product screenshots
