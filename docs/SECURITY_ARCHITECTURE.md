# PROJECT BLACKWATCH — SECURITY ARCHITECTURE DOCUMENT
**Classification**: TOP SECRET // COMMINT-SPEC-OPS  
**Product**: Project Blackwatch Tactical Detective System  
**Version**: 1.0.0-SEC  
**Security Framework**: Defense-in-Depth, Zero-Trust Architecture, Least-Privilege Access Control  

---

## 1. Security Architecture Overview
The security design of Project Blackwatch enforces strict segregation between public presentation layers, client-side game state machines, and privileged server-side artificial intelligence execution boundaries.

```
+-------------------------------------------------------------------------+
|                          CLIENT APPLICATION                             |
|  (Mobile PWA / Web Browser / Touch UI)                                  |
|                                                                         |
|  - Local Tactical State Machine (IndexedDB / LocalStorage fallback)     |
|  - Firebase Client SDK (Authenticated via Google Auth / Anonymous ID)   |
|  - Secure Token Storage & Nonce Validation                              |
+-------------------+---------------------------------+-------------------+
                    |                                 |
           HTTPS / WSS / gRPC                 HTTPS REST (/api/*)
                    |                                 |
+-------------------v-------------------+   +---------v-------------------+
|       FIREBASE INFRASTRUCTURE        |   |    APPLICATION SERVER       |
|                                       |   | (Node/Express API Proxy)    |
|  [Firebase Authentication]            |   |                             |
|  - Token verification                 |   |  - Server-Side Gemini API   |
|  - Google Identity Services           |   |    Key Isolation            |
|                                       |   |  - Interrogation Sanitizer  |
|  [Cloud Firestore Database]           |   |  - Rate-Limiting & WAF      |
|  - User Data Partitioning             |   |  - Request Signature Check  |
|  - `firestore.rules` Security Guard   |   |                             |
+---------------------------------------+   +-----------------------------+
```

---

## 2. Threat Modeling (STRIDE Analysis)

| Threat Category | Potential Attack Vector | Project Blackwatch Mitigation |
| :--- | :--- | :--- |
| **Spoofing** | Attacker impersonating another Detective Commander | Firebase Auth cryptographically signs all session JWTs; Firestore security rules enforce `request.auth.uid == userId`. |
| **Tampering** | Modifying unlocked evidence or hacking arrest warrants | Game logic rules validate prerequisite chains; Firestore security rules reject writes to unauthorized documents. |
| **Repudiation** | Denying dispatch orders or interrogation commands | Immutable operational audit logs recorded with millisecond timestamps and officer cryptographic callsigns. |
| **Information Disclosure** | Scraping Gemini API keys or unreleased case spoiler files | Gemini API key strictly isolated on the backend server (`GEMINI_API_KEY`); client never has direct key access. |
| **Denial of Service** | Flooding AI Interrogation or Dispatch endpoints | Token bucket rate limiting (10 queries/min/user), prompt truncation guards, and backend timeout bounds. |
| **Elevation of Privilege** | User attempting to alter global game configuration | Granular RBAC: Player roles capped at detective clearance level; administrative settings read-only from client. |

---

## 3. Data Protection & Cryptographic Protocols
1. **Data in Transit**: Enforced TLS 1.3 encryption across all communication links (HSTS enabled).
2. **Data at Rest**: AES-256 server-side encryption via Google Cloud Firestore.
3. **Secret Management**:
   - `GEMINI_API_KEY`: Injected into server container environment; zero client exposure.
   - `firebase-applet-config.json`: Public client configuration restricted via Google Cloud Console domain whitelisting.

---

## 4. Firestore Security Rules Enforcement
All Firestore operations are bound by declarative security rules in `firestore.rules`:
```cel
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() { return request.auth != null; }
    function isOwner(userId) { return isAuthenticated() && request.auth.uid == userId; }

    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId);
    }
    match /gameState/{userId} {
      allow read, write: if isOwner(userId);
    }
    match /caseProgress/{docId} {
      allow read, write: if isAuthenticated() && 
        (resource == null || resource.data.userId == request.auth.uid) && 
        request.resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## 5. PWA & Client-Side Sandboxing
- **Service Worker Scope Isolation**: Service Worker registered strictly within `/` scope; cache storage encrypted and keyed per origin.
- **Cross-Origin Resource Policy (CORP)** & **Content Security Policy (CSP)**: Restrictions preventing unauthorized iframe embedding and external script execution.
- **Input Sanitization**: Terminal CLI and Interrogation chat inputs sanitized against XSS and prompt injection attacks.
