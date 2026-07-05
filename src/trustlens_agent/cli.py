import sys
import argparse
from trustlens_agent.adk_agent import TrustLensCoordinatorAgent

# Predefined sample messages for easy testing
SAMPLES = {
    'courier': {
        'source': 'SMS',
        'situation': 'before_click',
        'text': 'Stimate client DHL, pachetul dvs. are o taxa vamala restanta de 14.99 RON. Va rugam sa platiti imediat pe http://dhl.customs-fee-handling.xyz/portal pentru a evita returnarea.'
    },
    'bank': {
        'source': 'SMS',
        'situation': 'before_click',
        'text': 'Banca Transilvania: Contul dumneavoastra a fost temporar restrictionat. Autentificati-va urgent pe https://bt-verificare-securizata.today/login pentru deblocare in 24 de ore.'
    },
    'lottery': {
        'source': 'Email',
        'situation': 'before_click',
        'text': 'Dear winner! Your email john.doe@gmail.com won $50,000 in Google Anniversary Promo. Write to claim@google-rewards.xyz with your phone +40722334455 and CNP 1900101998877.'
    },
    'romance': {
        'source': 'Chat',
        'situation': 'clicked_only',
        'text': 'Hello dear, I am trying to visit you next week but I do not have money for the visa fee. Please send $300 to my account. I love you so much and cannot wait!'
    }
}

def print_banner():
    print("=" * 60)
    print("      TRUSTLENS AGENT - AUTOMATED INCIDENT CONCIERGE      ")
    print("=" * 60)

def main():
    parser = argparse.ArgumentParser(description="TrustLens Agent CLI - Check messages before clicking.")
    parser.add_argument('action', choices=['scan'], help="Action to perform (e.g. scan)")
    parser.add_argument('--text', type=str, help="Suspicious message text to analyze")
    parser.add_argument('--sample', choices=list(SAMPLES.keys()), help="Run analysis on a pre-defined sample threat")
    parser.add_argument('--situation', choices=['before_click', 'clicked_only', 'compromised'], default='before_click', 
                        help="User situation context (default: before_click)")
    
    args = parser.parse_args()
    
    if args.action == 'scan':
        print_banner()
        
        # Load sample or direct text
        if args.sample:
            sample_data = SAMPLES[args.sample]
            text = sample_data['text']
            situation = args.situation if args.situation != 'before_click' else sample_data['situation']
            print(f"[*] Running scan on sample: '{args.sample}' ({sample_data['source']})")
            print(f"[*] User Context: {situation}")
        elif args.text:
            text = args.text
            situation = args.situation
            print(f"[*] Running scan on custom message input...")
            print(f"[*] User Context: {situation}")
        else:
            print("[!] Error: You must provide either --text or --sample.")
            sys.exit(1)
            
        print("-" * 60)
        print("RAW SUSPICIOUS TEXT:")
        print(text)
        print("-" * 60)
        
        # Run Coordinator Agent
        coordinator = TrustLensCoordinatorAgent()
        report = coordinator.run_investigation(text, situation)
        
        # Display Agent Execution Timeline Trace
        print("\n[+] AGENT TOOL EXECUTION TRACE:")
        for step in report['trace']:
            status_symbol = "DONE" if step['status'] == 'completed' else "RUN" if step['status'] == 'running' else "WAIT"
            print(f"  [{status_symbol}] {step['step']}: {step['detail']}")
            
        print("-" * 60)
        print("VERDICT & RISK ESTIMATE:")
        color_code = "\033[91m" if report['verdict'] == 'High' else "\033[93m" if report['verdict'] == 'Medium' else "\033[92m"
        reset_code = "\033[0m"
        
        print(f"  Risk Level: {color_code}{report['verdict'].upper()}{reset_code}")
        print(f"  Risk Score: {report['risk_score']}/100")
        print("  Detected Signatures:")
        for desc in report['breakdown']:
            print(f"    - {desc}")
            
        print("-" * 60)
        print("ANONYMIZED MESSAGE (PII REMOVED):")
        print(report['redacted_text'])
        
        print("-" * 60)
        print("RECOMMENDED SAFE ACTION PLAN:")
        for idx, step in enumerate(report['safe_steps'], 1):
            # Clean md bold markings and Unicode emojis to prevent Windows console encoding errors
            clean_step = step.replace("**", "")
            for emoji in ["⚠️", "❌", "🔍", "🗑️", "🌐", "🛡️", "💻", "🚨", "💳", "🔑", "🔒", "📈"]:
                clean_step = clean_step.replace(emoji, "")
            print(f"  {idx}. {clean_step.strip()}")
            
        print("=" * 60)

if __name__ == '__main__':
    main()
