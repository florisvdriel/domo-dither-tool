import React, { useState, useRef, useEffect, useCallback } from 'react';

// Domo Color Palette
const DOMO_PALETTE = {
  horizon: { name: 'Horizon', hex: '#0062FF', rgb: [0, 98, 255] },
  hearth: { name: 'Hearth', hex: '#430E0A', rgb: [67, 14, 10] },
  festival: { name: 'Festival', hex: '#E9280A', rgb: [233, 40, 10] },
  rooted: { name: 'Rooted', hex: '#11533B', rgb: [17, 83, 59] },
  threshold: { name: 'Threshold', hex: '#C7A95A', rgb: [199, 169, 90] },
  white: { name: 'White', hex: '#FFFFFF', rgb: [255, 255, 255] },
  black: { name: 'Black', hex: '#000000', rgb: [0, 0, 0] },
};

const ALL_COLOR_KEYS = Object.keys(DOMO_PALETTE);

// Curated dither algorithms (removed digital-looking ones: checker, grid, diagonal)
const DITHER_ALGORITHMS = {
  none: { name: 'NONE', category: 'none', hasScale: false, hasAngle: false, description: 'No dithering applied' },
  bayer2x2: { name: 'BAYER 2×2', category: 'ordered', hasScale: true, hasAngle: false, description: 'Small ordered pattern, creates a fine crosshatch texture' },
  bayer4x4: { name: 'BAYER 4×4', category: 'ordered', hasScale: true, hasAngle: false, description: 'Medium ordered pattern, classic retro computer look' },
  bayer8x8: { name: 'BAYER 8×8', category: 'ordered', hasScale: true, hasAngle: false, description: 'Large ordered pattern, smoother gradients with visible structure' },
  floydSteinberg: { name: 'FLOYD-STEINBERG', category: 'diffusion', hasScale: true, hasAngle: false, description: 'Classic error diffusion, natural-looking results' },
  atkinson: { name: 'ATKINSON', category: 'diffusion', hasScale: true, hasAngle: false, description: 'Mac-style dithering, higher contrast, iconic look' },
  halftoneCircle: { name: 'HALFTONE DOTS', category: 'halftone', hasScale: true, hasAngle: true, description: 'Traditional print dots, size varies with tone' },
  halftoneLines: { name: 'HALFTONE LINES', category: 'halftone', hasScale: true, hasAngle: true, description: 'Engraving-style lines, width varies with tone' },
  halftoneSquare: { name: 'HALFTONE SQUARES', category: 'halftone', hasScale: true, hasAngle: true, description: 'Square dots for a more geometric look' },
  noise: { name: 'NOISE/STIPPLE', category: 'other', hasScale: true, hasAngle: false, description: 'Random stipple pattern, organic texture' },
};

const BLEND_MODES = {
  multiply: 'MULTIPLY',
  normal: 'NORMAL',
  screen: 'SCREEN',
  overlay: 'OVERLAY',
  darken: 'DARKEN',
  lighten: 'LIGHTEN',
};

const EXPORT_RESOLUTIONS = { 
  '1x': { scale: 1, label: 'SCREEN (1x)' }, 
  '2x': { scale: 2, label: 'PRINT (2x)' }, 
  '4x': { scale: 4, label: 'LARGE (4x)' } 
};

// Preview resolution limit for performance
const PREVIEW_MAX_WIDTH = 1500;

// Presets
const PRESETS = {
  subtle: {
    name: 'SUBTLE',
    description: 'Light halftone overlay',
    layers: [
      { colorKey: 'hearth', ditherType: 'halftoneCircle', threshold: 0.55, scale: 8, angle: 15, offsetX: 0, offsetY: 0, blendMode: 'multiply', opacity: 0.85 }
    ]
  },
  bold: {
    name: 'BOLD',
    description: 'High contrast dual layer',
    layers: [
      { colorKey: 'festival', ditherType: 'halftoneCircle', threshold: 0.45, scale: 6, angle: 15, offsetX: -8, offsetY: -8, blendMode: 'multiply', opacity: 1 },
      { colorKey: 'hearth', ditherType: 'halftoneCircle', threshold: 0.5, scale: 6, angle: 75, offsetX: 8, offsetY: 8, blendMode: 'multiply', opacity: 1 }
    ]
  },
  vintage: {
    name: 'VINTAGE',
    description: 'Classic print aesthetic',
    layers: [
      { colorKey: 'threshold', ditherType: 'atkinson', threshold: 0.5, scale: 2, angle: 0, offsetX: 0, offsetY: 0, blendMode: 'multiply', opacity: 0.9 },
      { colorKey: 'hearth', ditherType: 'halftoneLines', threshold: 0.55, scale: 4, angle: 45, offsetX: 2, offsetY: 2, blendMode: 'multiply', opacity: 0.7 }
    ]
  },
  cmyk: {
    name: 'CMYK',
    description: 'Four-color process style',
    layers: [
      { colorKey: 'horizon', ditherType: 'halftoneCircle', threshold: 0.5, scale: 6, angle: 15, offsetX: -4, offsetY: 0, blendMode: 'multiply', opacity: 0.8 },
      { colorKey: 'festival', ditherType: 'halftoneCircle', threshold: 0.5, scale: 6, angle: 45, offsetX: 0, offsetY: -4, blendMode: 'multiply', opacity: 0.8 },
      { colorKey: 'threshold', ditherType: 'halftoneCircle', threshold: 0.5, scale: 6, angle: 0, offsetX: 4, offsetY: 0, blendMode: 'multiply', opacity: 0.8 },
      { colorKey: 'hearth', ditherType: 'halftoneCircle', threshold: 0.5, scale: 6, angle: 75, offsetX: 0, offsetY: 4, blendMode: 'multiply', opacity: 0.9 }
    ]
  },
  retro: {
    name: 'RETRO',
    description: '8-bit computer style',
    layers: [
      { colorKey: 'rooted', ditherType: 'bayer8x8', threshold: 0.5, scale: 3, angle: 0, offsetX: 0, offsetY: 0, blendMode: 'multiply', opacity: 1 }
    ]
  },
  duotone: {
    name: 'DUOTONE',
    description: 'Two-color gradient effect',
    gradient: true,
    gradientColors: ['hearth', 'threshold'],
    ditherType: 'halftoneCircle',
    ditherScale: 6,
    ditherAngle: 15,
    ditherThreshold: 0.5
  }
};

// Default state values
const DEFAULT_STATE = {
  imageScale: 1.0,
  brightness: 0,
  contrast: 0,
  invert: false,
  inkBleed: false,
  inkBleedAmount: 0.5,
  inkBleedRoughness: 0.5,
  paperTexture: false,
  gradientEnabled: false,
  gradientColors: ['black', 'white'],
  gradientDitherType: 'none',
  gradientDitherScale: 8,
  gradientDitherAngle: 15,
  gradientDitherThreshold: 0.5,
  backgroundColor: '#ffffff',
  exportResolution: '1x',
  zoom: 1,
  panX: 0,
  panY: 0,
  layers: [
    { id: 1, colorKey: 'hearth', ditherType: 'halftoneCircle', threshold: 0.5, scale: 8, angle: 15, offsetX: 0, offsetY: 0, blendMode: 'multiply', opacity: 1, visible: true }
  ]
};

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}

// Seeded random for consistent noise
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Bayer matrices
const BAYER_2x2 = [[0,2],[3,1]].map(r => r.map(v => v/4));
const BAYER_4x4 = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]].map(r => r.map(v => v/16));
const BAYER_8x8 = [[0,32,8,40,2,34,10,42],[48,16,56,24,50,18,58,26],[12,44,4,36,14,46,6,38],[60,28,52,20,62,30,54,22],[3,35,11,43,1,33,9,41],[51,19,59,27,49,17,57,25],[15,47,7,39,13,45,5,37],[63,31,55,23,61,29,53,21]].map(r => r.map(v => v/64));

// Dithering Algorithms
const ditherAlgorithms = {
  none: (imageData) => imageData,
  
  bayer2x2: (imageData, threshold, scale = 1) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    const matrix = BAYER_2x2;
    const size = 2;
    const thresholdOffset = (threshold - 0.5) * 0.8;
    const pixelScale = Math.max(1, Math.floor(scale));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const gray = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114) / 255;
        const mx = Math.floor(x / pixelScale) % size;
        const my = Math.floor(y / pixelScale) % size;
        const result = gray > (matrix[my][mx] + thresholdOffset) ? 255 : 0;
        data[i] = data[i+1] = data[i+2] = result;
      }
    }
    return new ImageData(data, w, h);
  },

  bayer4x4: (imageData, threshold, scale = 1) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    const matrix = BAYER_4x4;
    const size = 4;
    const thresholdOffset = (threshold - 0.5) * 0.8;
    const pixelScale = Math.max(1, Math.floor(scale));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const gray = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114) / 255;
        const mx = Math.floor(x / pixelScale) % size;
        const my = Math.floor(y / pixelScale) % size;
        const result = gray > (matrix[my][mx] + thresholdOffset) ? 255 : 0;
        data[i] = data[i+1] = data[i+2] = result;
      }
    }
    return new ImageData(data, w, h);
  },

  bayer8x8: (imageData, threshold, scale = 1) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    const matrix = BAYER_8x8;
    const size = 8;
    const thresholdOffset = (threshold - 0.5) * 0.8;
    const pixelScale = Math.max(1, Math.floor(scale));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const gray = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114) / 255;
        const mx = Math.floor(x / pixelScale) % size;
        const my = Math.floor(y / pixelScale) % size;
        const result = gray > (matrix[my][mx] + thresholdOffset) ? 255 : 0;
        data[i] = data[i+1] = data[i+2] = result;
      }
    }
    return new ImageData(data, w, h);
  },

  floydSteinberg: (imageData, threshold, scale = 1) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    const pixelScale = Math.max(1, Math.floor(scale));
    const thresh = 80 + threshold * 100;
    
    const sw = Math.ceil(w / pixelScale);
    const sh = Math.ceil(h / pixelScale);
    const gray = new Float32Array(sw * sh);
    
    for (let sy = 0; sy < sh; sy++) {
      for (let sx = 0; sx < sw; sx++) {
        let sum = 0, count = 0;
        for (let dy = 0; dy < pixelScale && sy * pixelScale + dy < h; dy++) {
          for (let dx = 0; dx < pixelScale && sx * pixelScale + dx < w; dx++) {
            const idx = ((sy * pixelScale + dy) * w + (sx * pixelScale + dx)) * 4;
            sum += data[idx] * 0.299 + data[idx+1] * 0.587 + data[idx+2] * 0.114;
            count++;
          }
        }
        gray[sy * sw + sx] = sum / count;
      }
    }
    
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const i = y * sw + x;
        const oldPixel = gray[i];
        const newPixel = oldPixel > thresh ? 255 : 0;
        gray[i] = newPixel;
        const error = oldPixel - newPixel;
        if (x + 1 < sw) gray[i + 1] += error * 7 / 16;
        if (y + 1 < sh) {
          if (x > 0) gray[i + sw - 1] += error * 3 / 16;
          gray[i + sw] += error * 5 / 16;
          if (x + 1 < sw) gray[i + sw + 1] += error * 1 / 16;
        }
      }
    }
    
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sx = Math.floor(x / pixelScale);
        const sy = Math.floor(y / pixelScale);
        const val = gray[sy * sw + sx] > 127 ? 255 : 0;
        const idx = (y * w + x) * 4;
        data[idx] = data[idx+1] = data[idx+2] = val;
      }
    }
    return new ImageData(data, w, h);
  },

  atkinson: (imageData, threshold, scale = 1) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    const pixelScale = Math.max(1, Math.floor(scale));
    const thresh = 80 + threshold * 100;
    
    const sw = Math.ceil(w / pixelScale);
    const sh = Math.ceil(h / pixelScale);
    const gray = new Float32Array(sw * sh);
    
    for (let sy = 0; sy < sh; sy++) {
      for (let sx = 0; sx < sw; sx++) {
        let sum = 0, count = 0;
        for (let dy = 0; dy < pixelScale && sy * pixelScale + dy < h; dy++) {
          for (let dx = 0; dx < pixelScale && sx * pixelScale + dx < w; dx++) {
            const idx = ((sy * pixelScale + dy) * w + (sx * pixelScale + dx)) * 4;
            sum += data[idx] * 0.299 + data[idx+1] * 0.587 + data[idx+2] * 0.114;
            count++;
          }
        }
        gray[sy * sw + sx] = sum / count;
      }
    }
    
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const i = y * sw + x;
        const oldPixel = gray[i];
        const newPixel = oldPixel > thresh ? 255 : 0;
        gray[i] = newPixel;
        const error = (oldPixel - newPixel) / 8;
        if (x + 1 < sw) gray[i + 1] += error;
        if (x + 2 < sw) gray[i + 2] += error;
        if (y + 1 < sh) {
          if (x > 0) gray[i + sw - 1] += error;
          gray[i + sw] += error;
          if (x + 1 < sw) gray[i + sw + 1] += error;
        }
        if (y + 2 < sh) gray[i + sw * 2] += error;
      }
    }
    
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sx = Math.floor(x / pixelScale);
        const sy = Math.floor(y / pixelScale);
        const val = gray[sy * sw + sx] > 127 ? 255 : 0;
        const idx = (y * w + x) * 4;
        data[idx] = data[idx+1] = data[idx+2] = val;
      }
    }
    return new ImageData(data, w, h);
  },

  halftoneCircle: (imageData, threshold, dotSize = 6, angle = 15) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    data.fill(255);
    
    const step = Math.max(3, Math.floor(dotSize));
    const maxRadius = step * 0.48;
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    
    const gridExtent = Math.max(w, h) * 2;
    
    for (let gy = -gridExtent; gy < gridExtent; gy += step) {
      for (let gx = -gridExtent; gx < gridExtent; gx += step) {
        const cx = gx * cos - gy * sin + w / 2;
        const cy = gx * sin + gy * cos + h / 2;
        
        if (cx < -step || cx >= w + step || cy < -step || cy >= h + step) continue;
        
        const sampleX = Math.max(0, Math.min(w - 1, Math.round(cx)));
        const sampleY = Math.max(0, Math.min(h - 1, Math.round(cy)));
        const si = (sampleY * w + sampleX) * 4;
        const gray = (imageData.data[si] * 0.299 + imageData.data[si+1] * 0.587 + imageData.data[si+2] * 0.114) / 255;
        
        const darkness = 1 - gray;
        const radius = Math.sqrt(darkness) * maxRadius * (0.6 + threshold * 0.7);
        
        if (radius < 0.5) continue;
        
        const minX = Math.max(0, Math.floor(cx - radius - 1));
        const maxX = Math.min(w - 1, Math.ceil(cx + radius + 1));
        const minY = Math.max(0, Math.floor(cy - radius - 1));
        const maxY = Math.min(h - 1, Math.ceil(cy + radius + 1));
        
        for (let py = minY; py <= maxY; py++) {
          for (let px = minX; px <= maxX; px++) {
            const dx = px - cx;
            const dy = py - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist <= radius + 0.7) {
              const i = (py * w + px) * 4;
              const coverage = Math.max(0, Math.min(1, radius - dist + 0.7));
              const newVal = Math.round(255 * (1 - coverage));
              data[i] = Math.min(data[i], newVal);
              data[i+1] = Math.min(data[i+1], newVal);
              data[i+2] = Math.min(data[i+2], newVal);
            }
          }
        }
      }
    }
    return new ImageData(data, w, h);
  },

  halftoneLines: (imageData, threshold, lineSpacing = 4, angle = 45) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    data.fill(255);
    
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const spacing = Math.max(3, lineSpacing);
    const maxWidth = spacing * 0.7;
    
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const gray = (imageData.data[i] * 0.299 + imageData.data[i+1] * 0.587 + imageData.data[i+2] * 0.114) / 255;
        
        const rx = x * cos + y * sin;
        
        const linePos = ((rx % spacing) + spacing) % spacing;
        const centerDist = Math.abs(linePos - spacing / 2);
        
        const darkness = 1 - gray;
        const lineWidth = Math.sqrt(darkness) * maxWidth * (0.5 + threshold * 0.7);
        const halfWidth = lineWidth / 2;
        
        if (centerDist <= halfWidth + 0.7) {
          const coverage = Math.max(0, Math.min(1, halfWidth - centerDist + 0.7));
          const val = Math.round(255 * (1 - coverage));
          data[i] = data[i+1] = data[i+2] = val;
        }
      }
    }
    return new ImageData(data, w, h);
  },

  halftoneSquare: (imageData, threshold, size = 6, angle = 0) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    data.fill(255);
    
    const step = Math.max(3, Math.floor(size));
    const maxSize = step * 0.85;
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    
    const gridExtent = Math.max(w, h) * 2;
    
    for (let gy = -gridExtent; gy < gridExtent; gy += step) {
      for (let gx = -gridExtent; gx < gridExtent; gx += step) {
        const cx = gx * cos - gy * sin + w / 2;
        const cy = gx * sin + gy * cos + h / 2;
        
        if (cx < -step || cx >= w + step || cy < -step || cy >= h + step) continue;
        
        const sampleX = Math.max(0, Math.min(w - 1, Math.round(cx)));
        const sampleY = Math.max(0, Math.min(h - 1, Math.round(cy)));
        const si = (sampleY * w + sampleX) * 4;
        const gray = (imageData.data[si] * 0.299 + imageData.data[si+1] * 0.587 + imageData.data[si+2] * 0.114) / 255;
        
        const darkness = 1 - gray;
        const squareHalf = Math.sqrt(darkness) * maxSize * (0.4 + threshold * 0.6) / 2;
        
        if (squareHalf < 0.3) continue;
        
        const extent = squareHalf + 1;
        const minX = Math.max(0, Math.floor(cx - extent));
        const maxX = Math.min(w - 1, Math.ceil(cx + extent));
        const minY = Math.max(0, Math.floor(cy - extent));
        const maxY = Math.min(h - 1, Math.ceil(cy + extent));
        
        for (let py = minY; py <= maxY; py++) {
          for (let px = minX; px <= maxX; px++) {
            const dx = px - cx;
            const dy = py - cy;
            const rdx = dx * cos + dy * sin;
            const rdy = -dx * sin + dy * cos;
            
            const distX = Math.abs(rdx) - squareHalf;
            const distY = Math.abs(rdy) - squareHalf;
            const dist = Math.max(distX, distY);
            
            if (dist < 0.7) {
              const i = (py * w + px) * 4;
              const coverage = Math.max(0, Math.min(1, -dist + 0.7));
              const newVal = Math.round(255 * (1 - coverage));
              data[i] = Math.min(data[i], newVal);
              data[i+1] = Math.min(data[i+1], newVal);
              data[i+2] = Math.min(data[i+2], newVal);
            }
          }
        }
      }
    }
    return new ImageData(data, w, h);
  },

  noise: (imageData, threshold, scale = 1) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    const pixelScale = Math.max(1, Math.floor(scale));
    const decisionThreshold = 0.3 + (1 - threshold) * 0.4;
    const noiseAmount = 0.25;
    
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const gray = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114) / 255;
        const sx = Math.floor(x / pixelScale);
        const sy = Math.floor(y / pixelScale);
        const noise = seededRandom(sy * Math.ceil(w / pixelScale) + sx + 0.5);
        const adjustedThreshold = decisionThreshold + (noise - 0.5) * noiseAmount;
        const result = gray > adjustedThreshold ? 255 : 0;
        data[i] = data[i+1] = data[i+2] = result;
      }
    }
    return new ImageData(data, w, h);
  }
};

// Blend modes
const blendModes = {
  normal: (base, blend, alpha) => blend * alpha + base * (1 - alpha),
  multiply: (base, blend, alpha) => ((base/255) * (blend/255) * 255) * alpha + base * (1 - alpha),
  screen: (base, blend, alpha) => (255 - ((255-base)/255) * ((255-blend)/255) * 255) * alpha + base * (1 - alpha),
  overlay: (base, blend, alpha) => {
    const result = base < 128 ? (2*base*blend)/255 : 255 - (2*(255-base)*(255-blend))/255;
    return result * alpha + base * (1 - alpha);
  },
  darken: (base, blend, alpha) => Math.min(base, blend) * alpha + base * (1 - alpha),
  lighten: (base, blend, alpha) => Math.max(base, blend) * alpha + base * (1 - alpha),
};

// Apply brightness and contrast
function applyBrightnessContrast(imageData, brightness, contrast) {
  const data = new Uint8ClampedArray(imageData.data);
  const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
  
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] + brightness * 255;
    let g = data[i + 1] + brightness * 255;
    let b = data[i + 2] + brightness * 255;
    
    r = factor * (r - 128) + 128;
    g = factor * (g - 128) + 128;
    b = factor * (b - 128) + 128;
    
    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }
  
  return new ImageData(data, imageData.width, imageData.height);
}

// Invert image data
function invertImageData(imageData) {
  const data = new Uint8ClampedArray(imageData.data);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
  return new ImageData(data, imageData.width, imageData.height);
}

// Ink bleed effect - simulates capillary action via randomized dilation (fiber spread)
function applyInkBleed(imageData, amount, roughness = 0.5) {
  const w = imageData.width, h = imageData.height;
  const original = new Uint8ClampedArray(imageData.data); // Read-only copy
  const result = new Uint8ClampedArray(imageData.data);   // Output buffer
  
  // Number of dilation passes based on amount (1-3 passes)
  const passes = Math.max(1, Math.round(amount * 3));
  
  // Probability of a white pixel bleeding based on amount and roughness
  // Higher roughness = more irregular/random spread
  const baseProb = 0.3 + amount * 0.5; // 0.3 to 0.8 range
  
  // Helper to check if a pixel is "ink" (dark)
  const isInk = (i) => {
    const gray = original[i] * 0.299 + original[i + 1] * 0.587 + original[i + 2] * 0.114;
    return gray < 128;
  };
  
  // Run multiple dilation passes
  for (let pass = 0; pass < passes; pass++) {
    // Use result from previous pass as the new "original" for this pass
    if (pass > 0) {
      for (let i = 0; i < original.length; i++) {
        original[i] = result[i];
      }
    }
    
    // Iterate through every pixel
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        
        // Check if current pixel is white (paper)
        const gray = original[i] * 0.299 + original[i + 1] * 0.587 + original[i + 2] * 0.114;
        const isPaper = gray >= 128;
        
        if (isPaper) {
          // Check 4 neighbors (Up, Down, Left, Right)
          const neighbors = [
            [x, y - 1], // Up
            [x, y + 1], // Down
            [x - 1, y], // Left
            [x + 1, y]  // Right
          ];
          
          let hasInkNeighbor = false;
          let inkColor = [0, 0, 0];
          
          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const ni = (ny * w + nx) * 4;
              const neighborGray = original[ni] * 0.299 + original[ni + 1] * 0.587 + original[ni + 2] * 0.114;
              if (neighborGray < 128) {
                hasInkNeighbor = true;
                inkColor = [original[ni], original[ni + 1], original[ni + 2]];
                break;
              }
            }
          }
          
          if (hasInkNeighbor) {
            // Calculate bleed probability with roughness adding randomness
            const prob = baseProb * (1 - roughness * 0.5 + Math.random() * roughness);
            
            if (Math.random() < prob) {
              // Flip to ink - but at 90% opacity (slightly lighter than core ink)
              // This simulates ink thinning as it spreads into paper fibers
              const bleedOpacity = 0.9;
              result[i] = Math.round(inkColor[0] * bleedOpacity + 255 * (1 - bleedOpacity));
              result[i + 1] = Math.round(inkColor[1] * bleedOpacity + 255 * (1 - bleedOpacity));
              result[i + 2] = Math.round(inkColor[2] * bleedOpacity + 255 * (1 - bleedOpacity));
            }
          }
        }
        // If it's already ink, keep it as-is (already copied from original)
      }
    }
  }
  
  return new ImageData(result, w, h);
}

// Interpolate between colors
function interpolateColor(color1, color2, t) {
  return [
    Math.round(color1[0] + (color2[0] - color1[0]) * t),
    Math.round(color1[1] + (color2[1] - color1[1]) * t),
    Math.round(color1[2] + (color2[2] - color1[2]) * t)
  ];
}

// Apply gradient map
function applyGradientMap(imageData, gradientColors) {
  const data = new Uint8ClampedArray(imageData.data);
  const colors = gradientColors.map(key => DOMO_PALETTE[key]?.rgb || [0, 0, 0]);
  const numStops = colors.length;
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
    
    const scaledPos = gray * (numStops - 1);
    const index = Math.min(Math.floor(scaledPos), numStops - 2);
    const t = scaledPos - index;
    
    const [r, g, b] = interpolateColor(colors[index], colors[index + 1], t);
    
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
  
  return new ImageData(data, imageData.width, imageData.height);
}

// Local storage helpers for custom presets
function loadCustomPresets() {
  try {
    const saved = localStorage.getItem('domo-dither-presets');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveCustomPresets(presets) {
  try {
    localStorage.setItem('domo-dither-presets', JSON.stringify(presets));
  } catch (e) {
    console.warn('Could not save presets:', e);
  }
}

// Toast notification component
function Toast({ message, visible, onHide }) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onHide, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, onHide]);
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: `translateX(-50%) translateY(${visible ? '0' : '20px'})`,
      backgroundColor: '#fff',
      color: '#000',
      padding: '12px 24px',
      fontSize: '11px',
      fontFamily: 'monospace',
      letterSpacing: '0.05em',
      opacity: visible ? 1 : 0,
      transition: 'all 0.3s ease',
      pointerEvents: 'none',
      zIndex: 1000
    }}>
      {message}
    </div>
  );
}

// Tooltip component
function Tooltip({ text, children }) {
  const [visible, setVisible] = useState(false);
  
  return (
    <div 
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && text && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#222',
          color: '#aaa',
          padding: '8px 12px',
          fontSize: '9px',
          fontFamily: 'monospace',
          marginBottom: '8px',
          zIndex: 100,
          maxWidth: '200px',
          whiteSpace: 'normal',
          lineHeight: 1.4
        }}>
          {text}
        </div>
      )}
    </div>
  );
}

// Minimal Slider Component
function Slider({ value, min, max, step, onChange, label }) {
  const percent = ((value - min) / (max - min)) * 100;
  const [hovering, setHovering] = useState(false);
  
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{ 
          display: 'block', 
          color: '#666', 
          fontSize: '10px', 
          marginBottom: '10px', 
          fontFamily: 'monospace',
          letterSpacing: '0.05em'
        }}>
          {label}
        </label>
      )}
      <div 
        style={{ 
          position: 'relative', 
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer'
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div style={{ 
          position: 'absolute',
          left: 0,
          right: 0,
          height: '1px', 
          backgroundColor: hovering ? '#555' : '#333',
          transition: 'background-color 0.15s ease'
        }} />
        
        <div style={{ 
          position: 'absolute',
          left: `${percent}%`,
          transform: 'translateX(-50%)',
          width: hovering ? '10px' : '8px',
          height: hovering ? '10px' : '8px',
          backgroundColor: '#fff',
          transition: 'all 0.12s ease',
          pointerEvents: 'none'
        }} />
        
        <input 
          type="range" 
          min={min} 
          max={max} 
          step={step} 
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ 
            position: 'absolute', 
            width: '100%', 
            height: '100%', 
            opacity: 0, 
            cursor: 'pointer', 
            margin: 0 
          }}
        />
      </div>
    </div>
  );
}

// Button Component
function Button({ children, onClick, primary = false, active = false, small = false, danger = false, style = {} }) {
  const [hovering, setHovering] = useState(false);
  
  let bg = '#000';
  let color = '#fff';
  let border = '1px solid #333';
  
  if (primary) {
    bg = hovering ? '#ddd' : '#fff';
    color = '#000';
    border = 'none';
  } else if (active) {
    bg = '#fff';
    color = '#000';
  } else if (danger && hovering) {
    bg = '#3a0a0a';
    border = '1px solid #661010';
  } else if (hovering) {
    bg = '#1a1a1a';
    border = '1px solid #444';
  }
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        width: small ? 'auto' : '100%',
        padding: small ? '6px 12px' : '10px',
        fontSize: '10px',
        fontFamily: 'monospace',
        cursor: 'pointer',
        transition: 'all 0.12s ease',
        letterSpacing: '0.05em',
        backgroundColor: bg,
        color: color,
        border: border,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// Color Swatch
function ColorSwatch({ colorKey, color, selected, onClick }) {
  const [hovering, setHovering] = useState(false);
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        flex: 1,
        height: '24px',
        backgroundColor: color.hex,
        border: selected ? '2px solid #fff' : '2px solid transparent',
        cursor: 'pointer',
        transform: hovering && !selected ? 'scale(1.08)' : 'scale(1)',
        transition: 'all 0.12s ease',
        zIndex: hovering ? 1 : 0,
      }}
    />
  );
}

// Color Picker
function ColorPicker({ value, onChange, label, showAll = false }) {
  const colors = showAll ? DOMO_PALETTE : Object.fromEntries(
    Object.entries(DOMO_PALETTE).filter(([k]) => !['white', 'black'].includes(k))
  );
  
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{ 
          display: 'block', 
          color: '#666', 
          fontSize: '10px', 
          marginBottom: '8px', 
          fontFamily: 'monospace',
          letterSpacing: '0.05em'
        }}>
          {label}
        </label>
      )}
      <div style={{ display: 'flex', gap: '3px' }}>
        {Object.entries(colors).map(([key, color]) => (
          <ColorSwatch key={key} colorKey={key} color={color} selected={value === key} onClick={() => onChange(key)} />
        ))}
      </div>
    </div>
  );
}

// Section Header
function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const [hovering, setHovering] = useState(false);
  
  return (
    <div style={{ borderBottom: '1px solid #222' }}>
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        style={{
          width: '100%',
          padding: '14px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: hovering ? '#0f0f0f' : 'transparent',
          border: 'none',
          color: hovering ? '#888' : '#666',
          fontSize: '10px',
          fontFamily: 'monospace',
          cursor: 'pointer',
          letterSpacing: '0.1em',
          transition: 'all 0.12s ease'
        }}
      >
        {title}
        <span style={{ color: '#444' }}>{open ? '−' : '+'}</span>
      </button>
      {open && <div style={{ padding: '0 16px 16px' }}>{children}</div>}
    </div>
  );
}

// Icon Button
function IconButton({ children, onClick, disabled = false, title }) {
  const [hovering, setHovering] = useState(false);
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      disabled={disabled}
      title={title}
      style={{
        width: '20px',
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: hovering && !disabled ? '#333' : 'transparent',
        border: 'none',
        color: disabled ? '#333' : (hovering ? '#fff' : '#666'),
        fontSize: '12px',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.12s ease'
      }}
    >
      {children}
    </button>
  );
}

// Algorithm Select - curated list only
function AlgorithmSelect({ value, onChange, includeNone = false }) {
  const [hovering, setHovering] = useState(false);
  const algoInfo = DITHER_ALGORITHMS[value];
  
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <label style={{ color: '#666', fontSize: '10px', fontFamily: 'monospace' }}>PATTERN</label>
        {algoInfo?.description && (
          <Tooltip text={algoInfo.description}>
            <span style={{ marginLeft: '6px', color: '#444', fontSize: '10px', cursor: 'help' }}>ⓘ</span>
          </Tooltip>
        )}
      </div>
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        style={{ 
          width: '100%', 
          padding: '8px', 
          backgroundColor: '#000', 
          border: hovering ? '1px solid #444' : '1px solid #333', 
          color: '#fff', 
          fontSize: '10px', 
          fontFamily: 'monospace',
          cursor: 'pointer',
          transition: 'border-color 0.12s ease'
        }}
      >
        {includeNone && <option value="none">NONE</option>}
        <optgroup label="HALFTONE">
          {Object.entries(DITHER_ALGORITHMS).filter(([,v]) => v.category === 'halftone').map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </optgroup>
        <optgroup label="ORDERED">
          {Object.entries(DITHER_ALGORITHMS).filter(([k,v]) => v.category === 'ordered').map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </optgroup>
        <optgroup label="DIFFUSION">
          {Object.entries(DITHER_ALGORITHMS).filter(([,v]) => v.category === 'diffusion').map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </optgroup>
        <optgroup label="ORGANIC">
          {Object.entries(DITHER_ALGORITHMS).filter(([,v]) => v.category === 'other').map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </optgroup>
      </select>
    </div>
  );
}

// Layer Panel
function LayerPanel({ layer, index, totalLayers, onUpdate, onRemove, onDuplicate, onMoveUp, onMoveDown, canRemove }) {
  const [expanded, setExpanded] = useState(true);
  const [hovering, setHovering] = useState(false);
  const algoInfo = DITHER_ALGORITHMS[layer.ditherType];
  const isVisible = layer.visible !== false; // Default to true if not set
  
  return (
    <div 
      style={{ 
        marginBottom: '8px', 
        backgroundColor: '#000', 
        border: hovering ? '1px solid #444' : '1px solid #2a2a2a',
        transition: 'border-color 0.12s ease',
        opacity: isVisible ? 1 : 0.5
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div style={{ display: 'flex' }}>
        <div style={{ width: '4px', flexShrink: 0, backgroundColor: DOMO_PALETTE[layer.colorKey]?.hex || '#fff' }} />
        <div style={{ flex: 1 }}>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '10px 12px', 
              borderBottom: expanded ? '1px solid #222' : 'none',
              cursor: 'pointer'
            }}
            onClick={() => setExpanded(!expanded)}
          >
            {/* Visibility toggle (eye icon) */}
            <IconButton 
              onClick={(e) => { e.stopPropagation(); onUpdate({ ...layer, visible: !isVisible }); }} 
              title={isVisible ? "Hide layer" : "Show layer"}
            >
              {isVisible ? '👁' : '👁‍🗨'}
            </IconButton>
            <span style={{ fontSize: '10px', color: '#888', fontFamily: 'monospace', marginLeft: '8px' }}>LAYER {index + 1}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
              <IconButton onClick={(e) => { e.stopPropagation(); onDuplicate(); }} title="Duplicate">⧉</IconButton>
              <IconButton onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={index === 0} title="Move up">↑</IconButton>
              <IconButton onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={index === totalLayers - 1} title="Move down">↓</IconButton>
              {canRemove && <IconButton onClick={(e) => { e.stopPropagation(); onRemove(); }} title="Remove">×</IconButton>}
            </div>
          </div>
          
          {expanded && (
            <div style={{ padding: '12px' }}>
              <ColorPicker value={layer.colorKey} onChange={(k) => onUpdate({ ...layer, colorKey: k })} label="COLOR" />
              
              <AlgorithmSelect value={layer.ditherType} onChange={(v) => onUpdate({ ...layer, ditherType: v })} />
              
              <Slider label={`DENSITY ${Math.round(layer.threshold * 100)}%`} value={layer.threshold} min={0} max={1} step={0.01} onChange={(v) => onUpdate({ ...layer, threshold: v })} />
              
              {algoInfo?.hasScale && (
                <Slider label={`SIZE ${layer.scale}px`} value={layer.scale} min={2} max={32} step={1} onChange={(v) => onUpdate({ ...layer, scale: v })} />
              )}
              
              {algoInfo?.hasAngle && (
                <Slider label={`ANGLE ${layer.angle}°`} value={layer.angle} min={0} max={180} step={5} onChange={(v) => onUpdate({ ...layer, angle: v })} />
              )}
              
              {/* X/Y Offset sliders - prominent for misregistered screenprint look */}
              <div style={{ 
                borderTop: '1px solid #222', 
                paddingTop: '12px', 
                marginTop: '8px',
                marginBottom: '12px'
              }}>
                <label style={{ display: 'block', color: '#666', fontSize: '10px', marginBottom: '8px', fontFamily: 'monospace' }}>
                  OFFSET (misregistration)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Slider label={`X ${layer.offsetX}px`} value={layer.offsetX} min={-50} max={50} step={1} onChange={(v) => onUpdate({ ...layer, offsetX: v })} />
                  <Slider label={`Y ${layer.offsetY}px`} value={layer.offsetY} min={-50} max={50} step={1} onChange={(v) => onUpdate({ ...layer, offsetY: v })} />
                </div>
              </div>
              
              <label style={{ display: 'block', color: '#666', fontSize: '10px', marginBottom: '8px', fontFamily: 'monospace' }}>BLEND</label>
              <select 
                value={layer.blendMode} 
                onChange={(e) => onUpdate({ ...layer, blendMode: e.target.value })} 
                style={{ width: '100%', padding: '8px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', fontSize: '10px', fontFamily: 'monospace', marginBottom: '16px', cursor: 'pointer' }}
              >
                {Object.entries(BLEND_MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              
              <Slider label={`OPACITY ${Math.round(layer.opacity * 100)}%`} value={layer.opacity} min={0} max={1} step={0.01} onChange={(v) => onUpdate({ ...layer, opacity: v })} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Drop Zone
function DropZone({ onDrop, children }) {
  const [dragging, setDragging] = useState(false);
  
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };
  
  const handleDragLeave = () => setDragging(false);
  
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) onDrop(file);
  };
  
  return (
    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {children}
      {dragging && (
        <div style={{
          position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 98, 255, 0.1)',
          border: '2px dashed #0062FF', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{ color: '#0062FF', fontSize: '12px', fontFamily: 'monospace', letterSpacing: '0.1em' }}>DROP IMAGE HERE</div>
        </div>
      )}
    </div>
  );
}

// Before/After Comparison Slider
function ComparisonSlider({ position, onChange }) {
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef(null);
  
  const handleMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
  };
  
  useEffect(() => {
    if (!dragging) return;
    
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      onChange(Math.max(0, Math.min(1, x)));
    };
    
    const handleMouseUp = () => setDragging(false);
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, onChange]);
  
  return (
    <div 
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        cursor: dragging ? 'ew-resize' : 'default',
        zIndex: 5
      }}
    >
      {/* Divider line */}
      <div 
        style={{
          position: 'absolute',
          left: `${position * 100}%`,
          top: 0,
          bottom: 0,
          width: '2px',
          backgroundColor: '#fff',
          transform: 'translateX(-50%)',
          boxShadow: '0 0 8px rgba(0,0,0,0.5)',
          zIndex: 6
        }}
      />
      
      {/* Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          left: `${position * 100}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'ew-resize',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          zIndex: 7
        }}
      >
        <span style={{ fontSize: '14px', color: '#000', userSelect: 'none' }}>⟷</span>
      </div>
      
      {/* Labels */}
      <div style={{
        position: 'absolute',
        left: '8px',
        top: '8px',
        padding: '4px 8px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: '#fff',
        fontSize: '9px',
        fontFamily: 'monospace',
        letterSpacing: '0.05em'
      }}>
        ORIGINAL
      </div>
      <div style={{
        position: 'absolute',
        right: '8px',
        top: '8px',
        padding: '4px 8px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: '#fff',
        fontSize: '9px',
        fontFamily: 'monospace',
        letterSpacing: '0.05em'
      }}>
        PROCESSED
      </div>
    </div>
  );
}

// Save Preset Modal
function SavePresetModal({ onSave, onCancel }) {
  const [name, setName] = useState('');
  
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#111',
        border: '1px solid #333',
        padding: '24px',
        width: '300px'
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '11px', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
          SAVE PRESET
        </h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Preset name..."
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#000',
            border: '1px solid #333',
            color: '#fff',
            fontSize: '11px',
            fontFamily: 'monospace',
            marginBottom: '16px',
            boxSizing: 'border-box'
          }}
          autoFocus
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button onClick={onCancel} style={{ flex: 1 }}>CANCEL</Button>
          <Button primary onClick={() => name.trim() && onSave(name.trim())} style={{ flex: 1 }}>SAVE</Button>
        </div>
      </div>
    </div>
  );
}

export default function DomoDitherTool() {
  const [image, setImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null); // Downscaled for performance
  const [imageScale, setImageScale] = useState(DEFAULT_STATE.imageScale);
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_STATE.backgroundColor);
  const [exportResolution, setExportResolution] = useState(DEFAULT_STATE.exportResolution);
  
  const [brightness, setBrightness] = useState(DEFAULT_STATE.brightness);
  const [contrast, setContrast] = useState(DEFAULT_STATE.contrast);
  const [invert, setInvert] = useState(DEFAULT_STATE.invert);
  const [inkBleed, setInkBleed] = useState(DEFAULT_STATE.inkBleed);
  const [inkBleedAmount, setInkBleedAmount] = useState(DEFAULT_STATE.inkBleedAmount);
  const [inkBleedRoughness, setInkBleedRoughness] = useState(DEFAULT_STATE.inkBleedRoughness);
  const [paperTexture, setPaperTexture] = useState(DEFAULT_STATE.paperTexture);
  
  const [gradientEnabled, setGradientEnabled] = useState(DEFAULT_STATE.gradientEnabled);
  const [gradientColors, setGradientColors] = useState(DEFAULT_STATE.gradientColors);
  const [gradientDitherType, setGradientDitherType] = useState(DEFAULT_STATE.gradientDitherType);
  const [gradientDitherScale, setGradientDitherScale] = useState(DEFAULT_STATE.gradientDitherScale);
  const [gradientDitherAngle, setGradientDitherAngle] = useState(DEFAULT_STATE.gradientDitherAngle);
  const [gradientDitherThreshold, setGradientDitherThreshold] = useState(DEFAULT_STATE.gradientDitherThreshold);
  
  const [layers, setLayers] = useState(DEFAULT_STATE.layers);
  
  // Zoom and pan
  const [zoom, setZoom] = useState(DEFAULT_STATE.zoom);
  const [panX, setPanX] = useState(DEFAULT_STATE.panX);
  const [panY, setPanY] = useState(DEFAULT_STATE.panY);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Comparison slider
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonPosition, setComparisonPosition] = useState(0.5);
  
  // Custom presets
  const [customPresets, setCustomPresets] = useState(loadCustomPresets);
  const [showSaveModal, setShowSaveModal] = useState(false);
  
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  
  const canvasRef = useRef(null);
  const originalCanvasRef = useRef(null);
  const sourceCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const processingRef = useRef(false);

  const colorKeys = Object.keys(DOMO_PALETTE).filter(k => !['white', 'black'].includes(k));
  
  // Debounce all processing-related state changes
  const debouncedImageScale = useDebounce(imageScale, 150);
  const debouncedBrightness = useDebounce(brightness, 150);
  const debouncedContrast = useDebounce(contrast, 150);
  const debouncedLayers = useDebounce(layers, 150);
  const debouncedGradientDitherThreshold = useDebounce(gradientDitherThreshold, 150);
  const debouncedGradientDitherScale = useDebounce(gradientDitherScale, 150);
  const debouncedGradientDitherAngle = useDebounce(gradientDitherAngle, 150);
  const debouncedInkBleedAmount = useDebounce(inkBleedAmount, 150);
  const debouncedInkBleedRoughness = useDebounce(inkBleedRoughness, 150);
  
  const showToast = (message) => {
    setToastMessage(message);
    setToastVisible(true);
  };
  
  // Create preview image (downscaled for performance)
  useEffect(() => {
    if (!image) {
      setPreviewImage(null);
      return;
    }
    
    if (image.width <= PREVIEW_MAX_WIDTH) {
      setPreviewImage(image);
      return;
    }
    
    const scale = PREVIEW_MAX_WIDTH / image.width;
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = Math.round(image.width * scale);
    previewCanvas.height = Math.round(image.height * scale);
    const ctx = previewCanvas.getContext('2d');
    ctx.drawImage(image, 0, 0, previewCanvas.width, previewCanvas.height);
    
    const previewImg = new Image();
    previewImg.onload = () => setPreviewImage(previewImg);
    previewImg.src = previewCanvas.toDataURL();
  }, [image]);
  
  // Reset all
  const resetAll = () => {
    setImageScale(DEFAULT_STATE.imageScale);
    setBrightness(DEFAULT_STATE.brightness);
    setContrast(DEFAULT_STATE.contrast);
    setInvert(DEFAULT_STATE.invert);
    setInkBleed(DEFAULT_STATE.inkBleed);
    setInkBleedAmount(DEFAULT_STATE.inkBleedAmount);
    setInkBleedRoughness(DEFAULT_STATE.inkBleedRoughness);
    setPaperTexture(DEFAULT_STATE.paperTexture);
    setGradientEnabled(DEFAULT_STATE.gradientEnabled);
    setGradientColors([...DEFAULT_STATE.gradientColors]);
    setGradientDitherType(DEFAULT_STATE.gradientDitherType);
    setGradientDitherScale(DEFAULT_STATE.gradientDitherScale);
    setGradientDitherAngle(DEFAULT_STATE.gradientDitherAngle);
    setGradientDitherThreshold(DEFAULT_STATE.gradientDitherThreshold);
    setBackgroundColor(DEFAULT_STATE.backgroundColor);
    setExportResolution(DEFAULT_STATE.exportResolution);
    setZoom(DEFAULT_STATE.zoom);
    setPanX(DEFAULT_STATE.panX);
    setPanY(DEFAULT_STATE.panY);
    setLayers(DEFAULT_STATE.layers.map(l => ({ ...l, id: Date.now() })));
    showToast('Reset to defaults');
  };
  
  const createDefaultLayer = () => ({
    id: Date.now(),
    colorKey: colorKeys[layers.length % colorKeys.length],
    ditherType: 'halftoneCircle',
    threshold: 0.5,
    scale: 8,
    angle: 45 + (layers.length * 30),
    offsetX: layers.length * 5,
    offsetY: layers.length * 5,
    blendMode: 'multiply',
    opacity: 1,
    visible: true
  });

  const addLayer = () => {
    if (layers.length < 4) setLayers([...layers, createDefaultLayer()]);
  };

  const updateLayer = (index, newLayer) => {
    const newLayers = [...layers];
    newLayers[index] = newLayer;
    setLayers(newLayers);
  };

  const removeLayer = (index) => setLayers(layers.filter((_, i) => i !== index));
  
  const duplicateLayer = (index) => {
    if (layers.length >= 4) return;
    const newLayer = { ...layers[index], id: Date.now() };
    const newLayers = [...layers];
    newLayers.splice(index + 1, 0, newLayer);
    setLayers(newLayers);
  };
  
  const moveLayerUp = (index) => {
    if (index === 0) return;
    const newLayers = [...layers];
    [newLayers[index - 1], newLayers[index]] = [newLayers[index], newLayers[index - 1]];
    setLayers(newLayers);
  };
  
  const moveLayerDown = (index) => {
    if (index === layers.length - 1) return;
    const newLayers = [...layers];
    [newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]];
    setLayers(newLayers);
  };
  
  // Add gradient color
  const addGradientColor = () => {
    if (gradientColors.length >= 4) return;
    const newColors = [...gradientColors];
    const insertIndex = Math.floor(newColors.length / 2);
    newColors.splice(insertIndex, 0, 'white');
    setGradientColors(newColors);
  };
  
  // Remove gradient color
  const removeGradientColor = (index) => {
    if (gradientColors.length <= 2) return;
    setGradientColors(gradientColors.filter((_, i) => i !== index));
  };

  // Apply preset
  const applyPreset = (presetKey, isCustom = false) => {
    const preset = isCustom ? customPresets[presetKey] : PRESETS[presetKey];
    if (!preset) return;
    
    if (preset.gradient) {
      setGradientEnabled(true);
      setGradientColors([...preset.gradientColors]);
      setGradientDitherType(preset.ditherType);
      setGradientDitherScale(preset.ditherScale);
      setGradientDitherAngle(preset.ditherAngle);
      setGradientDitherThreshold(preset.ditherThreshold);
    } else {
      setGradientEnabled(false);
      setLayers(preset.layers.map((l, i) => ({ ...l, id: Date.now() + i })));
    }
    
    if (preset.inkBleed !== undefined) setInkBleed(preset.inkBleed);
    if (preset.inkBleedAmount !== undefined) setInkBleedAmount(preset.inkBleedAmount);
    if (preset.paperTexture !== undefined) setPaperTexture(preset.paperTexture);
    
    showToast(`Applied ${preset.name} preset`);
  };
  
  // Save custom preset
  const saveCustomPreset = (name) => {
    const preset = {
      name: name.toUpperCase(),
      description: 'Custom preset',
      gradient: gradientEnabled,
      ...(gradientEnabled ? {
        gradientColors: [...gradientColors],
        ditherType: gradientDitherType,
        ditherScale: gradientDitherScale,
        ditherAngle: gradientDitherAngle,
        ditherThreshold: gradientDitherThreshold
      } : {
        layers: layers.map(l => ({ ...l }))
      }),
      inkBleed,
      inkBleedAmount,
      paperTexture
    };
    
    const newPresets = { ...customPresets, [name.toLowerCase().replace(/\s+/g, '_')]: preset };
    setCustomPresets(newPresets);
    saveCustomPresets(newPresets);
    setShowSaveModal(false);
    showToast(`Saved "${name}" preset`);
  };
  
  // Delete custom preset
  const deleteCustomPreset = (key) => {
    const newPresets = { ...customPresets };
    delete newPresets[key];
    setCustomPresets(newPresets);
    saveCustomPresets(newPresets);
    showToast('Preset deleted');
  };

  // Randomizer
  const randomizeLayers = () => {
    const shuffledColors = [...colorKeys].sort(() => Math.random() - 0.5);
    const algorithms = ['halftoneCircle', 'halftoneLines', 'bayer4x4', 'bayer8x8', 'floydSteinberg', 'atkinson'];
    
    setGradientEnabled(false);
    setLayers([
      {
        id: Date.now(),
        colorKey: shuffledColors[0],
        ditherType: algorithms[Math.floor(Math.random() * algorithms.length)],
        threshold: 0.45 + Math.random() * 0.2,
        scale: Math.floor(6 + Math.random() * 6),
        angle: Math.floor(Math.random() * 45),
        offsetX: Math.floor(-20 + Math.random() * 40),
        offsetY: Math.floor(-20 + Math.random() * 40),
        blendMode: 'multiply',
        opacity: 0.9 + Math.random() * 0.1,
        visible: true
      },
      {
        id: Date.now() + 1,
        colorKey: shuffledColors[1],
        ditherType: algorithms[Math.floor(Math.random() * algorithms.length)],
        threshold: 0.45 + Math.random() * 0.2,
        scale: Math.floor(6 + Math.random() * 6),
        angle: Math.floor(45 + Math.random() * 45),
        offsetX: Math.floor(-20 + Math.random() * 40),
        offsetY: Math.floor(-20 + Math.random() * 40),
        blendMode: 'multiply',
        opacity: 0.9 + Math.random() * 0.1,
        visible: true
      }
    ]);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) loadImageFile(file);
  };
  
  const loadImageFile = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setZoom(1);
        setPanX(0);
        setPanY(0);
        showToast('Image loaded');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };
  
  // Zoom handlers
  const handleWheel = (e) => {
    if (!image) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.25, Math.min(8, z * delta)));
  };
  
  const handleMouseDown = (e) => {
    if (!image || e.button !== 0 || showComparison) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
  };
  
  const handleMouseMove = (e) => {
    if (!isPanning) return;
    setPanX(e.clientX - panStart.x);
    setPanY(e.clientY - panStart.y);
  };
  
  const handleMouseUp = () => {
    setIsPanning(false);
  };
  
  const resetView = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  // Core image processing function
  const processImageCore = useCallback((sourceImage, targetCanvas, isExport = false) => {
    if (!sourceImage || !targetCanvas) return;
    
    const ctx = targetCanvas.getContext('2d');
    const sourceCanvas = document.createElement('canvas');
    const sourceCtx = sourceCanvas.getContext('2d');
    
    targetCanvas.width = sourceImage.width;
    targetCanvas.height = sourceImage.height;
    
    const scaledWidth = Math.round(sourceImage.width * debouncedImageScale);
    const scaledHeight = Math.round(sourceImage.height * debouncedImageScale);
    sourceCanvas.width = scaledWidth;
    sourceCanvas.height = scaledHeight;
    
    sourceCtx.fillStyle = '#888888';
    sourceCtx.fillRect(0, 0, scaledWidth, scaledHeight);
    sourceCtx.drawImage(sourceImage, 0, 0, scaledWidth, scaledHeight);
    
    let sourceData = sourceCtx.getImageData(0, 0, scaledWidth, scaledHeight);
    
    if (debouncedBrightness !== 0 || debouncedContrast !== 0) {
      sourceData = applyBrightnessContrast(sourceData, debouncedBrightness, debouncedContrast);
    }
    
    if (invert) {
      sourceData = invertImageData(sourceData);
    }
    
    let finalImageData;
    
    // Gradient map mode
    if (gradientEnabled && gradientColors.length >= 2) {
      const colors = gradientColors.map(key => DOMO_PALETTE[key]?.rgb || [0, 0, 0]);
      
      if (gradientDitherType !== 'none') {
        const algo = ditherAlgorithms[gradientDitherType];
        const algoInfo = DITHER_ALGORITHMS[gradientDitherType];
        
        if (algo) {
          let ditheredData;
          if (algoInfo.hasScale && algoInfo.hasAngle) {
            ditheredData = algo(sourceData, debouncedGradientDitherThreshold, debouncedGradientDitherScale, debouncedGradientDitherAngle);
          } else if (algoInfo.hasScale) {
            ditheredData = algo(sourceData, debouncedGradientDitherThreshold, debouncedGradientDitherScale);
          } else {
            ditheredData = algo(sourceData, debouncedGradientDitherThreshold);
          }
          
          const resultData = new Uint8ClampedArray(ditheredData.data);
          
          for (let i = 0; i < resultData.length; i += 4) {
            const ditheredVal = ditheredData.data[i] / 255;
            let r, g, b;
            if (colors.length === 2) {
              if (ditheredVal < 0.5) {
                [r, g, b] = colors[0];
              } else {
                [r, g, b] = colors[1];
              }
            } else {
              const colorIdx = Math.round(ditheredVal * (colors.length - 1));
              [r, g, b] = colors[Math.min(colorIdx, colors.length - 1)];
            }
            resultData[i] = r;
            resultData[i + 1] = g;
            resultData[i + 2] = b;
          }
          
          finalImageData = new ImageData(resultData, scaledWidth, scaledHeight);
        } else {
          finalImageData = applyGradientMap(sourceData, gradientColors);
        }
      } else {
        finalImageData = applyGradientMap(sourceData, gradientColors);
      }
      
      // Apply ink bleed if enabled
      if (inkBleed && debouncedInkBleedAmount > 0) {
        finalImageData = applyInkBleed(finalImageData, debouncedInkBleedAmount, debouncedInkBleedRoughness);
      }
      
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, sourceImage.width, sourceImage.height);
      
      const offsetX = (scaledWidth - sourceImage.width) / 2;
      const offsetY = (scaledHeight - sourceImage.height) / 2;
      
      const baseImageData = ctx.getImageData(0, 0, sourceImage.width, sourceImage.height);
      
      for (let y = 0; y < sourceImage.height; y++) {
        for (let x = 0; x < sourceImage.width; x++) {
          const sx = Math.floor(x + offsetX);
          const sy = Math.floor(y + offsetY);
          
          if (sx >= 0 && sx < scaledWidth && sy >= 0 && sy < scaledHeight) {
            const si = (sy * scaledWidth + sx) * 4;
            const di = (y * sourceImage.width + x) * 4;
            
            baseImageData.data[di] = finalImageData.data[si];
            baseImageData.data[di + 1] = finalImageData.data[si + 1];
            baseImageData.data[di + 2] = finalImageData.data[si + 2];
            baseImageData.data[di + 3] = 255;
          }
        }
      }
      
      ctx.putImageData(baseImageData, 0, 0);
    } else {
      // Layer mode
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, sourceImage.width, sourceImage.height);
      const baseImageData = ctx.getImageData(0, 0, sourceImage.width, sourceImage.height);
      
      const offsetX = (scaledWidth - sourceImage.width) / 2;
      const offsetY = (scaledHeight - sourceImage.height) / 2;
      
      debouncedLayers.forEach(layer => {
        // Skip hidden layers
        if (layer.visible === false) return;
        
        const algo = ditherAlgorithms[layer.ditherType];
        const algoInfo = DITHER_ALGORITHMS[layer.ditherType];
        
        if (!algo) return;
        
        let ditheredData;
        if (algoInfo.hasScale && algoInfo.hasAngle) {
          ditheredData = algo(sourceData, layer.threshold, layer.scale, layer.angle);
        } else if (algoInfo.hasScale) {
          ditheredData = algo(sourceData, layer.threshold, layer.scale);
        } else {
          ditheredData = algo(sourceData, layer.threshold);
        }
        
        // Apply ink bleed to layer if enabled
        if (inkBleed && debouncedInkBleedAmount > 0) {
          ditheredData = applyInkBleed(ditheredData, debouncedInkBleedAmount, debouncedInkBleedRoughness);
        }
        
        const [r, g, b] = DOMO_PALETTE[layer.colorKey]?.rgb || [0, 0, 0];
        const blendFn = blendModes[layer.blendMode] || blendModes.multiply;
        
        for (let y = 0; y < sourceImage.height; y++) {
          for (let x = 0; x < sourceImage.width; x++) {
            const sx = Math.floor(x + offsetX - layer.offsetX);
            const sy = Math.floor(y + offsetY - layer.offsetY);
            
            if (sx >= 0 && sx < scaledWidth && sy >= 0 && sy < scaledHeight) {
              const si = (sy * scaledWidth + sx) * 4;
              const di = (y * sourceImage.width + x) * 4;
              
              const darkness = 1 - (ditheredData.data[si] / 255);
              // Treat near-white pixels as fully transparent (screen print behavior)
              if (darkness > 0.02) {
                const alpha = layer.opacity * darkness;
                baseImageData.data[di] = blendFn(baseImageData.data[di], r, alpha);
                baseImageData.data[di + 1] = blendFn(baseImageData.data[di + 1], g, alpha);
                baseImageData.data[di + 2] = blendFn(baseImageData.data[di + 2], b, alpha);
              }
            }
          }
        }
      });
      
      ctx.putImageData(baseImageData, 0, 0);
    }
  }, [debouncedImageScale, debouncedBrightness, debouncedContrast, invert, gradientEnabled, gradientColors, gradientDitherType, debouncedGradientDitherThreshold, debouncedGradientDitherScale, debouncedGradientDitherAngle, debouncedLayers, backgroundColor, inkBleed, debouncedInkBleedAmount, debouncedInkBleedRoughness]);

  // Process preview image (debounced)
  useEffect(() => {
    if (!previewImage || !canvasRef.current || !originalCanvasRef.current || processingRef.current) return;
    
    processingRef.current = true;
    
    requestAnimationFrame(() => {
      // Draw original for comparison
      const originalCanvas = originalCanvasRef.current;
      originalCanvas.width = previewImage.width;
      originalCanvas.height = previewImage.height;
      originalCanvas.getContext('2d').drawImage(previewImage, 0, 0);
      
      // Process the preview image
      processImageCore(previewImage, canvasRef.current);
      
      processingRef.current = false;
    });
  }, [previewImage, processImageCore]);

  const exportPNG = () => {
    if (!image) return;
    
    // Create export canvas at full resolution
    const exportCanvas = document.createElement('canvas');
    processImageCore(image, exportCanvas, true);
    
    const scale = EXPORT_RESOLUTIONS[exportResolution].scale;
    
    let dataUrl;
    
    if (scale === 1) {
      dataUrl = exportCanvas.toDataURL('image/png');
    } else {
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = exportCanvas.width * scale;
      scaledCanvas.height = exportCanvas.height * scale;
      const ctx = scaledCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(exportCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
      dataUrl = scaledCanvas.toDataURL('image/png');
    }
    
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `domo-dither-${exportResolution}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast(`Exported at ${exportResolution}`);
  };

  const gradientAlgoInfo = DITHER_ALGORITHMS[gradientDitherType];

  return (
    <DropZone onDrop={loadImageFile}>
      <div style={{ display: 'flex', height: '100vh', backgroundColor: '#000', color: '#fff', fontFamily: 'monospace' }}>
        {/* Sidebar */}
        <div style={{ width: '300px', backgroundColor: '#0a0a0a', overflowY: 'auto', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column' }}>
          
          {/* Header */}
          <div style={{ padding: '20px 16px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '11px', letterSpacing: '0.2em', margin: 0, fontWeight: 400 }}>DOMO DITHER</h1>
            <IconButton onClick={resetAll} title="Reset all">↺</IconButton>
          </div>
          
          {/* Source Section */}
          <Section title="SOURCE">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            <Button primary onClick={() => fileInputRef.current.click()} style={{ marginBottom: '12px' }}>
              {image ? 'CHANGE IMAGE' : 'UPLOAD IMAGE'}
            </Button>
            <p style={{ fontSize: '9px', color: '#444', margin: '0 0 16px 0', textAlign: 'center' }}>or drag & drop anywhere</p>
            
            {image && (
              <>
                <Slider label={`SCALE ${Math.round(imageScale * 100)}%`} value={imageScale} min={0.5} max={2} step={0.05} onChange={setImageScale} />
                <Button onClick={randomizeLayers}>↻ RANDOMIZE</Button>
              </>
            )}
          </Section>
          
          {/* Presets Section */}
          <Section title="PRESETS" defaultOpen={false}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '16px' }}>
              {Object.entries(PRESETS).map(([key, preset]) => (
                <Tooltip key={key} text={preset.description}>
                  <Button onClick={() => applyPreset(key)} style={{ fontSize: '9px' }}>
                    {preset.name}
                  </Button>
                </Tooltip>
              ))}
            </div>
            
            {/* Custom presets */}
            {Object.keys(customPresets).length > 0 && (
              <>
                <label style={{ display: 'block', color: '#666', fontSize: '10px', marginBottom: '8px', fontFamily: 'monospace' }}>
                  SAVED
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                  {Object.entries(customPresets).map(([key, preset]) => (
                    <div key={key} style={{ display: 'flex', gap: '4px' }}>
                      <Button onClick={() => applyPreset(key, true)} style={{ flex: 1, fontSize: '9px' }}>
                        {preset.name}
                      </Button>
                      <IconButton onClick={() => deleteCustomPreset(key)} title="Delete">×</IconButton>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            <Button onClick={() => setShowSaveModal(true)} style={{ opacity: 0.7 }}>
              + SAVE CURRENT AS PRESET
            </Button>
          </Section>
          
          {/* Adjustments Section */}
          <Section title="ADJUSTMENTS">
            <Slider 
              label={`BRIGHTNESS ${brightness > 0 ? '+' : ''}${Math.round(brightness * 100)}`} 
              value={brightness} min={-0.5} max={0.5} step={0.01} onChange={setBrightness} 
            />
            <Slider 
              label={`CONTRAST ${contrast > 0 ? '+' : ''}${Math.round(contrast * 100)}`} 
              value={contrast} min={-0.5} max={0.5} step={0.01} onChange={setContrast} 
            />
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <Button onClick={() => setInvert(!invert)} active={invert} style={{ flex: 1 }}>
                {invert ? '◐ INVERTED' : '◑ INVERT'}
              </Button>
              <Button onClick={() => { setBrightness(0); setContrast(0); setInvert(false); }} style={{ flex: 1, color: '#666' }}>
                RESET
              </Button>
            </div>
          </Section>
          
          {/* Analog Effects Section */}
          <Section title="ANALOG EFFECTS" defaultOpen={false}>
            <div style={{ marginBottom: '16px' }}>
              <Button onClick={() => setInkBleed(!inkBleed)} active={inkBleed} style={{ marginBottom: inkBleed ? '12px' : '0' }}>
                {inkBleed ? '● INK BLEED ON' : '○ INK BLEED'}
              </Button>
              {inkBleed && (
                <>
                  <Slider 
                    label={`SPREAD ${Math.round(inkBleedAmount * 100)}%`} 
                    value={inkBleedAmount} min={0.1} max={1} step={0.05} onChange={setInkBleedAmount} 
                  />
                  <Slider 
                    label={`ROUGHNESS ${Math.round(inkBleedRoughness * 100)}%`} 
                    value={inkBleedRoughness} min={0} max={1} step={0.05} onChange={setInkBleedRoughness} 
                  />
                </>
              )}
            </div>
            
            <Button onClick={() => setPaperTexture(!paperTexture)} active={paperTexture}>
              {paperTexture ? '● PAPER MODE ON' : '○ PAPER MODE'}
            </Button>
            <p style={{ fontSize: '9px', color: '#444', margin: '8px 0 0 0' }}>
              Adds warm paper tint and texture overlay
            </p>
          </Section>
          
          {/* Gradient Map Section */}
          <Section title="GRADIENT MAP" defaultOpen={false}>
            <Button onClick={() => setGradientEnabled(!gradientEnabled)} active={gradientEnabled} style={{ marginBottom: '16px' }}>
              {gradientEnabled ? 'ENABLED' : 'DISABLED'}
            </Button>
            
            {gradientEnabled && (
              <>
                <label style={{ display: 'block', color: '#666', fontSize: '10px', marginBottom: '8px', fontFamily: 'monospace' }}>
                  COLORS ({gradientColors.length}/4)
                </label>
                
                <div style={{ 
                  height: '24px', 
                  marginBottom: '16px', 
                  background: `linear-gradient(to right, ${gradientColors.map((c, i) => `${DOMO_PALETTE[c]?.hex || '#000'} ${(i / (gradientColors.length - 1)) * 100}%`).join(', ')})`,
                  border: '1px solid #333'
                }} />
                
                {gradientColors.map((colorKey, i) => (
                  <div key={i} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ color: '#666', fontSize: '10px' }}>STOP {i + 1}</span>
                      {gradientColors.length > 2 && (
                        <IconButton onClick={() => removeGradientColor(i)} style={{ marginLeft: 'auto' }}>×</IconButton>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      {ALL_COLOR_KEYS.map(key => (
                        <ColorSwatch
                          key={key}
                          colorKey={key}
                          color={DOMO_PALETTE[key]}
                          selected={colorKey === key}
                          onClick={() => {
                            const newColors = [...gradientColors];
                            newColors[i] = key;
                            setGradientColors(newColors);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                
                {gradientColors.length < 4 && (
                  <Button onClick={addGradientColor} style={{ marginBottom: '16px' }}>+ ADD STOP</Button>
                )}
                
                <div style={{ borderTop: '1px solid #222', paddingTop: '16px', marginTop: '8px' }}>
                  <AlgorithmSelect value={gradientDitherType} onChange={setGradientDitherType} includeNone />
                  
                  {gradientDitherType !== 'none' && (
                    <>
                      <Slider label={`DENSITY ${Math.round(gradientDitherThreshold * 100)}%`} value={gradientDitherThreshold} min={0} max={1} step={0.01} onChange={setGradientDitherThreshold} />
                      {gradientAlgoInfo?.hasScale && (
                        <Slider label={`SIZE ${gradientDitherScale}px`} value={gradientDitherScale} min={2} max={32} step={1} onChange={setGradientDitherScale} />
                      )}
                      {gradientAlgoInfo?.hasAngle && (
                        <Slider label={`ANGLE ${gradientDitherAngle}°`} value={gradientDitherAngle} min={0} max={180} step={5} onChange={setGradientDitherAngle} />
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </Section>
          
          {/* Layers Section */}
          {!gradientEnabled && (
            <Section title={`LAYERS ${layers.length}/4`}>
              {layers.map((layer, i) => (
                <LayerPanel
                  key={layer.id}
                  layer={layer}
                  index={i}
                  totalLayers={layers.length}
                  onUpdate={(l) => updateLayer(i, l)}
                  onRemove={() => removeLayer(i)}
                  onDuplicate={() => duplicateLayer(i)}
                  onMoveUp={() => moveLayerUp(i)}
                  onMoveDown={() => moveLayerDown(i)}
                  canRemove={layers.length > 1}
                />
              ))}
              {layers.length < 4 && (
                <Button onClick={addLayer}>+ ADD LAYER</Button>
              )}
            </Section>
          )}
          
          {/* Output Section */}
          <Section title="OUTPUT">
            <ColorPicker 
              value={backgroundColor === '#ffffff' ? 'white' : backgroundColor === '#000000' ? 'black' : ''} 
              onChange={(k) => setBackgroundColor(DOMO_PALETTE[k].hex)} 
              label="BACKGROUND" 
              showAll 
            />
            
            <label style={{ display: 'block', color: '#666', fontSize: '10px', marginBottom: '8px', fontFamily: 'monospace' }}>RESOLUTION</label>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
              {Object.entries(EXPORT_RESOLUTIONS).map(([key, { label }]) => (
                <Button key={key} onClick={() => setExportResolution(key)} active={exportResolution === key} style={{ flex: 1, fontSize: '8px' }}>
                  {label}
                </Button>
              ))}
            </div>
            
            {image && (
              <Button primary onClick={exportPNG}>EXPORT PNG</Button>
            )}
          </Section>
        </div>
        
        {/* Canvas Area */}
        <div 
          ref={canvasContainerRef}
          style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '32px', 
            backgroundColor: '#111', 
            overflow: 'hidden',
            position: 'relative',
            cursor: isPanning ? 'grabbing' : (image && !showComparison ? 'grab' : 'default')
          }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Paper texture overlay - warm tint + noise */}
          {paperTexture && image && (
            <div style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              mixBlendMode: 'multiply',
              opacity: 0.3,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E"), linear-gradient(to bottom right, #fffdf5, #f0f0e0)`,
              backgroundRepeat: 'repeat',
              zIndex: 20
            }} />
          )}
          
          {/* Top bar */}
          {image && (
            <div style={{ 
              position: 'absolute', 
              top: '16px', 
              left: '16px', 
              right: '16px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              zIndex: 10,
              pointerEvents: 'none'
            }}>
              {/* Dimensions */}
              <div style={{ 
                fontSize: '10px', 
                color: '#555', 
                fontFamily: 'monospace',
                backgroundColor: 'rgba(0,0,0,0.5)',
                padding: '6px 10px'
              }}>
                {image.width} × {image.height}
                {image.width > PREVIEW_MAX_WIDTH && (
                  <span style={{ color: '#666', marginLeft: '8px' }}>
                    (preview @ {Math.round(PREVIEW_MAX_WIDTH / image.width * 100)}%)
                  </span>
                )}
              </div>
              
              {/* Controls */}
              <div style={{ display: 'flex', gap: '4px', pointerEvents: 'auto' }}>
                <Button small onClick={() => setZoom(z => Math.max(0.25, z / 1.5))}>−</Button>
                <Button small onClick={resetView} style={{ minWidth: '60px' }}>{Math.round(zoom * 100)}%</Button>
                <Button small onClick={() => setZoom(z => Math.min(8, z * 1.5))}>+</Button>
                <div style={{ width: '8px' }} />
                <Button small onClick={() => setShowComparison(!showComparison)} active={showComparison}>
                  {showComparison ? '✓ COMPARE' : 'COMPARE'}
                </Button>
              </div>
            </div>
          )}
          
          {/* Help text */}
          {image && !showComparison && (
            <div style={{ 
              position: 'absolute', 
              bottom: '16px', 
              left: '50%', 
              transform: 'translateX(-50%)',
              fontSize: '9px', 
              color: '#333', 
              fontFamily: 'monospace',
              pointerEvents: 'none'
            }}>
              Scroll to zoom • Drag to pan
            </div>
          )}
          
          {!image ? (
            <div style={{ textAlign: 'center', color: '#444' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>◐</div>
              <p style={{ fontSize: '10px', letterSpacing: '0.1em' }}>UPLOAD OR DROP IMAGE</p>
            </div>
          ) : (
            <div style={{
              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.1s ease-out',
              position: 'relative'
            }}>
              {/* Original canvas (for comparison) */}
              <canvas 
                ref={originalCanvasRef} 
                style={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  border: '1px solid #333',
                  imageRendering: zoom > 1 ? 'pixelated' : 'auto',
                  clipPath: showComparison ? `inset(0 ${(1 - comparisonPosition) * 100}% 0 0)` : 'none',
                  display: showComparison ? 'block' : 'none'
                }} 
              />
              
              {/* Processed canvas */}
              <canvas 
                ref={canvasRef} 
                style={{ 
                  border: '1px solid #333',
                  imageRendering: zoom > 1 ? 'pixelated' : 'auto',
                  clipPath: showComparison ? `inset(0 0 0 ${comparisonPosition * 100}%)` : 'none'
                }} 
              />
              
              {/* Comparison slider */}
              {showComparison && (
                <ComparisonSlider 
                  position={comparisonPosition} 
                  onChange={setComparisonPosition} 
                />
              )}
            </div>
          )}
          <canvas ref={sourceCanvasRef} style={{ display: 'none' }} />
        </div>
        
        <Toast message={toastMessage} visible={toastVisible} onHide={() => setToastVisible(false)} />
        
        {showSaveModal && (
          <SavePresetModal 
            onSave={saveCustomPreset} 
            onCancel={() => setShowSaveModal(false)} 
          />
        )}
      </div>
    </DropZone>
  );
}
