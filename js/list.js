

// Prepare playlist
function saveToFile(saveOnlyUnplayed=false) {
	// Ask to save text file .tsv
	const list = []
	for(const i = (saveOnlyUnplayed ? ivideo+1 : 0); i<videoList.length; i++) {
		list.push(videoList[i].id)
	}

	const blob = new Blob([list.join(' ')], {type: "text/plain;charset=utf-8"})
	const url = URL.createObjectURL(blob)
	const a = document.createElement("a")
	a.href = url
	a.download = "Nindtest list.txt"
	a.click()
	URL.revokeObjectURL(url)
}
function parse_vid(p) {
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
function loadFromList() {
	// Load from TSV file
	const input = document.createElement('input')
	input.type = 'file'
	input.accept = '.txt'
	input.onchange = () => {
		const file = input.files[0]
		const reader = new FileReader()
		reader.onload = () => {
			const newVideoList = []
			const parts = reader.result.replace(/[ \t\r\n]+/g, ' ').split(' ')
			for(const p of parts) {
				const ldd = parse_vid(p)
				if(ldd) newVideoList.push(ldd)
			}
			addVideos(newVideoList)
		}
		reader.readAsText(file)
	}
	input.click()
}
function loadFromPopup() {
	// Promp user for a string
	const str = prompt('Enter a list of video ids separated by spaces')
	if(str) {
		const newVideoList = []
		const parts = str.replace(/[ \t\r\n]+/g, ' ').split(' ')
		for(const p of parts) {
			const ldd = parse_vid(p)
			if(ldd) newVideoList.push(ldd)
		}
		addVideos(newVideoList)
	}
}
