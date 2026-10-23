// Revenge Protocol — Windows arka plan aracı (kalp atışı + komut).
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

type config struct {
	APIURL      string `json:"apiUrl"`
	AgentID     string `json:"agentId"`
	Secret      string `json:"secret"`
	RegisterKey string `json:"registerKey,omitempty"`
}

type heartbeatResp struct {
	Command *struct {
		Kind  string `json:"kind"`
		URL   string `json:"url"`
		Force bool   `json:"force"`
	} `json:"command"`
}

func main() {
	if runtime.GOOS != "windows" {
		fmt.Println("Yalnızca Windows")
		os.Exit(1)
	}

	cfgPath := configPath()
	cfg, err := loadConfig(cfgPath)
	if err != nil {
		fmt.Println("config:", err)
		os.Exit(1)
	}

	if cfg.RegisterKey != "" {
		if err := register(cfg); err != nil {
			fmt.Println("register:", err)
			os.Exit(1)
		}
		cfg.RegisterKey = ""
		_ = saveConfig(cfgPath, cfg)
	}

	hostname, _ := os.Hostname()
	interval := 25 * time.Second

	for {
		cmd, err := heartbeat(cfg, hostname)
		if err != nil {
			time.Sleep(interval)
			continue
		}
		if cmd != nil {
			execute(cmd)
		}
		time.Sleep(interval)
	}
}

func configPath() string {
	if p := os.Getenv("REVENGE_CONFIG"); p != "" {
		return p
	}
	return filepath.Join(os.Getenv("ProgramData"), "QSteelCAD", "RevengeProtocol", "config.json")
}

func loadConfig(path string) (config, error) {
	if api := os.Getenv("REVENGE_API_URL"); api != "" {
		return config{
			APIURL:  strings.TrimRight(api, "/"),
			AgentID: envOr("REVENGE_AGENT_ID", "dev-agent"),
			Secret:  envOr("REVENGE_AGENT_SECRET", "dev-secret-change-me-32chars!!"),
		}, nil
	}
	b, err := os.ReadFile(path)
	if err != nil {
		return config{}, err
	}
	var c config
	if err := json.Unmarshal(b, &c); err != nil {
		return config{}, err
	}
	if c.APIURL == "" || c.AgentID == "" || c.Secret == "" {
		return config{}, fmt.Errorf("eksik alan")
	}
	return c, nil
}

func saveConfig(path string, c config) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	b, _ := json.MarshalIndent(c, "", "  ")
	return os.WriteFile(path, b, 0o600)
}

func envOr(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func register(cfg config) error {
	body, _ := json.Marshal(map[string]string{
		"agentId":     cfg.AgentID,
		"secret":      cfg.Secret,
		"hostname":    hostname(),
		"registerKey": cfg.RegisterKey,
	})
	req, _ := http.NewRequest("POST", cfg.APIURL+"/api/agent/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		b, _ := io.ReadAll(res.Body)
		return fmt.Errorf("register %d: %s", res.StatusCode, string(b))
	}
	return nil
}

func heartbeat(cfg config, hostname string) (*heartbeatResp, error) {
	body, _ := json.Marshal(map[string]string{
		"agentId":  cfg.AgentID,
		"secret":   cfg.Secret,
		"hostname": hostname,
	})
	req, _ := http.NewRequest("POST", cfg.APIURL+"/api/agent/heartbeat", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("heartbeat %d", res.StatusCode)
	}
	var out heartbeatResp
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func execute(resp *heartbeatResp) {
	if resp.Command == nil {
		return
	}
	switch resp.Command.Kind {
	case "scenario":
		if resp.Command.URL != "" {
			openKiosk(resp.Command.URL)
		}
	case "shutdown":
		runShutdown(false)
	case "restart":
		runShutdown(true)
	}
}

func openKiosk(url string) {
	chromeArgs := []string{"--incognito", "--new-window", "--start-fullscreen", "--no-first-run", "--disable-infobars", url}
	for _, p := range []string{
		os.Getenv("ProgramFiles") + `\Google\Chrome\Application\chrome.exe`,
		os.Getenv("ProgramFiles(x86)") + `\Google\Chrome\Application\chrome.exe`,
		os.Getenv("LocalAppData") + `\Google\Chrome\Application\chrome.exe`,
	} {
		if _, err := os.Stat(p); err == nil {
			cmd := exec.Command(p, chromeArgs...)
			_ = cmd.Start()
			return
		}
	}
	_ = exec.Command("cmd", "/c", "start", "", url).Start()
}

func runShutdown(restart bool) {
	flag := "/s"
	if restart {
		flag = "/r"
	}
	cmd := exec.Command("shutdown", flag, "/t", "0", "/f")
	_ = cmd.Run()
}

func hostname() string {
	h, _ := os.Hostname()
	return h
}
