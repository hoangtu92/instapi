function pickHeaders(headers) {
    const allow = [
        "x-csrftoken",
        "x-ig-app-id",
        "x-asbd-id",
        "x-bloks-version-id"
    ];

    return Object.fromEntries(Object.entries(headers).filter(([key]) => allow.includes(key.toLowerCase())));
}

function pickParams(params) {
    const allow = [
        "av",
        "__user",
        "__hs",
        "dpr",
        "__ccg",
        "__rev",
        "__s",
        "__hsi",
        "__dyn",
        "__csr",
        "__hsdp",
        "__hblp",
        "__sjsp",
        "__comet_req",
        "server_timestamps",
        "__a",
        "__d",
        "__req",
        "__spin_b",
        "__spin_r",
        "__spin_t",
        "fb_dtsg",
        "jazoest",
        "lsd"
    ];

    return Object.fromEntries(Object.entries(Object.fromEntries(params)).filter(([key]) => allow.includes(key.toLowerCase())))
}

/**
 *
 * @param req
 * @returns {{headers: *, payload: any}}
 */
async function extractGraphqlSession(req) {
    const postData = await req.postData();
    const postDataObj = new URLSearchParams(postData);

    const headers = pickHeaders(req.headers());

    const params = pickParams(postDataObj);
    return {
        ...headers,
        ...params
    };
}

module.exports = {extractGraphqlSession}
