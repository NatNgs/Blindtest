

// Prepare playlist
function saveToFile(saveOnlyUnplayed=false) {
	// Ask to save text file .tsv
	const list = []

	// Columns: VIDEO_ID, AUTHOR, TITLE
	for(let i = (saveOnlyUnplayed ? ivideo+1 : 0); i<videoList.length; i++) {
		list.push([videoList[i].id, videoList[i].author||'', videoList[i].title])
	}
	// sort list by Author, then Title, then Video id
	list.sort((a,b)=>{
		if(a[1] !== b[1]) return a[1] < b[1] ? -1 : 1 // author
		if(a[2] !== b[2]) return a[2] < b[2] ? -1 : 1 // title
		return a[0] < b[0] ? -1 : 1 // vid
	})

	const blob = new Blob([list.map(l=>l.join('\t')).join('\n')], {type: "text/plain;charset=utf-8"})
	const url = URL.createObjectURL(blob)
	const a = document.createElement("a")
	a.href = url
	a.download = "Nindtest list.tsv"
	a.click()
	URL.revokeObjectURL(url)
}


function _addVideos(vidsToAdd) {
	if(vidsToAdd && vidsToAdd.length) {
		videoList.push(... vidsToAdd)
		document.getElementById('vid_count').innerText = videoList.length
	}
}
function _parseVid(p) {
	if(p.length === 11) {
		return {id: p}
	} else if(p.length > 11) {
		id = null

		// Parse yt video URL to video id
		let match = p.match(/(?:[^/]+\/)*([a-zA-Z0-9_-]{11})/)
		if(match && match.length > 1)
			id = match[1]
		else {
			// Extract url params, and find parameter "v"
			match = p.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
			if(match && match.length > 1) id = match[1]
		}
		if(id != null) return {id: id}
	}
	return null
}
function _loadTxt(contents) {
	const newVideoList = []
	const parts = contents.replace(/[ \t\r\n]+/g, ' ').split(' ')
	for(const p of parts) {
		const ldd = _parseVid(p)
		if(ldd) newVideoList.push(ldd)
	}
	_addVideos(newVideoList)
}
function _loadTsv(contents) {
	// Expected columns : VID, AUTHOR, TITLE
	const newVideoList = []
	const lines = contents.split('\n')
	for(const l of lines) {
		const parts = l.split('\t')
		const ldd = _parseVid(parts[0])
		if(ldd) {
			newVideoList.push(ldd)
			if(parts.length >= 3) {
				if(parts[1].trim().length) ldd['author'] = parts[1].trim()
				if(parts[2].trim().length) ldd['title'] = parts[2].trim()
			}
		}
	}
	_addVideos(newVideoList)
}

function loadFromList() {
	// Load from TSV file
	const input = document.createElement('input')
	input.type = 'file'
	input.accept = '.txt,.tsv'
	input.onchange = () => {
		const file = input.files[0]
		const reader = new FileReader()
		if(file.name.endsWith('.tsv')) {
			reader.onload = ()=>_loadTsv(reader.result)
		} else {
			reader.onload = ()=>_loadTxt(reader.result)
		}
		reader.readAsText(file)
	}
	input.click()
}
function loadFromPopup() {
	// Promp user for a string
	const str = prompt('Enter a list of video ids separated by spaces')
	if(str) {
		_loadTxt(str)
	}
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
