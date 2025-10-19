// نمونه کامل Group Firewall Management
// این فایل نشان می‌دهد چگونه می‌توان فایروال rules را روی گروه‌های میکروتیک‌ها اعمال کرد

import { applyFirewallRuleToGroup, createAddressList, getGroupFirewallRules } from './src/group-firewall.js';

// نمونه استفاده از Group Firewall System
async function demonstrateGroupFirewall() {
  console.log("=== Group Firewall Management Demo ===\n");
  
  // 1. ایجاد Address Lists
  console.log("1. Creating Address Lists...");
  
  const trustedHosts = await createAddressList(
    "trusted-hosts",
    ["192.168.1.0/24", "10.0.0.0/8"],
    "Trusted internal networks"
  );
  
  const blockedSites = await createAddressList(
    "blocked-sites", 
    ["8.8.8.8", "1.1.1.1"],
    "Blocked external sites"
  );
  
  const dmzServers = await createAddressList(
    "dmz-servers",
    ["192.168.100.0/24"],
    "DMZ server network"
  );
  
  console.log("✓ Address lists created successfully\n");
  
  // 2. دریافت Group Firewall Rules
  console.log("2. Available Group Firewall Rules:");
  const rules = await getGroupFirewallRules();
  
  if (rules.success) {
    rules.rules.forEach(rule => {
      console.log(`- Rule ${rule.id}: ${rule.name}`);
      console.log(`  Action: ${rule.action}`);
      console.log(`  Source: ${rule.srcAddressList || rule.srcAddress || 'Any'}`);
      console.log(`  Destination: ${rule.dstAddressList || rule.dstAddress || 'Any'}`);
      console.log(`  Protocol: ${rule.protocol || 'Any'}`);
      console.log(`  Port: ${rule.port || 'Any'}`);
      console.log(`  Comment: ${rule.comment}`);
      console.log("");
    });
  }
  
  // 3. اعمال Firewall Rule روی گروه
  console.log("3. Applying Firewall Rules to Group...");
  
  // اعمال rule برای Allow Trusted to DMZ
  const result1 = await applyFirewallRuleToGroup(1, 1);
  if (result1.success) {
    console.log(`✓ Rule 1 applied successfully to group ${result1.groupName}`);
    console.log(`  Total devices: ${result1.totalDevices}`);
    console.log(`  Successful: ${result1.successful}`);
    console.log(`  Failed: ${result1.failed}`);
    console.log("");
  }
  
  // اعمال rule برای Block Malicious Traffic
  const result2 = await applyFirewallRuleToGroup(1, 2);
  if (result2.success) {
    console.log(`✓ Rule 2 applied successfully to group ${result2.groupName}`);
    console.log(`  Total devices: ${result2.totalDevices}`);
    console.log(`  Successful: ${result2.successful}`);
    console.log(`  Failed: ${result2.failed}`);
    console.log("");
  }
  
  // اعمال rule برای Allow Internal Communication
  const result3 = await applyFirewallRuleToGroup(1, 3);
  if (result3.success) {
    console.log(`✓ Rule 3 applied successfully to group ${result3.groupName}`);
    console.log(`  Total devices: ${result3.totalDevices}`);
    console.log(`  Successful: ${result3.successful}`);
    console.log(`  Failed: ${result3.failed}`);
    console.log("");
  }
  
  console.log("=== Demo Completed ===");
}

// اجرای نمونه
demonstrateGroupFirewall().catch(console.error);

// نمونه SSH Commands که روی میکروتیک‌ها اجرا می‌شود:
console.log("\n=== Sample SSH Commands ===");
console.log("These commands would be executed on each MikroTik device:");
console.log("");
console.log("1. Allow Trusted to DMZ:");
console.log("/ip firewall filter add chain=forward action=accept src-address-list=trusted-hosts dst-address-list=dmz-servers protocol=tcp dst-port=80,443,22 comment=\"Allow trusted hosts to access DMZ web and SSH services\"");
console.log("");
console.log("2. Block Malicious Traffic:");
console.log("/ip firewall filter add chain=input action=drop src-address-list=blocked-sites comment=\"Drop all traffic from blocked sites\"");
console.log("");
console.log("3. Allow Internal Communication:");
console.log("/ip firewall filter add chain=forward action=accept src-address=192.168.0.0/16 dst-address=192.168.0.0/16 comment=\"Allow all internal network communication\"");
console.log("");
console.log("=== Address Lists Commands ===");
console.log("These commands would create the address lists:");
console.log("");
console.log("/ip firewall address-list add list=trusted-hosts address=192.168.1.0/24 comment=\"Trusted internal networks\"");
console.log("/ip firewall address-list add list=trusted-hosts address=10.0.0.0/8 comment=\"Trusted internal networks\"");
console.log("/ip firewall address-list add list=blocked-sites address=8.8.8.8 comment=\"Blocked external sites\"");
console.log("/ip firewall address-list add list=blocked-sites address=1.1.1.1 comment=\"Blocked external sites\"");
console.log("/ip firewall address-list add list=dmz-servers address=192.168.100.0/24 comment=\"DMZ server network\"");
