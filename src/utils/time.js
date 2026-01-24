async function sleep(timeout){
    await new Promise(r => setTimeout(r, timeout + Math.random() * 300))
}

module.exports = {sleep}
