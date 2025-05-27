// Ensure the Webflow Apps SDK is loaded and ready
Webflow.onReady(() => {
    console.log('Webflow App SDK is ready!');
    document.getElementById('status-message').textContent = 'Webflow SDK initialized. Fetching project data...';

    const statusMessage = document.getElementById('status-message');
    const resultsContainer = document.getElementById('results');
    const headCodeDisplay = document.getElementById('head-code-display');
    const bodyCodeDisplay = document.getElementById('body-code-display');
    const headScriptsList = document.getElementById('head-scripts-list');
    const bodyScriptsList = document.getElementById('body-scripts-list');
    const refreshButton = document.getElementById('refresh-button');

    // --- NEW: Define a list of commonly trusted/safe domains ---
    const safeDomains = [
        'ajax.googleapis.com',
        'code.jquery.com',
        'cdn.jsdelivr.net',
        'stackpath.bootstrapcdn.com',
        'kit.fontawesome.com',
        'fonts.googleapis.com',
        'fonts.gstatic.com',
        'www.google-analytics.com',
        'www.googletagmanager.com',
        'connect.facebook.net',
        'platform.twitter.com',
        'static.addtoany.com',
        'cdn.snipcart.com',
        // Add more common/trusted CDNs or your own trusted domains here
    ];

    /**
     * Helper function to extract the domain from a URL.
     * @param {string} url - The URL string.
     * @returns {string|null} The domain, or null if invalid URL.
     */
    function getDomainFromUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (e) {
            return null; // Invalid URL
        }
    }

    /**
     * Fetches custom code from the current Webflow project.
     */
    async function fetchAndAuditCustomCode() {
        statusMessage.textContent = 'Auditing custom code...';
        resultsContainer.style.display = 'none';

        try {
            // Clear previous results
            headCodeDisplay.textContent = 'N/A';
            bodyCodeDisplay.textContent = 'N/A';
            headScriptsList.innerHTML = '';
            bodyScriptsList.innerHTML = '';

            let projectHeadCode = '';
            let projectBodyCode = '';

            const allPages = await Webflow.getAllPages();
            const currentPage = allPages.find(page => page.selected);

            if (currentPage) {
                projectHeadCode = currentPage.customCode?.head || '';
                projectBodyCode = currentPage.customCode?.body || '';
            } else {
                statusMessage.textContent = 'No active page found in the Designer. Please select a page.';
                resultsContainer.style.display = 'block';
                return;
            }

            headCodeDisplay.textContent = projectHeadCode || 'No custom code found in <head> for this page.';
            bodyCodeDisplay.textContent = projectBodyCode || 'No custom code found in <body> for this page.';

            // Pass the safeDomains array to the listExternalResources function
            listExternalResources(projectHeadCode, headScriptsList, safeDomains);
            listExternalResources(projectBodyCode, bodyScriptsList, safeDomains);

            statusMessage.textContent = 'Audit complete!';
            resultsContainer.style.display = 'block';

        } catch (error) {
            console.error('Error fetching or auditing custom code:', error);
            statusMessage.textContent = `Error: ${error.message}. Please check console for details.`;
            resultsContainer.style.display = 'none';
        }
    }

    /**
     * Parses the provided HTML string to extract external script and stylesheet URLs.
     * Categorizes them based on domains.
     * @param {string} htmlString - The HTML content to parse.
     * @param {HTMLElement} listElement - The <ul> element to append the results to.
     * @param {string[]} trustedDomains - An array of trusted domain names.
     */
    function listExternalResources(htmlString, listElement, trustedDomains) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlString;

        const resources = [];

        // Scripts
        tempDiv.querySelectorAll('script[src]').forEach(script => {
            resources.push({ type: 'Script', url: script.src });
        });

        // Stylesheets
        tempDiv.querySelectorAll('link[rel="stylesheet"][href]').forEach(link => {
            resources.push({ type: 'Stylesheet', url: link.href });
        });

        // Inline Scripts (NEW: Identify inline <script> blocks without a src)
        tempDiv.querySelectorAll('script:not([src])').forEach((script, index) => {
            const scriptContent = script.textContent.trim();
            if (scriptContent) {
                 // Truncate long inline scripts for display
                const displayContent = scriptContent.length > 100 ? scriptContent.substring(0, 100) + '...' : scriptContent;
                resources.push({ type: 'Inline Script', url: `(inline script ${index + 1}: ${displayContent})` });
            }
        });


        if (resources.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No external or inline scripts/stylesheets found.';
            li.classList.add('resource-category-none');
            listElement.appendChild(li);
            return;
        }

        resources.forEach(resource => {
            const li = document.createElement('li');
            li.classList.add('resource-item');
            li.textContent = `${resource.type}: ${resource.url}`;

            const domain = getDomainFromUrl(resource.url);

            if (resource.type === 'Inline Script') {
                li.classList.add('resource-category-unknown'); // Inline scripts are always flagged as 'unknown' for review
                li.title = 'Inline scripts should be reviewed for malicious code or performance impact.';
            }
            else if (!domain) { // Relative paths or malformed URLs
                li.classList.add('resource-category-local');
                li.title = 'This appears to be a relative path or an invalid URL. Ensure it points to a valid resource.';
            } else if (trustedDomains.includes(domain)) {
                li.classList.add('resource-category-safe');
                li.title = 'Source is from a commonly recognized and trusted CDN/domain.';
            } else {
                li.classList.add('resource-category-unknown');
                li.title = `Source domain '${domain}' is not in the trusted list. Review for security and necessity.`;
            }

            listElement.appendChild(li);
        });
    }

    // Initial audit when the app loads
    fetchAndAuditCustomCode();

    // Add event listener for the refresh button
    refreshButton.addEventListener('click', fetchAndAuditCustomCode);

    const projectWideNote = document.createElement('p');
    projectWideNote.style.marginTop = '20px';
    projectWideNote.style.fontStyle = 'italic';
    projectWideNote.style.color = '#888';
    projectWideNote.innerHTML = '<strong>Note:</strong> This audit currently focuses on custom code for the <strong>selected page</strong>. Project-wide custom code (set in Site Settings > Custom Code) must be manually reviewed within Webflow for now, as the SDK does not yet expose it directly.';
    resultsContainer.parentNode.insertBefore(projectWideNote, resultsContainer.nextSibling);

});