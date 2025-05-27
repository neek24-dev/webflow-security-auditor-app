// Ensure the Webflow Apps SDK is loaded and ready
// This is the entry point for your Webflow App logic.
Webflow.onReady(() => {
    console.log('Webflow App SDK is ready!');
    document.getElementById('status-message').textContent = 'Webflow SDK initialized. Fetching project data...';

    // Get references to our HTML elements where results will be displayed
    const statusMessage = document.getElementById('status-message');
    const resultsContainer = document.getElementById('results');
    const headCodeDisplay = document.getElementById('head-code-display');
    const bodyCodeDisplay = document.getElementById('body-code-display');
    const headScriptsList = document.getElementById('head-scripts-list');
    const bodyScriptsList = document.getElementById('body-scripts-list');
    const refreshButton = document.getElementById('refresh-button');

    /**
     * Fetches custom code from the current Webflow project.
     * Webflow.getAllPages() is used to get information about all pages.
     * We'll then look for custom code settings on the project level and page level.
     */
    async function fetchAndAuditCustomCode() {
        statusMessage.textContent = 'Auditing custom code...';
        resultsContainer.style.display = 'none'; // Hide results until fresh data is available

        try {
            // Clear previous results
            headCodeDisplay.textContent = 'N/A';
            bodyCodeDisplay.textContent = 'N/A';
            headScriptsList.innerHTML = '';
            bodyScriptsList.innerHTML = '';

            let projectHeadCode = '';
            let projectBodyCode = '';

            // --- IMPORTANT: Webflow SDK Access ---
            // As of current SDK capabilities, direct access to the "site-wide"
            // custom code fields in project settings isn't directly exposed via a
            // single SDK method like Webflow.getSiteCustomCode().
            //
            // We typically rely on:
            // 1. Reading 'customCode' property from Page objects (page-specific custom code).
            // 2. For project-wide custom code (which is what a security auditor often needs),
            //    you might need a backend to access the Webflow API (not SDK) or
            //    rely on inspecting a published site.
            //
            // For this app, we will focus on what the SDK *can* access directly:
            // - The custom code on the *currently selected page*.
            // - **Correction based on current SDK:** The SDK's `Webflow.getPages()`
            //   method *does* return an array of Page objects, and each Page object
            //   has `customCode.head` and `customCode.body` properties.
            //   However, this is *page-specific* custom code.
            //   For *project-wide* custom code (set in Site Settings), the SDK
            //   doesn't currently have a direct method.
            //
            // To provide a useful audit, we will:
            // A) Check the custom code of the *currently active page*.
            // B) Provide a note that project-wide custom code requires manual inspection
            //    or a more advanced backend integration with the Webflow API.
            //
            // Let's modify to get the current page's custom code as the primary focus.

            const allPages = await Webflow.getAllPages();
            const currentPage = allPages.find(page => page.selected); // Find the currently selected page

            if (currentPage) {
                projectHeadCode = currentPage.customCode?.head || '';
                projectBodyCode = currentPage.customCode?.body || '';
            } else {
                statusMessage.textContent = 'No active page found in the Designer. Please select a page.';
                resultsContainer.style.display = 'block';
                return; // Exit if no page is selected
            }

            // Display raw custom code
            headCodeDisplay.textContent = projectHeadCode || 'No custom code found in <head> for this page.';
            bodyCodeDisplay.textContent = projectBodyCode || 'No custom code found in <body> for this page.';

            // Parse and list external resources
            listExternalResources(projectHeadCode, headScriptsList);
            listExternalResources(projectBodyCode, bodyScriptsList);

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
     * @param {string} htmlString - The HTML content to parse.
     * @param {HTMLElement} listElement - The <ul> element to append the results to.
     */
    function listExternalResources(htmlString, listElement) {
        // Create a temporary DOM element to parse the HTML string
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlString;

        // Find all script tags with a 'src' attribute
        const scripts = tempDiv.querySelectorAll('script[src]');
        if (scripts.length > 0) {
            scripts.forEach(script => {
                const li = document.createElement('li');
                li.textContent = `Script: ${script.src}`;
                listElement.appendChild(li);
            });
        }

        // Find all link tags with rel="stylesheet" and an 'href' attribute
        const stylesheets = tempDiv.querySelectorAll('link[rel="stylesheet"][href]');
        if (stylesheets.length > 0) {
            stylesheets.forEach(link => {
                const li = document.createElement('li');
                li.textContent = `Stylesheet: ${link.href}`;
                listElement.appendChild(li);
            });
        }

        if (scripts.length === 0 && stylesheets.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No external scripts or stylesheets found.';
            listElement.appendChild(li);
        }
    }

    // Initial audit when the app loads
    fetchAndAuditCustomCode();

    // Add event listener for the refresh button
    refreshButton.addEventListener('click', fetchAndAuditCustomCode);

    // Provide a helper to warn about project-wide custom code
    // This is a current limitation of the SDK for directly accessing global settings
    const projectWideNote = document.createElement('p');
    projectWideNote.style.marginTop = '20px';
    projectWideNote.style.fontStyle = 'italic';
    projectWideNote.style.color = '#888';
    projectWideNote.innerHTML = '<strong>Note:</strong> This audit currently focuses on custom code for the <strong>selected page</strong>. Project-wide custom code (set in Site Settings > Custom Code) must be manually reviewed within Webflow for now, as the SDK does not yet expose it directly.';
    resultsContainer.parentNode.insertBefore(projectWideNote, resultsContainer.nextSibling);

});