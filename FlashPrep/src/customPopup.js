(function () {

    const promptTypes = {
        summary: "summary",
        flashCards: "flashCards",
        quiz: "quiz"
    }

    // Create and inject the UI elements
    function createAndInjectUI() {
        if (!document.getElementById("extension-popup")) {
            // Fetch the popup.html content as a string
            console.log("Injecting popup");
            fetch(chrome.runtime.getURL('/public/popup.html'))
                .then(response => response.text())
                .then(html => {
                    const popupDiv = document.createElement("div");
                    popupDiv.id = "extension-popup";
                    // Remove class from popupDiv since it won't be visible in shadow DOM

                    // Create a shadow root to isolate styles
                    const shadow = popupDiv.attachShadow({ mode: 'open' });

                    // Enhanced path replacement to add public/ for images
                    html = html.replace(
                        /(src|href)=["']([^"']+)["']/g,
                        (match, attr, path) => {
                            if (!path.startsWith('http') && !path.startsWith('data:')) {
                                if (path.match(/\.(png|jpg|jpeg|gif|svg)$/i)) {
                                    path = 'public/' + path.replace(/^\//, '');
                                }
                                return `${attr}="${chrome.runtime.getURL(path)}"`;
                            }
                            return match;
                        }
                    );

                    // Inject the CSS into the shadow DOM
                    const link = document.createElement("link");
                    link.rel = "stylesheet";
                    link.href = chrome.runtime.getURL('/src/popup.css');
                    shadow.appendChild(link);

                    // Create a container for the HTML content
                    const container = document.createElement('div');
                    container.className = "extension-popup"; // Add class here instead
                    container.innerHTML = html;
                    shadow.appendChild(container);

                    // Append the popup div to the body
                    document.body.appendChild(popupDiv);

                    typeText(shadow, "Generating summary...", 25);
                    const extractedTextElement = shadow.querySelector('#extractedText');
                    extractedTextElement.classList.add('blink');
                    // Wait for DOM to be updated and initialize the counter
                    setTimeout(() => {
                        // Initialize event listeners
                        setupCounter(shadow);

                        // Restore extracted text from local storage instead of sync
                        readDocument(promptTypes.summary, (extractedText) => {
                            typeText(shadow, extractedText);
                            extractedTextElement.classList.remove('blink');
                            extractedTextElement.classList.remove('fade-in');
                            void extractedTextElement.offsetWidth;

                            extractedTextElement.classList.add('fade-in');
                        });
                    }, 0);
                })
                .catch(err => {
                    console.error("Error loading popup.html:", err);
                });
        }
    }

    // Storage helper (modified to work in content script)
    const counterStorage = {
        get: cb => {
            chrome.storage.sync.get(['count'], result => {
                cb(result.count);
            });
        },
        set: (value, cb) => {
            chrome.storage.sync.set(
                {
                    count: value,
                },
                () => {
                    cb();
                }
            );
        },
    };

    function setupCounter(shadow) {
        const exitButton = shadow.querySelector('.extension-popup .exitButton');
        const reloadButton = shadow.querySelector('.extension-popup .reloadButton');
        const copyButton = shadow.querySelector('.extension-popup .copyButton');
        const flashCardsButton = shadow.querySelector('.extension-popup .flashCardsButton');
        const quizButton = shadow.querySelector('.extension-popup .quizButton');

        if (exitButton) {
            exitButton.addEventListener('click', () => {
                exitPopup();
            });
        }
        if (copyButton) {
            copyButton.addEventListener('click', () => {
                copyPrompt();
            });
        }
        if (reloadButton) {
            reloadButton.addEventListener('click', () => {
                reloadSummarizePrompt(shadow);
            });
        }
        if (flashCardsButton) {
            flashCardsButton.addEventListener('click', () => {
                flashCardPrompt(shadow);
            });
        }
        if (quizButton) {
            quizButton.addEventListener('click', () => {
                quizPrompt(shadow);
            });
        }
    }

    function updateDocumentReadText(shadow, text) {
        console.log(`new text: ${text}`);
        const textTitle = shadow.querySelector('#textTitle');
        const extractedText = shadow.querySelector('#extractedText');

        if (textTitle) textTitle.innerText = "Extracted Text:";
        if (extractedText) extractedText.innerHTML = text;
    }



    function typeText(shadow, text, speed = 0.01, charsPerFrame = 3) {
        const extractedText = shadow.querySelector('#extractedText');
        let titleEndIndex = text.indexOf("</b></h2><br>");
        let title = text.substring(0, titleEndIndex + 13);
        
        extractedText.innerHTML = title; // Start with title
        let i = title.length;
        let lastTime = 0;
    

        let detailsBlock = text.indexOf("<details>") === -1 ? null : text.substring(text.indexOf("<details>"), text.indexOf("</details>")+10);
        console.log(detailsBlock);

        function typeNextLetters(timestamp) {
            if (i < text.length) {
                if (timestamp - lastTime >= speed) { // Ensure minimum delay
                    let appendText = "";
                    let addNum = 0;
    
                    while (addNum < charsPerFrame && i < text.length) {
                        /** @type {string} */
                        let currentChar = text[i];
                        
                        if(detailsBlock !== null && text.indexOf("<details>") === i) {
                            appendText = detailsBlock;
                            i += detailsBlock.length;
                        }
                        else {
                            if (currentChar === "<") {
                                let tagMatch = text.substring(i).match(/^<\/?([a-zA-Z0-9\-]+)[^>]*>/);
                                if (tagMatch) {
                                    let tagName = tagMatch[1];
                                    let endTagIndex = findFullHTMLElement(text, i, tagName);
                                    
        
                                    if (endTagIndex !== -1) {
                                        appendText += text.slice(i, endTagIndex + 1);
                                        addNum += (endTagIndex + 1 - i);
                                        i = endTagIndex + 1;
                                        continue;
                                    }
                                }
                            }
        
                            appendText += currentChar;
                            addNum++;
                            i++;
                        }
                    }
    
                    extractedText.innerHTML += appendText;
                    lastTime = timestamp; // Update time for next frame
                }
                requestAnimationFrame(typeNextLetters);
            }
        }
    
        requestAnimationFrame(typeNextLetters);
    }
    
    /**
     * Finds the end index of a full HTML element, ensuring proper closure of `<details>` and other tags.
     * @param {string} text - The full HTML text.
     * @param {number} startIndex - Index where "<" was found.
     * @param {string} tagName - Specific tag (e.g., "details") to fully capture.
     * @returns {number} - The end index of the full HTML element or -1 if not found.
     */
    function findFullHTMLElement(text, startIndex, tagName = null) {
        let i = startIndex;
        let tagStack = [];
        let tagPattern = /<\/?([a-zA-Z0-9\-]+)[^>]*>/g;
        tagPattern.lastIndex = startIndex;
    
        while ((match = tagPattern.exec(text)) !== null) {
            let tag = match[1];
            let fullTag = match[0];
            let isClosing = fullTag.startsWith("</");
            let isSelfClosing = fullTag.endsWith("/>") || /<br\s*\/?>/.test(fullTag);
    
            if (isClosing) {
                if (tagStack.length > 0 && tagStack[tagStack.length - 1] === tag) {
                    tagStack.pop();
                }
                if (tagStack.length === 0 && (!tagName || tag === tagName)) {
                    return match.index + fullTag.length - 1;
                }
            } else {
                if (!isSelfClosing) { // Avoid pushing self-closing tags onto the stack
                    tagStack.push(tag);
                }
            }
    
            // Ensure `<br>` and other self-closing tags are fully captured
            if (isSelfClosing) return match.index + fullTag.length - 1;
    
            // Prevent infinite loops by limiting scan length
            if (match.index - startIndex > 1000) {
                console.warn("Possible infinite loop detected in findFullHTMLElement!");
                return -1;
            }
        }
    
        return -1; // No valid end tag found
    }









    function readDocument(promptType, callback) {
        console.log("Reading document");
        const documentData = {
            website: window.location.hostname,
            content: document.querySelector('article')?.innerText || document.body.innerText,
            title: document.querySelector('h1')?.innerText || document.title,
            headings: Array.from(document.querySelectorAll("h1, h2, h3"))
                .map(h => h.innerText)
                .join(" "),
            pageURL: window.location.href,
            author: document.querySelector("[name='author']")?.content ||
                document.querySelector(".author, .byline")?.innerText || "",
            pubDate: document.querySelector("time")?.dateTime || "",
            metadata: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
            metakeywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '',
            images: Array.from(document.querySelectorAll("img")).map(img => img.src)
        };
        let msgType = 'SUMMARY';
        switch (promptType) {
            case promptTypes.flashCards:
                msgType = 'FLASHCARD';
                break;
            case promptTypes.quiz:
                msgType = 'QUIZ';
                break;
        }

        chrome.runtime.sendMessage({
            type: msgType,
            payload: documentData
        }, response => {
            if (chrome.runtime.lastError) {
                console.error("Error sending message:", chrome.runtime.lastError);
                return;
            }
            if (response && response.error) {
                callback("Error: " + response.error);
            }
            if (response && response.answer) {
                callback(response.answer);
            }
        });
    }

    function exitPopup() {
        console.log("Exiting popup");
        // Find the root popup div in the main document, not in shadow
        const popupDiv = document.getElementById('extension-popup');
        if (popupDiv) {
            popupDiv.remove();
        } else {
            console.log("Popup div not found");
        }
    }


    function copyPrompt() {
        console.log("copying text");
        chrome.storage.local.get("answer", (result) => {
            if (result.answer) {
                navigator.clipboard.writeText(result.answer)
                    .then(() => console.log("Extracted text copied to clipboard!"))
                    .catch(err => console.error("Failed to copy text:", err));
            } else {
                console.warn("No extracted text found in storage!");
            }
        });
    }

    function reloadSummarizePrompt(shadow) {
        typeText(shadow, "Regenerating summary...", 25);
        const extractedTextElement = shadow.querySelector('#extractedText');
        extractedTextElement.classList.add('blink');
        readDocument(promptTypes.summary, (answer) => {
            typeText(shadow, answer);
            extractedTextElement.classList.remove('blink');
        });
    }

    function flashCardPrompt(shadow) {
        typeText(shadow, "Generating keywords...", 25);
        const extractedTextElement = shadow.querySelector('#extractedText');
        extractedTextElement.classList.add('blink');
        readDocument(promptTypes.flashCards, (answer) => {
            typeText(shadow, answer);
            extractedTextElement.classList.remove('blink');
        });
    }

    function quizPrompt(shadow) {
        typeText(shadow, "Generating quiz...", 25);
        const extractedTextElement = shadow.querySelector('#extractedText');
        extractedTextElement.classList.add('blink');
        readDocument(promptTypes.quiz, (answer) => {
            typeText(shadow, answer);
            extractedTextElement.classList.remove('blink');
        });
    }

    function initialize() {
        console.log("Initializing");
        createAndInjectUI();
    }

    // Initialize when the content script loads
    initialize();
})();
