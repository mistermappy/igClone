var nextUserImageId = 0;

function Photos() {
	this.photoList = [];
}

Photos.prototype.addPhoto = function(params, filename) {
	this.photoList.push({
		caption: params.caption,
		fileName: '/images/' + filename,
		thumbnail: '/thumbnails/' + filename,
		id: nextUserImageId++
	});

	//console.log(JSON.stringify(this.photoList))
};

Photos.prototype.findById = function(id) {
	for (var i = 0; i < this.photoList.length; i++) {
		if (parseInt(id) === this.photoList[i].id) {
			return this.photoList[i];
		}
	}
};

Photos.prototype.list = function() {
	return this.photoList;
}

module.exports = new Photos(); 
