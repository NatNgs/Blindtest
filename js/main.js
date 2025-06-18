Array.prototype.shuffle = function() {
	for(let i = this.length-1; i > 0; i--) {
		let rnd = (Math.random() * this.length)|0
		if(rnd == i) continue
		let tmp = this[rnd]
		this[rnd] = this[i]
		this[i] = tmp
	}
}
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
	});

	curtain = document.getElementById('curtain')
	counterElement = document.getElementById('counter')
	banner = document.getElementById('banner')
}

// Prepare playlist
function loadFromFile() {
	// Load from TSV file
	const input = document.createElement('input')
	input.type = 'file'
	input.accept = '.tsv'
	input.onchange = () => {
		const file = input.files[0]
		const reader = new FileReader()
		reader.onload = () => {
			const rows = reader.result.split('\n')
			const newVideoList = []
			for(const r of rows) {
				const cols = r.split('\t')
				if(cols.length < 4) continue
				if(!Number.isSafeInteger(cols[1]) || !Number.isSafeInteger(cols[2])) continue
				newVideoList.push({id: cols[0], start: cols[1], end: cols[2], name: cols[3]})
			}
			loadVideos(newVideoList)
		}
		reader.readAsText(file)
	}
	input.click()
}
function loadFromInput() {
	// Load from JSON text
	let txt_video_list = prompt("Paste the JSON video list below");
	try {
		const newVideoList = JSON.parse(txt_video_list)
		loadVideos(newVideoList)
	} catch(e) {
		alert('Failed to load. Format may be incorrect.')
		console.log(e, txt_video_list)
	}
}
function resetList() {
	loadingVideos.length = 0
	videoList.length = 0
	isLoadingVideos = false
}

async function loadVideos(vidsToAdd) {
	if(vidsToAdd && vidsToAdd.length) {
		console.log(vidsToAdd)
		loadingVideos.push(... vidsToAdd)
	}
	if(isLoadingVideos) return

	isLoadingVideos = true

	await waitUntilTrue(()=>videoPlayer.mute)

	let successCount = 0
	const errorsMap = {}
	while(loadingVideos.length) {
		document.getElementById('load_count').innerHTML = loadingVideos.length

		// Pick first video from loadingVideo
		const currentlyLoading = loadingVideos.shift()

		// if video is already loaded: skip
		const vid_id = currentlyLoading['id']
		if(videoList.find(v => v.id == vid_id)) continue


		// Open-it in the youtube player
		videoPlayer.errCode = null
		videoPlayer.errMessage = null
		videoPlayer.cueVideoById(vid_id)

		// Wait until video has been loaded
		const hasBeenLoaded = await waitUntilTrue(() => videoPlayer.errCode || videoPlayer?.playerInfo?.videoData?.video_id === vid_id, 2000)
		if(!hasBeenLoaded) {
			videoPlayer.errCode = -1
			videoPlayer.errMessage = 'Loading timeout'
		}
		if(videoPlayer.errCode) {
			errorsMap[videoPlayer.errMessage] = (errorsMap[videoPlayer.errMessage] || 0) +1
			continue
		}
		videoPlayer.loadVideoById({videoId:vid_id, startSeconds:0, endSeconds:1})
		await sleep(200)

		// Process has been stopped while waiting
		if(!isLoadingVideos) break

		// Extract video data, and if isPlayable is true, add its info to videoList (and increment loaded video counter)
		const vdata = videoPlayer.getVideoData()
		if(vdata && vdata.isPlayable && !vdata.errorCode) {
			const duration = videoPlayer.getDuration()

			// Fill missing data
			if(!currentlyLoading.author) currentlyLoading.author = vdata.author
			if(!currentlyLoading.title) currentlyLoading.title = vdata.title

			if(!currentlyLoading.end || currentlyLoading.end > duration) currentlyLoading.end = duration
			if(!currentlyLoading.start) currentlyLoading.start = 0

			videoList.push(currentlyLoading)
			document.getElementById('vid_count').innerHTML = `${videoList.length}`
		}
		successCount ++
	}

	document.getElementById('load_count').innerHTML = loadingVideos.length
	isLoadingVideos = false
	videoPlayer.stopVideo()
	videoPlayer.unMute()

	for(const errMessage in errorsMap) {
		toast(`${errorsMap[errMessage]} videos excluded: ${errMessage}`, '', 5000)
		await sleep(1000)
	}
	toast(`${successCount} videos loaded with success`, 'toast-ok', 5000)
}
function onStart() {
	if(isLoadingVideos) {
		console.warn('Cannot start: some videos remain to be loaded')
		// TODO: notify user without alert (that blocks the loading)
		return
	}
	if(videoList.length < 3) {
		alert(videoList.length + ' videos are ready. Minimum 3 are required to start')
	}

	videoList.shuffle()
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
		banner.innerHTML = '(' + videoList[ivideo]['name'] + ')'
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
	revealTime = videoList[ivideo]['start'] + guessingTime
	currentTime = videoPlayer.getCurrentTime()
	if(revealTime <= currentTime) {
		let vdata = videoPlayer.getVideoData()
		let soluce = vdata['title']
		curtain.style.display = 'none'
		banner.innerHTML = soluce
		curtain.style['backdrop-filter'] = ''
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
		videoList.shuffle()
		ivideo = 0
	} else {
		ivideo ++
	}

	// if no more video, stop player and return
	if (ivideo >= videoList.length) {
		curtain.style.display = 'block'
		counterElement.innerHTML = '<div>End of the blind test !</div>'
		clearInterval(countInter)
		ivideo = -1
		document.getElementById('menu').removeAttribute('hidden')
		return
	}

	// cue a new video (it will be played once cued)
	console.log('cued video:', ivideo, videoList[ivideo])
	videoPlayer.cueVideoById({'videoId': videoList[ivideo]['id'],
		'startSeconds': videoList[ivideo]['start'],
		'endSeconds': videoList[ivideo]['end']}
	)

	// reset counter end drop the curtain
	curtain.style.display = 'block'
	banner.innerHTML = '(loading song '+ (ivideo+1) + '/' + videoList.length +'...)'
	counterElement.innerHTML = ''

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
