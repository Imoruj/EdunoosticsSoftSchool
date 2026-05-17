import fs from 'fs';
import { execSync } from 'child_process';

const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split('\n');

console.log("Starting environment variables transfer to Vercel...");

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  
  const match = trimmed.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    
    // Remove wrapping quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.substring(1, value.length - 1);
    }

    if (key === 'NEXTAUTH_URL') {
      console.log(`Skipping ${key} (should not be hardcoded to localhost on Vercel)`);
      continue;
    }

    console.log(`Processing ${key}...`);
    try {
        execSync(`npx vercel env rm ${key} -y`, { stdio: 'ignore' });
    } catch (e) { }

    for (const env of ['production', 'preview', 'development']) {
        try {
            execSync(`npx vercel env add ${key} ${env}`, { input: value, stdio: 'ignore' });
            console.log(`  Added to ${env}`);
        } catch (e) {
            console.error(`  Failed to add to ${env}`);
        }
    }
  }
}

console.log("Environment variables transfer complete!");
