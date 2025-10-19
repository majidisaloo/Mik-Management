import { getMikrotikById } from './src/database.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function getRealMikrotikLogs() {
  try {
    console.log('Getting MikroTik device info...');
    const device = await getMikrotikById(1);
    
    console.log('Device:', {
      name: device.name,
      host: device.host,
      sshUsername: device.routeros.sshUsername,
      sshPort: device.routeros.sshPort
    });
    
    console.log('\nTrying to get real MikroTik logs...');
    
    try {
      // Try to connect to MikroTik and get logs
      const sshCommand = `ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ${device.routeros.sshUsername}@${device.host} -p ${device.routeros.sshPort} "/log print" 2>/dev/null || echo "SSH connection failed"`;
      console.log('SSH Command:', sshCommand);
      
      const { stdout, stderr } = await execAsync(sshCommand, { timeout: 15000 });
      console.log('SSH Output:', stdout);
      if (stderr) console.log('SSH Error:', stderr);
      
    } catch (sshError) {
      console.log('SSH Error:', sshError.message);
      console.log('\nTrying alternative method...');
      
      // Try with password (if available)
      if (device.routeros.sshPassword) {
        try {
          const sshpassCommand = `sshpass -p "${device.routeros.sshPassword}" ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ${device.routeros.sshUsername}@${device.host} -p ${device.routeros.sshPort} "/log print" 2>/dev/null || echo "SSH with password failed"`;
          console.log('SSH with password command:', sshpassCommand);
          
          const { stdout: stdout2, stderr: stderr2 } = await execAsync(sshpassCommand, { timeout: 15000 });
          console.log('SSH with password output:', stdout2);
          if (stderr2) console.log('SSH with password error:', stderr2);
          
        } catch (sshpassError) {
          console.log('SSH with password error:', sshpassError.message);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getRealMikrotikLogs();
