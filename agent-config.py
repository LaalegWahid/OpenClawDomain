#!/usr/bin/env python3
"""
agent-config.py — post-processes openclaw.json and writes auth-profiles.json.

Called by agent-entrypoint.sh after the initial JSON skeleton is written.

Usage:
    python3 agent-config.py <config_file> <auth_profiles_file>
"""
import base64
import json
import os
import sys


def patch_discord(cfg):
    token = os.environ.get("DISCORD_BOT_TOKEN", "")
    if not token:
        return
    print("Adding Discord channel config...")
    cfg.setdefault("channels", {})["discord"] = {
        "enabled": True,
        "token": token,
        "dmPolicy": "open",
        "allowFrom": ["*"],
        "execApprovals": {"enabled": True},
    }
    print("Discord channel configured.")


def patch_whatsapp(cfg):
    if not os.environ.get("WHATSAPP_ENABLED", ""):
        return
    print("Adding WhatsApp channel config (Baileys)...")
    cfg.setdefault("channels", {})["whatsapp"] = {
        "enabled": True,
        "dmPolicy": "open",
        "allowFrom": ["*"],
    }
    print("WhatsApp channel configured.")


def patch_mcp(cfg):
    mcp_b64 = os.environ.get("MCP_CONFIG_B64", "")
    if not mcp_b64:
        return
    print("Adding MCP server config...")
    mcp_servers = json.loads(base64.b64decode(mcp_b64).decode())
    cfg.setdefault("mcp", {})["servers"] = mcp_servers
    print("MCP servers configured.")


def is_valid_key(key, provider):
    if not key or not key.strip():
        return False, "empty"
    k = key.strip()
    if provider == "anthropic" and not k.startswith("sk-ant-"):
        return False, "invalid format (expected sk-ant-...)"
    if provider == "openrouter" and not k.startswith("sk-or-"):
        return False, "invalid format (expected sk-or-...)"
    if provider == "google" and len(k) < 20:
        return False, "too short to be valid"
    return True, "ok"


def write_auth_profiles(path):
    profiles = {}
    for provider, env_var, profile_key in [
        ("anthropic", "ANTHROPIC_API_KEY", "anthropic:default"),
        ("google", "GEMINI_API_KEY", "google:default"),
        ("openrouter", "OPENROUTER_API_KEY", "openrouter:default"),
    ]:
        key = os.environ.get(env_var, "")
        valid, reason = is_valid_key(key, provider)
        if valid:
            profiles[profile_key] = {"type": "api_key", "provider": provider, "key": key.strip()}
        elif key:
            print(f"WARNING: {env_var} set but skipped ({reason})", flush=True)

    data = {"version": 1, "profiles": profiles}
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Auth profiles written: {list(profiles.keys())}")


def main():
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <config_file> <auth_profiles_file>", file=sys.stderr)
        sys.exit(1)

    config_path = sys.argv[1]
    auth_path = sys.argv[2]

    with open(config_path) as f:
        cfg = json.load(f)

    patch_discord(cfg)
    patch_whatsapp(cfg)
    patch_mcp(cfg)

    with open(config_path, "w") as f:
        json.dump(cfg, f, indent=2)

    write_auth_profiles(auth_path)


if __name__ == "__main__":
    main()
