'use strict';

// With background scripts you can communicate with popup
// and contentScript files.
// For more information on background script,
// See https://developer.chrome.com/extensions/background_pages
chrome.action.onClicked.addListener(async (tab) => {
    // Check if the tab URL is valid for injection
    if (tab.url.startsWith("chrome://") || tab.url.startsWith("about:") || tab.url.startsWith("edge://")) {
        console.warn("Cannot inject script into a chrome:// or about: page.");
        return;
    }

    try {
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["src/customPopup.js"]
        });
    } catch (error) {
        console.error("Failed to inject script:", error);
    }
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if(request.type === 'GREETINGS') {
        const message = `Hi ${sender.tab ? 'Con' : 'Pop'
            }, my name is Bac. I am from Background. It's great to hear from you.`;

        // Log message coming from the `request` parameter
        console.log(request.payload.message);
        // Send a response message
        sendResponse({
            message,
        });
    }
    else if(request.type === 'STORE_DOC_TEXT') {
        const documentData = request.payload;
        const extractedText = 
            `<h2><b>Website:</b></h2>${cleanUpText(documentData.website)}<br><br>` +
            `<h2><b>Title:</b></h2>${cleanUpText(documentData.title)}<br><br>` +
            `<h2><b>Headings:</b></h2>${cleanUpText(documentData.headings)}<br><br>` +
            `<h2><b>Page URL:</b></h2>${cleanUpText(documentData.pageURL)}<br><br>` +
            `<h2><b>Author:</b></h2>${cleanUpText(documentData.author)}<br><br>` +
            `<h2><b>Publication Date:</b></h2>${cleanUpText(documentData.pubDate)}<br><br>` +
            `<h2><b>Metadata:</b></h2>${cleanUpText(documentData.metadata)}<br><br>` +
            `<h2><b>Keywords:</b></h2>${cleanUpText(documentData.metakeywords)}<br><br>` +
            `<h2><b>Content:</b></h2>${cleanUpText(documentData.content)}<br><br>` +
            `<h2><b>Images:</b></h2>${cleanUpText(documentData.images.join("<br>"))}`;

        chrome.storage.local.set({ extractedText }, () => {
            console.log(`Document saved in local storage`);
            // Send the extracted text back in the response
            sendResponse({ extractedText });
        });
        return true; // Required to use sendResponse asynchronously
    }
});

function cleanUpText(text) {

    // Simple heuristic to extract 'important' text (e.g., remove excess whitespace)
    let importantText = text.split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0) // Remove empty lines
        .join("\n");

    return importantText;
}
