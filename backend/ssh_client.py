#!/usr/bin/env python3
import sys
import paramiko
import json
import time

def ssh_connect(host, username, password, command):
    """Connect to SSH and execute command"""
    try:
        # Create SSH client
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        # Connect
        client.connect(
            hostname=host,
            username=username,
            password=password,
            timeout=10,
            look_for_keys=False,
            allow_agent=False
        )
        
        # Execute command
        stdin, stdout, stderr = client.exec_command(command)
        
        # Get output
        output = stdout.read().decode('utf-8')
        error = stderr.read().decode('utf-8')
        
        # Close connection
        client.close()
        
        if error:
            return {"success": False, "error": error, "output": output}
        else:
            return {"success": True, "output": output, "error": None}
            
    except Exception as e:
        return {"success": False, "error": str(e), "output": None}

def main():
    if len(sys.argv) < 5:
        print(json.dumps({
            "success": False,
            "error": "Usage: python ssh_client.py <host> <username> <password> <command>",
            "output": None
        }))
        sys.exit(1)
    
    host = sys.argv[1]
    username = sys.argv[2]
    password = sys.argv[3]
    command = sys.argv[4]
    
    result = ssh_connect(host, username, password, command)
    print(json.dumps(result))

if __name__ == "__main__":
    main()
