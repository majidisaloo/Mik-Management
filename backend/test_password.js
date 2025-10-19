import bcrypt from 'bcrypt';

const hash = '$2b$10$thT0aVUSl/xHAQL9GNO5B.L5rNSrPXfP/CEWR0wHWZ8f5XJD5LZrC';
const password = 'Majid@#$Majid';

try {
  const result = await bcrypt.compare(password, hash);
  console.log('Password match:', result);
} catch (error) {
  console.error('Error:', error);
}
