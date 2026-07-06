import sys
import json
from trustlens_agent.tools import (
    redact_pii,
    extract_links,
    inspect_domain_pattern,
    detect_social_engineering,
    score_risk,
    generate_safe_steps,
    generate_report_draft
)

TOOL_SCHEMAS = [
    {
        "name": "redact_pii",
        "description": "Redacts PII (emails, phones, cards, SSNs, national ID-like values) from message text.",
        "inputSchema": {
            "type": "object",
            "properties": {"text": {"type": "string"}},
            "required": ["text"]
        }
    },
    {
        "name": "extract_links",
        "description": "Finds links and clean domains in text without visiting them.",
        "inputSchema": {
            "type": "object",
            "properties": {"text": {"type": "string"}},
            "required": ["text"]
        }
    },
    {
        "name": "inspect_domain_pattern",
        "description": "Checks a domain for spoofing, typosquatting, and risky TLDs.",
        "inputSchema": {
            "type": "object",
            "properties": {"domain": {"type": "string"}},
            "required": ["domain"]
        }
    },
    {
        "name": "detect_social_engineering",
        "description": "Finds urgency, impersonation, payment pressure, and credential hooks in text.",
        "inputSchema": {
            "type": "object",
            "properties": {"text": {"type": "string"}},
            "required": ["text"]
        }
    },
    {
        "name": "score_risk",
        "description": "Computes a consolidated risk score from domain reports and text indicators.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "domain_reports": {"type": "array"},
                "text_indicators": {"type": "array"}
            },
            "required": ["domain_reports", "text_indicators"]
        }
    },
    {
        "name": "generate_safe_steps",
        "description": "Generates safe next steps for before_click, clicked_only, or compromised situations.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "verdict": {"type": "string"},
                "situation": {"type": "string"}
            },
            "required": ["verdict", "situation"]
        }
    },
    {
        "name": "generate_report_draft",
        "description": "Generates an anonymized incident report draft for escalation or reporting.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "text": {"type": "string"},
                "redacted_text": {"type": "string"},
                "risk_score": {"type": "integer"},
                "indicators": {"type": "array"},
                "safe_steps": {"type": "array"}
            },
            "required": ["text", "redacted_text", "risk_score", "indicators"]
        }
    }
]

def call_tool(tool_name: str, tool_args: dict):
    """Dispatches MCP tool calls for both standard names and FastMCP-style aliases."""
    if tool_name in ("redact_pii", "clean_text_pii"):
        return redact_pii(tool_args.get("text", ""))
    if tool_name in ("extract_links", "get_links"):
        return extract_links(tool_args.get("text", ""))
    if tool_name in ("inspect_domain_pattern", "analyze_domain"):
        return inspect_domain_pattern(tool_args.get("domain", ""))
    if tool_name in ("detect_social_engineering", "check_social_engineering"):
        return detect_social_engineering(tool_args.get("text", ""))
    if tool_name in ("score_risk", "assess_risk"):
        return score_risk(tool_args.get("domain_reports", []), tool_args.get("text_indicators", []))
    if tool_name in ("generate_safe_steps", "fetch_safe_steps"):
        return generate_safe_steps(tool_args.get("verdict", "Low"), tool_args.get("situation", "before_click"))
    if tool_name in ("generate_report_draft", "draft_report"):
        return generate_report_draft(
            tool_args.get("text", ""),
            tool_args.get("redacted_text", ""),
            int(tool_args.get("risk_score", 0)),
            tool_args.get("indicators", []),
            tool_args.get("safe_steps", [])
        )
    raise ValueError(f"Unknown tool: {tool_name}")

# Attempt to import FastMCP from the python-mcp library
try:
    from mcp.server.fastmcp import FastMCP
    
    # Initialize the official FastMCP server
    mcp_app = FastMCP("TrustLens Security Server")
    
    @mcp_app.tool()
    def clean_text_pii(text: str) -> str:
        """
        Redacts personal identifiable information (emails, phones, credit cards, SSNs, national ID-like values) from text.
        """
        return redact_pii(text)
        
    @mcp_app.tool()
    def get_links(text: str) -> list:
        """
        Extracts all embedded URLs and clean domains from a message body.
        """
        return extract_links(text)
        
    @mcp_app.tool()
    def analyze_domain(domain: str) -> dict:
        """
        Heuristically inspects a domain for typosquatting, brand impersonation, and high-risk TLDs.
        """
        return inspect_domain_pattern(domain)
        
    @mcp_app.tool()
    def check_social_engineering(text: str) -> list:
        """
        Scans message text for typical social engineering tactics (urgency, money request, credential hooks).
        """
        return detect_social_engineering(text)
        
    @mcp_app.tool()
    def assess_risk(domain_reports: list, text_indicators: list) -> dict:
        """
        Computes a threat risk level (High, Medium, Low) and threat score based on text and links.
        """
        return score_risk(domain_reports, text_indicators)
        
    @mcp_app.tool()
    def fetch_safe_steps(verdict: str, situation: str) -> list:
        """
        Provides custom safety steps based on computed risk and user click/compromise context.
        """
        return generate_safe_steps(verdict, situation)
        
    @mcp_app.tool()
    def draft_report(text: str, redacted_text: str, risk_score: int, indicators: list, safe_steps: list | None = None) -> str:
        """
        Generates a text incident report suitable for submission to authorities.
        """
        return generate_report_draft(text, redacted_text, risk_score, indicators, safe_steps)
        
    HAS_FAST_MCP = True
except ImportError:
    HAS_FAST_MCP = False
    mcp_app = None

# ---- Standard Stdin/Stdout JSON-RPC Fallback for MCP Clients ----
def handle_json_rpc(line):
    try:
        req = json.loads(line)
        req_id = req.get("id")
        method = req.get("method")
        params = req.get("params", {})
        
        # 1. Initialize Request
        if method == "initialize":
            res = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {}
                    },
                    "serverInfo": {
                        "name": "trustlens-mcp-server",
                        "version": "1.0.0"
                    }
                }
            }
        
        # 2. List Tools Request
        elif method == "tools/list" or method == "listTools":
            res = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "tools": TOOL_SCHEMAS
                }
            }
            
        # 3. Call Tool Request
        elif method == "tools/call" or method == "callTool":
            tool_name = params.get("name")
            tool_args = params.get("arguments", {})
            result_data = call_tool(tool_name, tool_args)
                
            res = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(result_data, indent=2, ensure_ascii=False)
                        }
                    ]
                }
            }
            
        else:
            res = {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {
                    "code": -32601,
                    "message": f"Method not found: {method}"
                }
            }
            
        sys.stdout.write(json.dumps(res) + "\n")
        sys.stdout.flush()
    except Exception as e:
        err_res = {
            "jsonrpc": "2.0",
            "error": {
                "code": -32603,
                "message": f"Internal error: {str(e)}"
            }
        }
        sys.stdout.write(json.dumps(err_res) + "\n")
        sys.stdout.flush()

def run_stdin_stdout_server():
    """Reads lines from stdin and parses JSON-RPC requests."""
    while True:
        line = sys.stdin.readline()
        if not line:
            break
        handle_json_rpc(line.strip())

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "run":
        if HAS_FAST_MCP:
            print("[*] Launching FastMCP Server...")
            mcp_app.run()
        else:
            print("[!] mcp package not installed. Running standard Stdin/Stdout JSON-RPC server...")
            run_stdin_stdout_server()
    else:
        # Default behavior: run stdin/stdout loop directly (used by host clients)
        run_stdin_stdout_server()

if __name__ == '__main__':
    main()
