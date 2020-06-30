const sqlite = require('sqlite3');
const logger = require('./logger');

const DAY = 24*60*60*1000;

class Database {
    constructor() {
        this._db = new sqlite.Database('database.sql');

        this._db.serialize(() => {
            this._db.run('CREATE TABLE IF NOT EXISTS videos(id TINYTEXT PRIMARY KEY, initialCommentCount INT, '
            + 'commentCount INT, retrievedAt BIGINT, lastUpdated BIGINT, inProgress BOOL)');
            this._db.run('CREATE TABLE IF NOT EXISTS comments(id TINYTEXT PRIMARY KEY, textDisplay TEXT, authorDisplayName TEXT, '
                + 'authorProfileImageUrl TINYTEXT, authorChannelId TINYTEXT, likeCount INT, publishedAt BIGINT, updatedAt BIGINT, '
                + 'totalReplyCount SMALLINT, videoId TINYTEXT, FOREIGN KEY(videoId) REFERENCES videos(id) ON DELETE CASCADE)');

            this._db.run('CREATE INDEX IF NOT EXISTS comment_index ON comments(videoId, publishedAt, likeCount)');
        });

        setInterval(() => this.cleanup(), 1 * DAY);
    }

    checkVideo(videoId, callback) {
        this._db.get('SELECT * FROM videos WHERE id = ?', [videoId], (_err, row) => callback(row));
    }

    addVideo(video, callback) {
        let now = new Date().getTime();
        this._db.run('INSERT OR REPLACE INTO videos(id, initialCommentCount, commentCount, '
            + 'retrievedAt, lastUpdated, inProgress) VALUES(?, ?, ?, ?, ?, true)',
            [video.id, video.statistics.commentCount, video.statistics.commentCount, now, now], () => callback());
    }

    reAddVideo(video, callback) {
        this._db.run('UPDATE videos SET commentCount = ?, lastUpdated = ?, inProgress = true WHERE id = ?',
            [video.statistics.commentCount, new Date().getTime(), video.id], () => callback());
    }

    resetVideo(video, callback) {
        this._db.run('DELETE FROM videos WHERE id = ?', [video.id], (_result, _err) => this.addVideo(video, callback));
    }

    getComments(videoId, limit, offset, sortBy, callback) {
        this._db.all(`SELECT * FROM comments WHERE videoId = ? ORDER BY ${sortBy} LIMIT ${limit} OFFSET ${offset}`,
            [videoId], (err, rows) => callback(err, rows));
    }

    getLastDate(videoId, callback) {
        this._db.get('SELECT MAX(publishedAt) FROM comments WHERE videoId = ?', [videoId], (_err, row) => callback(row));
    }

    getAllDates(videoId, callback) {
        this._db.all('SELECT publishedAt FROM comments WHERE videoId = ? ORDER BY publishedAt DESC',
            [videoId], (_err, rows) => callback(rows));
    }

    writeNewComments(videoId, comments) {
        let insert = [];
        for (let i = 0; i < comments.length; i++) { 
            insert.push(comments[i].id, comments[i].textDisplay, comments[i].authorDisplayName, comments[i].authorProfileImageUrl,
                comments[i].authorChannelId, comments[i].likeCount, comments[i].publishedAt, comments[i].updatedAt, comments[i].totalReplyCount);
        }
        // Using video ID as constant to prevent exceeding 999-parameter limit
        // (10 parameters * 100 comments = 1000)
        let placeholders = comments.map((_elem) => `(?,?,?,?,?,?,?,?,?,'${videoId}')`).join(',');

        let statement = this._db.prepare(`INSERT OR REPLACE INTO comments(id, textDisplay, authorDisplayName, authorProfileImageUrl, `
            + `authorChannelId, likeCount, publishedAt, updatedAt, totalReplyCount, videoId) VALUES ${placeholders}`);
        statement.run(insert);
        statement.finalize();

        this._db.run('UPDATE videos SET lastUpdated = ? WHERE id = ?', [new Date().getTime(), videoId]);
    }

    markVideoComplete(videoId) {
        this._db.run('UPDATE videos SET inProgress = false WHERE id = ?', [videoId]);
    }

    cleanup() {
        // Remove any videos with:
        // - under 1,000 comments   & > 1 day untouched
        // - under 10,000 comments  & > 7 days untouched
        // - under 100,000 comments & > 60 days untouched

        let now = new Date();
        logger.log('info', "Starting database cleanup");
        this._db.serialize(() => {
            this._db.run('DELETE FROM videos WHERE (lastUpdated < ?) AND (commentCount < 1000 OR inProgress = true)', [now.getTime() - 1*DAY], deleteCallback);
            this._db.run('DELETE FROM videos WHERE (lastUpdated < ?) AND (commentCount < 10000)', [now.getTime() - 7*DAY], deleteCallback);
            this._db.run('DELETE FROM videos WHERE (lastUpdated < ?) AND (commentCount < 100000)', [now.getTime() - 60*DAY], deleteCallback);

            this._db.run('VACUUM');
        });

        function deleteCallback(err) {
            if (err)
                logger.log('error', "Database delete error: %o", err);
            else
                logger.log('info', "Deleted rows: %d", this.changes);
        }
    }
}

module.exports = Database;