
# Amplior Prospect Intelligence - Extension Integration Guide (v5.0)

## 1. Overview
The extension acts as a data ingestion and retrieval tool. It must sync data to the `prospects` collection and request updates via the `contactRequests` collection.

## 2. Deduplication Logic (Critical)
To prevent duplicate records, the system enforces the following hierarchy when syncing profiles. **The Extension must follow this logic before creating a new record.**

1.  **ID Match (Priority 1):**
    *   If the record already has a known `amplior_id` (e.g. from a previous search), update that specific Document ID.

2.  **LinkedIn URL Match (Priority 2 - Primary Key):**
    *   Clean the URL: Remove `https://`, `http://`, `www.`, and trailing slashes.
    *   Example: `https://www.linkedin.com/in/john-doe/` -> `linkedin.com/in/john-doe`
    *   Query `prospects` collection where `personalLinkedin == cleaned_url`.

3.  **Fuzzy Name Match (Priority 3 - Fallback):**
    *   If no LinkedIn URL is available, query for:
    *   `fullName` (Exact Case Insensitive) **AND** `companyName` (Exact Case Insensitive).

## 3. Data Schema: `prospects` Collection

| Field Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | string | Auto | Firestore Document ID |
| `fullName` | string | Yes | Full display name |
| `firstName` | string | Yes | |
| `lastName` | string | Yes | |
| `designation` | string | Yes | Job Title |
| `companyName` | string | Yes | |
| `personalLinkedin` | string | Yes* | *Highly Recommended for dedup. Store normalized. |
| `workEmail` | string | No | |
| `workEmailDisposition` | enum | No | `Accurate`, `Wrong`, `Unverified` (Default) |
| `contactNumber1` | string | No | Primary Mobile/Direct |
| `contactNumber1Disposition`| enum | No | `Accurate`, `Wrong`, `Unverified` (Default) |
| `contactNumber2` | string | No | Secondary Phone |
| `contactNumber3` | string | No | Other Phone |
| `receptionNumber` | string | No | Board line |
| `city` | string | No | |
| `state` | string | No | |
| `website` | string | No | Company Domain |
| `companyLinkedin` | string | No | Company Profile URL |
| `companyIndustry` | string | No | |
| `companySubIndustry` | string | No | e.g. "SaaS", "EdTech" |
| `companyEmployeeSize` | string | No | e.g. "51-200" |
| `companyCIN` | string | No | Corporate ID Number |
| `remark` | string | No | Agent notes |
| `teamId` | string | Yes | Linked Team ID (e.g. `team_default`) |
| `lastUpdated` | timestamp| Yes | Server timestamp |

## 4. Data Schema: `contactRequests` Collection
Use this when the user clicks "Request Info" in the extension.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `prospectId` | string | **Important:** If requesting update for an existing DB record, include this. |
| `prospectName` | string | |
| `companyName` | string | |
| `linkedinUrl` | string | |
| `status` | string | Always set to `Pending` initially. |
| `sourceHint` | string | Set to `Extension` or specific provider name. |
| `requestedBy` | object | `{ uid, name, email }` of the logged-in agent. |
| `createdAt` | timestamp| |

## 5. NEW (Phase 7): Usage & Credits
**Collection:** `credits`
**Document ID:** `{userId}` (The Firebase Auth UID of the logged-in user)

The extension is **responsible** for:
1. Checking balance before executing AI actions.
2. Deducting credits after successful actions.
3. **Checking for Monthly Reset** (Lazy Reset logic) on extension open.

### A. Credits Document Schema
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `balance` | number | **Current available credits.** Check this before spending. |
| `plan` | string | `free`, `starter`, `pro`, `enterprise` |
| `monthlyAllocation` | number | The amount to reset to (e.g. 100, 2000). |
| `lastReset` | timestamp | Date of last monthly reset. |
| `usage` | map | Object containing counters. |
| `usage.scoring` | number | Total scoring actions used. |
| `usage.pitches` | number | Total pitch actions used. |
| `usage.research` | number | Total research actions used. |
| `usage.contacts` | number | Total contact reveals used. |

### B. Cost Table
| Action | Cost (Credits) | Usage Field (to increment) |
| :--- | :--- | :--- |
| Scoring | 1 | `usage.scoring` |
| Pitch Generation | 2 | `usage.pitches` |
| Deep Research | 5 | `usage.research` |
| Contact Request | 10 | `usage.contacts` |

### C. Logic: Lazy Auto-Reset (MUST IMPLEMENT)
Run this logic when the extension opens to ensure users get their monthly credits.

```javascript
async function checkAndResetCredits(userId) {
  const docRef = doc(db, 'credits', userId);
  const snap = await getDoc(docRef);
  
  if (snap.exists()) {
    const data = snap.data();
    // Calculate days since last reset
    const lastResetDate = data.lastReset.toDate(); 
    const now = new Date();
    const diffTime = Math.abs(now - lastResetDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (diffDays > 30) {
      // RESET LOGIC
      await updateDoc(docRef, {
        balance: data.monthlyAllocation, // Refill to plan limit
        lastReset: new Date() // Reset timer
      });
    }
  }
}
```

### D. Logic: Spending Credits (Transaction)
Use a transaction to prevent race conditions when two actions happen simultaneously.

```javascript
async function spendCredits(userId, cost, usageField) {
  const docRef = doc(db, 'credits', userId);
  
  try {
    await runTransaction(db, async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists()) throw "User has no credit account!";
      
      const newBalance = doc.data().balance - cost;
      if (newBalance < 0) throw "Insufficient Credits";
      
      const newUsage = doc.data().usage || {};
      newUsage[usageField] = (newUsage[usageField] || 0) + 1;

      transaction.update(docRef, { 
        balance: newBalance,
        usage: newUsage 
      });
    });
    return true; // Success
  } catch (e) {
    console.error("Credit deduction failed: ", e);
    return false; // Fail UI
  }
}
```
