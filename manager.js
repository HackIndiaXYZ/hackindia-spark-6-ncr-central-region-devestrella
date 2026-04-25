// ============================================================================
// INSTRUCTIONS FOR THE USER:
// 1. Create a Google Sheet and name the first tab exactly: "Guards"
// 2. Put Name, ID, Password in row 1.
// 3. Paste the appscript_code.js into the Extensions -> Apps Script editor.
// 4. Deploy as a Web App (Access: Anyone).
// 5. Paste the Web App URL below:
// ============================================================================

const APPSCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxDzNOsviHPhlc8nUV7ozhFsBSV9VfAMbldqnD6ve62Zd1GUMxdjIWQ77AGiQ8ErhU6/exec';

class AuthManager {
    constructor() {
        // AppScript acts as a stateless REST API, so no complex connection logic is needed!
    }

    async ensureReady() {
        if (APPSCRIPT_WEB_APP_URL === 'PASTE_YOUR_WEB_APP_URL_HERE') {
            throw new Error('Google Apps Script URL is not configured. Please paste your Web App URL into manager.js.');
        }
    }

    async addGuard(name, id, password) {
        await this.ensureReady();

        const payload = {
            action: 'ADD_GUARD',
            name: name,
            id: id,
            password: password
        };

        const response = await fetch(APPSCRIPT_WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to add guard.');
        }

        return { success: true, message: 'Guard added successfully.' };
    }

    async getAllGuards() {
        await this.ensureReady();

        // AppScript GET request returns all guards
        const response = await fetch(APPSCRIPT_WEB_APP_URL);
        const data = await response.json();

        return data; // Returns an array of {name, id}
    }

    async deleteGuard(id) {
        await this.ensureReady();

        const payload = {
            action: 'DELETE_GUARD',
            id: id
        };

        const response = await fetch(APPSCRIPT_WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to delete guard.');
        }

        return { success: true, message: 'Guard deleted successfully.' };
    }

    async authenticateUser(role, id, password) {
        await this.ensureReady();

        if (role !== 'guard') {
            throw new Error('Only guard role is supported currently.');
        }

        const payload = {
            action: 'LOGIN',
            id: id,
            password: password
        };

        const response = await fetch(APPSCRIPT_WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!data.success) {
            return { success: false, message: data.error || 'Invalid credentials.' };
        }

        return {
            success: true,
            message: 'Authentication successful.',
            name: data.name
        };
    }

    async logBill(billId, items, totalAmount) {
        await this.ensureReady();

        const payload = {
            action: 'ADD_BILL',
            billId: billId,
            items: items,
            total: totalAmount,
            timestamp: Date.now()
        };

        try {
            // We do not await the json parsing if we don't care about the result blocking the thread
            // But fetch returns a promise, we will just fire and forget or await
            const response = await fetch(APPSCRIPT_WEB_APP_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (!data.success) {
                console.error('[Google Sheets] Failed to log bill:', data.error);
            } else {
                console.log('[Google Sheets] Successfully logged bill:', billId);
            }
        } catch (err) {
            console.error('[Google Sheets] Network error while logging bill:', err);
        }
    }
}

// Note: Node.js 18+ has built-in fetch. If running on an older version, we'd need node-fetch, 
// but Railway runs modern Node.js versions by default.

module.exports = new AuthManager();
