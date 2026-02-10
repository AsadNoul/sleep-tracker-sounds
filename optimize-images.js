const fs = require('fs');
const path = require('path');

// Simple JPG to PNG converter without external dependencies
// We'll use a different approach - just copy and rename to test if JPG works directly

const onboardingDir = path.join(__dirname, 'assets', 'onboarding');
const files = fs.readdirSync(onboardingDir).filter(f => f.endsWith('.jpg'));

console.log('Found JPG files:', files);
console.log('\nThese files will be used as-is in the build.');
console.log('If build fails, we need to use an external image optimization tool.');
