

// Prepare playlist
function saveToFile() {
	// Ask to save text file .tsv
	const tsv = []
	for(const v of videoList) {
		tsv.push(v.id)
	}

	const blob = new Blob([tsv.join(' ')], {type: "text/plain;charset=utf-8"})
	const url = URL.createObjectURL(blob)
	const a = document.createElement("a")
	a.href = url
	a.download = "Nindtest list.txt"
	a.click()
	URL.revokeObjectURL(url)
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
				if(p.length === 11) {
					newVideoList.push({id: p})
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
					if(id != null) newVideoList.push({id: id})
				}
			}
			loadVideos(newVideoList)
		}
		reader.readAsText(file)
	}
	input.click()
}
