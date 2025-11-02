package main

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"golang.org/x/crypto/ssh"
)

type SSHClient struct {
	Host     string
	Username string
	Password string
	Client   *ssh.Client
}

func NewSSHClient(host, username, password string) *SSHClient {
	return &SSHClient{
		Host:     host,
		Username: username,
		Password: password,
	}
}

func (s *SSHClient) Connect() error {
	config := &ssh.ClientConfig{
		User: s.Username,
		Auth: []ssh.AuthMethod{
			ssh.Password(s.Password),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         10 * time.Second,
	}

	client, err := ssh.Dial("tcp", s.Host+":22", config)
	if err != nil {
		return fmt.Errorf("failed to connect: %v", err)
	}

	s.Client = client
	return nil
}

func (s *SSHClient) ExecuteCommand(command string) (string, error) {
	if s.Client == nil {
		return "", fmt.Errorf("not connected")
	}

	session, err := s.Client.NewSession()
	if err != nil {
		return "", fmt.Errorf("failed to create session: %v", err)
	}
	defer session.Close()

	output, err := session.CombinedOutput(command)
	if err != nil {
		return "", fmt.Errorf("command failed: %v", err)
	}

	return string(output), nil
}

func (s *SSHClient) Close() {
	if s.Client != nil {
		s.Client.Close()
	}
}

func main() {
	if len(os.Args) < 4 {
		fmt.Println("Usage: go run ssh-client.go <host> <username> <password> <command>")
		os.Exit(1)
	}

	host := os.Args[1]
	username := os.Args[2]
	password := os.Args[3]
	command := os.Args[4]

	client := NewSSHClient(host, username, password)
	
	// Connect
	if err := client.Connect(); err != nil {
		log.Fatalf("Connection failed: %v", err)
	}
	defer client.Close()

	// Execute command
	output, err := client.ExecuteCommand(command)
	if err != nil {
		log.Fatalf("Command execution failed: %v", err)
	}

	// Print output
	fmt.Print(output)
}
