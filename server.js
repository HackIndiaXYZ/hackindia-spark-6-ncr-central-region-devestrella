const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static HTML/CSS/JS files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

const SECRET_KEY = 'super_secret_guard_key_2026'; // In production, this goes in .env

// OOP Architecture
class BillManager {
    constructor() {
        this.bills = []; // Our in-memory database
    }

    // Binary Search Algorithm
    // Time Complexity: O(log N)
    findBillIndex(billId) {
        let left = 0;
        let right = this.bills.length - 1;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if (this.bills[mid].id === billId) {
                return mid;
            } else if (this.bills[mid].id < billId) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        return -1; // Not found
    }

    // Add and sort to maintain Binary Search integrity
    addBill(billId, items) {
        const newBill = {
            id: billId,
            items: items,
            status: 'open',
            timestamp: Date.now()
        };
        
        this.bills.push(newBill);
        // Sort bills array by ID for Binary Search
        this.bills.sort((a, b) => a.id.localeCompare(b.id));
        return newBill;
    }

    verifyAndConsume(billId) {
        const index = this.findBillIndex(billId);
        
        if (index === -1) {
            return { success: false, message: "Bill not found in system." };
        }

        const bill = this.bills[index];

        if (bill.status === 'verified') {
            return { success: false, message: "This bill has already been used!" };
        }

        // Mutate state to prevent reuse
        this.bills[index].status = 'verified';
        
        return { 
            success: true, 
            message: "Bill verified successfully.",
            items: bill.items 
        };
    }
}

const manager = new BillManager();

// Cryptographic Functions
function generateSecureSignature(billId) {
    const hmac = crypto.createHmac('sha256', SECRET_KEY);
    hmac.update(billId);
    return hmac.digest('hex');
}

function verifySignature(billId, providedSignature) {
    const expectedSignature = generateSecureSignature(billId);
    return expectedSignature === providedSignature;
}

// REST Endpoints

// Called by index.html after checkout
app.post('/api/bills', (req, res) => {
    const { items } = req.body;
    if (!items || !items.length) {
        return res.status(400).json({ error: "No items provided" });
    }

    // Generate a random Bill ID
    const billId = `BILL-${Math.floor(10000 + Math.random() * 90000)}`;
    
    // Save to memory
    manager.addBill(billId, items);

    // Generate cryptographic signature
    const signature = generateSecureSignature(billId);
    
    // The secure token the QR code will contain
    const secureToken = `${billId}.${signature}`;

    console.log(`[API] New Bill Generated: ${billId} | Items: ${items.length}`);
    
    // Calculate total for the sheet
    let total = 0;
    items.forEach(item => total += item.price * item.quantity);
    
    // ASYNCHRONOUSLY push to Google Sheets (DO NOT await it, so the user doesn't wait)
    authManager.logBill(billId, items, total).catch(err => console.error("Error logging bill to sheet:", err));
    
    res.json({ billId, secureToken });
});

// Called by guard.html when scanning the QR
app.get('/api/verify/:token', (req, res) => {
    const { token } = req.params;
    
    // Split the token into ID and Signature
    const parts = token.split('.');
    if (parts.length !== 2) {
        console.log(`[SECURITY] Invalid token format scanned.`);
        return res.status(400).json({ success: false, message: "Invalid QR format." });
    }

    const billId = parts[0];
    const signature = parts[1];

    // 1. Cryptographic Verification
    if (!verifySignature(billId, signature)) {
        console.log(`[SECURITY] Forgery Attempt Detected! Invalid Signature for ${billId}`);
        return res.status(401).json({ success: false, message: "FORGERY DETECTED: Invalid digital signature." });
    }

    // 2. Logic Verification (Does it exist? Is it already used?)
    const result = manager.verifyAndConsume(billId);
    
    if (result.success) {
        console.log(`[API] Bill Verified & Consumed: ${billId}`);
    } else {
        console.log(`[API] Bill Verification Failed: ${billId} - ${result.message}`);
    }

    res.json(result);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Guard Verification Server running on http://localhost:${PORT}`);
    console.log(`OOP BillManager Initialized with Binary Search.`);
});

// ============================================================================
// NEW AUTHENTICATION ENDPOINTS (Managed by manager.js)
// ============================================================================
const authManager = require('./manager.js');

app.post('/api/auth/addGuard', async (req, res) => {
    try {
        const { name, id, password } = req.body;
        if (!name || !id || !password) return res.status(400).json({ error: "Missing fields" });
        
        const result = await authManager.addGuard(name, id, password);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/auth/guards', async (req, res) => {
    try {
        const guards = await authManager.getAllGuards();
        res.json(guards);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/auth/guards/:id', async (req, res) => {
    try {
        const result = await authManager.deleteGuard(req.params.id);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { role, id, password } = req.body;
        if (!role || !id || !password) return res.status(400).json({ error: "Missing fields" });

        const result = await authManager.authenticateUser(role, id, password);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ============================================================================
// ADMIN AUTHENTICATION
// ============================================================================
const ADMIN_USERS = {
    'Ronak Gupta': 'ronak123',
    'Siddhant Gupta': 'siddhant123',
    'Mirtunjay Dubey': 'mirtunjay123',
    'Tanishka Singh Sengar': 'tanishka123'
};

app.post('/api/auth/adminLogin', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Missing fields" });
    }

    // Check if user exists in hardcoded object and password matches
    if (ADMIN_USERS[username] && ADMIN_USERS[username] === password) {
        return res.json({ 
            success: true, 
            message: "Admin authentication successful", 
            name: username 
        });
    }

    return res.status(401).json({ success: false, message: "Invalid admin credentials" });
});
