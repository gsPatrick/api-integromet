const Setting = require('../models/Setting');

class SettingsController {

    // GET /settings
    async getAll(req, res) {
        try {
            const settings = await Setting.findAll();
            const formatted = {};
            settings.forEach(s => {
                // Try parsing JSON or numbers
                let val = s.value;
                if (!isNaN(val)) val = Number(val);
                if (val === 'true') val = true;
                if (val === 'false') val = false;
                formatted[s.key] = val;
            });
            res.json(formatted);
        } catch (error) {
            console.error('Error fetching settings:', error);
            res.status(500).json({ error: 'Failed' });
        }
    }

    // PUT /settings
    async update(req, res) {
        try {
            const updates = req.body; // { markup_percentage: 35, group_orders: true }

            for (const [key, value] of Object.entries(updates)) {
                await Setting.upsert({
                    key,
                    value: String(value)
                });
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Error updating settings:', error);
            res.status(500).json({ error: 'Failed' });
        }
    }

    // Helper to get value internaly
    static async getValue(key, defaultValue) {
        try {
            const setting = await Setting.findByPk(key);
            if (!setting) return defaultValue;

            let val = setting.value;
            if (!isNaN(val)) return Number(val);
            if (val === 'true') return true;
            if (val === 'false') return false;
            return val;
        } catch (e) {
            return defaultValue;
        }
    }

    static async updateValue(key, value) {
        try {
            await Setting.upsert({
                key,
                value: String(value)
            });
            return true;
        } catch (e) {
            console.error('Error updating setting internal:', e);
            return false;
        }
    }
}

module.exports = SettingsController;
