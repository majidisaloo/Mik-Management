import bcrypt from 'bcrypt';
import fs from 'fs';

const password = 'Majid@#$Majid';
const email = 'm@m.com';

try {
  const passwordHash = await bcrypt.hash(password, 10);
  console.log('New password hash:', passwordHash);
  
  const dbContent = fs.readFileSync('./data/app.db', 'utf8');
  const db = JSON.parse(dbContent);
  
  const user = db.users.find(u => u.email === email);
  if (user) {
    user.passwordHash = passwordHash;
    fs.writeFileSync('./data/app.db', JSON.stringify(db, null, 2));
    console.log('User password updated successfully');
  } else {
    console.log('User not found');
  }
} catch (error) {
  console.error('Error:', error);
}
