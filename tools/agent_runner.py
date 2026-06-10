import time
import anthropic
from utils import require_env

DEFAULT_MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 8096


def run_agent(task, system_prompt, tools, tool_registry, model=DEFAULT_MODEL):
    require_env("ANTHROPIC_API_KEY")
    client = anthropic.Anthropic()

    system = [
        {
            "type": "text",
            "text": system_prompt,
            "cache_control": {"type": "ephemeral"},
        }
    ]

    messages = [{"role": "user", "content": task}]

    while True:
        response = _call_with_retry(client, model, system, tools, messages)

        if response.stop_reason == "end_turn":
            for block in response.content:
                if hasattr(block, "text"):
                    return block.text
            return ""

        # stop_reason == "tool_use"
        messages.append({"role": "assistant", "content": response.content})

        tool_results = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            fn = tool_registry.get(block.name)
            if fn is None:
                result = f"Unknown tool: {block.name}"
            else:
                try:
                    result = fn(**block.input)
                except Exception as e:
                    result = f"Error running {block.name}: {e}"

            tool_results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": str(result),
                }
            )

        messages.append({"role": "user", "content": tool_results})


def _call_with_retry(client, model, system, tools, messages):
    backoff = [5, 15, 60]
    for attempt, wait in enumerate([0] + backoff):
        if wait:
            time.sleep(wait)
        try:
            return client.messages.create(
                model=model,
                max_tokens=MAX_TOKENS,
                system=system,
                tools=tools,
                messages=messages,
            )
        except anthropic.RateLimitError:
            print("Rate limited — waiting 60s...")
            time.sleep(60)
        except anthropic.APIStatusError as e:
            if e.status_code == 529 and attempt < len(backoff):
                print(f"API overloaded — retrying in {backoff[attempt]}s...")
            else:
                raise
    raise RuntimeError("Max retries exceeded")
