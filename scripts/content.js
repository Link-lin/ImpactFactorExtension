// Initialize extension when document is ready
async function initializeExtension() {
    const table = document.getElementById("gsc_a_t");

    // Function to read and process the XLSX file
    async function readImpactFactorFile() {
        try {
            const response = await fetch(chrome.runtime.getURL('lib/impact_factor.xlsx'));
            const arrayBuffer = await response.arrayBuffer();
            const data = new Uint8Array(arrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Assume the first sheet contains our data
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert the sheet data to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            // Create a map of journal names to impact factors
            const impactFactorData = {};
            jsonData.forEach(row => {
                // Assuming the Excel file has columns named "Journal" and "Impact Factor"
                if (row['Name'] && row['JIF']) {
                    impactFactorData[row['Name'].toLowerCase()] = row['JIF'];
                }
            });

            // Store the data in Chrome's storage
            await chrome.storage.local.set({ impactFactors: impactFactorData });
            return impactFactorData;
        } catch (error) {
            console.error('Error reading impact factor file:', error);
            throw error;
        }
    }

    // Function to get impact factors from storage
    async function getStoredImpactFactors() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['impactFactors'], (result) => {
                resolve(result.impactFactors || {});
            });
        });
    }

    // Function to extract journal name from citation text
    function extractJournalName(citationText) {
        // Remove any trailing year in parentheses with preceding comma and space
        citationText = citationText.replace(/,\s*\d{4}$/, '');
        
        // Match the pattern: journal name followed by volume and page numbers
        // This will match "Nature 489 (7414), 91-100" and extract "Nature"
        const match = citationText.match(/^([^0-9]+?)\s*\d/);
        
        if (match && match[1]) {
            // Trim any whitespace from the journal name
            return match[1].trim();
        }
        return '';
    }

    // Function to update the table with impact factors
    async function updateTableWithImpactFactors() {
        const impactFactors = await getStoredImpactFactors();
        
        if (table) {
            const rows = table.rows;
            const headerRow = rows[1];
            
            // Add header if it doesn't exist
            if (!headerRow.querySelector('th.impact-factor-column')) {
                const newHeaderCell = document.createElement("th");
                newHeaderCell.textContent = "Impact Factor";
                newHeaderCell.classList.add("gsc_a_y", "impact-factor-column");
                newHeaderCell.style.width = "20px";
                headerRow.insertBefore(newHeaderCell, headerRow.children[3]);
            }

            // Update each row with impact factor
            for (let i = 2; i < rows.length; i++) {
                const row = rows[i];
                // Skip if row already has impact factor
                if (row.querySelector('.impact-factor-column')) continue;
                
                // Get the second gs_gray div which contains the journal information
                const journalCell = row.querySelector('.gsc_a_t .gs_gray:nth-child(3)');
                
                let journalName = '';
                if (journalCell) {
                    journalName = extractJournalName(journalCell.textContent);
                }

                // Insert or update impact factor cell
                let impactFactorCell = row.insertCell(3);
                impactFactorCell.classList.add("gsc_a_y", "impact-factor-column");
                impactFactorCell.style.width = "20px";
                impactFactorCell.textContent = impactFactors[journalName.toLowerCase()] || "N/A";
            }
        }
    }

    // Function to check if impact factors are already stored
    async function checkAndInitializeImpactFactors() {
        try {
            const storedData = await getStoredImpactFactors();
            if (!storedData || Object.keys(storedData).length === 0) {
                await readImpactFactorFile();
            }
            await updateTableWithImpactFactors();
        } catch (error) {
            console.error('Error initializing impact factors:', error);
        }
    }

    // Initialize the extension
    await checkAndInitializeImpactFactors();

    // Set up mutation observer to watch for new rows
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if any of the added nodes are table rows
                const hasNewRows = Array.from(mutation.addedNodes).some(node => 
                    node.nodeType === Node.ELEMENT_NODE && 
                    node.classList && 
                    node.classList.contains('gsc_a_tr')
                );
                
                if (hasNewRows) {
                    updateTableWithImpactFactors();
                }
            }
        });
    });

    // Start observing the table for changes
    observer.observe(table, {
        childList: true,
        subtree: true
    });
}

// Start the extension when the document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
    initializeExtension();
}