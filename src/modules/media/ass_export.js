// src/modules/media/ass_export.js
(function () {
  'use strict';
  if (!globalThis.DYEXRL_NEXT) return;

  globalThis.DYEXRL_NEXT.registry.register('modules.media.assExport', ['ui.miuix'], function (miuix) {

    var danmakuTrack = [];
    var startTime = 0;
    var isTracking = false;

    function startTracking() {
      danmakuTrack = [];
      startTime = Date.now();
      isTracking = true;
      miuix.Toast('【字幕录制】已开始记录弹幕轨...', 'info');
    }

    function recordDanmaku(text, color, sender) {
      if (!isTracking) return;
      var offsetSec = Math.max(0, (Date.now() - startTime) / 1000);
      danmakuTrack.push({
        start: offsetSec,
        end: offsetSec + 8, // 8 seconds display window
        text: text,
        color: color || 'FFFFFF',
        sender: sender || ''
      });
    }

    function formatTime(sec) {
      var h = Math.floor(sec / 3600);
      var m = Math.floor((sec % 3600) / 60);
      var s = (sec % 60).toFixed(2);
      return (
        String(h).padStart(1, '0') + ':' +
        String(m).padStart(2, '0') + ':' +
        (s < 10 ? '0' : '') + s
      );
    }

    function generateAssContent() {
      var header = [
        '[Script Info]',
        'Title: DouyuEx-RL NEXT Danmaku Export',
        'ScriptType: v4.00+',
        'PlayResX: 1920',
        'PlayResY: 1080',
        'ScaledBorderAndShadow: yes',
        '',
        '[V4+ Styles]',
        'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
        'Style: R2L,Microsoft YaHei,38,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,2,0,2,20,20,20,1',
        '',
        '[Events]',
        'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
      ].join('\r\n');

      var events = danmakuTrack.map(function (d) {
        var startStr = formatTime(d.start);
        var endStr = formatTime(d.end);
        var safeText = String(d.text || '').replace(/[\r\n]/g, ' ');
        return 'Dialogue: 0,' + startStr + ',' + endStr + ',R2L,,0,0,0,,' + safeText;
      }).join('\r\n');

      return header + '\r\n' + events;
    }

    function exportAssFile() {
      if (danmakuTrack.length === 0) {
        miuix.Toast('暂无记录的弹幕轨迹', 'info');
        return null;
      }

      var assText = generateAssContent();
      var blob = new Blob([assText], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'Douyu_Danmaku_' + Date.now() + '.ass';
      a.click();

      miuix.Toast('ASS 弹幕字幕已导出 (' + danmakuTrack.length + ' 条)', 'success');
      return assText;
    }

    function stopTrackingAndExport() {
      isTracking = false;
      return exportAssFile();
    }

    return {
      startTracking: startTracking,
      recordDanmaku: recordDanmaku,
      generateAssContent: generateAssContent,
      exportAssFile: exportAssFile,
      stopTrackingAndExport: stopTrackingAndExport,
      get isTracking() { return isTracking; },
      get count() { return danmakuTrack.length; }
    };
  });
})();
