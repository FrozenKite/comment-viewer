function displayTitle(video, useCount) {
    let liveState = video.snippet.liveBroadcastContent;

    // casting in order to use toLocaleString()
	let viewCount = Number(video.statistics.viewCount);
    let likeCount = Number(video.statistics.likeCount);
    let dislikeCount = Number(video.statistics.dislikeCount);
    let commentCount = Number(video.statistics.commentCount);

    let ratingsSec = `<div class="ratings">`;
    if (typeof video.statistics.likeCount === "undefined") {
        ratingsSec += `<i class="fas fa-thumbs-up"></i> <span class="it">Ratings have been hidden.</span>`;
    }
    else {
        ratingsSec += `<i class="fas fa-thumbs-up"></i> ` + likeCount.toLocaleString() + 
            `&nbsp;&nbsp;&nbsp;&nbsp;<i class="fas fa-thumbs-down"></i> ` + dislikeCount.toLocaleString();
    }
    ratingsSec += `</div>`;

    let viewcountSec = `<div class="viewcount"><i class="fas fa-eye"></i> `;
    let timestampSec = `<div class="vidTimestamp">`;
	let commentCountSec = `<div id="commentInfo" class="commentCount">`;
	let streamTimesSec = ``;
    if (liveState == "live") {
        let concurrentViewers = Number(video.liveStreamingDetails.concurrentViewers);
        viewcountSec += `<span class="concurrent">` + concurrentViewers.toLocaleString() + ` watching now</span> / `
            + viewCount.toLocaleString() + ` total views`;
        let startTime = new Date(video.liveStreamingDetails.actualStartTime);                    
        let diffMs = (new Date() - startTime); // milliseconds
        let diffHrs = Math.floor(diffMs / 3600000); // hours
        let diffMins = Math.floor(((diffMs % 86400000) % 3600000) / 60000); // minutes
        let diffSecs = Math.round((((diffMs % 86400000) % 3600000) % 60000) / 1000);
        timestampSec += `<strong>Stream start time:</strong> ` + parseDate(startTime.toISOString())
            + ` (Elapsed: ` + diffHrs + `h ` + diffMins + `m ` + diffSecs + `s)`;
    }
    else if (liveState == "upcoming") {
        viewcountSec += `<span class="concurrent">Upcoming live stream</span>`;
        timestampSec += `<strong><i class="fas fa-calendar"></i> Published:</strong> `
            + parseDate(video.snippet.publishedAt) + `<br><i class="fas fa-clock"></i> <strong>Scheduled start time:</strong> `
            + parseDate(video.liveStreamingDetails.scheduledStartTime);
    }
    else {
		// YT premium shows don't return viewcount
		if (typeof video.statistics.viewCount === "undefined") {
			viewcountSec += ` <span class="it">View count unavailable</span>`;
		}
		else {
			viewcountSec += viewCount.toLocaleString() + ` views`;
		}
        
        timestampSec += `<strong><i class="fas fa-calendar"></i> Published:</strong> ` + parseDate(video.snippet.publishedAt);

        if (typeof video.liveStreamingDetails !== "undefined") {
            streamTimesSec += `<div class="streamTimes"><strong>Stream start time:</strong> `
                + parseDate(video.liveStreamingDetails.actualStartTime)
                + `<br><strong>Stream end time:</strong> ` + parseDate(video.liveStreamingDetails.actualEndTime) + `</div>`;
        }

        commentCountSec += `<i class="fas fa-comment"></i> `;
        commentCountSec += useCount ? Number(commentCount).toLocaleString() + ` comments` : ` Loading comment information...`;
	}
    viewcountSec += `</div>`;
    timestampSec += `</div>`;
	commentCountSec += `</div>`;

    let newContent = `
        <img class="thumbnail" src="` + video.snippet.thumbnails.medium.url + `">
        <div class="metadata">
            <div class="vidTitle">
                <a class="authorName" href="https://www.youtube.com/watch?v=` + video.id + `" target="_blank">
                    ` + video.snippet.title + `
                </a>
            </div>
            <div class="author">
				<a class="authorLink" href="https://www.youtube.com/channel/` + video.snippet.channelId
					+ `" target="_blank">` + video.snippet.channelTitle + `</a>
            </div>
            <div class="moreMeta">
                ` + viewcountSec + `
                ` + ratingsSec + `
                ` + timestampSec + `
            </div>
		</div>
		` + streamTimesSec + `
        ` + commentCountSec + `
    `;
	//vidInfo.innerHTML = newContent;
	//socket.emit("videoInfo", newContent);
	return newContent;
}

function formatCommentThread(item, number, uploaderId, videoId, linked = false, reply = false) {
	let content = "";
	let mainComment;
    let replyCount = -1;
	let contentClass;
	if (reply) {
		mainComment = item;
		contentClass = "replyContent";
	}
	else {
		mainComment = item.snippet.topLevelComment;
		contentClass = "commentContent";
        replyCount = item.snippet.totalReplyCount;
	}

	let publishedAt = mainComment.snippet.publishedAt;
	let updatedAt = mainComment.snippet.updatedAt;
	let channelUrl = mainComment.snippet.authorChannelUrl;
	let commentId = mainComment.id;
	let likeCount = mainComment.snippet.likeCount;
	let pfpUrl = mainComment.snippet.authorProfileImageUrl;
	let displayName = mainComment.snippet.authorDisplayName;
	let textDisplay = mainComment.snippet.textDisplay;
	// Checking existence for this because one time it was left out for some reason
	let channelId = mainComment.snippet.authorChannelId ? mainComment.snippet.authorChannelId.value : "";
	    
    let linkedSegment = "";
    let replySegment = "";
	let likeSegment = "";
	let numSegment = "";
	let opSegment = "";

    let timeString = parseDate(publishedAt);
    if (publishedAt != updatedAt) {
        timeString += ` ( <i class="fas fa-pencil-alt"></i> edited ` + parseDate(updatedAt) + `)`;
	}
	
    if (linked) {
        linkedSegment = `<span class="linkedComment">• LINKED COMMENT</span>`;
        //className = "linked";
        //if (reply) className = "linked";
    }
    
    // second condition included for safety
    if (replyCount > 0 && !reply) {
        replySegment = `
            <div id="replies-` + commentId + `" class="commentRepliesDiv">
                <div class="repliesExpanderCollapsed">
                    <button id="getReplies-` + commentId + `" class="showHideButton" type="button">
                        Load ` + replyCount + ` replies
                    </button>
                </div>
                <div id="repliesEE-` + commentId + `" class="repliesExpanderExpanded">
                    
                </div>
            </div>
        `;
    }
    
    if (likeCount) {
        likeSegment += `<div class="commentFooter"><i class="fas fa-thumbs-up"></i> ` + likeCount.toLocaleString() + `</div>`;
    }
    else {
        likeSegment += `<div class="commentFooter"></div>`;
	}

	if (number > 0) numSegment += `<span class="num">#` + number + `</span>`;

	if (channelId == uploaderId) opSegment += `class="authorNameCreator"`;

    content += `
		<a class="channelPfpLink" href="` + channelUrl + `" target="_blank">
			<img class="pfp" src="` + pfpUrl + `">
		</a>

		<div class="` + contentClass +`">
			<div class="commentHeader">
				<span ` + opSegment + `><a href="` + channelUrl + `" class="authorName" target="_blank">` + displayName + `</a></span>
				<span>|</span>
				<span class="timeStamp">
					<a href="https://www.youtube.com/watch?v=` + videoId + `&lc=` + commentId + `" class="timeStampLink" target="_blank">
						` + timeString + `
					</a>
				</span>
				` + linkedSegment + numSegment + `
			</div>
			<div class="commentText">` + textDisplay + `</div>
			` + likeSegment + replySegment + `
		</div>
    `;

    return content;
}

function parseDate(iso) {
    let date = new Date(iso);
    
    // Uses client's locale

    /* return DAYS[date.getDay()] + " " + MONTHS[date.getMonth()] + " " + date.getDate() + " " + iso.substring(0, 4)
        + " - " + date.toLocaleTimeString(); */
    return date.toLocaleString();
}