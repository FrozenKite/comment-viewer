const {google} = require('googleapis');
const config = require('../config.json');

class YouTubeAPI {
    constructor() {
        this._youtube = google.youtube({
            version: "v3",
            auth: config.gapiKey
        });
    }
    
    executeVideo(videoId) {
        return this._youtube.videos.list({
            "part": "snippet, statistics, liveStreamingDetails",
            "id": videoId
        });
    }

    executeTestComment(videoId) {
        return this._youtube.commentThreads.list({
            "part": "id",
            "videoId": videoId,
            "maxResults": 1
        });
    }

    executeCommentChunk(videoId, nextPageToken) {
        return this._youtube.commentThreads.list({
            "part": "snippet",
            "videoId": videoId,
            "order": "time",
            "maxResults": 100,
            "pageToken": nextPageToken
        });
    }

    executeReplies(parentId, nextPageToken) {
        return this._youtube.comments.list({
            "part": "snippet",
            "maxResults": 100,
            "parentId": parentId,
            "pageToken": nextPageToken
        });
    }

    executeSingleComment(commentId) {
        return this._youtube.commentThreads.list({
            "part": "snippet",
            "id": commentId
        });
    }
    executeSingleReply(commentId) {
        return this._youtube.comments.list({
            "part": "snippet",
            "id": commentId,
        });
    }

    quotaExceeded() {
        // nothing for now
    }

}

module.exports = YouTubeAPI;