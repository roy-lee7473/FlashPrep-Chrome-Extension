(function () {
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
                    
        
                    // Wait for DOM to be updated and initialize the counter
                    setTimeout(() => {
                        // Initialize event listeners
                        setupCounter(shadow);

                        // Restore extracted text from local storage instead of sync
                        readDocument(shadow, (extractedText) => {
                            updateDocumentReadText(shadow, extractedText);
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

    function setupCounter(shadow, initialValue = 0) {
        const readDocumentButton = shadow.querySelector('.extension-popup #readDocumentButton');
        const exitButton = shadow.querySelector('.extension-popup .exitButton');
        
        if (readDocumentButton) {
            readDocumentButton.addEventListener('click', () => {
                readDocument(shadow, (extractedText) => {
                    updateDocumentReadText(shadow, extractedText);
                });
            });
        }
        if (exitButton) {
            exitButton.addEventListener('click', () => {
                exitPopup(shadow);
            });
        }
    }

    function updateDocumentReadText(shadow, text) {
        const textTitle = shadow.querySelector('#textTitle');
        const extractedText = shadow.querySelector('#extractedText');
        
        if (textTitle) textTitle.innerText = "Extracted Text:";
        if (extractedText) extractedText.innerHTML = text;
    }

    function readDocument(shadow, callback) {
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

        chrome.runtime.sendMessage({
            type: 'STORE_DOC_TEXT',
            payload: documentData
        }, response => {
            if (chrome.runtime.lastError) {
                console.error("Error sending message:", chrome.runtime.lastError);
                return;
            }
            if (response && response.extractedText) {
                callback(response.extractedText);
            }
        });
    }

    function exitPopup(shadow) {
        console.log("Exiting popup");
        // Find the root popup div in the main document, not in shadow
        const popupDiv = document.getElementById('extension-popup');
        if (popupDiv) {
            popupDiv.remove();
        } else {
            console.log("Popup div not found");
        }
    }

    function initialize() {
        console.log("Initializing");
        createAndInjectUI();
    }

    // Initialize when the content script loads
    initialize();
})();