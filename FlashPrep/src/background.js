import { SUMMARIZE_PROMPT2 } from "./prompt.js";
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

    if (request.type === 'GREETINGS') {
        const message = `Hi ${sender.tab ? 'Con' : 'Pop'
            }, my name is Bac. I am from Background. It's great to hear from you.`;

        // Log message coming from the `request` parameter
        console.log(request.payload.message);
        // Send a response message
        sendResponse({
            message,
        });
    }
    else if (request.type === 'SUMMARY' || request.type === 'FLASHCARD' || request.type === 'QUIZ') {


        /**
         * |--------------------------------------------------------|
         * |                                                        |
         * | Right now this does request.type === 'SUMMARY'         |
         * | For 'FLASHCARD' and 'QUIZ' just use a different prompt |
         * |                                                        |
         * |--------------------------------------------------------|
         */

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

        processText();
        async function processText() {
            let responseText = extractedText;  // Keep extractedText for prompt generation
        
            try {
                // Create the prompt
                const my_prompt = SUMMARIZE_PROMPT2 + extractedText;
                const apiUrl = "https://openrouter.ai/api/v1/chat/completions";
        
                // Send request to AI API
                const response = await fetch(apiUrl, {
                    method: "POST",
                    headers: {
                        "Authorization": "Bearer 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",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "google/gemini-2.0-flash-lite-preview-02-05:free",
                        messages: [{
                            role: "user",
                            content: [{ type: "text", text: my_prompt }]
                        }],
                    })
                });
        
                if (!response.ok) {
                    throw new Error(`Error: ${response.status}`);
                }
        
                const data = await response.json();
                let answer = data.choices?.[0]?.message?.content;  // Extract answer from API response
                
                // Store the AI-generated summary (answer) in local storage
                chrome.storage.local.set({ answer }, () => {
                    console.log("Answer saved in local storage:", answer);
                });
        
                answer = formatAnswerForHTML(answer);

                // Send the response back with the formatted summary
                responseText = `<h2><b>Website Summary:</b></h2><br>${answer}<br><br>`;
            } catch (error) {
                console.error("Error sending to LLM:", error);
                sendResponse({ error: error.message });
            }
        
            sendResponse({ answer: responseText });  // Send back 'answer' instead of 'extractedText'
        }
            
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

/**
 * 
 * @param {string} text 
 * @returns 
 */
function formatAnswerForHTML(text) {
    let output = '• ';
    output = output + text.replace(/\n\n/g, '<br><br>• ');
    return output;
}
