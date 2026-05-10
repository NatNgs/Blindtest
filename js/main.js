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
const guessingTime = 30 // seconds
const afterguessingTime = 10 // seconds

// Local variables
let loadingVideos = [], isLoadingVideos = false
let videoList = [] // [{id: .., start: .., end: .., name: ..}, ...]
let ivideo = -1
let curtain = null
let counterElement = null
let countInter = null
let cuingTimeout = null
let banner = null
let playing = false
let loaderPlayer;
let videoPlayer;


// Prepare Youtube Player
function onYouTubeIframeAPIReady() {
	loaderPlayer = new YT.Player('loader', {
		height: '100px',
		width: '150px',
		videoId: '',
		events: {
			'onError': onYoutubeErrorEvent,
			'onStateChange': (evt) => {
				evt.target.errMessage = undefined
				evt.target.errCode = undefined
			}
		},
		disablekb: 1,
		controls: 0,
		iv_load_policy: 3,
		rel: 0,
	});
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
	});

	curtain = document.getElementById('curtain')
	counterElement = document.getElementById('counter')
	banner = document.getElementById('banner')
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


async function resetList() {
	if(playing) {
		videoPlayer.stopVideo()
		playing = false
	}
	if(countInter) clearInterval(countInter)
	if(cuingTimeout) clearTimeout(cuingTimeout)
	counterElement.innerHTML = '<div>Reseting...</div>'

	loadingVideos.length = 0
	videoList.length = 0
	isLoadingVideos = false

	await sleep(1000)
	document.getElementById('vid_count').innerText = videoList.length
	document.getElementById('load_count').innerText = loadingVideos.length
	counterElement.innerHTML = '<div>Cleared</div>'
}

async function loadVideos(vidsToAdd) {
	if(vidsToAdd && vidsToAdd.length) {
		console.log(vidsToAdd)
		loadingVideos.push(... vidsToAdd)
	}
	if(isLoadingVideos) return

	isLoadingVideos = true

	await waitUntilTrue(() => loaderPlayer.mute) // Wait until the function is available (may take a few ms), also does assert that the player is ready
	loaderPlayer.mute()

	let successCount = 0
	const errorsMap = {}
	while(loadingVideos.length) {
		console.debug('[LOAD] next')
		document.getElementById('load_count').innerHTML = loadingVideos.length

		// Pick a random element from loadingVideo
		const index = (loadingVideos.length * Math.random())|0
		const currentlyLoading = loadingVideos[index]

		// Remove the video from the list
		loadingVideos[index] = loadingVideos[loadingVideos.length-1]
		loadingVideos.pop()

		// if video is already loaded: skip
		const vid_id = currentlyLoading['id']
		if(videoList.find(v => v.id == vid_id)) continue

		// Open-it in the youtube player
		loaderPlayer.errCode = null
		loaderPlayer.errMessage = null
		console.debug('[LOAD] Cuing')
		loaderPlayer.cueVideoById(vid_id)

		// Wait until video has been loaded
		console.debug('[LOAD] Wait until video is loaded')
		const hasBeenLoaded = await waitUntilTrue(() => loaderPlayer.errCode || loaderPlayer?.playerInfo?.videoData?.video_id === vid_id, 2000)
		if(!hasBeenLoaded) {
			loaderPlayer.errCode = -1
			loaderPlayer.errMessage = 'Loading timeout'
		}
		if(loaderPlayer.errCode) {
			console.debug('[LOAD] Error', loaderPlayer.errCode, loaderPlayer.errMessage)
			errorsMap[loaderPlayer.errMessage] = (errorsMap[loaderPlayer.errMessage] || 0) +1
			continue
		}

		// Load more info from the video by playing first seconds of it
		console.debug('[LOAD] Playing')
		loaderPlayer.playVideo()
		await waitUntilTrue(() => loaderPlayer.getDuration() > 0.1)

		// Process has been stopped while waiting
		if(!isLoadingVideos) break

		// Extract video data, and if isPlayable is true, add its info to videoList (and increment loaded video counter)
		console.debug('[LOAD] Get video data')
		const vdata = loaderPlayer.getVideoData()
		if(vdata && vdata.isPlayable && !vdata.errorCode) {
			const duration = loaderPlayer.getDuration()

			// Fill missing data
			if(!currentlyLoading.author) currentlyLoading.author = vdata.author
			if(!currentlyLoading.title) currentlyLoading.title = vdata.title

			if(duration && !currentlyLoading.end || currentlyLoading.end > duration) currentlyLoading.end = duration
			if(!currentlyLoading.start) currentlyLoading.start = loaderPlayer.getCurrentTime() || 0

			console.debug('[LOAD] Inserting')
			videoList.push(currentlyLoading)
			document.getElementById('vid_count').innerHTML = videoList.length
			successCount ++
		}
		console.debug('[LOAD] Stopping video')
		loaderPlayer.stopVideo()
	}

	document.getElementById('load_count').innerHTML = loadingVideos.length
	isLoadingVideos = false

	for(const errMessage in errorsMap) {
		toast(`${errorsMap[errMessage]} videos excluded: ${errMessage}`, '', 5000)
		await sleep(1000)
	}
	toast(`${successCount} videos loaded with success`, 'toast-ok', 5000)
}
function onStart() {
	if(videoList.length < 3) {
		alert(videoList.length + ' videos are ready. Minimum 3 are required to start')
		return
	}

	document.getElementById('menu').setAttribute('hidden', 'hidden')
	videoPlayer.unMute()

	clickNext()
}


// When video player sends an event (video started, stopped, loaded, ...)
let gameStarted = false
let timerStarted = false
let cued = false
function onYouTubeEventStateChange(evt) {
	evt.target.errMessage = undefined
	evt.target.errCode = undefined
	if (!gameStarted) {
		return
	}
	if (evt.data == YT.PlayerState.CUED && !cued) {
		cued = true
		if(videoList[ivideo]['name']) banner.innerHTML = '(' + videoList[ivideo]['name'] + ')'
		else banner.innerHTML = (ivideo+1) + '/' + videoList.length
		counterElement.innerHTML = '<br>' + guessingTime
		setTimeout(playVideo, 100)
	} else if (evt.data == YT.PlayerState.PLAYING && !timerStarted) {
		countInter = setInterval(updateCounter, 100)
	} else if (evt.data == YT.PlayerState.ENDED) {
		playing = false
		clickNext()
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
		case 2:
			thisPlayer.errMessage = 'Invalid video id'
			break
		case 5:
			thisPlayer.errMessage = 'Device cannot play this video'
			break
		case 100:
			thisPlayer.errMessage = 'Video not found or removed'
			break
		case 101:
		case 150:
			thisPlayer.errMessage = 'Video not allowed outside Youtube'
			break
		default:
			thisPlayer.errMessage = 'Unknown error (code:' + errCode + ')'
	}
}

// Display the counter to 0
function updateCounter() {
	revealTime = videoList[ivideo]['_start'] + guessingTime
	currentTime = videoPlayer.getCurrentTime()
	if(revealTime <= currentTime) {
		let vdata = videoPlayer.getVideoData()
		let soluce = vdata['title']
		curtain.style.display = 'none'
		banner.innerHTML = soluce
		curtain.style['backdrop-filter'] = ''
		return
	}
	skipTime = revealTime + afterguessingTime
	if(currentTime >= skipTime) {
		// Fallback if youtube stop time doesnt works (unfortunately often happens)
		clearInterval(countInter)
		setTimeout(playNextVideo, 100)
		return
	}

	let counter = revealTime - currentTime
	counterElement.innerHTML = '<br>' + ((counter+0.99)|0)

	if (counter < 3) {
		curtain.style['backdrop-filter'] = 'blur(0) grayscale(0)'
	} else if (counter < 8) {
		curtain.style['backdrop-filter'] = 'blur(' + ((counter-3) * 10) + 'px) grayscale(' + ((counter-3)*20) + '%)'
	} else {
		curtain.style['backdrop-filter'] = ''
	}
}

// Prepare the next video to play
function playNextVideo() {
	// reset flags
	cued = false
	clearInterval(countInter)
	clearTimeout(cuingTimeout)
	timerStarted = false
	gameStarted = true

	// increase video index
	if(ivideo < 0) {
		ivideo = 0
	} else {
		ivideo ++
	}
	document.getElementById('played_count').innerText = ivideo

	// if no more video, stop player and return
	if (ivideo >= videoList.length) {
		curtain.style.display = 'block'
		if(videoList.length > 0) counterElement.innerHTML = '<div>End of the blind test !</div>'
		else counterElement.innerHTML = '<div>No video are loaded yet</div>'
		clearInterval(countInter)
		ivideo = -1
		document.getElementById('menu').removeAttribute('hidden')
		return
	}

	// Pick a random video from the remaining elements (Get a random element in the list from ivideo to the end, exchange list position of these such as the randomly picked one is at index ivideo)
	const rnd = ((Math.random() * (videoList.length - ivideo))|0) + ivideo
	const picked = videoList[rnd]
	videoList[rnd] = videoList[ivideo]
	videoList[ivideo] = picked

	// cue a new video (it will be played once cued)

	let _start = picked['start']
	let _end = picked['end']
	if(_end - _start > guessingTime + afterguessingTime) {
		// Randomize where to start between _start and (_end - 2*guessintTime), then set _end = (_start + 2*guessingTime)
		_start = Math.random() * (_end - guessingTime - afterguessingTime) + _start
		_end = _start + guessingTime + afterguessingTime
	}
	picked['_start'] = _start // For the counter start time

	console.log('cued video:', ivideo, picked, {_start, _end})
	videoPlayer.cueVideoById({'videoId': picked['id'],
		'startSeconds': _start,
		'endSeconds': _end,
	})

	// reset counter end drop the curtain
	curtain.style.display = 'block'
	banner.innerText = '(loading song '+ (ivideo+1) + '/' + videoList.length +'...)'
	counterElement.innerText = ''

	// Fallback if video doesnt loads within 5 seconds
	cuingTimeout = setTimeout(()=>{
		if(!cued) {
			playNextVideo()
		}
	}, 5000)
}
function clickNext() {
	videoPlayer.stopVideo()
	playing = false
	setTimeout(playNextVideo, 100)
}

function clickPlayPause() {
	if(cued) {
		if(playing) {
			videoPlayer.pauseVideo()
			playing = false
		} else {
			playVideo()
		}
	}
}

function playVideo() {
	videoPlayer.playVideo()
	playing = true
}
