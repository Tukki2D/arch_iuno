/**
 * (c) 2013 - 2024 Rob Wu <rob@robwu.nl>
 **/

'use strict';

chrome.runtime.onInstalled.addListener(createContextMenu);
chrome.runtime.onStartup.addListener(createContextMenu);
function createContextMenu() {
    chrome.contextMenus.removeAll(function() {
        chrome.contextMenus.create({
            id: 'nl.robwu.exporttopng',
            title: 'Save Image As PNG',
            contexts: ['image']
        });
    });
}
function getPNGFileNameFromURL(url) {
    var reURI = /^(?:([^:]+:)?\/\/[^/]+)?([^?#]*)(\?[^#]*)?(#.*)?$/;
    //            SCHEME      HOST         1.PATH  2.QUERY   3.REF
    // Pattern to get first matching NAME.ext
    var reFilename = /[^/?#=]+(?=\.[a-z0-9]{3,4}\b)/i;
    var splitURI = reURI.exec(url);
    var suggestedFilename = reFilename.exec(splitURI[1]) ||
                            reFilename.exec(splitURI[2]) ||
                            reFilename.exec(splitURI[3]);
    if (suggestedFilename) {
        suggestedFilename = suggestedFilename[0];
        if (suggestedFilename.indexOf('%') != -1) {
            // URL-encoded %2Fpath%2Fto%2Ffile.png should be file.png
            try {
                suggestedFilename = reFilename.exec(decodeURIComponent(suggestedFilename))[0];
            } catch(e) { // Possible (extremely rare) errors:
                // URIError "Malformed URI", e.g. for "%AA.png"
                // TypeError "null has no properties", e.g. for "%2F.png"
            }
            // The downloads API implementation is going to normalize anyway,
            // let's do it ourselves to emphasize that this happens.
            suggestedFilename = suggestedFilename.replaceAll('%', '_');
        }
        suggestedFilename += '.png';
    }
    return suggestedFilename || 'image.png';
}
chrome.contextMenus.onClicked.addListener(function(info, tab) {
    downloadImageAsPngForFrame(info.srcUrl, tab.id, tab.frameId);
});

async function downloadImageAsPngForFrame(srcUrl, tabId, frameId) {
    let filename = getPNGFileNameFromURL(srcUrl);

    // Try to fetch the image in the context of the frame first, because that
    // ensures that the image request is fetched from the same network/cache
    // partition, and otherwise at least having similar cookies.
    let { pngUrl, errorMessage, fallbackToNonScript } =
        await fetchImageAsPngInFrame(srcUrl, tabId, frameId);

    if (!pngUrl && fallbackToNonScript) {
        // Failed, fall back. This won't work for images that expect cookies
        // from the frame partition, but will work perfectly for public images.
        ({ pngUrl, errorMessage } = await fetchImageAsPNG(srcUrl));
    }

    console.assert(pngUrl || errorMessage, "Got pngUrl or errorMessage");
    if (pngUrl) {
        // Nice! We got the image!
        try {
            await download(pngUrl, filename);
            // All right, we can ignore error messages if any.
            return;
        } catch (e) {
            errorMessage =
                'An error occurred while saving the image:' + e.message;
        }
    }
    if (!errorMessage) {
        // Done!
        return;
    }
    // Service workers don't support alert, so display it elsewhere.
    let alerted = await queryOffscreenClient('alert', errorMessage);
    if (alerted) {
        // Shown message, we're good.
        return;
    }
    // This is extremely unexpected - somehow the offscreen document cannot
    // display the error. Could happen if a future Chrome release drops the
    // offscreen tabs API and/or reason.
    try {
        // Fall back to displaying alert in the tab if we can somehow not display
        // the message through the offscreen document.
        let [ { result } ] = await chrome.scripting.executeScript({
            target: { tabId },
            injectImmediately: true,
            func: function(errorMessage) {
                console.error(errorMessage);
                // Note: If the document has a CSP sandbox without allow-modals,
                // then the dialog does not appear. This is hopefully
                // sufficiently rare that we don't need to care about.
                alert(errorMessage);
                return true;
            },
            args: [errorMessage],
        });
        if (result) {
            return;
        }
    } catch (e) {
        // Ignore. Perhaps the tab closed.
    }
    console.error(errorMessage);
}

async function fetchImageAsPngInFrame(srcUrl, tabId, frameId) {
    let target = { tabId };
    if (frameId > 0) {
        target.frameIds = [frameId];
    }
    // func to execute with scripting.executeScript in the web page:
    async function func(url) {
        function convertImgToPNGURL(img) {
            let canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
            let pngUrl = canvas.toDataURL('image/png');
            console.info('Successfully converted image to PNG');
            // TODO: Use createImageBitmap and return ImageBitmap when we can
            // send ImageBitmap through runtime.sendMessage or executeScript
            // because that ImageBitmap can hold the cross-origin image data.
            // https://github.com/w3c/webextensions/issues/293
            // Chrome's structured cloning serialization is behind a flag and
            // defaults to JSON serialization: https://crbug.com/248548#c44
            return pngUrl;
        }
        // Re-use image if we can to avoid loading it.
        for (let img of document.images) {
            if (img.src === url) {
                try {
                    await img.decode();
                    console.info('Found image in document');
                    // This works for if the image is same-origin, or if it is
                    // cross-origin and already has the crossOrigin attribute.
                    return { pngUrl: convertImgToPNGURL(img) };
                } catch (e) {
                    // Cannot re-use image, whether due it being invalid, or
                    // due to the canvas being tainted.
                    console.info('Cannot decode image in document', e.message);
                }
            }
        }
        // Note: content scripts are unaffected by the page's image-src CSP.
        let img = document.createElement('img');
        img.src = url;
        try {
            await img.decode();
            console.info('Loaded and decoded new image');
        } catch (e) {
            console.info('Unable to load new image');
            // Cannot load image.
            return { errorMessage: e.message, fallbackToNonScript: false };
        }
        try {
            // This only works for same-origin images.
            return { pngUrl: convertImgToPNGURL(img) };
        } catch (e) {
            // Canvas was tainted.
            console.info('Unable to convert canvas to PNG');
            return { errorMessage: e.message, fallbackToNonScript: true };
        }
    }

    let pngUrl;
    let errorMessage;
    let fallbackToNonScript = false;
    try {
        // Note: error needs to be implemented: https://crbug.com/1271527
        let [ { result, error } ] = await chrome.scripting.executeScript({
            target,
            injectImmediately: true,
            func,
            args: [srcUrl],
        });
        if (result?.pngUrl) {
            pngUrl = result.pngUrl;
        } else if (error) {
            errorMessage = error?.message || String(error);
            fallbackToNonScript = true;
        } else if (result?.errorMessage) {
            errorMessage = result.errorMessage;
            // If the image failed to load, it will also fail when retrying.
            // So do not bother.
            fallbackToNonScript = result.fallbackToNonScript;
        } else {
            errorMessage = 'An unexpected error occurred.';
            fallbackToNonScript = true;
        }
    } catch (e) {
        errorMessage = e.message;
        fallbackToNonScript = true;
    }
    if (errorMessage) {
        errorMessage =
            'An error occurred while loading ' + srcUrl + ': ' + errorMessage;
    }
    return { pngUrl, errorMessage, fallbackToNonScript };
}

async function fetchImageAsPNG(srcUrl) {
    let blob;
    try {
        let res = await fetch(srcUrl, { credentials: 'include' });
        blob = await res.blob();
    } catch (e) {
        return { errorMessage: 'Failed to load image from ' + srcUrl };
    }
    try {
        return await convertBlobToPNGURL(blob);
    } catch (e) {
        console.log('Failed to convert blob to PNG', e);
        // Perhaps the content is SVG, need to use <img> for decoding.
    }

    // Fall back to offscreen document...
    let response = await queryOffscreenClient('decodeBlobAsPNG', blob);
    if (response) {
        console.log('Decoded blob as PNG via offscreen document');
        return { pngUrl: response.pngUrl };
    }
    return { errorMessage: 'Failed to decode image from ' + srcUrl };
}

async function convertBlobToPNGURL(blob) {
    // createImageBitmap could throw, e.g. for SVG: https://crbug.com/40269670
    let bm = await createImageBitmap(blob);
    let oc = new OffscreenCanvas(bm.width, bm.height);
    oc.getContext('2d').drawImage(bm, 0, 0, bm.width, bm.height);
    let decodedBlob = await oc.convertToBlob({ type: 'image/png' });

    let fr = new FileReader();
    await new Promise(resolve => {
        fr.onloadend = resolve;
        fr.readAsDataURL(decodedBlob);
    });
    return { pngUrl: fr.result };
}

async function download(url, filename) {
    try {
        await chrome.downloads.download({
            url,
            filename,
            saveAs: true,
        });
        return;
    } catch (e) {
        if (!e.message.includes('filename')) {
            throw e;
        }
        // Invalid filename. Use a safe fallback instead of not saving anything.
        await chrome.downloads.download({
            url,
            filename: 'image.png',
            saveAs: true,
        });
    }
}

async function ensureOffscreenClient() {
    async function getOffscreenClient() {
        const clients = await self.clients.matchAll();
        return clients.find(c => c.url.includes('offscreen.html'));
    }
    let client = await getOffscreenClient();
    if (client) {
        return client;
    }
    try {
        // Note: the offscreen document is responsible for closing itself after
        // a period of inactivity with window.close(), so we won't call
        // chrome.offscreen.closeDocument().
        await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            // DOM_SCRAPING is the closest reason; we want to use an <img> to
            // decode the image, which is technically scraping DOM.
            reasons: ['DOM_SCRAPING'],
            justification: 'Converting an image to PNG',
        });
    } catch (e) {
        // Maybe the offscreen document was still loading?
        let client = await getOffscreenClient();
        if (client) {
            return client;
        }
        console.error('Unable to open offscreen document', e);
    }
    return await getOffscreenClient();
}

/**
 * @param {string} type
 * @param {*} data
 * @returns {*} The response. null if an error occurred.
 */
async function queryOffscreenClient(type, data) {
    const client = await ensureOffscreenClient();
    if (!client) {
        console.error('Cannot find offscreen document');
        return null;
    }
    const messageId = crypto.randomUUID();
    const responsePromise = new Promise(resolve => {
        function listener(event) {
            if (event.origin === origin && event.data.messageId === messageId) {
                resolve(event.data.response);
                self.removeEventListener('message', listener);
            }
        }
        self.addEventListener('message', listener);
    });
    client.postMessage({ messageId, type, data });
    return responsePromise;
}
