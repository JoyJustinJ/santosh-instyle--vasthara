import { readFileSync, writeFileSync } from 'fs';

const files = [
  'src/pages/StaffDashboard.tsx',
  'src/pages/AdminDashboard.tsx',
];

// The mojibake appears as individual Unicode codepoints because Node reads the file as UTF-8
// The actual bad sequence: â (U+00E2) + ‚ (U+201A) + ¹ (U+00B9) = mis-decoded ₹
// In the raw UTF-8 file these might be stored as the Windows-1252 mis-reading
// Let's try multiple patterns

const PATTERNS = [
  // Pattern 1: stored as literal multi-char mojibake string
  { from: '\u00e2\u201a\u00b9', to: '₹' },
  // Pattern 2: â€™ etc variants  
  { from: '\u00e2\u0082\u00b9', to: '₹' },
  // Pattern 3: direct string match from grep output
  { from: 'â\u201a¹', to: '₹' },
  { from: 'â‚¹', to: '₹' },
];

for (const file of files) {
  let content = readFileSync(file, 'latin1'); // read as raw bytes
  const before = content;
  
  // The mojibake for ₹ (U+20B9) encoded as UTF-8 (E2 82 B9) but decoded as latin1:
  // E2 -> â, 82 -> (control char, latin1 = \x82), B9 -> ¹
  // \x82 in latin1 is an unprintable control char
  content = content.replaceAll('\xe2\x82\xb9', '₹');
  
  if (content !== before) {
    writeFileSync(file, content, 'utf8');
    const count = (before.match(/\xe2\x82\xb9/g) || []).length;
    console.log(`✅ Fixed ${count} rupee symbols in ${file}`);
  } else {
    // Try reading as UTF-8 and check for visually broken chars  
    const utf8content = readFileSync(file, 'utf8');
    let fixed = utf8content;
    // The chars â and ¹ appear side by side 
    // In UTF-8 source: â = \xC3\xA2, ‚ = \xE2\x80\x9A, ¹ = \xC2\xB9
    fixed = fixed.replace(/â€™/g, "'");
    fixed = fixed.replace(/â€"/g, "–");
    
    // Check for the specific broken rupee pattern visible in grep: â‚¹
    // These chars in the file as UTF-8 codepoints: U+00E2 U+201A U+00B9
    const brokenRupee = '\u00e2\u201a\u00b9';
    if (fixed.includes(brokenRupee)) {
      const count2 = (fixed.match(new RegExp(brokenRupee, 'g')) || []).length;
      fixed = fixed.replaceAll(brokenRupee, '₹');
      writeFileSync(file, fixed, 'utf8');
      console.log(`✅ Fixed ${count2} rupee symbols (UTF-8 path) in ${file}`);
    } else {
      console.log(`ℹ️  No fixable issues in ${file}`);
      // Show what non-ASCII chars exist
      const nonAscii = [...utf8content.matchAll(/[\u0080-\uFFFF]/g)].map(m => `U+${m[0].charCodeAt(0).toString(16).toUpperCase().padStart(4,'0')}`);
      const unique = [...new Set(nonAscii)];
      console.log('  Non-ASCII chars present:', unique.join(', '));
    }
  }
}
