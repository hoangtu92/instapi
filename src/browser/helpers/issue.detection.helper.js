const {
    VERIFICATION, CHALLENGE, SOFT_COOKIE, CONSENT, SAVE_INFO, LOGIN_REQUIRED
} = require("../constants/sessionIssue.constants");

async function issueDetectionHelper(page) {
    const url = page.url();

    // 1️⃣ URL-based (fast, reliable)
    if (url.includes("/consent")) return CONSENT;
    if (url.includes("/onetap")) return SAVE_INFO;
    if (url.includes("/challenge")) return CHALLENGE;
    if (url.includes("/accounts/login")) return LOGIN_REQUIRED;
    if (url.includes("/security") || url.includes("/codeentry")) {
        return VERIFICATION;
    }

    // 2️⃣ DOM-based (only if needed)
    const html = await page.content();

    // 🍪 Soft cookie banner (not full consent)
    if (
        html.includes("cookie") &&
        (html.includes("Allow all") || html.includes("Accept all"))
    ) {
        return SOFT_COOKIE;
    }

    // 🚧 Challenge markers (GraphQL / embedded JSON)
    if (
        html.includes("challenge_required") ||
        html.includes("/challenge/")
    ) {
        return CHALLENGE;
    }

    // 🔐 Logged out session
    if (
        html.includes("login_required") ||
        html.includes("Log in to Instagram") ||
        html.includes("Forgot password?")
    ) {
        return LOGIN_REQUIRED;
    }

    // ❗ Security verification
    if (
        html.includes("Verify your account") ||
        html.includes("Confirm it’s you")
    ) {
        return VERIFICATION;
    }

    return null;
}



module.exports = {issueDetectionHelper }
