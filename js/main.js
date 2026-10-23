// Local variables
const videoList = [] // [{id: ..., _start: ..., _end: ...}, ...]
let ivideo = -1
let playersManager = null

// Prepare Youtube Player
function onYouTubeIframeAPIReady() {
	playersManager = new Players()

	// Hook up the manager's callbacks
	playersManager.onRequestingNextVideo = () => {
		// Called when a transition is complete and the next video needs to be queued
		const picked = _pickNextVideo()
		if(picked) {
			playersManager.queueNext(picked, handleQueueError)
		} else {
			// End of list
			const counterElement = document.getElementById('counter')
			if(videoList.length > 0) counterElement.innerText = 'End !'
			else counterElement.innerText = 'No video loaded'
			if(playersManager.onEndGame) playersManager.onEndGame()
		}
	}

	playersManager.onEndGame = () => {
		console.log("Game finished")
	}
}

function handleQueueError(vdata, errCode) {
	toast('Error while queuing video ' + vdata['id'] + ': ' + errCode, 'toast-err')
	// Remove video from the list
	const index = videoList.indexOf(vdata)
	if (index > -1) {
		videoList.splice(index, 1)
		if(ivideo >= videoList.length) ivideo = videoList.length - 1
		document.getElementById('vid_count').innerText = videoList.length
	}
	// The manager will automatically skip to the next valid video via its internal logic
}

// Helper to extract title/author (Same logic as before)
function _extractTitleAndAuthor(entity, vdata) {
	let channel = (vdata['author'] || '').trim()
	let title = (vdata['title'] || '').trim()

	if(channel.endsWith(' - Topic')) {
		channel = channel.substring(0, channel.length - 8).trim()
		return [channel, title]
	} else if(title.includes(' - ')) {
		const spt = title.split(' - ')
		channel = spt.shift().trim()
		title = spt.join(' - ').trim()
	} else if(channel.endsWith('VEVO'))
		channel = channel.substring(0, channel.length - 4).trim()
	else if(channel.endsWith('Official') || channel.endsWith('Officiel'))
		channel = channel.substring(0, channel.length - 8).trim()
	else if(vdata['author'])
		channel = '(' + vdata['author'] + ')'
	else
		channel = null

	const reg = /[(\[][^)\]]*?(Officiel|Off?icial|1080|4K|Remaster|Video|Audio|Live|Stereo|Mono|HD|HQ|Clip)[^)\]]*[)\]]/ig
	if(title.match(reg))
		title = title.replace(reg, '').trim()

	return [channel, title]
}

// Prepare the next video to play (Logic adapted for the Manager)
function _pickNextVideo() {
	// 1. Increase video index
	if(ivideo < 0) {
		ivideo = 0
	} else {
		ivideo ++
	}

	// 2. Check if end of list
	if (ivideo >= videoList.length) {
		return null
	}

	// 3. Pick a random video from the remaining unplayed pool
	// Math: Random index between ivideo and videoList.length - 1
	const rnd = ((Math.random() * (videoList.length - ivideo))|0) + ivideo

	// 4. Swap the picked video with the current index (ivideo)
	// This ensures the current video is "played" and moved out of the random pool
	const picked = videoList[rnd]
	videoList[rnd] = videoList[ivideo]
	videoList[ivideo] = picked

	// 5. Return the raw data object
	return picked
}

// Start the game
async function clickStart() {
	const picked = _pickNextVideo()
	if(!picked) return
	// Cue the first music
	await playersManager.queueNext(picked, handleQueueError);

	// Change button 'Start' to 'Next'
	const btn = document.getElementById('skipBtn')
	btn.disabled = true
	btn.innerText = 'Next'
	btn.onclick = clickNext
}

function clickNext(event) {
	// Mark skip button as disabled
	const btn = document.getElementById('skipBtn')
	if(btn) btn.disabled = true

	// If already transitioning, ignore click (handled by manager mostly, but good safety)
	// The manager handles the flow, but we can force a skip
	if(event?.shiftKey) {
		// Remove current video if shift clicked
		if(ivideo >= 0 && ivideo < videoList.length) {
			videoList.splice(ivideo, 1)
			ivideo--
			document.getElementById('vid_count').innerText = videoList.length
		}
	}

	// Tell the manager to skip immediately
	playersManager.forceSkip()
}

function clickPlayPause() {
	const state = playersManager.frontPlayer.getPlayerState()
	if(state === YT.PlayerState.PLAYING) {
		playersManager.frontPlayer.pauseVideo()
	} else {
		playersManager.frontPlayer.playVideo()
	}
}

// Global error handler for the initial setup if needed
function onYoutubeErrorEvent(evt) {
	// This is now handled inside the Players class callbacks,
	// but kept here if you need global logging
	console.log("Global Error Event:", evt.data)
}
