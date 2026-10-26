/*
    等级任务自动领取
    ------------------------------------------------------------
    历史问题（与 Reply / Mute 同族）：接口返回体被裸取 ——
      ret.data.taskIds.join(...) / ret.data.list / result.length
    只要服务端少给一层（未登录、风控、空列表、错误码），这里就抛 TypeError；
    而 checkLevelTask 是 35 秒一次的定时器回调，抛错后这一轮后面的任务全部丢，
    控制台里也只有一行 "请求失败!"，看不出到底是哪个接口坏了。

    现在的契约（三条）：
      1) 每个接口都校验结构：不是数组一律收敛成空数组，并留一条带包名的 warn；
      2) checkLevelTask 整体兜底 + 单个任务隔离：一个任务领取失败不影响其它任务，
         一轮失败也不影响下一轮；
      3) 定时器幂等：重复 init 不会叠出两个 35 秒轮询。
*/

let levelTaskTimer = null;
let levelTaskChecking = false;

function initPkg_LevelTask_Timer() {
  if (levelTaskTimer) return;
  checkLevelTask();
  levelTaskTimer = setInterval(checkLevelTask, 35 * 1000);
}

function levelTask_showToast(text) {
  if (typeof showMessage === "function") {
    showMessage(text, "success");
  } else {
    ExGuard_warn("等级任务", "showMessage 不可用，本次奖励提示被吞：" + text);
  }
}

async function checkLevelTask() {
  if (levelTaskChecking) return; // 上一轮还没跑完（接口慢）时不叠加请求
  levelTaskChecking = true;
  try {
    const ids = await getLevelTaskIds(rid);
    if (!ids) return; // 拿不到任务列表：本轮跳过，下一轮继续
    const tasks = await getLevelTasks(ids);
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      if (!task) continue;
      try {
        if (task.taskStatus == 1 && task.prizeStatus == 0) {
          const result = await finishLevelTask(rid, task.taskId);
          const prizes = ExGuard_asList(result);
          for (let j = 0; j < prizes.length; j++) {
            const prize = prizes[j];
            if (!prize) continue;
            levelTask_showToast(`【等级任务】${task.name} 获得${prize.name}${prize.num}`);
          }
        }
      } catch (e) {
        ExGuard_warn("等级任务", `任务 ${task.name || task.taskId} 领取失败，跳过该任务`, e);
      }
    }
  } catch (e) {
    ExGuard_warn("等级任务", "本轮检查失败，下一轮继续", e);
  } finally {
    levelTaskChecking = false;
  }
}

/** @returns {Promise<string>} 逗号分隔的 taskId；拿不到时返回空串（不再 reject） */
function getLevelTaskIds(rid) {
  return new Promise((resolve) => {
    fetch("https://www.douyu.com/japi/interactnc/web/userLevel/userLevelDetail?rid=" + rid, {
        method: 'GET',
        mode: 'no-cors',
        credentials: 'include',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    }).then(res => {
        return res.json();
    }).then(ret => {
        const taskIds = ret && ret.data ? ret.data.taskIds : null;
        if (!Array.isArray(taskIds) || taskIds.length === 0) {
            ExGuard_warn("等级任务", "任务列表接口没有返回 taskIds，本轮跳过");
            resolve("");
            return;
        }
        resolve(taskIds.join(","));
    }).catch(err => {
        ExGuard_warn("等级任务", "任务列表请求失败，本轮跳过", err);
        resolve("");
    })
  })
}

/** @returns {Promise<Array>} 任务列表；结构不对时返回空数组（不再 reject） */
function getLevelTasks(ids) {
  return new Promise((resolve) => {
    fetch("https://www.douyu.com/japi/tasksys/userLevelTask/getTaskStatus?taskIds=" + ids, {
        method: 'GET',
        mode: 'no-cors',
        credentials: 'include',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    }).then(res => {
        return res.json();
    }).then(ret => {
        const list = ret && ret.data ? ret.data.list : null;
        if (!Array.isArray(list)) {
            ExGuard_warn("等级任务", "任务状态接口没有返回 list，本轮跳过");
            resolve([]);
            return;
        }
        resolve(list);
    }).catch(err => {
        ExGuard_warn("等级任务", "任务状态请求失败，本轮跳过", err);
        resolve([]);
    })
  })
}

/** @returns {Promise<Array>} 本次领到的奖励列表；结构不对时返回空数组（不再 reject） */
function finishLevelTask(rid, taskid) {
  return new Promise((resolve) => {
    fetch("https://www.douyu.com/japi/tasksys/userLevelTask/getPrize", {
        method: 'POST',
        mode: 'no-cors',
        credentials: 'include',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: `ctn=${getCCN()}&taskIds=${taskid}&roomId=${rid}`
    }).then(res => {
        return res.json();
    }).then(ret => {
        const list = ret && ret.data ? ret.data.list : null;
        if (!Array.isArray(list)) {
            ExGuard_warn("等级任务", "领取奖励接口没有返回 list，本次按未领到处理");
            resolve([]);
            return;
        }
        resolve(list);
    }).catch(err => {
        ExGuard_warn("等级任务", "领取奖励请求失败，本次跳过", err);
        resolve([]);
    })
  })
}
