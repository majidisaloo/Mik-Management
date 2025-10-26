const output = "Flags: R - RUNNING\r\nColumns: NAME, TYPE, ACTUAL-MTU, L2MTU\r\n#   NAME                            TYPE           ACTUAL-MTU  L2MTU\r\n0 R ether2                          ether                1500   9014\r\n1   Eoip-Majid-Tehran               eoip                 1458  65535\r\n2   Eoip-Shatel-Majid-Asiatech-owa  eoip                 1458  65535\r\n3   EoipV6-Majid                    eoipv6-              1444  65535\r\n4 R Eoip_Majid.Mashayekhi_72.212    eoip                 1390  65535\r\n";

const lines = output.split('\n');
let inDataSection = false;

for (const line of lines) {
  if (line.includes('Columns: NAME, TYPE')) {
    inDataSection = true;
    console.log('Found header, starting data section');
    continue;
  }
  if (inDataSection && line.trim() && !line.includes('Flags:') && !line.includes('Columns:')) {
    console.log('\n--- Processing line ---');
    console.log('Raw:', JSON.stringify(line));
    
    const parts = line.trim().split(/\s+/);
    console.log('Parts:', parts);
    
    if (parts[0] === '#') {
      console.log('Skipping header line');
      continue;
    }
    
    let name, type, running = false;
    
    if (parts[0].match(/^\d+$/)) {
      console.log('Line starts with number:', parts[0]);
      running = parts[1] === 'R';
      console.log('Running:', running);
      console.log('Name index:', running ? 2 : 1);
      console.log('Type index:', running ? 3 : 2);
      name = running ? parts[2] : parts[1];
      type = running ? parts[3] : parts[2];
    }
    
    console.log('Result -> Name:', name, 'Type:', type, 'Running:', running);
  }
}

