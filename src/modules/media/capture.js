// src/modules/media/capture.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.media.capture', [
    'adapters.player',
    'ui.miuix'
  ], function (playerAdapter, miuix) {

    var mediaRecorder = null;
    var recordedChunks = [];
    var isRecording = false;

    function takeScreenshot() {
      var video = playerAdapter.getVideoElement();
      if (!video) {
        miuix.Toast('未找到视频画面', 'error');
        return null;
      }

      var width = video.videoWidth || video.clientWidth || 1920;
      var height = video.videoHeight || video.clientHeight || 1080;

      var canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      var ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, width, height);

      try {
        var dataUrl = canvas.toDataURL('image/png');
        var a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'Douyu_Snapshot_' + Date.now() + '.png';
        a.click();
        miuix.Toast('高清截图已保存', 'success');
        return dataUrl;
      } catch (err) {
        miuix.Toast('截图失败 (跨域保护或无画面)', 'error');
        return null;
      }
    }

    function toggleRecording() {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }

    function startRecording() {
      var video = playerAdapter.getVideoElement();
      if (!video) {
        miuix.Toast('未找到视频画面，无法录制', 'error');
        return false;
      }

      if (typeof video.captureStream !== 'function') {
        miuix.Toast('当前浏览器不支持画面录制', 'error');
        return false;
      }

      try {
        var stream = video.captureStream();
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });

        mediaRecorder.ondataavailable = function (e) {
          if (e.data && e.data.size > 0) {
            recordedChunks.push(e.data);
          }
        };

        mediaRecorder.onstop = function () {
          var blob = new Blob(recordedChunks, { type: 'video/webm' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'Douyu_Record_' + Date.now() + '.webm';
          a.click();
          miuix.Toast('录制完成，已触发下载', 'success');
          recordedChunks = [];
        };

        mediaRecorder.start();
        isRecording = true;
        miuix.Toast('【视频录制】已开始录屏...', 'info');
        return true;
      } catch (e) {
        miuix.Toast('启动录制失败: ' + e.message, 'error');
        return false;
      }
    }

    function stopRecording() {
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        mediaRecorder = null;
      }
    }

    return {
      takeScreenshot: takeScreenshot,
      toggleRecording: toggleRecording,
      startRecording: startRecording,
      stopRecording: stopRecording,
      get isRecording() { return isRecording; }
    };
  });
})();
