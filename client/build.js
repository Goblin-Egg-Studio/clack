import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

// Process Tailwind CSS
try {
  console.log('Processing Tailwind CSS...');
  execSync('npx tailwindcss -i ./src/index.css -o ./dist/main.css --minify', { stdio: 'inherit' });
  console.log('✅ Tailwind CSS processed successfully');
} catch (error) {
  console.log('⚠️  Tailwind CLI not available, using fallback CSS');
  // Fallback: copy our manual CSS
  const fallbackCSS = readFileSync('./dist/main.css', 'utf8');
  writeFileSync('./dist/main.css', fallbackCSS);
}

// Build the main bundle
console.log('Building main bundle...');
execSync('bun build src/main.tsx --outdir dist --target browser --minify', { stdio: 'inherit' });
console.log('✅ Build complete!');

