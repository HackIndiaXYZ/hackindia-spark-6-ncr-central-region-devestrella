const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

// ============================================================================
// INSTRUCTIONS FOR THE USER:
// 1. Put your Google Cloud Service Account JSON file in the same folder 
//    as this file and name it 'credentials.json'.
// 2. Paste your Google Sheet ID below. You can find this in the URL of your sheet.
//    Example: https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit
// 3. Ensure your Google Sheet has a tab exactly named "Guards" with columns: Name, ID, Password
// ============================================================================

const SPREADSHEET_ID = 'PASTE_YOUR_SPREADSHEET_ID_HERE'; 

class AuthManager {
    constructor() {
        this.doc = null;
        this.isReady = false;
        this.init();
    }

    async init() {
        try {
            const credsPath = path.join(__dirname, 'credentials.json');
            if (!fs.existsSync(credsPath)) {
                console.warn('[AUTH] credentials.json not found! Google Sheets auth will fail until configured.');
                return;
            }

            const creds = require('./credentials.json');

            // Initialize auth
            const serviceAccountAuth = new JWT({
                email: creds.client_email,
                key: creds.private_key,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });

            this.doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
            await this.doc.loadInfo(); 
            this.isReady = true;
            console.log(`[AUTH] Successfully connected to Google Sheet: ${this.doc.title}`);

            // Auto-create sheets if they don't exist
            let guardsSheet = this.doc.sheetsByTitle['Guards'];
            if (!guardsSheet) {
                console.log('[AUTH] Creating "Guards" sheet...');
                guardsSheet = await this.doc.addSheet({ title: 'Guards', headerValues: ['Name', 'ID', 'Password'] });
            }
        } catch (error) {
            console.error('[AUTH] Failed to connect to Google Sheets:', error.message);
        }
    }

    async ensureReady() {
        if (!this.isReady) {
            throw new Error('Google Sheets is not configured or failed to connect. Check credentials.json and SPREADSHEET_ID.');
        }
    }

    async addGuard(name, id, password) {
        await this.ensureReady();
        const sheet = this.doc.sheetsByTitle['Guards'];
        
        // Check if ID already exists
        const rows = await sheet.getRows();
        const existing = rows.find(r => r.get('ID') === id);
        if (existing) {
            throw new Error('A guard with this ID already exists.');
        }

        await sheet.addRow({ Name: name, ID: id, Password: password });
        return { success: true, message: 'Guard added successfully.' };
    }

    async getAllGuards() {
        await this.ensureReady();
        const sheet = this.doc.sheetsByTitle['Guards'];
        const rows = await sheet.getRows();
        
        return rows.map(row => ({
            name: row.get('Name'),
            id: row.get('ID')
        }));
    }

    async deleteGuard(id) {
        await this.ensureReady();
        const sheet = this.doc.sheetsByTitle['Guards'];
        const rows = await sheet.getRows();
        
        const rowToDelete = rows.find(r => r.get('ID') === id);
        if (!rowToDelete) {
            throw new Error('Guard not found.');
        }

        await rowToDelete.delete();
        return { success: true, message: 'Guard deleted successfully.' };
    }

    async authenticateUser(role, id, password) {
        await this.ensureReady();
        
        if (role !== 'guard') {
            throw new Error('Only guard role is supported currently.');
        }

        const sheet = this.doc.sheetsByTitle['Guards'];
        const rows = await sheet.getRows();
        
        const user = rows.find(r => r.get('ID') === id);
        
        if (!user) {
            return { success: false, message: 'Invalid ID.' };
        }

        if (user.get('Password') !== password) {
            return { success: false, message: 'Invalid password.' };
        }

        return { 
            success: true, 
            message: 'Authentication successful.',
            name: user.get('Name')
        };
    }
}

module.exports = new AuthManager();
