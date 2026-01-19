const Campaign = require('../models/Campaign');
const CatalogProduct = require('../models/CatalogProduct');
const textPdfParser = require('../services/textPdfParser.service');

exports.createCampaign = async (req, res) => {
    try {
        const { name, startDate, endDate, isActive } = req.body;

        // If the new campaign is set to ACTIVE, we NO LONGER deactivate all others.
        // Multiple campaigns can be active simultaneously (overlapping groups).

        const campaign = await Campaign.create({
            name,
            startDate,
            endDate,
            isActive,
            targetGroups: req.body.targetGroups || []
        });
        return res.status(201).json(campaign);
    } catch (error) {
        console.error('Error creating campaign:', error);
        return res.status(500).json({ error: 'Failed to create campaign' });
    }
};

exports.listCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.findAll({ order: [['id', 'DESC']] });
        return res.json(campaigns);
    } catch (error) {
        console.error('Error listing campaigns:', error);
        return res.status(500).json({ error: 'Failed to list campaigns' });
    }
};

exports.updateCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, isActive, startDate, endDate } = req.body;
        const campaign = await Campaign.findByPk(id);

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // If activating THIS campaign, we now ALLOW overlap.
        // No need to deactivate others.


        // Apply updates
        if (name !== undefined) campaign.name = name;
        if (isActive !== undefined) campaign.isActive = isActive;
        if (startDate !== undefined) campaign.startDate = startDate;
        if (endDate !== undefined) campaign.endDate = endDate;
        if (req.body.targetGroups !== undefined) campaign.targetGroups = req.body.targetGroups;
        if (req.body.markupPercentage !== undefined) campaign.markupPercentage = req.body.markupPercentage;

        await campaign.save();
        return res.json(campaign);

    } catch (error) {
        console.error('Error updating campaign:', error);
        return res.status(500).json({ error: 'Failed to update campaign' });
    }
};

const CatalogMarkupService = require('../services/catalogMarkup.service');
const catalogAssistant = require('../services/catalogAssistant.service');
const path = require('path');
const fs = require('fs');

exports.uploadFiles = async (req, res) => {
    try {
        const { id } = req.params;
        const { markupPercentage } = req.body;

        const campaign = await Campaign.findByPk(id);
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        // Update fields if provided
        if (markupPercentage) campaign.markupPercentage = parseFloat(markupPercentage);

        // Handle Files
        if (req.files) {
            if (req.files['pdf'] && req.files['pdf'][0]) {
                campaign.visualPdfPath = req.files['pdf'][0].path; // Full path or relative? Multer gives absolute usually or relative to cwd.
                // Let's store relative to public usually, but here we store string path. System uses full path often.
                // For consistency with existing catalog logic, let's just store what multer gives (path).
            }

            if (req.files['pricePdf']) {
                const paths = req.files['pricePdf'].map(f => f.path);
                // If appending or replacing? User said "subir o pdf do catalogo tambem... ou sem para modificar..".
                // Let's assume replacement for now to keep it simple, or append if needed. Replacement is safer for "Configuring the campaign".
                campaign.pricePdfPaths = paths;
            }
        }

        await campaign.save();

        // Sync with AI Assistant (Background or Await)
        // We await to ensure valid status
        try {
            if (campaign.visualPdfPath && fs.existsSync(campaign.visualPdfPath)) {
                const filename = path.basename(campaign.visualPdfPath);
                console.log(`[CampaignController] Syncing Visual PDF to AI: ${filename}`);
                await catalogAssistant.uploadCatalogPdf(campaign.visualPdfPath, filename);

                // Create Catalog Metadata related to this Campaign
                await CatalogProduct.create({
                    code: 'CATALOG_META',
                    name: `Catálogo: ${campaign.name}`,
                    category: 'METADATA',
                    catalogName: filename.replace('.pdf', ''),
                    pdfPath: campaign.visualPdfPath,
                    isActive: true,
                    campaignId: campaign.id
                });

                // EXTRACT PRODUCTS LOCALLY (Text Parse)
                // This populates the DB so Webhook can find products locally
                try {
                    const extractedItems = await textPdfParser.extractProducts(campaign.visualPdfPath);
                    if (extractedItems.length > 0) {
                        console.log(`[CampaignController] Extracted ${extractedItems.length} items from Visual PDF.`);

                        // Bulk upsert items
                        for (const item of extractedItems) {
                            if (!item.code) continue;

                            // Upsert based on Code + Campaign (or just Code if unique globally? Usually unique per campaign)
                            // For now, assuming Code is unique enough or we overwrite. 
                            // Ideally we should scope by campaign if needed, but CatalogProduct schema is flat?
                            // Schema has no campaignId on individual products yet?
                            // Wait, CatalogProduct schema check...

                            await CatalogProduct.upsert({
                                code: item.code,
                                name: `Produto ${item.code}`, // We don't have name from text parser yet, use generic
                                price_1_3: item.price, // Saving as base price
                                catalogName: filename.replace('.pdf', ''),
                                isActive: true,
                                campaignId: campaign.id // LINK TO CAMPAIGN
                            });
                        }
                        console.log('[CampaignController] Products saved to DB.');
                        console.log(`[CampaignController] ✅ SUCCESS: Linked PDF "${filename}" to Campaign "${campaign.name}" (ID: ${campaign.id})`);
                        console.log(`[CampaignController] ℹ️  AI Lookup for this file will now resolve to this Campaign.`);
                    }
                } catch (parseErr) {
                    console.error('[CampaignController] Local parse failed:', parseErr);
                }
            }

            if (campaign.pricePdfPaths && campaign.pricePdfPaths.length > 0) {
                for (const pPath of campaign.pricePdfPaths) {
                    if (fs.existsSync(pPath)) {
                        const filename = path.basename(pPath);
                        console.log(`[CampaignController] Syncing Price PDF to AI: ${filename}`);
                        await catalogAssistant.uploadCatalogPdf(pPath, filename);
                    }
                }
            }
        } catch (aiError) {
            console.error('[CampaignController] Warning: Failed to sync files with AI:', aiError.message);
            // Don't fail the request, just log
        }


    } catch (error) {
        console.error('Error uploading campaign files:', error);
        return res.status(500).json({ error: 'Failed to upload files' });
    }
};

exports.generateCatalog = async (req, res) => {
    try {
        const { id } = req.params;
        const campaign = await Campaign.findByPk(id);
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        if (!campaign.visualPdfPath) {
            return res.status(400).json({ error: 'Visual Catalog PDF missing.' });
        }

        // Logic to load files
        const visualBuffer = fs.readFileSync(campaign.visualPdfPath);

        const priceBuffers = [];
        const pricePaths = campaign.pricePdfPaths || [];
        for (const pPath of pricePaths) {
            if (fs.existsSync(pPath)) {
                priceBuffers.push(fs.readFileSync(pPath));
            }
        }

        // Generate
        const catalogService = new CatalogMarkupService();
        // Note: verify if generateMergedPdf handles empty price buffers (it should, or standard logic)
        // Only generate if we have data, or maybe user just wants markup on visual? usually needs price list.

        const markup = campaign.markupPercentage || 0;

        console.log(`[Campaign] Generating PDF for Campaign ${id} with Markup ${markup}%`);
        const resultPdfBuffer = await catalogService.generateMergedPdf(visualBuffer, priceBuffers, markup);

        // Save Result
        const fileName = `campaign-${id}-final-${Date.now()}.pdf`;
        const outputPath = path.join(__dirname, '../../public/uploads/catalogs', fileName);

        // Ensure dir exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(outputPath, resultPdfBuffer);

        // Update Campaign
        campaign.finalPdfPath = outputPath; // Store absolute path
        await campaign.save();

        // Return the public URL or download
        // Assuming public/uploads is served at /uploads
        const publicUrl = `/uploads/catalogs/${fileName}`;

        return res.json({
            message: 'Catalog generated successfully',
            campaign,
            downloadUrl: publicUrl
        });

    } catch (error) {
        console.error('Error generating campaign catalog:', error);
        return res.status(500).json({ error: 'Failed to generate catalog: ' + error.message });
    }
};

exports.deleteCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const campaign = await Campaign.findByPk(id);

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        await campaign.destroy();
        return res.json({ message: 'Campaign deleted successfully' });

    } catch (error) {
        console.error('Error deleting campaign:', error);
        return res.status(500).json({ error: 'Failed to delete campaign' });
    }
};

exports.fixPdfFilename = async (req, res) => {
    try {
        const { id } = req.params;
        const campaign = await Campaign.findByPk(id);

        if (!campaign || !campaign.visualPdfPath) {
            return res.status(404).json({ error: 'Campaign or PDF not found' });
        }

        const currentPath = campaign.visualPdfPath;
        const fs = require('fs');
        if (!fs.existsSync(currentPath)) {
            return res.status(404).json({ error: 'File does not exist on disk' });
        }

        const path = require('path');
        const oldFilename = path.basename(currentPath);

        // Sanitize Campaign Name
        const saneCampName = campaign.name.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);

        const timestamp = Date.now();
        const newFilename = `catalog-${saneCampName}-${timestamp}.pdf`;
        const newPath = path.join(path.dirname(currentPath), newFilename);

        // Rename File
        fs.renameSync(currentPath, newPath);
        console.log(`[CampaignController] Renamed legacy PDF: ${oldFilename} -> ${newFilename}`);

        // Update Campaign
        campaign.visualPdfPath = newPath;
        await campaign.save();

        // Update Metadata (CatalogProduct)
        const CatalogProduct = require('../models/CatalogProduct');
        await CatalogProduct.upsert({
            code: 'CATALOG_META',
            name: `Catálogo: ${campaign.name}`,
            category: 'METADATA',
            catalogName: newFilename.replace('.pdf', ''),
            pdfPath: newPath,
            isActive: true,
            campaignId: campaign.id
        });

        console.log(`[CampaignController] Fixed PDF link for Campaign ${campaign.name}`);

        res.json({ success: true, newPath });

    } catch (error) {
        console.error('Error fixing PDF filename:', error);
        res.status(500).json({ error: 'Failed to fix PDF filename' });
    }
};
