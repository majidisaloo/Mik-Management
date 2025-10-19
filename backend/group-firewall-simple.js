// نمونه ساده Group Firewall Management
// این فایل نشان می‌دهد چگونه می‌توان فایروال rules را روی گروه‌های میکروتیک‌ها اعمال کرد

console.log("=== Group Firewall Management System ===");
console.log("این سیستم به شما امکان اعمال فایروال rules روی گروه‌های میکروتیک‌ها را می‌دهد\n");

// نمونه Address Lists
const addressLists = {
  "trusted-hosts": {
    name: "trusted-hosts",
    description: "Hosts that are trusted and can access internal resources",
    addresses: [
      "192.168.1.0/24",
      "10.0.0.0/8",
      "172.16.0.0/12"
    ]
  },
  "blocked-sites": {
    name: "blocked-sites", 
    description: "Sites that should be blocked",
    addresses: [
      "8.8.8.8",
      "1.1.1.1"
    ]
  },
  "dmz-servers": {
    name: "dmz-servers",
    description: "DMZ servers that need special access",
    addresses: [
      "192.168.100.0/24"
    ]
  }
};

// نمونه Firewall Rules برای گروه‌ها
const firewallRules = [
  {
    id: 1,
    name: "Allow Trusted to DMZ",
    description: "Allow trusted hosts to access DMZ servers",
    groupId: 1, // گروه Mik-Group Root
    chain: "forward",
    action: "accept",
    srcAddressList: "trusted-hosts",
    dstAddressList: "dmz-servers", 
    protocol: "tcp",
    port: "80,443,22",
    comment: "Allow trusted hosts to access DMZ web and SSH services"
  },
  {
    id: 2,
    name: "Block Malicious Traffic",
    description: "Block traffic from blocked sites",
    groupId: 1,
    chain: "input",
    action: "drop",
    srcAddressList: "blocked-sites",
    comment: "Drop all traffic from blocked sites"
  },
  {
    id: 3,
    name: "Allow Internal Communication",
    description: "Allow internal network communication",
    groupId: 1,
    chain: "forward",
    action: "accept",
    srcAddress: "192.168.0.0/16",
    dstAddress: "192.168.0.0/16",
    comment: "Allow all internal network communication"
  }
];

// تابع برای تولید SSH command
function generateSSHCommand(rule) {
  let command = "/ip firewall filter add";
  
  command += ` chain=${rule.chain}`;
  command += ` action=${rule.action}`;
  
  if (rule.srcAddressList) {
    command += ` src-address-list=${rule.srcAddressList}`;
  }
  if (rule.srcAddress) {
    command += ` src-address=${rule.srcAddress}`;
  }
  if (rule.dstAddressList) {
    command += ` dst-address-list=${rule.dstAddressList}`;
  }
  if (rule.dstAddress) {
    command += ` dst-address=${rule.dstAddress}`;
  }
  if (rule.protocol) {
    command += ` protocol=${rule.protocol}`;
  }
  if (rule.port) {
    command += ` dst-port=${rule.port}`;
  }
  if (rule.comment) {
    command += ` comment="${rule.comment}"`;
  }
  
  return command;
}

// نمایش Address Lists
console.log("1. Address Lists:");
Object.values(addressLists).forEach(list => {
  console.log(`   - ${list.name}: ${list.addresses.join(', ')}`);
  console.log(`     Description: ${list.description}`);
});

console.log("\n2. Firewall Rules:");
firewallRules.forEach(rule => {
  console.log(`   - Rule ${rule.id}: ${rule.name}`);
  console.log(`     Action: ${rule.action}`);
  console.log(`     Source: ${rule.srcAddressList || rule.srcAddress || 'Any'}`);
  console.log(`     Destination: ${rule.dstAddressList || rule.dstAddress || 'Any'}`);
  console.log(`     Protocol: ${rule.protocol || 'Any'}`);
  console.log(`     Port: ${rule.port || 'Any'}`);
  console.log(`     Comment: ${rule.comment}`);
  console.log("");
});

console.log("3. SSH Commands for Address Lists:");
console.log("   این commands برای ایجاد address lists استفاده می‌شود:");
console.log("");
Object.values(addressLists).forEach(list => {
  list.addresses.forEach(address => {
    console.log(`   /ip firewall address-list add list=${list.name} address=${address} comment="${list.description}"`);
  });
});

console.log("\n4. SSH Commands for Firewall Rules:");
console.log("   این commands برای اعمال firewall rules استفاده می‌شود:");
console.log("");
firewallRules.forEach(rule => {
  const command = generateSSHCommand(rule);
  console.log(`   Rule ${rule.id} (${rule.name}):`);
  console.log(`   ${command}`);
  console.log("");
});

console.log("5. نمونه استفاده:");
console.log("   برای اعمال یک rule روی گروه:");
console.log("   1. گروه مورد نظر را انتخاب کنید");
console.log("   2. rule مورد نظر را انتخاب کنید");
console.log("   3. سیستم به طور خودکار rule را روی تمام میکروتیک‌های گروه اعمال می‌کند");
console.log("   4. نتایج در لاگ‌ها ثبت می‌شود");

console.log("\n6. مثال عملی:");
console.log("   - گروه: Mik-Group Root (ID: 1)");
console.log("   - میکروتیک‌ها: Test1-Iran, Test2-Iran, Test3-Iran");
console.log("   - Rule: Allow Trusted to DMZ");
console.log("   - نتیجه: rule روی 3 میکروتیک اعمال می‌شود");

console.log("\n=== سیستم آماده استفاده است ===");
