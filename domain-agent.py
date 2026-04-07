"""
domain_agent.py
---------------
Prompt a domain/field, OpenRouter generates the agent config + answers your query.

Usage:
    python domain_agent.py --domain "education"
    python domain_agent.py --domain "agriculture"
    python domain_agent.py --domain "cybersecurity"

Requirements:
    pip install openai
    export OPENROUTER_API_KEY="your_key_here"
"""

import os
import sys
import json
import argparse

try:
    from openai import OpenAI
except ImportError:
    sys.exit("Run:  pip install openai")


OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


def get_client() -> OpenAI:
    key = os.environ.get("OPENROUTER_API_KEY")
    if not key:
        sys.exit("Set your key:  export OPENROUTER_API_KEY='your_key_here'")
    return OpenAI(api_key=key, base_url=OPENROUTER_BASE_URL)


def generate_domain_config(client: OpenAI, model: str, domain: str) -> dict:
    """Ask the model to generate the agent config for the given domain."""
    prompt = f"""
You are a configuration generator. Given a domain/field, generate a specialized AI agent config.

Domain: "{domain}"

Respond ONLY with a valid JSON object (no markdown, no explanation) in this exact format:
{{
  "label": "<Domain> Agent",
  "description": "One sentence describing what this agent does.",
  "topics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "off_topics": ["off1", "off2", "off3"],
  "skills": [
    {{
      "name": "skill-name",
      "description": "Short description",
      "instructions": "What the agent should do with this skill."
    }},
    {{
      "name": "skill-name-2",
      "description": "Short description",
      "instructions": "What the agent should do with this skill."
    }},
    {{
      "name": "skill-name-3",
      "description": "Short description",
      "instructions": "What the agent should do with this skill."
    }}
  ]
}}
"""
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = response.choices[0].message.content.strip()
    raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(raw)


def build_system_prompt(config: dict) -> str:
    topics = ", ".join(config["topics"])
    off    = ", ".join(config["off_topics"])
    label  = config["label"]
    refusal = (
        f"I'm a specialized {label}. I can only assist with "
        f"{config['description']} For other topics, please use the appropriate specialist agent."
    )

    skills_block = "\n\n".join(
        f"## Skill: {s['name']}\n{s['description']}\n{s['instructions']}"
        for s in config["skills"]
    )

    return f"""[SYSTEM INSTRUCTION — HIGHEST PRIORITY]

You are a {label.upper()} ONLY agent.
You are STRICTLY PROHIBITED from answering anything not related to: {topics}.

RULES:
1. If the question is off-topic, refuse with exactly: "{refusal}"
2. Never partially answer off-topic questions.

YOUR DOMAIN (answer these): {topics}
OFF-LIMITS (always refuse): {off}

[END SYSTEM INSTRUCTION]

{skills_block}"""


def ask_agent(client: OpenAI, model: str, system_prompt: str, user_prompt: str) -> str:
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
    )
    return response.choices[0].message.content


def main():
    parser = argparse.ArgumentParser(description="Domain agent powered by OpenRouter.")
    parser.add_argument("--domain", "-d", required=True, help="The field/domain (e.g. education, agriculture)")
    parser.add_argument("--model",  "-m", default="google/gemini-2.0-flash-001", help="OpenRouter model to use")
    args = parser.parse_args()

    client = get_client()

    # Step 1: generate config from domain name alone
    print(f"\n Generating agent config for domain: '{args.domain}'...")
    config = generate_domain_config(client, args.model, args.domain)

    print(f"\n Agent  : {config['label']}")
    print(f" About  : {config['description']}")
    print(f" Skills : {', '.join(s['name'] for s in config['skills'])}")
    print(f" Topics : {', '.join(config['topics'][:3])}...")

    system_prompt = build_system_prompt(config)

    # Step 2: interactive chat loop
    print(f"\n Agent is ready. Type your questions (or 'exit' to quit).\n")
    print("─" * 50)

    while True:
        try:
            user_input = input("\nYou: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not user_input or user_input.lower() in ("exit", "quit"):
            print("Goodbye!")
            break

        response = ask_agent(client, args.model, system_prompt, user_input)
        print(f"\nAgent: {response}")


if __name__ == "__main__":
    main()
