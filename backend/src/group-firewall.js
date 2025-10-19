// Group Firewall Management System
// این فایل برای مدیریت فایروال rules روی گروه‌های میکروتیک‌ها است

import initializeDatabase from './database.js';

// نمونه Address Lists
const sampleAddressLists = {
  "trusted-hosts": {
    name: "trusted-hosts",
    description: "Hosts that are trusted and can access internal resources",
    addresses: [
      "192.168.1.0/24",
      "10.0.0.0/8",
      "172.16.0.0/12"
    ],
    created: new Date().toISOString()
  },
  "blocked-sites": {
    name: "blocked-sites", 
    description: "Sites that should be blocked",
    addresses: [
      "8.8.8.8",
      "1.1.1.1"
    ],
    created: new Date().toISOString()
  },
  "dmz-servers": {
    name: "dmz-servers",
    description: "DMZ servers that need special access",
    addresses: [
      "192.168.100.0/24"
    ],
    created: new Date().toISOString()
  }
};

// نمونه Firewall Rules برای گروه‌ها
const sampleGroupFirewallRules = [
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
    comment: "Allow trusted hosts to access DMZ web and SSH services",
    enabled: true,
    created: new Date().toISOString()
  },
  {
    id: 2,
    name: "Block Malicious Traffic",
    description: "Block traffic from blocked sites",
    groupId: 1,
    chain: "input",
    action: "drop",
    srcAddressList: "blocked-sites",
    dstAddress: "",
    protocol: "",
    port: "",
    comment: "Drop all traffic from blocked sites",
    enabled: true,
    created: new Date().toISOString()
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
    protocol: "",
    port: "",
    comment: "Allow all internal network communication",
    enabled: true,
    created: new Date().toISOString()
  }
];

// تابع برای اعمال فایروال rule روی یک گروه
export async function applyFirewallRuleToGroup(groupId, ruleId) {
  try {
    console.log(`Applying firewall rule ${ruleId} to group ${groupId}`);
    
    // خواندن دیتابیس
    const db = await initializeDatabase();
    const state = db.state;
    
    // پیدا کردن گروه
    const group = state.groups.find(g => g.id === groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }
    
    // پیدا کردن rule
    const rule = sampleGroupFirewallRules.find(r => r.id === ruleId);
    if (!rule) {
      throw new Error(`Firewall rule ${ruleId} not found`);
    }
    
    // پیدا کردن تمام میکروتیک‌های گروه
    const groupMikrotiks = state.mikrotiks.filter(m => m.groupId === groupId);
    
    console.log(`Found ${groupMikrotiks.length} MikroTik devices in group ${group.name}`);
    
    // اعمال rule روی هر میکروتیک
    const results = [];
    for (const mikrotik of groupMikrotiks) {
      try {
        // شبیه‌سازی اعمال rule (در واقعیت اینجا SSH command ارسال می‌شود)
        const result = await applyRuleToMikrotik(mikrotik.id, rule);
        results.push({
          mikrotikId: mikrotik.id,
          mikrotikName: mikrotik.name,
          success: true,
          result: result
        });
        
        console.log(`✓ Rule applied to ${mikrotik.name} (${mikrotik.host})`);
      } catch (error) {
        results.push({
          mikrotikId: mikrotik.id,
          mikrotikName: mikrotik.name,
          success: false,
          error: error.message
        });
        
        console.log(`✗ Failed to apply rule to ${mikrotik.name}: ${error.message}`);
      }
    }
    
    return {
      success: true,
      groupId: groupId,
      groupName: group.name,
      ruleId: ruleId,
      ruleName: rule.name,
      totalDevices: groupMikrotiks.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results
    };
    
  } catch (error) {
    console.error('Error applying firewall rule to group:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// تابع برای اعمال rule روی یک میکروتیک خاص
async function applyRuleToMikrotik(mikrotikId, rule) {
  // شبیه‌سازی SSH command برای اعمال rule
  const sshCommand = generateSSHCommand(rule);
  
  console.log(`SSH Command for MikroTik ${mikrotikId}:`);
  console.log(sshCommand);
  
  // در واقعیت اینجا SSH connection برقرار می‌شود و command اجرا می‌شود
  // برای نمونه، فقط یک response موفق برمی‌گردانیم
  return {
    command: sshCommand,
    status: "applied",
    timestamp: new Date().toISOString()
  };
}

// تولید SSH command برای MikroTik
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

// تابع برای ایجاد Address List
export async function createAddressList(listName, addresses, description = "") {
  try {
    const db = await initializeDatabase();
    const state = db.state;
    
    // اضافه کردن address list جدید
    if (!state.addressLists) {
      state.addressLists = [];
    }
    
    const newList = {
      name: listName,
      description: description,
      addresses: addresses,
      created: new Date().toISOString()
    };
    
    state.addressLists.push(newList);
    
    // ذخیره دیتابیس
    await db.save();
    
    console.log(`Address list '${listName}' created with ${addresses.length} addresses`);
    
    return {
      success: true,
      addressList: newList
    };
    
  } catch (error) {
    console.error('Error creating address list:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// تابع برای دریافت تمام Address Lists
export async function getAddressLists() {
  try {
    const db = await initializeDatabase();
    const state = db.state;
    
    return {
      success: true,
      addressLists: state.addressLists || []
    };
    
  } catch (error) {
    console.error('Error getting address lists:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// تابع برای دریافت تمام Group Firewall Rules
export async function getGroupFirewallRules() {
  try {
    return {
      success: true,
      rules: sampleGroupFirewallRules,
      addressLists: sampleAddressLists
    };
    
  } catch (error) {
    console.error('Error getting group firewall rules:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// نمونه استفاده:
console.log("=== Group Firewall Management System ===");
console.log("Available Address Lists:");
Object.values(sampleAddressLists).forEach(list => {
  console.log(`- ${list.name}: ${list.addresses.join(', ')}`);
});

console.log("\nAvailable Firewall Rules:");
sampleGroupFirewallRules.forEach(rule => {
  console.log(`- ${rule.name}: ${rule.action} from ${rule.srcAddressList || rule.srcAddress} to ${rule.dstAddressList || rule.dstAddress}`);
});

export { sampleAddressLists, sampleGroupFirewallRules };
