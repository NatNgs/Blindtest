Array.prototype.shuffle = function() {
	for(let i = this.length-1; i > 0; i--) {
		let rnd = (Math.random() * this.length)|0
		if(rnd == i) continue
		let tmp = this[rnd]
		this[rnd] = this[i]
		this[i] = tmp
	}
}


// Constants
const guessingTime = 30 // seconds


// Prepare Youtube Player
let player;
function onYouTubeIframeAPIReady() {
	player = new YT.Player('player', {
		height: '95%',
		width: '95%',
		videoId: '',
		events: {
			'onStateChange': onPlayerStateChange
		},
		disablekb: 1,
		controls: 0,
		iv_load_policy: 3,
	});

	curtain = document.getElementById('curtain')
	counterElement = document.getElementById('counter')
	banner = document.getElementById('banner')

	onLoad()
}

// Prepare playlist
function onLoad() {
	try {
		let txt_video_list = prompt("Paste the JSON video list below");
		console.log(txt_video_list)
		videoList = JSON.parse(txt_video_list)
		videoList.shuffle()
		console.log(videoList)

		banner.innerHTML = 'Click on "Next" to start !'
		counterElement.innerHTML = '⇊'
	} catch(e) {
		banner.innerHTML = 'Load Failed. [F5] to retry.'
		counterElement.innerHTML = e
		console.log(e)
	}
}

// When video player sends an event (video started, stopped, loaded, ...)
let gameStarted = false
let timerStarted = false
let cued = false
function onPlayerStateChange(event) {
	// console.log('Event received:', Object.keys(YT.PlayerState).find(key => YT.PlayerState[key] === event.data) || event.data)
	if (!gameStarted) {
		return
	}
	if (event.data == YT.PlayerState.CUED && !cued) {
		cued = true
		banner.innerHTML = '(' + videoList[ivideo]['name'] + ')'
		counterElement.innerHTML = '<br>' + guessingTime
		setTimeout(playVideo, 100)
	} else if (event.data == YT.PlayerState.PLAYING && !timerStarted) {
		countInter = setInterval(updateCounter, 250)
	} else if (event.data == YT.PlayerState.ENDED) {
		playing = false
		clickNext()
	}
}

// Local variables
let videoList = []
let ivideo = -1
let curtain = null
let counterElement = null
let countInter = null
let cuingTimeout = null
let banner = null
let playing = false

// Display the counter to 0
function updateCounter() {
	revealTime = videoList[ivideo]['start'] + guessingTime
	currentTime = player.getCurrentTime()
	if(revealTime <= currentTime) {
		let vdata = player.getVideoData()
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
		counterElement.innerHTML = 'End of the list !'
		clearInterval(countInter)
		ivideo = -1
		return
	}

	// cue a new video (it will be played once cued)
	console.log('cued video:', ivideo, videoList[ivideo])
	player.cueVideoById({'videoId': videoList[ivideo]['id'],
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
	player.stopVideo()
	playing = false
	setTimeout(playNextVideo, 100)
}

function clickPlayPause() {
	if(cued) {
		if(playing) {
			player.pauseVideo()
			playing = false
		} else {
			playVideo()
		}
	}
}

function playVideo() {
	player.playVideo()
	playing = true
}
