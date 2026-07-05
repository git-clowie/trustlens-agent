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

# Attempt to import FastMCP from the python-mcp library
try:
    from mcp.server.fastmcp import FastMCP
    
    # Initialize the official FastMCP server
    mcp_app = FastMCP("TrustLens Security Server")
    
    @mcp_app.tool()
    def clean_text_pii(text: str) -> str:
        """
        Redacts personal identifiable information (emails, phones, credit cards, CNP, SSN) from text.
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
    def draft_report(text: str, redacted_text: str, risk_score: int, indicators: list) -> str:
        """
        Generates a text incident report suitable for submission to authorities.
        """
        return generate_report_draft(text, redacted_text, risk_score, indicators)
        
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
                    "tools": [
                        {
                            "name": "redact_pii",
                            "description": "Redacts PII (emails, phones, cards, CNP, SSN) from message text.",
                            "inputSchema": {
                                "type": "object",
                                "properties": {"text": {"type": "string"}},
                                "required": ["text"]
                            }
                        },
                        {
                            "name": "extract_links",
                            "description": "Finds links and clean domains in text.",
                            "inputSchema": {
                                "type": "object",
                                "properties": {"text": {"type": "string"}},
                                "required": ["text"]
                            }
                        },
                        {
                            "name": "inspect_domain_pattern",
                            "description": "Checks a domain for spoofing or typosquatting.",
                            "inputSchema": {
                                "type": "object",
                                "properties": {"domain": {"type": "string"}},
                                "required": ["domain"]
                            }
                        },
                        {
                            "name": "detect_social_engineering",
                            "description": "Finds urgency or financial request hooks in text.",
                            "inputSchema": {
                                "type": "object",
                                "properties": {"text": {"type": "string"}},
                                "required": ["text"]
                            }
                        }
                    ]
                }
            }
            
        # 3. Call Tool Request
        elif method == "tools/call" or method == "callTool":
            tool_name = params.get("name")
            tool_args = params.get("arguments", {})
            
            result_data = None
            if tool_name == "redact_pii":
                result_data = redact_pii(tool_args.get("text", ""))
            elif tool_name == "extract_links":
                result_data = extract_links(tool_args.get("text", ""))
            elif tool_name == "inspect_domain_pattern":
                result_data = inspect_domain_pattern(tool_args.get("domain", ""))
            elif tool_name == "detect_social_engineering":
                result_data = detect_social_engineering(tool_args.get("text", ""))
            else:
                raise ValueError(f"Unknown tool: {tool_name}")
                
            res = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(result_data, indent=2)
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
