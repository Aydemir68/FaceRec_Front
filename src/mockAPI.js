const mockDatabase = {
    videos: {}, // { id: { id, title, description, status, created_at } }
    reports: {}   // { reportId: { status, video_ids, download_url } }
};
let nextVideoId = 1;
let nextReportId = 1;

function formatTimestamp(seconds) {
    const s = Math.floor(seconds % 60);
    const m = Math.floor(seconds / 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Генерация UUID для тестирования
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// GET /health
export async function getHealth() {
    console.log('[mockApi] GET /health');
    return {
        status: "ok",
        version: "1.0.0"
    };
}

// POST /api/v1/video/upload
export async function uploadVideo(file, title, description = null) {
    console.log('[mockApi] POST /api/v1/video/upload', { title, description, filename: file.name });
    
    if (!title || !file) {
        throw { error: 'Missing title or file' };
    }

    const allowedTypes = ['video/mp4', 'video/x-matroska', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(file.type)) {
        throw { error: 'Unsupported file type' };
    }

    const videoId = generateUUID();
    const now = new Date().toISOString();

    mockDatabase.videos[videoId] = {
        id: videoId,
        title: title,
        description: description,
        status: "Uploaded",
        created_at: now
    };

    return {
        id: videoId,
        title: title,
        status: "Uploaded"
    };
}

// GET /api/v1/video/{id}
export async function getVideoInfo(videoId) {
    console.log('[mockApi] GET /api/v1/video/{id}', videoId);
    
    const video = mockDatabase.videos[videoId];
    if (!video) {
        throw { error: 'Video not found' };
    }

    return video;
}

// POST /api/v1/video/list
export async function listVideos() {
    console.log('[mockApi] POST /api/v1/video/list');
    
    const videos = Object.values(mockDatabase.videos);
    return {
        total: videos.length,
        videos: videos
    };
}

// POST /api/v1/video/pipeline/publish/{id}
export async function publishVideo(videoId) {
    console.log('[mockApi] POST /api/v1/video/pipeline/publish/{id}', videoId);
    
    const video = mockDatabase.videos[videoId];
    if (!video) {
        throw { error: 'Video not found' };
    }

    if (video.status === "Processing" || video.status === "Waiting") {
        throw { error: 'Video already pending or in progress' };
    }

    video.status = "Processing";
    return { message: 'Video queued successfully' };
}

// POST /api/v1/video/pipeline/cancel/{id}
export async function cancelVideo(videoId) {
    console.log('[mockApi] POST /api/v1/video/pipeline/cancel/{id}', videoId);
    
    const video = mockDatabase.videos[videoId];
    if (!video) {
        throw { error: 'Video not found' };
    }

    if (video.status !== "Processing" && video.status !== "Waiting") {
        throw { error: 'Video not in waiting or processing state' };
    }

    video.status = "Cancelled";
    return { message: 'Cancellation successful' };
}

// DELETE /api/v1/video/delete/{id}
export async function deleteVideo(videoId) {
    console.log('[mockApi] DELETE /api/v1/video/delete/{id}', videoId);
    
    const video = mockDatabase.videos[videoId];
    if (!video) {
        throw { error: 'Video not found' };
    }

    const deletedVideo = { ...video };
    delete mockDatabase.videos[videoId];
    
    return deletedVideo;
}

// Эмуляция POST /report
export async function createReport(video_ids) {
    console.log('[mockApi] POST /report, video_ids:', video_ids);
    return new Promise((resolve) => {
        const reportId = `rep_${nextReportId++}`;
        mockDatabase.reports[reportId] = {
            status: 'completed', // Сразу 'completed'
            video_ids: video_ids,
            download_url: `/reports/${reportId}/download` // Пример URL
        };
        const status_url = `/reports/${reportId}/status`;
        console.log('[mockApi] Report created (simulated instantly):', reportId);
        resolve({ report_id: reportId, message: 'Report generation started', status_url });
    });
}

// Эмуляция GET /reports/{report_id}/status
export async function getReportStatus(reportId) {
    console.log('[mockApi] GET /reports/{report_id}/status, reportId:', reportId);
    return new Promise((resolve, reject) => {
        const report = mockDatabase.reports[reportId];
        if (report) {
            console.log('[mockApi] Report status:', reportId, report);
            resolve({
                status: report.status,
                download_url: report.download_url,
                error_message: null
            });

        } else {
            console.error('[mockApi] Report not found for status:', reportId);
            reject({ error: 'Report not found' });
        }
    });
}
