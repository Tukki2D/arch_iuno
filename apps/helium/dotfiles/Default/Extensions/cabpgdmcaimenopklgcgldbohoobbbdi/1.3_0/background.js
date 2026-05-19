const searchEngines = [
    { id: "saucenao", name: "SauceNAO", url: "https://saucenao.com/search.php?db=999&url=" },
    { id: "iqdb", name: "IQDB", url: "https://iqdb.org/?url=" },
    { id: "tineye", name: "TinEye", url: "https://tineye.com/search/?url=" },
    { id: "google", name: "Google", url: "https://lens.google.com/uploadbyurl?url=" },
    { id: "yandex", name: "Yandex", url: "https://yandex.com/images/search?rpt=imageview&url=" },
    { id: "ascii2d", name: "Ascii2d", url: "https://ascii2d.net/search/url/" },
    {
        id: "lensoai",
        name: "Lenso.ai",
        urls: {
            url: {
                target:
                    "https://lenso.ai/en/search-by-url?url={imgUrl}&utm_source=affiliate&utm_medium=affiliate&utm_campaign=UrjI7k59yL7E4g_mBbEdng"
            },
            image: {
                target:
                    "https://lenso.ai/?utm_source=affiliate&utm_medium=affiliate&utm_campaign=UrjI7k59yL7E4g_mBbEdng",
                isExec: true
            }
        }
    }
];

const debugAffiliate = true;

function createMenu() {
    chrome.contextMenus.removeAll(() => {
        searchEngines.forEach(engine => {
            chrome.contextMenus.create({
                id: engine.id,
                title: `Search with ${engine.name}`,
                contexts: ["image"]
            });
        });
        chrome.contextMenus.create({
            id: "multiSearch",
            title: "Search with All Engines",
            contexts: ["image"]
        });
    });
}

function doSearch(info) {
    const imgUrl = encodeURIComponent(info.srcUrl);
    if (info.menuItemId === "multiSearch") {
        searchEngines.forEach(engine => {
            const url = buildSearchUrl(engine, imgUrl);
            if (url) {
                if (debugAffiliate && engine.id === "lensoai") console.log("Affiliate search →", url);
                chrome.tabs.create({ url, active: false });
            }
        });
    } else {
        const engine = searchEngines.find(e => e.id === info.menuItemId);
        if (engine) {
            const url = buildSearchUrl(engine, imgUrl);
            if (url) {
                if (debugAffiliate && engine.id === "lensoai") console.log("Affiliate search →", url);
                chrome.tabs.create({ url, active: true });
            }
        }
    }
}

function buildSearchUrl(engine, imgUrl) {
    if (engine.url) return engine.url + imgUrl;
    if (engine.urls?.url?.target)
        return engine.urls.url.target.replace("{imgUrl}", decodeURIComponent(imgUrl));
    return null;
}

chrome.runtime.onInstalled.addListener(createMenu);
chrome.runtime.onStartup.addListener(createMenu);
chrome.contextMenus.onClicked.addListener(doSearch);
