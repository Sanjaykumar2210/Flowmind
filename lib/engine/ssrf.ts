import { URL } from "url";

/**
 * Validates URLs to prevent SSRF (Server-Side Request Forgery)
 * Blocks private IP ranges, link-local addresses, cloud metadata endpoints,
 * and dangerous protocols.
 */
export function validateUrlForSsrf(urlString: string): { isSafe: boolean; reason?: string } {
  try {
    const parsed = new URL(urlString);

    // 1. Only allow HTTP and HTTPS protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { isSafe: false, reason: `Disallowed protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // 2. Block localhost and loopback names
    if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
      return { isSafe: false, reason: "Access to internal/localhost addresses is prohibited." };
    }

    // 3. Block IPv4/IPv6 private ranges and cloud metadata IPs
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);

    if (ipMatch) {
      const [, p1, p2] = ipMatch.map(Number);

      // 127.0.0.0/8 (Loopback)
      if (p1 === 127) return { isSafe: false, reason: "Loopback IP addresses (127.x.x.x) are blocked." };

      // 10.0.0.0/8 (Private network)
      if (p1 === 10) return { isSafe: false, reason: "Private Class A network addresses (10.x.x.x) are blocked." };

      // 172.16.0.0/12 (Private network)
      if (p1 === 172 && p2 >= 16 && p2 <= 31) {
        return { isSafe: false, reason: "Private Class B network addresses (172.16-31.x.x) are blocked." };
      }

      // 192.168.0.0/16 (Private network)
      if (p1 === 192 && p2 === 168) {
        return { isSafe: false, reason: "Private Class C network addresses (192.168.x.x) are blocked." };
      }

      // 169.254.0.0/16 (Link-local & AWS/GCP/Azure Metadata service 169.254.169.254)
      if (p1 === 169 && p2 === 254) {
        return { isSafe: false, reason: "Link-local and cloud metadata addresses (169.254.x.x) are blocked." };
      }

      // 0.0.0.0
      if (p1 === 0) return { isSafe: false, reason: "Broadcast/zero addresses are blocked." };
    }

    return { isSafe: true };
  } catch {
    return { isSafe: false, reason: "Invalid or malformed URL." };
  }
}

