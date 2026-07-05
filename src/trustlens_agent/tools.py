import re
from urllib.parse import urlparse

# Regular expressions for PII redaction
EMAIL_REGEX = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
PHONE_REGEX = r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
CREDIT_CARD_REGEX = r'\b(?:\d[ -]*?){13,16}\b'
CNP_REGEX = r'\b[1-8]\d{12}\b' # Romanian CNP (SSN equivalent)
SSN_REGEX = r'\b\d{3}-\d{2}-\d{4}\b' # US SSN

# Brands commonly targeted by scammers
COMMON_BRANDS = [
    'dhl', 'fedex', 'ups', 'posta', 'posta romana', 'fan courier', 'sameday',
    'paypal', 'revolut', 'netflix', 'amazon', 'bt', 'banca transilvania',
    'brd', 'bcr', 'ing', 'raiffeisen', 'anaf', 'google', 'microsoft',
    'apple', 'facebook', 'instagram', 'whatsapp', 'posta-romana'
]

# Suspicious top-level domains (TLDs)
SUSPICIOUS_TLDS = {
    '.xyz', '.top', '.club', '.info', '.top', '.support', '.link', '.cc',
    '.work', '.click', '.gq', '.cf', '.tk', '.ml', '.ga', '.today', '.live'
}

def _domain_tokens(domain: str) -> list:
    """Split a domain into meaningful labels/tokens without treating substrings as brands."""
    return [token for token in re.split(r'[^a-z0-9]+', domain.lower()) if token]

def _brand_tokens(brand: str) -> list:
    return [token for token in re.split(r'[^a-z0-9]+', brand.lower()) if token]

def _domain_mentions_brand(domain: str, brand: str) -> bool:
    tokens = _domain_tokens(domain)
    brand_tokens = _brand_tokens(brand)
    if not brand_tokens:
        return False

    # Short brands such as ING, BT, BCR, BRD, UPS must be exact tokens.
    # This avoids false positives such as "handling" -> "ing".
    if len(brand_tokens) == 1:
        return brand_tokens[0] in tokens

    phrase_length = len(brand_tokens)
    return any(tokens[i:i + phrase_length] == brand_tokens for i in range(len(tokens) - phrase_length + 1))

def redact_pii(text: str) -> str:
    """
    Scans the text and replaces sensitive PII with safe placeholders.
    Protects user privacy.
    """
    redacted = text
    
    # Redact email addresses
    redacted = re.sub(EMAIL_REGEX, '[REDACTED_EMAIL]', redacted)
    
    # Redact US SSN
    redacted = re.sub(SSN_REGEX, '[REDACTED_SSN]', redacted)

    # Redact Romanian CNP before phone/card patterns can consume the digits
    redacted = re.sub(CNP_REGEX, '[REDACTED_SSN]', redacted)

    # Redact credit cards before phone numbers to avoid partial phone-style matches
    redacted = re.sub(CREDIT_CARD_REGEX, '[REDACTED_CREDIT_CARD]', redacted)

    # Redact phone numbers
    redacted = re.sub(PHONE_REGEX, '[REDACTED_PHONE]', redacted)
    
    return redacted

def extract_links(text: str) -> list:
    """
    Extracts all URLs and clean domains from the text.
    Does not visit or open any links.
    """
    # Regex to find links starting with http, https or www.
    url_pattern = r'(https?://[^\s/$.?#].[^\s]*|www\.[^\s/$.?#].[^\s]*)'
    found_urls = re.findall(url_pattern, text)
    
    links = []
    for url in found_urls:
        # Standardize url format
        clean_url = url
        if not url.startswith('http'):
            clean_url = 'http://' + url
            
        try:
            parsed = urlparse(clean_url)
            domain = parsed.netloc.lower()
            # Strip port if any
            if ':' in domain:
                domain = domain.split(':')[0]
            # Strip www.
            if domain.startswith('www.'):
                domain = domain[4:]
                
            if domain:
                links.append({
                    'original': url,
                    'domain': domain
                })
        except Exception:
            continue
            
    return links

def inspect_domain_pattern(domain: str) -> dict:
    """
    Analyzes the domain pattern offline using heuristic checks to detect spoofing,
    brand hijacking, typosquatting, and high-risk TLDs.
    """
    domain = domain.lower()
    indicators = []
    risk_score = 0
    
    # Check TLD
    has_suspicious_tld = False
    for tld in SUSPICIOUS_TLDS:
        if domain.endswith(tld):
            has_suspicious_tld = True
            indicators.append(f"Suspicious top-level domain: {tld}")
            risk_score += 30
            break
            
    # Check Brand Hijacking / Spoofing
    detected_brands = []
    for brand in COMMON_BRANDS:
        # If the brand name is in the domain, but it is not the main domain (e.g. dhl.support-portal.xyz)
        # OR if it's merged with other words (e.g. netflix-login-renew.com)
        if _domain_mentions_brand(domain, brand):
            parts = domain.split('.')
            main_domain_part = parts[-2] if len(parts) >= 2 else parts[0]
            main_domain_tokens = _domain_tokens(main_domain_part)
            brand_tokens = _brand_tokens(brand)
            
            # If the brand is present, but it's not the exact main domain or a standard subdomain
            if main_domain_tokens != brand_tokens:
                detected_brands.append(brand)
                indicators.append(f"Impersonates brand '{brand}' in a suspicious domain layout")
                risk_score += 40
                
    # Check for excessive hyphens or numbers
    if domain.count('-') > 1:
        indicators.append("Contains multiple hyphens, typical of phishing domain naming patterns")
        risk_score += 15
        
    num_digits = sum(c.isdigit() for c in domain)
    if num_digits > 3:
        indicators.append("Contains multiple digits, often used to bypass spam filters")
        risk_score += 10
        
    # Check for typosquatting (e.g., netfl1x, paypa1, etc.)
    typo_patterns = [
        (r'paypa1', 'paypal'), (r'pay-pal', 'paypal'),
        (r'netfl1x', 'netflix'), (r'netf1ix', 'netflix'),
        (r'revo1ut', 'revolut'), (r'rev-olut', 'revolut'),
        (r'arnazon', 'amazon'), (r'amaz0n', 'amazon'),
        (r'g00gle', 'google'), (r'micr0soft', 'microsoft')
    ]
    for pattern, brand in typo_patterns:
        if re.search(pattern, domain):
            indicators.append(f"Typosquatting attempt mimicking '{brand}'")
            risk_score += 50
            
    # Cap risk score at 100
    risk_score = min(risk_score, 100)
    
    verdict = "Low"
    if risk_score >= 70:
        verdict = "High"
    elif risk_score >= 30:
        verdict = "Medium"
        
    return {
        'domain': domain,
        'risk_score': risk_score,
        'verdict': verdict,
        'indicators': indicators,
        'detected_brands': list(set(detected_brands))
    }

def detect_social_engineering(text: str) -> list:
    """
    Scans the text for social engineering patterns, psychological pressure,
    urgency, and data collection prompts.
    """
    text_lower = text.lower()
    indicators = []
    
    # 1. Urgency / Threat triggers
    urgency_keywords = [
        'urgent', 'imediata', 'imediat', 'suspendat', 'suspend', 'blocat', 'block',
        '24 ore', '24h', 'limita', 'expira', 'de urgenta', 'penalizare', 'amenda',
        'immediately', 'restrict', 'action required', 'atentie'
    ]
    matched_urgency = [kw for kw in urgency_keywords if kw in text_lower]
    if matched_urgency:
        indicators.append({
            'category': 'Urgency & Pressure',
            'detail': f"High urgency words detected: {', '.join(matched_urgency[:3])}"
        })
        
    # 2. Impersonation of brands in text
    matched_brands = []
    for brand in COMMON_BRANDS:
        # Match word boundaries or custom formats like Posta-Romana
        pattern = r'\b' + re.escape(brand) + r'\b'
        if re.search(pattern, text_lower):
            matched_brands.append(brand)
    if matched_brands:
        indicators.append({
            'category': 'Brand Impersonation',
            'detail': f"Claimed source: {', '.join(set(matched_brands))}"
        })
        
    # 3. Financial requests
    financial_keywords = [
        'plateste', 'plata', 'taxa', 'fee', 'restituire', 'customs', 'vama',
        'outstanding', 'refund', 'card', 'cont', 'bank', 'investeste', 'castig',
        'premiu', 'prize', 'colet', 'pachet', 'delivered', 'livrare'
    ]
    matched_financial = [kw for kw in financial_keywords if kw in text_lower]
    if matched_financial:
        indicators.append({
            'category': 'Financial Request',
            'detail': f"Financial or delivery terminology detected: {', '.join(matched_financial[:3])}"
        })
        
    # 4. Credential Harvesting / Action redirection
    harvesting_keywords = [
        'verificare', 'confirma', 'conecteaza-te', 'autentifica', 'update', 'login',
        'verify', 'confirm', 'update credentials', 'secure account', '2fa', 'cod'
    ]
    matched_harvesting = [kw for kw in harvesting_keywords if kw in text_lower]
    if matched_harvesting:
        indicators.append({
            'category': 'Data Collection Prompt',
            'detail': f"Account verification request: {', '.join(matched_harvesting[:3])}"
        })
        
    return indicators

def score_risk(domain_reports: list, text_indicators: list) -> dict:
    """
    Computes a global threat score combining domain safety checks and
    message body social engineering analysis.
    """
    total_score = 0
    confidence = 55
    
    # Social engineering indicators add up
    total_score += len(text_indicators) * 20
    
    # Domain inspection overrides or adds to score
    max_domain_score = 0
    for rep in domain_reports:
        if rep['risk_score'] > max_domain_score:
            max_domain_score = rep['risk_score']
    if domain_reports:
        confidence += 15
    if max_domain_score >= 70:
        confidence += 15
    confidence += min(len(text_indicators) * 8, 24)
            
    # Combine scores
    if max_domain_score > 0:
        total_score = max(total_score, max_domain_score)
        # If there are both suspicious text AND a malicious domain, push to max
        if len(text_indicators) >= 2:
            total_score = max(total_score + 15, 95)
    else:
        # If no links, but severe social engineering pattern (e.g. romance scam, text-only bank fraud)
        total_score = min(total_score, 85)
        
    # Cap total score at 100
    total_score = min(total_score, 100)
    
    verdict = "Low"
    if total_score >= 70:
        verdict = "High"
    elif total_score >= 35:
        verdict = "Medium"
        
    # Build breakdown
    breakdown = []
    if max_domain_score > 50:
        breakdown.append("Unsafe destination link detected.")
    if any(ind['category'] == 'Urgency & Pressure' for ind in text_indicators):
        breakdown.append("Artificial sense of urgency or threat detected.")
    if any(ind['category'] == 'Brand Impersonation' for ind in text_indicators):
        breakdown.append("Appears to impersonate a trusted company/institution.")
    if any(ind['category'] == 'Financial Request' for ind in text_indicators):
        breakdown.append("Asks for immediate payment, bank details, or delivery fees.")
    if any(ind['category'] == 'Data Collection Prompt' for ind in text_indicators):
        breakdown.append("Contains phishing hooks to harvest credentials or verification codes.")
        
    if not breakdown:
        breakdown.append("No common scam signatures identified in the message structure.")
        
    return {
        'risk_score': total_score,
        'verdict': verdict,
        'confidence': min(confidence, 98),
        'breakdown': breakdown
    }

def generate_safe_steps(message_type: str, situation: str) -> list:
    """
    Generates actionable, safe next steps tailored to the user's specific context.
    Matches 'before_click', 'clicked_only', or 'compromised'.
    """
    if situation == 'before_click':
        return [
            "DO NOT click any link in the message.",
            "Do not reply to the sender. Scammers often use replies to verify that a phone number or email is active.",
            "Verify independently: use the official website or official app by typing the address yourself.",
            "Report and delete: block the sender, mark it as spam, and remove the message.",
        ]
    if situation == 'clicked_only':
        return [
            "Close the browser tab immediately to stop any active scripts.",
            "Clear cache and cookies for the browser used to open the link.",
            "Run a security scan using a trusted antivirus or antimalware tool.",
            "Check downloads for recent files such as .exe, .dmg, .apk, or .zip, and delete suspicious files without opening them.",
        ]
    if situation == 'compromised':
        return [
            "Contact your bank immediately using the official phone number on your card or banking app.",
            "Change passwords immediately on the affected service and anywhere the same password was reused.",
            "Enable multi-factor authentication on email, banking, and social accounts.",
            "Monitor accounts and card transactions for unexpected activity.",
        ]

    return [
        "Be cautious and avoid interacting with suspicious links or unknown senders.",
        "Report unsolicited requests for personal or financial information to official portals.",
    ]

    steps = []
    
    if situation == 'before_click':
        steps = [
            "⚠️ **DO NOT click any link** in the message.",
            "❌ **Do not reply** to the sender. Scammers often use replies to verify that a phone number or email is active.",
            "🔍 **Verify independently**: Go to the official website of the organization (e.g., DHL, ANAF) by typing the URL yourself or using their official app. Check if there are any alerts.",
            "🗑️ **Report and delete**: Block the sender's phone number or email address, mark it as spam, and delete the message."
        ]
    elif situation == 'clicked_only':
        steps = [
            "🌐 **Close the browser tab** immediately to stop any active scripts.",
            "🛡️ **Clear cache & cookies**: Scammers sometimes use session-jacking. Clear your browser data.",
            "💻 **Run a security scan**: Perform a full system scan using a trusted antivirus/antimalware program on the device used to click the link.",
            "🚨 **Check downloads**: Inspect your downloads folder for any recently added files (.exe, .dmg, .apk, .zip) that might have downloaded automatically, and delete them without opening."
        ]
    elif situation == 'compromised':
        steps = [
            "💳 **Contact your bank immediately**: Call the official phone number printed on the back of your credit card. Explain that you entered details on a suspicious site, freeze your cards, and monitor transactions.",
            "🔑 **Change passwords immediately**: If you entered a password, change it on that service immediately. If you reuse this password elsewhere (e.g., email, bank, social media), change it there too.",
            "🔒 **Enable Multi-Factor Authentication (MFA)**: Turn on 2FA on your accounts (email, bank, social) to prevent unauthorized logins even if they have your password.",
            "📈 **Monitor accounts & credit**: Keep a close eye on bank statement charges and check for unexpected registration emails."
        ]
    else:
        steps = [
            "🔍 Be cautious and avoid interacting with suspicious links or unknown senders.",
            "🛡️ Report any unsolicited requests for personal or financial information to official portals."
        ]
        
    return steps

def generate_report_draft(text: str, redacted_text: str, risk_score: int, indicators: list) -> str:
    """
    Generates a draft of a security report that can be copied and submitted to anti-phishing
    organizations (like APWG, cert.ro, DNS registrars, or police).
    """
    brand = "Unknown"
    for ind in indicators:
        if ind['category'] == 'Brand Impersonation':
            brand = ind['detail'].replace("Claimed source: ", "")
            break
            
    threats = [ind['category'] for ind in indicators]
    
    report = f"""--- PHISHING / SCAM INCIDENT REPORT ---
Target Brand: {brand.upper()}
Threat Indicators: {', '.join(threats) if threats else 'Generic Phishing'}
Computed Risk Level: {'HIGH' if risk_score >= 70 else 'MEDIUM' if risk_score >= 35 else 'LOW'} ({risk_score}/100)

SUSPICIOUS TEXT (Anonymized for Privacy):
----------------------------------------
{redacted_text}
----------------------------------------

INVESTIGATION DETAILS:
- Social Engineering features detected: {len(indicators)} indicators.
- User Privacy status: Protected via automatic PII redaction.

REPORTING ACTION REQUESTED:
Please flag the associated links and sender details as malicious and block hosting/distribution.
"""
    return report.strip()
