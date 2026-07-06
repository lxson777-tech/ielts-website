# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Agent Instructions

You're working inside the **WAT framework** (Workflows, Agents, Tools). This architecture separates concerns so that probabilistic AI handles reasoning while deterministic code handles execution. That separation is what makes this system reliable.

## The WAT Architecture

**Layer 1: Workflows (The Instructions)**
- Markdown SOPs stored in `workflows/`
- Each workflow defines the objective, required inputs, which tools to use, expected outputs, and how to handle edge cases
- Written in plain language, the same way you'd brief someone on your team

**Layer 2: Agents (The Decision-Maker)**
- This is your role. You're responsible for intelligent coordination.
- Read the relevant workflow, run tools in the correct sequence, handle failures gracefully, and ask clarifying questions when needed
- You connect intent to execution without trying to do everything yourself
- Example: If you need to pull data from a website, don't attempt it directly. Read `workflows/scrape_website.md`, figure out the required inputs, then execute `tools/scrape_single_site.py`

**Layer 3: Tools (The Execution)**
- Python scripts in `tools/` that do the actual work
- API calls, data transformations, file operations, database queries
- Credentials and API keys are stored in `.env`

**Why this matters:** When AI tries to handle every step directly, accuracy drops fast. If each step is 90% accurate, you're down to 59% success after just five steps. By offloading execution to deterministic scripts, you stay focused on orchestration and decision-making where you excel.

## How to Operate

**1. Look for existing tools first**
Before building anything new, check `tools/` based on what your workflow requires. Only create new scripts when nothing exists for that task.

**2. Learn and adapt when things fail**
When you hit an error:
- Read the full error message and trace
- Fix the script and retest (if it uses paid API calls or credits, check with the user before running again)
- Document what you learned in the workflow (rate limits, timing quirks, unexpected behavior)

**3. Keep workflows current**
Workflows should evolve as you learn. When you find better methods, discover constraints, or encounter recurring issues, update the workflow. Don't create or overwrite workflows without asking unless explicitly told to — these are the user's instructions and need to be preserved and refined.

## Running Tools

Tools are standalone Python scripts. Run them directly:

```
python tools/<script_name>.py
```

Install dependencies once:

```
pip install -r requirements.txt
```

All tools import from [tools/utils.py](tools/utils.py), which auto-loads `.env` and provides:
- `require_env(*keys)` — exits with a clear message if any keys are missing
- `tmp_path(filename)` — resolves a `.tmp/` path and creates the directory
- `get_google_service(api, version)` — handles OAuth and returns a Google API client

If a script fails with a missing-key error, add the key to `.env`.

## Building Agents with Claude

**Default model:** `claude-sonnet-4-6`

### The agentic loop

```
messages = [{"role": "user", "content": task}]
while True:
    response = client.messages.create(system=..., tools=..., messages=messages)
    if response.stop_reason == "end_turn":
        return response          # done
    # stop_reason == "tool_use": execute each tool call, feed results back
    messages.append({"role": "assistant", "content": response.content})
    messages.append({"role": "user",      "content": [tool_result, ...]})
```

All of this is handled by [tools/agent_runner.py](tools/agent_runner.py). Import and call `run_agent()` from any workflow tool — don't re-implement the loop.

### Defining tools for Claude

Each tool passed to `run_agent()` must follow this shape:

```python
{
    "name": "tool_name",
    "description": "What this tool does and when to use it.",
    "input_schema": {
        "type": "object",
        "properties": {
            "param": {"type": "string", "description": "..."}
        },
        "required": ["param"],
    },
}
```

The matching entry in `tool_registry` is a plain Python callable: `{"tool_name": my_function}`.

### Prompt caching

For system prompts longer than ~500 tokens, `agent_runner.py` already adds `"cache_control": {"type": "ephemeral"}` to the system prompt block. This caches the prompt on Anthropic's side and cuts cost significantly on multi-turn tasks. No extra work needed.

### Error handling

`agent_runner.py` retries automatically on:
- `anthropic.RateLimitError` — waits 60 s
- `anthropic.APIStatusError` status 529 (overloaded) — exponential backoff (5 s, 15 s, 60 s)

For any other `anthropic.APIError`, let it propagate and fix the root cause.

## The Self-Improvement Loop

Every failure is a chance to make the system stronger:
1. Identify what broke
2. Fix the tool
3. Verify the fix works
4. Update the workflow with the new approach

## File Structure

```
.tmp/           # Temporary files (scraped data, intermediate exports). Regenerated as needed.
tools/          # Python scripts for deterministic execution
workflows/      # Markdown SOPs defining what to do and how
.env            # API keys and environment variables
credentials.json, token.json  # Google OAuth (gitignored)
```

**Deliverables** go to cloud services (Google Sheets, Slides, etc.) — not stored locally. Everything in `.tmp/` is disposable and regenerated on demand.

## Bottom Line

You sit between what the user wants (workflows) and what actually gets done (tools). Read instructions, make smart decisions, call the right tools, recover from errors, and keep improving the system as you go.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
