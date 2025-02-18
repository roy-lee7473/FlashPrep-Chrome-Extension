'use strict';

(function () {
    // We will make use of Storage API to get and store `count` value
    // More information on Storage API can we found at
    // https://developer.chrome.com/extensions/storage

    // To get storage access, we have to mention it in `permissions` property of manifest.json file
    // More information on Permissions can we found at
    // https://developer.chrome.com/extensions/declare_permissions
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

    function setupCounter(initialValue = 0) {
        document.getElementById('counter').innerHTML = initialValue;

        document.getElementById('incrementBtn').addEventListener('click', () => {
            updateCounter({
                type: 'INCREMENT',
            });
        });

        document.getElementById('decrementBtn').addEventListener('click', () => {
            updateCounter({
                type: 'DECREMENT',
            });
        });
        
        document.getElementById('readDocumentButton').addEventListener('click', () => {
            sendReadDocumentRequest();
        });
    }

    //automatically read document on popup display
    sendReadDocumentRequest();

    function sendReadDocumentRequest() {
        // Communicate with content script of
        // active tab by sending a message
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            const tab = tabs[0];

            chrome.tabs.sendMessage(
                tab.id,
                {
                    type: 'STORE_DOC_TEXT',
                    payload: {},
                }
            );
        });
    }

    function updateDocumentReadText(text) {
        document.getElementById('textTitle').innerText = "Extracted Text:";
        document.getElementById('extractedText').innerText = text;
    }


    function updateCounter({ type }) {
        counterStorage.get(count => {
            let newCount;

            if (type === 'INCREMENT') {
                newCount = count + 1;
            } else if (type === 'DECREMENT') {
                newCount = count - 1;
            } else {
                newCount = count;
            }


            counterStorage.set(newCount, () => {
                document.getElementById('counter').innerHTML = newCount;

                // Communicate with content script of
                // active tab by sending a message
                chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                    const tab = tabs[0];

                    chrome.tabs.sendMessage(
                        tab.id,
                        {
                            type: 'COUNT',
                            payload: {
                                count: newCount,
                            },
                        },
                        response => {
                            console.log('Current count value passed to contentScript file');
                        }
                    );
                });
            });
        });
    }


    function restoreDocumentReadText() {
        chrome.storage.sync.get("extractedText", (data) => {
            updateDocumentReadText(data.extractedText);
        });
    }
    function restoreCounter() {
        // Restore count value
        counterStorage.get(count => {
            if (typeof count === 'undefined') {
                // Set counter value as 0
                counterStorage.set(0, () => {
                    setupCounter(0);
                });
            } else {
                setupCounter(count);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', restoreDocumentReadText);
    document.addEventListener('DOMContentLoaded', restoreCounter);

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === "DATA_STORED") {
            updateDocumentReadText(request.payload.extractedText);
        }
    });


    // Communicate with background file by sending a message
    chrome.runtime.sendMessage(
        {
            type: 'GREETINGS',
            payload: {
                message: 'Hello, my name is Pop. I am from Popup.',
            }
        },
        response => {
            console.log(response.message);
        }
    );
})();
