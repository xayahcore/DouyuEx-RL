function* (__imports) {
yield {"jr": { get: () => jr, set: value => { jr = value; } }};
/**
 * HLS / M3U8 多线程分片并发下载与视频拼接下载器 (导出兼容 jr)
 */
function HlsVideoDownloader() {
  const self = this;

  /**
   * TS 视频分片并发批量下载状态机
   */
  function SegmentDownloadTask(urlList, onComplete, startIndex, accumulatedChunks) {
    const task = this;
    this.aborted = false;
    this.threadNum = 10;
    this.step = 0;

    (function batchFetch(urls, resolveAll, currentIdx, chunks) {
      const promiseBatch = [];
      for (let t = 0; t < task.threadNum; t++) {
        const segUrl = urls[currentIdx + t];
        if (!segUrl) {
          promiseBatch.push(Promise.resolve());
          break;
        }

        promiseBatch.push(
          (0, __imports.fetch)(segUrl).catch(() => {
            return (0, __imports.fetch)(segUrl).catch(() => {
              return (0, __imports.fetch)(segUrl);
            });
          })
        );
      }

      task.step = promiseBatch.length;

      Promise.all(promiseBatch)
        .then((responses) => {
          const validResponses = responses.filter(r => r && typeof r.blob === "function");
          return Promise.all(validResponses.map(r => r.blob()));
        })
        .then((blobs) => {
          const bufferPromises = blobs.map((blob, offset) => {
            return new Promise((res) => {
              const reader = new FileReader();
              reader.readAsArrayBuffer(new Blob([blob], { type: "octet/stream" }));
              reader.addEventListener("loadend", () => {
                res(reader.result);
                if (typeof task.onprogress === "function") {
                  const currentSegment = currentIdx + offset + 1;
                  const totalSegments = urls.length;
                  const totalDownloadedBytes = chunks.reduce((sum, chunk) => sum + (chunk?.byteLength || 0), 0);

                  task.onprogress({
                    segment: currentSegment,
                    total: totalSegments,
                    percentage: ((currentSegment / totalSegments) * 100).toFixed(3),
                    downloaded: formatByteSize(totalDownloadedBytes),
                    status: "Downloading...",
                  });
                }
              });
            });
          });
          return Promise.all(bufferPromises);
        })
        .then((loadedBuffers) => {
          for (let i = 0; i < loadedBuffers.length; i++) {
            chunks.push(loadedBuffers[i]);
          }
          const nextStep = task.step;

          if (task.aborted) {
            if (typeof task.aborted === "function") task.aborted();
          } else if (urls[currentIdx + nextStep]) {
            if (task.ie) {
              (0, __imports.setTimeout)(() => {
                batchFetch(urls, resolveAll, currentIdx + nextStep, chunks);
              }, 500);
            } else {
              batchFetch(urls, resolveAll, currentIdx + nextStep, chunks);
            }
          } else {
            resolveAll(chunks);
          }
        })
        .catch((err) => {
          if (typeof task.onerror === "function") {
            task.onerror(`下载 TS 分片时异常 (index: ${currentIdx}): ${err}`);
          }
        });
    })(urlList, onComplete, startIndex, accumulatedChunks);
  }

  function formatByteSize(bytes) {
    const units = [
      { divider: 1e18, suffix: "EB" },
      { divider: 1e15, suffix: "PB" },
      { divider: 1e12, suffix: "TB" },
      { divider: 1e9, suffix: "GB" },
      { divider: 1e6, suffix: "MB" },
      { divider: 1e3, suffix: "kB" },
    ];
    for (const unit of units) {
      if (bytes >= unit.divider) {
        return (bytes / unit.divider).toString().split(".")[0] + unit.suffix;
      }
    }
    return String(bytes);
  }

  this.ie = navigator.appVersion.toString().includes(".NET");
  this.ios = Boolean(navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform));

  /**
   * 启动下载 M3U8 并封装导出视频
   */
  this.start = function (m3u8Url, options = {}) {
    let activeTask = null;
    const callbacks = { progress: null, finished: null, error: null, aborted: null };

    const emitEvent = (type, payload) => {
      if (typeof callbacks[type] === "function") callbacks[type](payload);
    };

    if (self.ios) {
      emitEvent("error", "iOS 平台暂不支持分片合并下载");
      return;
    }

    const controller = {
      on(event, handler) {
        if (event in callbacks) callbacks[event] = handler;
        return controller;
      },
      abort() {
        if (activeTask) {
          activeTask.aborted = () => emitEvent("aborted");
        }
      },
    };

    new Promise((resolve, reject) => {
      const parsedUrl = new URL(m3u8Url);
      (0, __imports.fetch)(m3u8Url)
        .then(res => res.text())
        .then((m3u8Content) => {
          const lines = m3u8Content.split(/\r?\n/);
          const tsLines = lines.filter(line => line.includes(".ts"));

          if (tsLines.length === 0) {
            const err = "无效的 M3U8 播放列表文件";
            reject(err);
            emitEvent("error", err);
            return;
          }

          const resolvedTsUrls = tsLines.map((tsLine) => {
            if (tsLine.startsWith("http") || tsLine.startsWith("ftp")) {
              return tsLine;
            }
            return `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}/./../${tsLine}`;
          });

          activeTask = new SegmentDownloadTask(resolvedTsUrls, (chunkBuffers) => {
            const finalBlob = new Blob(chunkBuffers, { type: "octet/stream" });
            emitEvent("progress", { status: "Processing..." });

            if (options.returnBlob) {
              emitEvent("finished", { status: "Successfully downloaded video", data: finalBlob });
              resolve(finalBlob);
            } else {
              const filename = options.filename || "video.mp4";
              if (self.ie) {
                window.navigator.msSaveBlob(finalBlob, filename);
              } else {
                emitEvent("progress", { status: "Sending video to browser..." });
                const anchor = document.createElement("a");
                anchor.href = URL.createObjectURL(finalBlob);
                anchor.download = filename;
                anchor.style.display = "none";
                document.body.appendChild(anchor);
                anchor.click();
                anchor.remove();
              }
              emitEvent("finished", { status: "Successfully downloaded video", data: finalBlob });
              resolve(finalBlob);
            }
          }, 0, []);

          activeTask.onprogress = (prog) => {
            emitEvent("progress", prog);
          };
        })
        .catch((err) => {
          emitEvent("error", `解析 M3U8 失败: ${err}`);
        });
    });

    return controller;
  };
}

const jr = HlsVideoDownloader;

}
