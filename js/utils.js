async function sleep(ms) {
	await new Promise(resolve => setTimeout(resolve, ms))
}
async function waitUntilTrue(condition, maxwait=5000) {
	let totalWait = 0
	let i = 0
	while(totalWait < maxwait) {
		if(condition()) return true
		totalWait += (++i)*50
		await sleep(i*50)
	}
	return condition()
}
