import { SUMMARIZE_PROMPT2, FLASHCARD_PROMPT, QUIZ_PROMPT } from "./prompt.js";
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
            //Create a variable to store the response text
            let responseText = extractedText;

            //Try to send the extracted text to the AI API
            try {
                // Create the prompt
                let my_prompt = extractedText;
                if (request.type === 'SUMMARY') {
                    my_prompt = SUMMARIZE_PROMPT2 + my_prompt;
                }
                else if (request.type === 'FLASHCARD') {
                    my_prompt = FLASHCARD_PROMPT + my_prompt;
                }
                else {
                    my_prompt = QUIZ_PROMPT + my_prompt;
                }

                // Define the API URL
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

                // Check if the response is OK
                if (!response.ok) {
                    sendResponse({ error: response.status });
                    const responseText = await response.text();
                    console.error("Error details:", responseText);
                    throw new Error(`Error: ${response.status}`);
                }

                // Extract answer from API response
                const data = await response.json();
                let answer = data.choices?.[0]?.message?.content;

                // Store the AI-generated summary (answer) in local storage
                chrome.storage.local.set({ answer }, () => {
                    console.log("Answer saved in local storage:", answer);
                });

                // Format the answer depending on the request type
                if (request.type === 'SUMMARY') {
                    answer = formatAnswerForHTML(answer);
                }
                else if (request.type === 'FLASHCARD') {
                    answer = formatFlashcardsForHTML(answer);
                }
                else {
                    answer = formatQandA(answer);
                }

                // Format the response for display depending on the request type
                if (request.type === 'SUMMARY') {
                    responseText = `<h2><b>Website Summary:</b></h2><br>${answer}<br><br>`;
                }
                else if (request.type === 'FLASHCARD') {
                    responseText = `<h2><b>Flashcards:</b></h2><br>${answer}<br><br>`;
                }
                else {
                    responseText = `<h2><b>Quiz:</b></h2><br>${answer}<br><br>`;
                }

                //catch any errors
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

function formatFlashcardsForHTML(text) {
    //Split
    const lines = text.split(/\r?\n/);

    const processedLines = lines
        .map(line => {
            // remove unnecessary *
            if (line.startsWith('*')) {
                line = line.slice(1);
            }

            // Bolding
            line = line.replace(
                /^(.*?):(.*)$/,
                '<strong>$1</strong>:$2'
            );

            // remove leading/trailing whitespace
            return line.trim();
        })
        // Remove empty lines
        .filter(line => line.length > 0)
        // bullet
        .map(line => '• ' + line);

    // Join lines with <br><br>
    return processedLines.join('<br><br>');
}

function formatQandA(text) {
    text = text.replace(/\r\n/g, '\n');

    // Split
    const [questionsPart, answersPart = ''] = text.split('AIanswer', 2);

    // Process the questions
    const questions = questionsPart
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map((line, i) => `${i + 1}) ${line}`);

    // Process the answers
    const answers = answersPart
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map((line, i) => `${i + 1}) ${line}`);

    // Construct an HTML string
    const htmlOutput = `
        <h3>Questions</h3>
        ${questions.join('<br>')}

        <br><br>

        <details>
            <summary><strong>Click to reveal Answers</strong></summary>
            <p>${answers.join('<br>')}</p>
            </details>
`.trim();

    return htmlOutput;
}