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
const GUESSING_TIME = 30 // seconds
const AFTER_GUESSING_TIME = 10 // seconds

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
let videoPlayer;

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
    // Signal any running async operation to stop immediately
    resetRequested = true;
    isTransitioning = false;

    if(playing && videoPlayer) {
        videoPlayer.stopVideo()
        playing = false
    }
    if(countInter) clearInterval(countInter)
    if(cuingTimeout) clearTimeout(cuingTimeout)
    if(fallbackTimeout) clearTimeout(fallbackTimeout) // Clear fallback too

    counterElement.innerHTML = '<div>Reseting...</div>'

    ivideo = -1
    loadingVideos.length = 0
    videoList.length = 0
    isLoadingVideos = false

    await sleep(1000)

    // Double check reset wasn't called again or state changed unexpectedly
    if(!resetRequested) {
        document.getElementById('vid_count').innerText = 0
        counterElement.innerHTML = '<div>Cleared</div>'
    }

    resetRequested = false; // Reset flag for next use
}

function addVideos(vidsToAdd) {
	if(vidsToAdd && vidsToAdd.length) {
		console.log(vidsToAdd)
		videoList.push(... vidsToAdd)

		document.getElementById('vid_count').innerText = videoList.length - (ivideo+1)
	}
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
let timerStarted = false
let onVideoCued = null
function onYouTubeEventStateChange(evt) {
    evt.target.errMessage = undefined
    evt.target.errCode = undefined

    if (onVideoCued && evt.data == YT.PlayerState.CUED) {
        onVideoCued(evt)
        onVideoCued = null
        return
    } else if (evt.data == YT.PlayerState.PLAYING && !timerStarted) {
        if(countInter) clearInterval(countInter)
        countInter = setInterval(_updateCounter, 125)
    } else if (evt.data == YT.PlayerState.ENDED) {
        if (!isTransitioning && !resetRequested) {
            playing = false
            clickNext()
        }
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
function _updateCounter() {
    // Safety check for valid state
    if(ivideo < 0 || ivideo >= videoList.length || !videoList[ivideo]) {
        clearInterval(countInter);
        return;
    }

    revealTime = videoList[ivideo]['_start'] + GUESSING_TIME
    currentTime = videoPlayer.getCurrentTime()

    if(revealTime <= currentTime) {
        let vdata = videoPlayer.getVideoData()
        let soluce = vdata['title']
        curtain.style.display = 'none'
        banner.innerHTML = soluce
        curtain.style['backdrop-filter'] = ''
        return
    }

    skipTime = revealTime + AFTER_GUESSING_TIME
    if(currentTime >= skipTime) {
        // Prevent double trigger if transition already started
        if(!isTransitioning && !resetRequested) {
            // Clear interval immediately to prevent re-entry
            if(countInter) clearInterval(countInter);
            setTimeout(playNextVideo, 100)
        }
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

async function _pickNextVideo() {
    // increase video index
    if(ivideo < 0) {
        ivideo = 0
    } else {
        ivideo ++
    }

    document.getElementById('played_count').innerText = ivideo
    document.getElementById('vid_count').innerText = videoList.length - (ivideo+1)

    // if no more video, stop player and return
    if (ivideo >= videoList.length) {
        curtain.style.display = 'block'
        if(videoList.length > 0) counterElement.innerHTML = '<div>End of the blind test !</div>'
        else counterElement.innerHTML = '<div>No video are loaded yet</div>'
        clearInterval(countInter)
        ivideo = -1
        isTransitioning = false;
        return null
    }

    // Pick a random video
    const rnd = ((Math.random() * (videoList.length - ivideo))|0) + ivideo
    const picked = videoList[rnd]
    videoList[rnd] = videoList[ivideo]
    videoList[ivideo] = picked

    // cue a new video
    cued = false
    onVideoCued = ()=>{cued = true}
	videoPlayer.errorCode = 0
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
			)), 5000)

    // Abort if reset was triggered during wait
    if (resetRequested) {
        isTransitioning = false;
        return null;
    }

    if(!hasBeenLoaded || videoPlayer.errCode) {
        if(!videoPlayer.errCode) videoPlayer.errCode = -1, videoPlayer.errMessage = 'Loading timeout'
        toast('Youtube sent an error while loading video ' + picked['id'] + ': ' + videoPlayer.errMessage, 'toast-err')
        isTransitioning = false;
        // Retry logic: wait then call self (which will re-check locks)
		await sleep(1000)
        return _pickNextVideo()
    }

    const vdata = videoPlayer.getVideoData()
    if(!vdata || !vdata.isPlayable || vdata.errorCode) {
        toast('Video ' + picked['id'] + ' failed to be played ' + (vdata.errCode || ''), 'toast-err')
        isTransitioning = false;
		await sleep(1000)
        return _pickNextVideo()
    }

	// Gather video timing information
    let _start = videoPlayer.getCurrentTime() || 0
    let _end = videoPlayer.getDuration()

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
        isTransitioning = false;
        return;
    }
    isTransitioning = true;

    // reset flags
    clearInterval(countInter)
    if(cuingTimeout) clearTimeout(cuingTimeout)
    if(fallbackTimeout) clearTimeout(fallbackTimeout) // Clear previous fallback
    fallbackTimeout = null;

    onVideoCued = null
    timerStarted = false

	const picked = await _pickNextVideo()
	if(!picked) return

    console.log('Playing video', ivideo, picked)
    if(videoList[ivideo]['name']) banner.innerHTML = '(' + videoList[ivideo]['name'] + ')'
    else banner.innerHTML = (ivideo+1)
    counterElement.innerHTML = '<br>' + GUESSING_TIME

    // Clear any existing timeout first
    if(cuingTimeout) clearTimeout(cuingTimeout);

    cuingTimeout = setTimeout(()=>{
        // Only trigger if we haven't successfully moved on
        if(!resetRequested && isTransitioning) {
            toast('Video ' + picked['id'] + " hasn't started after 5s, autoskip")
            // Call self directly, but ensure we don't double lock if playNextVideo is already running
            // However, since this is a timeout callback, the main flow might have finished.
            // We set isTransitioning = false inside the recursive call naturally.
            playNextVideo();
        }
    }, 5000)

    // Clear fallback immediately on success cue
    onVideoCued = ()=> {
        clearTimeout(cuingTimeout);
        cuingTimeout = null;
    };

    videoPlayer.loadVideoById({'videoId': picked['id'],
        'startSeconds': picked['_start'],
        'endSeconds': picked['_end'],
    })

    curtain.style.display = 'block'
    banner.innerText = '(loading song '+ (ivideo+1) + '/' + videoList.length +'...)'
    counterElement.innerText = ''

    isTransitioning = false;
}
function clickNext() {
    // If already transitioning, ignore click
	if(isTransitioning) return

    if(videoPlayer) {
        videoPlayer.stopVideo()
    }
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
