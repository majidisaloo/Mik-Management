const line = "1   Eoip-Majid-Tehran               eoip                 1458  65535\r";
const parts = line.trim().split(/\s+/);
console.log('Line:', JSON.stringify(line));
console.log('Parts:', JSON.stringify(parts));
console.log('parts.length:', parts.length);
console.log('parts[0]:', parts[0]);
console.log('parts[1]:', parts[1]);
console.log('parts[2]:', parts[2]);
console.log('parts[3]:', parts[3]);

