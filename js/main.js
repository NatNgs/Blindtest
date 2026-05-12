async function sleep(ms) {
	await new Promise(resolve => setTimeout(resolve, ms))
}
async function waitUntilTrue(condition, maxwait=3000) {
	let totalWait = 0
	let i = 0
	while(totalWait < maxwait) {
		if(condition()) return true
		totalWait += (++i)*50
		await sleep(i*50)
	}
	return condition()
}



// Constants
const GUESSING_TIME = 20 // seconds
const AFTER_GUESSING_TIME = 10 // seconds

// Local variables
let videoList = [] // [{id: .., start: .., end: .., name: ..}, ...]
let ivideo = -1
let curtain = null
let counterElement = null
let countInter = null
let cuingTimeout = null
let playing = false
let videoPlayer

// Concurrency and State Control
let isTransitioning = false; // Prevents concurrent playNextVideo calls
let resetRequested = false;  // Flags if resetList was called during async operations
let fallbackTimeout = null;  // Explicit reference to the fallback timer

// Prepare Youtube Player
function onYouTubeIframeAPIReady() {
	videoPlayer = new YT.Player('player', {
		height: '95%',
		width: '95%',
		videoId: '',
		events: {
			'onStateChange': onYouTubeEventStateChange,
			'onError': onYoutubeErrorEvent,
		},
		disablekb: 1,
		controls: 0,
		iv_load_policy: 3,
		rel: 0,
	})

	curtain = document.getElementById('curtain')
	counterElement = document.getElementById('counter')
}

function parseTime(timeAsText) {
	try {
		const spt = timeAsText.split(':')
		if(spt.length === 1) return Number.parseFloat(timeAsText)
		if(spt.length === 2) return Number.parseInt(spt[0])*60 + Number.parseFloat(spt[1])
		if(spt.length === 3) return (Number.parseInt(spt[0])*60 + Number.parseInt(spt[1]))*60 + Number.parseFloat(spt[2])
	} catch(e) {
		console.warn('Could not parse time: \'' + timeAsText + '\'', e)
	}
	return undefined
}

function resetList() {
	// Signal any running async operation to stop immediately
	isTransitioning = false

	if(countInter) clearInterval(countInter)
	if(cuingTimeout) clearTimeout(cuingTimeout)
	if(fallbackTimeout) clearTimeout(fallbackTimeout) // Clear fallback too
	videoPlayer.stopVideo()
	playing = false

	ivideo = -1
	document.getElementById('played_count').innerText = 0
	document.getElementById('vid_count').innerText = videoList.length
}
async function clearList() {
	resetRequested = true
	counterElement.innerText = 'Reseting...'

	videoList.length = 0
	resetList()
	await sleep(1000)

	counterElement.innerText = 'Cleared'
	resetRequested = false // Reset flag for next use
}

function addVideos(vidsToAdd) {
	if(vidsToAdd && vidsToAdd.length) {
		console.log(vidsToAdd)
		videoList.push(... vidsToAdd)

		document.getElementById('vid_count').innerText = videoList.length
	}
}

// When video player sends an event (video started, stopped, loaded, ...)
function onYouTubeEventStateChange(evt) {
	evt.target.errMessage = undefined
	evt.target.errCode = undefined

	if (videoPlayer._onCued && (evt.data == YT.PlayerState.CUED || evt.data == YT.PlayerState.PLAYING)) {
		videoPlayer._onCued(evt)
		videoPlayer._onCued = null
	}
	if (evt.data == YT.PlayerState.PLAYING) {
		if(countInter) clearInterval(countInter)
		countInter = setInterval(_updateCounter, 125)
	}
}
function onYoutubeErrorEvent(evt) {
	const thisPlayer = evt.target
	const errCode = evt.data
	/**
	 * errCodes:
	 * 2 – The request contains an invalid parameter value. For example, this error occurs if you specify a video ID that does not have 11 characters, or if the video ID contains invalid characters, such as exclamation points or asterisks.
	 * 5 – The requested content cannot be played in an HTML5 player or another error related to the HTML5 player has occurred.
	 * 100 – The video requested was not found. This error occurs when a video has been removed (for any reason) or has been marked as private.
	 * 101 – The owner of the requested video does not allow it to be played in embedded players.
	 * 150 – same as 101
	 */
	thisPlayer.errCode = errCode
	switch(errCode) {
		case 2: thisPlayer.errMessage = 'Invalid video id'; break
		case 5: thisPlayer.errMessage = 'Device cannot play this video'; break
		case 100: thisPlayer.errMessage = 'Video not found or removed'; break
		case 101:
		case 150:
			thisPlayer.errMessage = 'Video not found or not allowed outside Youtube'
			break
		case 153: thisPlayer.errMessage = 'Player settings error'; break
		default: thisPlayer.errMessage = 'Unknown error (code:' + errCode + ')'
	}
}

// Display the counter to 0
function _updateCounter() {
	// Safety check for valid state
	if(ivideo < 0 || ivideo >= videoList.length || !videoList[ivideo]) {
		clearInterval(countInter)
		return
	}

	seekTime = videoList[ivideo]['_start']
	revealTime = seekTime + GUESSING_TIME
	skipTime = revealTime + AFTER_GUESSING_TIME
	currentTime = videoPlayer.getCurrentTime()

	// Fix possible desync (failed to skip beginning of the video)
	if(currentTime < seekTime) {
		videoPlayer.seekTo(seekTime) // Will try to seek to requested start before next _updateCounter loop
		//videoList[ivideo]['_start'] = currentTime // bruteforce fix the problem
	} else if(currentTime >= skipTime) {
		// Prevent double trigger if transition already started
		if(!isTransitioning && !resetRequested) {
			// Clear interval immediately to prevent re-entry
			if(countInter) clearInterval(countInter)
			setTimeout(playNextVideo, 100)
		}
	} else if(currentTime >= revealTime) {
		curtain.style.display = 'none'
		counterElement.innerHTML = (videoPlayer.getVideoData()['author'] || '')
			+ '<br/>' + (videoPlayer.getVideoData()['title'] || '')
		curtain.style['backdrop-filter'] = ''
	} else {
		const counter = revealTime - currentTime
		counterElement.innerText = ((counter+0.99)|0)

		if (counter <= 1) {
			curtain.style['backdrop-filter'] = 'blur(0) grayscale(0)'
		} else if (counter <= 6) {
			curtain.style['backdrop-filter'] = 'blur(' + ((counter-1) * 10) + 'px) grayscale(' + ((counter-1)*20) + '%)'
		} else {
			curtain.style['backdrop-filter'] = ''
		}
	}
}

async function _pickNextVideo() {
	// increase video index
	if(ivideo < 0) {
		ivideo = 0
	} else {
		ivideo ++
	}

	// if no more video, stop player and return
	if (ivideo >= videoList.length) {
		curtain.style.display = 'block'
		if(videoList.length > 0) counterElement.innerText = 'End !'
		else counterElement.innerText = 'No video loaded'
		return null
	}

	// Pick a random video
	const rnd = ((Math.random() * (videoList.length - ivideo))|0) + ivideo
	const picked = videoList[rnd]
	videoList[rnd] = videoList[ivideo]
	videoList[ivideo] = picked

	// cue a new video
	cued = false
	videoPlayer._onCued = ()=>{cued = true}
	videoPlayer.errorCode = 0
	videoPlayer.mute()
	videoPlayer.cueVideoById({
		'videoId': picked['id'],
		'startSeconds': 0,
		'endSeconds': 1,
	})

	// Wait until video has been loaded
	const hasBeenLoaded = await waitUntilTrue(() =>
		resetRequested // Abort wait if reset
		|| (videoPlayer?.playerInfo?.videoData?.video_id === picked['id']
			&& (cued // Video has been cued successfully
				|| videoPlayer.errCode // Abort if an error occurred
			)), 2000)

	// Abort if reset was triggered during wait
	if (resetRequested) {
		isTransitioning = false
		return null
	}

	if(!hasBeenLoaded || videoPlayer.errCode) {
		if(!videoPlayer.errCode) videoPlayer.errCode = -1, videoPlayer.errMessage = 'Loading timeout'
		toast('Error while loading video ' + picked['id'] + ': ' + videoPlayer.errMessage, 'toast-err')
		isTransitioning = false

		// Remove video from the list !
		videoList[ivideo] = videoList.pop()

		// Retry
		await sleep(1000)
		return await _pickNextVideo()
	}

	const vdata = videoPlayer.getVideoData()
	if(!vdata || !vdata.isPlayable || vdata.errorCode) {
		toast('Video ' + picked['id'] + ' failed to be played ' + (vdata.errCode || ''), 'toast-err')
		isTransitioning = false

		// Retry
		await sleep(1000)
		return await _pickNextVideo()
	}

	// Gather video timing information
	let _start = videoPlayer.getCurrentTime() || 0
	let _end = videoPlayer.getDuration() - 5 // Ignore last 5s, outro is not fun

	// Prepare random location to listen
	if(_end - _start > GUESSING_TIME + AFTER_GUESSING_TIME) {
		_start = Math.random() * (_end - GUESSING_TIME - AFTER_GUESSING_TIME) + _start
		_end = _start + GUESSING_TIME + AFTER_GUESSING_TIME
	}
	picked['_start'] = _start
	picked['_end'] = _end
	return picked
}

// Prepare the next video to play
async function playNextVideo() {
	// Prevent concurrent executions
	if (isTransitioning || resetRequested) {
		isTransitioning = false
		return
	}
	isTransitioning = true

	// reset flags
	clearInterval(countInter)
	if(cuingTimeout) clearTimeout(cuingTimeout)
	if(fallbackTimeout) clearTimeout(fallbackTimeout) // Clear previous fallback
	fallbackTimeout = null

	videoPlayer._onCued = null

	curtain.style.display = 'block'
	counterElement.innerText = ''

	// Mark skip button as enabled
	document.getElementById('skipBtn').disabled = false

	const picked = await _pickNextVideo()
	if(!picked) return resetList()

	document.getElementById('played_count').innerText = ivideo+1

	console.log('Playing video', ivideo, picked)

	// Clear any existing timeout first
	if(cuingTimeout) clearTimeout(cuingTimeout)

	// Clear fallback immediately on success cue
	let cued = false
	videoPlayer._onCued = ()=> {
		cued = true
		clearTimeout(cuingTimeout)
		cuingTimeout = null

		videoPlayer._onCued = null
		videoPlayer.unMute()
	}

	videoPlayer.loadVideoById({'videoId': picked['id'],
		'startSeconds': picked['_start'],
		'endSeconds': picked['_end'],
	})

	cuingTimeout = setTimeout(()=>{
		// Only trigger if we haven't successfully moved on
		if(!cued && !resetRequested) {
			toast('Video ' + picked['id'] + " hasn't started after 5s, autoskip")
			setTimeout(playNextVideo)
		}
	}, 5000)

	isTransitioning = false
}

function clickStart() {
	const btn = document.getElementById('skipBtn')
	btn.innerText = 'Next'
	btn.onclick = clickNext
	clickNext()
}
function clickNext() {
	// Mark skip button as disabled
	document.getElementById('skipBtn').disabled = true

	// If already transitioning, ignore click
	if(isTransitioning) return

	if(videoPlayer) {
		videoPlayer.stopVideo()
	}
	playing = false
	setTimeout(playNextVideo)
}

function clickPlayPause() {
	if(videoPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
		videoPlayer.pauseVideo()
		playing = false
	} else {
		videoPlayer.playVideo()
		playing = true
	}
}
