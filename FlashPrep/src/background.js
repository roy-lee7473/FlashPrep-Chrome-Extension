'use strict';

// With background scripts you can communicate with popup
// and contentScript files.
// For more information on background script,
// See https://developer.chrome.com/extensions/background_pages

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
        const extractedText = cleanUpText(request.payload.innerText);
        chrome.storage.sync.set({ extractedText: extractedText }, () => {
            console.log(`Document saved in sync storage:\n[\n${extractedText}\n]`);
            chrome.runtime.sendMessage(
                {
                    type: 'DATA_STORED',
                    payload: {
                        extractedText: extractedText
                    },
                }
            );
        });
        //sendResponse({ message: "Received and stored" });
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
