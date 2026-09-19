function* (__imports) {
yield {"$i": { get: () => $i, set: value => { $i = value; } },
"O": { get: () => O, set: value => { O = value; } },
"Oi": { get: () => Oi, set: value => { Oi = value; } },
"Pi": { get: () => Pi, set: value => { Pi = value; } },
"Zi": { get: () => Zi, set: value => { Zi = value; } },
"ca": { get: () => ca, set: value => { ca = value; } },
"closeEnhancedPip": { get: () => closeEnhancedPip, set: value => { closeEnhancedPip = value; } },
"da": { get: () => da, set: value => { da = value; } },
"ea": { get: () => ea, set: value => { ea = value; } },
"ji": { get: () => ji, set: value => { ji = value; } },
"ka": { get: () => ka, set: value => { ka = value; } },
"pipPreferences": { get: () => pipPreferences, set: value => { pipPreferences = value; } },
"recapturePipStream": { get: () => recapturePipStream, set: value => { recapturePipStream = value; } },
"returnToPipSource": { get: () => returnToPipSource, set: value => { returnToPipSource = value; } },
"sa": { get: () => sa, set: value => { sa = value; } },
"syncPipPlayback": { get: () => syncPipPlayback, set: value => { syncPipPlayback = value; } },
"ta": { get: () => ta, set: value => { ta = value; } },
"ua": { get: () => ua, set: value => { ua = value; } },
"va": { get: () => va, set: value => { va = value; } },
"wa": { get: () => wa, set: value => { wa = value; } },
"zi": { get: () => zi, set: value => { zi = value; } }};
let Ai =
    '<img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjJweCIgaGVpZ2h0PSIyMHB4IiB2aWV3Qm94PSIwIDAgMjIgMjAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8dGl0bGU+am95c291bmQvc2VsZWN0ZWQ8L3RpdGxlPgogICAgPGRlZnM+CiAgICAgICAgPGxpbmVhckdyYWRpZW50IHgxPSI1MCUiIHkxPSIwJSIgeDI9IjUwJSIgeTI9IjEwMCUiIGlkPSJsaW5lYXJHcmFkaWVudC0xIj4KICAgICAgICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iI0YwQ0I5NSIgb2Zmc2V0PSIwJSI+PC9zdG9wPgogICAgICAgICAgICA8c3RvcCBzdG9wLWNvbG9yPSIjRTlCRTgwIiBvZmZzZXQ9IjEwMCUiPjwvc3RvcD4KICAgICAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPC9kZWZzPgogICAgPGcgaWQ9ImpveXNvdW5kL3NlbGVjdGVkIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KICAgICAgICA8ZyBpZD0i57yW57uEIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyLjc4NTc1MCwgMC43MTQyMjUpIiBmaWxsPSJ1cmwoI2xpbmVhckdyYWRpZW50LTEpIiBmaWxsLXJ1bGU9Im5vbnplcm8iPgogICAgICAgICAgICA8cGF0aCBkPSJNMTYuNDI4NiwwIEwxNi40Mjg2LDkuNjQzIEMxNi40Mjg2LDE0LjEzNDU1MjcgMTIuODIzMzY2NywxNy43ODQyODggOC4zNDg5MzYxOCwxNy44NTYxNjk2IEw4LjE4NzE4MTUzLDE3Ljg1NzI1NjEgTDguMTg3MTgxNTMsMTcuODU3MjU2MSBMNy44NTcxLDE3Ljg1NzI1NjEgTDcuODU3MTM4OTYsMTcuODQ5NjQxIEMzLjQ5MjM4MDEzLDE3LjY2MjA3NDQgMCwxNC4wNTMxMzQxIDAsOS42NDMwNSBDMCw1LjExMzExNTA1IDMuNjg0NDAwMiwxLjQyODU1IDguMjE0MjUsMS40Mjg1NSBDOS43MDA3OTkxMywxLjQyODU1IDExLjA5NjI5ODUsMS44MjUzNTUwMiAxMi4zMDA0MTUxLDIuNTE4NjIzMzEgQzEyLjc0OTU2ODcsMS4wNjAxNjYwMSAxNC4xMDgyMjM2LDAgMTUuNzE0MzUsMCBMMTYuNDI4NiwwIFogTTguMjE0MjUsMi40Mjg1NSBDNC4yMzY2OTQ5NiwyLjQyODU1IDEsNS42NjUzODk3OCAxLDkuNjQzMDUgQzEsMTMuNTAwNzUwOCA0LjA0NDc3MzgsMTYuNjYxNzMzMyA3Ljg1NzA4ODk5LDE2Ljg0ODU2NjggTDcuODU3MDYyNTQsMTQuNTc1MDE3IEM2Ljc3Mjk4NjcxLDE0LjQ5NzMxMDMgNS43ODQ2MTcxOSwxNC4wNjg3NDc3IDUuMDA1MTgzMTEsMTMuNDAyNTU3OCBMNC45MjI0NzY5NywxMy4zMzAyNzYyIEw0LjgwNDkyNDY4LDEzLjIyMTc5NDEgQzMuODU5Mjk3NTksMTIuMzIwNjI4MyAzLjI2OTI1LDExLjA0OTU0OTYgMy4yNjkyNSw5LjY0MzAyNSBDMy4yNjkyNSw2LjkxNTg4MjYzIDUuNDg3MTA3NjMsNC42OTgwMjUgOC4yMTQyNSw0LjY5ODAyNSBDOS44MTQwMDc1Niw0LjY5ODAyNSAxMS4yMzg0NTI3LDUuNDYxMjEyMzMgMTIuMTQyNzY0NSw2LjY0MjcxMjE1IEwxMi4xNDI3NjQ1LDMuNTk0NjQ0OTEgQzExLjAxMTU4OTYsMi44NTczNjc2NSA5LjY2MTk5NDQ5LDIuNDI4NTUgOC4yMTQyNSwyLjQyODU1IFogTTguMjE0MjUsNS42OTgwMjUgQzYuMDM5MzkyMzcsNS42OTgwMjUgNC4yNjkyNSw3LjQ2ODE2NzM3IDQuMjY5MjUsOS42NDMwMjUgQzQuMjY5MjUsMTEuNjY5NTM3MyA1LjgwNjQ4MjY0LDEzLjM0NDc0OTggNy43NzU4ODgxNSwxMy41NjM1NjcyIEw3Ljg1NzEsMTMuNTcxNSBMOC4yMTQzNSwxMy41NzE1IEMxMC4zNDk2LDEzLjU3MTUgMTIuMDg2ODUsMTEuODY4IDEyLjE0MTYsOS43NDYgTDEyLjE0MjY0NjgsOS42NDMgTDEyLjE0MjY0NjgsOS4yODIzMzIzMyBDMTEuOTU5ODU4NSw3LjI3NTc1MDI2IDEwLjI2NzQ4MjMsNS42OTgwMjUgOC4yMTQyNSw1LjY5ODAyNSBaIE04LjIxNDI1LDcuNTAwMDI1IEM5LjM5NjE5Mjg0LDcuNTAwMDI1IDEwLjM1Nyw4LjQ2MDkzMzA5IDEwLjM1Nyw5LjY0MzAyNSBDMTAuMzU3LDEwLjgyNDkxNzQgOS4zOTYxNDIzNywxMS43ODU3NzUgOC4yMTQyNSwxMS43ODU3NzUgQzcuMDMyMTgyMTUsMTEuNzg1Nzc1IDYuMDcxNSwxMC44MjQ5OTE5IDYuMDcxNSw5LjY0MzAyNSBDNi4wNzE1LDguNDYwODU4NTUgNy4wMzIxMzE2OSw3LjUwMDAyNSA4LjIxNDI1LDcuNTAwMDI1IFogTTguMjE0MjUsOC41MDAwMjUgQzcuNTg0NDYzNDgsOC41MDAwMjUgNy4wNzE1LDkuMDEzMDk2MjcgNy4wNzE1LDkuNjQzMDI1IEM3LjA3MTUsMTAuMjcyNzMwNyA3LjU4NDQ5MDQyLDEwLjc4NTc3NSA4LjIxNDI1LDEwLjc4NTc3NSBDOC44NDM4NTc2MywxMC43ODU3NzUgOS4zNTcsMTAuMjcyNjMyNiA5LjM1Nyw5LjY0MzAyNSBDOS4zNTcsOS4wMTMxOTQzMyA4Ljg0Mzg4NDU3LDguNTAwMDI1IDguMjE0MjUsOC41MDAwMjUgWiIgaWQ9IuW9oueKtiI+PC9wYXRoPgogICAgICAgIDwvZz4KICAgIDwvZz4KPC9zdmc+" alt="joysound-on"/>',
  Di =
    '<img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjJweCIgaGVpZ2h0PSIyMHB4IiB2aWV3Qm94PSIwIDAgMjIgMjAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8dGl0bGU+am95c291bmQvbm9ybWFsPC90aXRsZT4KICAgIDxnIGlkPSJqb3lzb3VuZC9ub3JtYWwiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgICAgIDxnIGlkPSLnvJbnu4QiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDIuNzg1NzUwLCAwLjcxNDIyNSkiIGZpbGw9IiNGRkZGRkYiIGZpbGwtcnVsZT0ibm9uemVybyI+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik0xNi40Mjg2LDAgTDE2LjQyODYsOS42NDMgQzE2LjQyODYsMTQuMTM0NTUyNyAxMi44MjMzNjY3LDE3Ljc4NDI4OCA4LjM0ODkzNjE4LDE3Ljg1NjE2OTYgTDguMTg3MTgxNTMsMTcuODU3MjU2MSBMOC4xODcxODE1MywxNy44NTcyNTYxIEw3Ljg1NzEsMTcuODU3MjU2MSBMNy44NTcxMzg5NiwxNy44NDk2NDEgQzMuNDkyMzgwMTMsMTcuNjYyMDc0NCAwLDE0LjA1MzEzNDEgMCw5LjY0MzA1IEMwLDUuMTEzMTE1MDUgMy42ODQ0MDAyLDEuNDI4NTUgOC4yMTQyNSwxLjQyODU1IEM5LjcwMDc5OTEzLDEuNDI4NTUgMTEuMDk2Mjk4NSwxLjgyNTM1NTAyIDEyLjMwMDQxNTEsMi41MTg2MjMzMSBDMTIuNzQ5NTY4NywxLjA2MDE2NjAxIDE0LjEwODIyMzYsMCAxNS43MTQzNSwwIEwxNi40Mjg2LDAgWiBNOC4yMTQyNSwyLjQyODU1IEM0LjIzNjY5NDk2LDIuNDI4NTUgMSw1LjY2NTM4OTc4IDEsOS42NDMwNSBDMSwxMy41MDA3NTA4IDQuMDQ0NzczOCwxNi42NjE3MzMzIDcuODU3MDg4OTksMTYuODQ4NTY2OCBMNy44NTcwNjI1NCwxNC41NzUwMTcgQzYuNzcyOTg2NzEsMTQuNDk3MzEwMyA1Ljc4NDYxNzE5LDE0LjA2ODc0NzcgNS4wMDUxODMxMSwxMy40MDI1NTc4IEw0LjkyMjQ3Njk3LDEzLjMzMDI3NjIgTDQuODA0OTI0NjgsMTMuMjIxNzk0MSBDMy44NTkyOTc1OSwxMi4zMjA2MjgzIDMuMjY5MjUsMTEuMDQ5NTQ5NiAzLjI2OTI1LDkuNjQzMDI1IEMzLjI2OTI1LDYuOTE1ODgyNjMgNS40ODcxMDc2Myw0LjY5ODAyNSA4LjIxNDI1LDQuNjk4MDI1IEM5LjgxNDAwNzU2LDQuNjk4MDI1IDExLjIzODQ1MjcsNS40NjEyMTIzMyAxMi4xNDI3NjQ1LDYuNjQyNzEyMTUgTDEyLjE0Mjc2NDUsMy41OTQ2NDQ5MSBDMTEuMDExNTg5NiwyLjg1NzM2NzY1IDkuNjYxOTk0NDksMi40Mjg1NSA4LjIxNDI1LDIuNDI4NTUgWiBNOC4yMTQyNSw1LjY5ODAyNSBDNi4wMzkzOTIzNyw1LjY5ODAyNSA0LjI2OTI1LDcuNDY4MTY3MzcgNC4yNjkyNSw5LjY0MzAyNSBDNC4yNjkyNSwxMS42Njk1MzczIDUuODA2NDgyNjQsMTMuMzQ0NzQ5OCA3Ljc3NTg4ODE1LDEzLjU2MzU2NzIgTDcuODU3MSwxMy41NzE1IEw4LjIxNDM1LDEzLjU3MTUgQzEwLjM0OTYsMTMuNTcxNSAxMi4wODY4NSwxMS44NjggMTIuMTQxNiw5Ljc0NiBMMTIuMTQyNjQ2OCw5LjY0MyBMMTIuMTQyNjQ2OCw5LjI4MjMzMjMzIEMxMS45NTk4NTg1LDcuMjc1NzUwMjYgMTAuMjY3NDgyMyw1LjY5ODAyNSA4LjIxNDI1LDUuNjk4MDI1IFogTTguMjE0MjUsNy41MDAwMjUgQzkuMzk2MTkyODQsNy41MDAwMjUgMTAuMzU3LDguNDYwOTMzMDkgMTAuMzU3LDkuNjQzMDI1IEMxMC4zNTcsMTAuODI0OTE3NCA5LjM5NjE0MjM3LDExLjc4NTc3NSA4LjIxNDI1LDExLjc4NTc3NSBDNy4wMzIxODIxNSwxMS43ODU3NzUgNi4wNzE1LDEwLjgyNDk5MTkgNi4wNzE1LDkuNjQzMDI1IEM2LjA3MTUsOC40NjA4NTg1NSA3LjAzMjEzMTY5LDcuNTAwMDI1IDguMjE0MjUsNy41MDAwMjUgWiBNOC4yMTQyNSw4LjUwMDAyNSBDNy41ODQ0NjM0OCw4LjUwMDAyNSA3LjA3MTUsOS4wMTMwOTYyNyA3LjA3MTUsOS42NDMwMjUgQzcuMDcxNSwxMC4yNzI3MzA3IDcuNTg0NDkwNDIsMTAuNzg1Nzc1IDguMjE0MjUsMTAuNzg1Nzc1IEM4Ljg0Mzg1NzYzLDEwLjc4NTc3NSA5LjM1NywxMC4yNzI2MzI2IDkuMzU3LDkuNjQzMDI1IEM5LjM1Nyw5LjAxMzE5NDMzIDguODQzODg0NTcsOC41MDAwMjUgOC4yMTQyNSw4LjUwMDAyNSBaIiBpZD0i5b2i54q2Ij48L3BhdGg+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4=" alt="joysound-off"/>';
function ji() {
  var e = document.getElementById("vtoolbar-joysound-switch"),
    t = document.getElementById("vtoolbar-joysound-icon");
  e &&
    (__imports.unsafeWindow.hasInstalledJoysound &&
    1 == __imports.localStorage.getItem("Ex_isJoysound")
      ? (e.classList.add("is-on"), t && (t.innerHTML = Ai))
      : (e.classList.remove("is-on"), t && (t.innerHTML = Di)));
}
let O = null;
let Pi =
    '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAB2klEQVR4AcyUgXHCMAxF7S7SsglsApMAk0AngU1gE/qeiRxMgFC43jXnH8mK9b9sJflIf3z9P4HT6fQFpoGxA3h6BxBKvIHwAHYB4gewZH5zPCUAwZxsibW46ZhS2qfz9YURmOEYFYB8SpqVY5Kkk5zzJPWXYt/9tPVGBVge5Nuc8yznfETUI1JY8gWxPTGPcIdtjuuhAIvnCMT21/gxJNev5Ew8QuPmMD2PhwIs+QSOFVVabUJUEmNHYqVyJpJjynAnsSaNCUT1JbO7KSQkklj4yP4I/YoxAYnqYh2qNjbD10YBpT/EYo57HmMCkRC2ZF2ITPAdC47ONSIRqDu5K0CCzRKSDl5DSOyBu/C5qG+bk8BNgY48EsqbEgnXlrX2wlczGtsUMxAgwaovybdB6jOwBBugldgmr7o1fif1eIw1AiRZxV1yEnwmmUVoBeHkUQ3IE1cjwNwvFJM8lqZygpJjkqQ+E/qutdlN5am7qkBXvWGbZ7K+H5bVBrlkaxqsFfp1bUm4ulUB4m4T0w9Er8kfkvWZvVcFqEoBt+lb4T/e5l1W/mtyZaqAE7AARQTrR6OoR/ESORztv8hdAH8D/u99K2zey+QDAQMCERvtTpy+hesjeovsVvIPAAAA//+5v3LIAAAABklEQVQDAFMMzjFiZ8i8AAAAAElFTkSuQmCC"/>',
  zi =
    '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAs0lEQVR4AeyU3Q2AIAyE1UkcRTfTyXQTR8GW5MgFCCQFXwxELD/HfaRpWKaP248AzrnL9WsPMs8p2rDYIa7wYIBfmxubN6FfAqC9LsMBqKaxmCJULVxqc+g4FgEstI6LAFQszGtz6DgWASy0jgegmrkkRVKKq3TzyxoTE4AI9KltfVlv8fFfDqAbN0rSGHc10Z4DHGIaBCpq6TFgF/OzxTA+ywA1D7mLhdZ5AMjNu5vrpV4AAAD//9kfWOoAAAAGSURBVAMAe2CtMQj8RU0AAAAASUVORK5CYII="/>',
  Oi = null,
  pipPreferences = {
    fontSize: 18,
    speed: 2.5,
    area: "full",
    trackHeight: 28,
    mergeMode: "combo",
    lowPowerMode: !1,
    filterRobotDanmaku: !0,
    opacity: 1,
    danmakuVisible: !0,
  },
  Ri = null,
  Fi = null,
  Hi = null,
  Gi = null,
  i = null,
  Vi = null,
  qi = null,
  Ui = null,
  Wi = null,
  Yi = null,
  Qi = null,
  Ji = null,
  Zi = !1,
  Xi =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="13" width="7" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/></svg>',
  Ki =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M7 10h5.5M7 13h3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  $i =
    '<svg width="24" height="24" viewBox="0 0 1024 1024" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path fill="#fff" d="M513.34 831.74C337.03 831.74 193.6 688.31 193.6 512c0-71.09 23.31-138.85 65.53-194.03v51.61c0 17.67 14.33 32 32 32s32-14.33 32-32V239.45c0-5.87-1.59-11.36-4.34-16.09-0.06-0.1-0.11-0.2-0.17-0.3-0.16-0.28-0.34-0.55-0.51-0.82-0.13-0.2-0.26-0.41-0.39-0.61-0.08-0.13-0.17-0.25-0.26-0.37a35.5 35.5 0 0 0-1.58-2.13c-6.81-8.35-16.96-12.35-26.95-11.69h-130c-17.67 0-32 14.33-32 32s14.33 32 32 32h55.35C159.8 339 129.6 423.35 129.6 512c0 51.79 10.15 102.05 30.17 149.38 19.33 45.7 46.99 86.74 82.23 121.97 35.23 35.23 76.27 62.9 121.97 82.23 47.33 20.02 97.59 30.17 149.38 30.17 17.67 0 32-14.33 32-32s-14.34-32.01-32.01-32.01zM855.38 762.3h-51.23c19.81-23 36.93-48.3 50.75-75.22 27.6-53.74 42.18-114.28 42.18-175.08 0-51.79-10.15-102.05-30.17-149.38-19.33-45.7-46.99-86.73-82.23-121.97-35.23-35.23-76.27-62.9-121.97-82.23-47.33-20.02-97.59-30.17-149.38-30.17-17.67 0-32 14.33-32 32s14.33 32 32 32c176.31 0 319.74 143.44 319.74 319.74 0 78.31-27.68 151.61-77.6 209.05l0.24-56.04c0.08-17.67-14.19-32.06-31.86-32.14h-0.14c-17.61 0-31.92 14.24-32 31.86l-0.55 129.43a31.988 31.988 0 0 0 9.32 22.71 31.68 31.68 0 0 0 5.33 4.3c0.02 0.01 0.04 0.02 0.06 0.04 0.48 0.31 0.97 0.61 1.47 0.89l0.15 0.09c0.5 0.28 1 0.54 1.51 0.8 0.03 0.01 0.05 0.03 0.08 0.04 1.64 0.8 3.34 1.46 5.1 1.98 0.01 0 0.02 0.01 0.03 0.01 0.55 0.16 1.1 0.3 1.66 0.43 0.07 0.02 0.15 0.03 0.22 0.05 0.5 0.11 1 0.21 1.5 0.3 0.1 0.02 0.2 0.04 0.3 0.05 0.48 0.08 0.96 0.15 1.44 0.21 0.11 0.01 0.23 0.03 0.34 0.04 0.48 0.05 0.95 0.09 1.43 0.12l0.34 0.03c0.53 0.03 1.07 0.04 1.61 0.05h132.31c17.67 0 32-14.33 32-32s-14.31-31.99-31.98-31.99z"/></svg>';
function ea(e) {
  e = e || window.__pip_window__;
  if (e && !e.closed) {
    var t = e.document.getElementById("danmaku"),
      e = e.document.getElementById("combo-container"),
      o =
        null == (o = pipPreferences.opacity) || Number.isNaN(o)
          ? 1
          : Math.min(1, Math.max(0.3, o)),
      n = !1 !== pipPreferences.danmakuVisible;
    if (
      t &&
      ((t.style.opacity = String(o)),
      (t.style.visibility = n ? "visible" : "hidden"),
      !n)
    )
      for (; t.firstChild;) t.removeChild(t.firstChild);
    e &&
      ((e.style.opacity = String(o)),
      (e.style.display = n ? "" : "none"),
      n || (e.textContent = ""));
  }
}
function ta(e) {
  var t,
    e = (e || window.__pip_window__)?.document.getElementById(
      "pip-danmaku-toggle",
    );
  e &&
    ((t = !1 !== pipPreferences.danmakuVisible),
    (e.textContent = "弹"),
    (e.title = t ? "隐藏弹幕" : "显示弹幕"),
    e.classList.toggle("is-off", !t));
}
function closeEnhancedPip(e, t) {
  if (!e) {
    if (__imports.pendingPipOwner && !__imports.pendingPipOwner.disposed) __imports.pendingPipOwner.dispose();
    e = window.__pip_window__;
    t = e?.document?.getElementById('pip-video');
  }
  if (e?.__nextPipLifetime && !e.__nextPipLifetime.disposed) {
    e.__nextPipLifetime.dispose();
    return;
  }
  // A stale window may release itself, never the current window's global state.
  try { t?.srcObject?.getTracks().forEach(track => track.stop()); } catch (error) {}
  try { if (t) t.srcObject = null; } catch (error) {}
  if (e && window.__pip_window__ === e) {
    ((window.__pip_is_active__ = !1),
      (window.__pip_window__ = null),
      e?.__pip_keydown_handler__ &&
        (e.document.removeEventListener("keydown", e.__pip_keydown_handler__),
        (e.__pip_keydown_handler__ = null)),
      sa(),
      (0, __imports.La)(!1),
      (0, __imports.Na)(!1),
      (0, __imports.resetPipPacketState)(),
      (0, __imports.resetPipMergeState)(),
      (window.__pip_track_state__ = []),
      __imports.ja && ((0, __imports.clearInterval)(__imports.ja), (__imports.ja = null)),
      __imports.pipMergeGroups.clear());
    try {
      t && (t.srcObject = null);
    } catch (e) {}
  }
  if (e && !e.closed) {
    try { e.close(); } catch (error) {}
  }
}
function returnToPipSource(e, t = !0) {
  var o,
    e = e || window.__pip_window__,
    n = e?.__pip_source_video__ || document.getElementById("__video2");
  t &&
    window.__pip_is_active__ &&
    ((o = e?.document?.getElementById("pip-video")), closeEnhancedPip(e, o));
  try {
    window.focus();
  } catch (e) {}
  if (n) {
    try {
      n.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } catch (e) {}
    !t && window.__pip_is_active__
      ? refreshPipSourceFrame(n).catch(() => {})
      : t && n.play().catch(() => {});
  }
}
function cancelPipFramePump() {
  var e = Ui;
  if (null != Wi && e && "function" == typeof e.cancelVideoFrameCallback)
    try {
      e.cancelVideoFrameCallback(Wi);
    } catch (e) {}
  else null != Wi && (0, __imports.clearTimeout)(Wi);
  ((Wi = null), (Ui = null));
}
async function refreshPipSourceFrame(n, current = () => true) {
  if (!n || !current()) return !1;
  var e = n.paused;
  await n.play().catch(() => {});
  if (!current()) return !1;
  var t = "0.01" === n.style.getPropertyValue("opacity");
  t && n.style.removeProperty("opacity");
  try {
    window.focus();
  } catch (e) {}
  await new Promise((e) => {
    let t = !1,
      o = () => {
        t || ((t = !0), e());
      };
    ("function" == typeof n.requestVideoFrameCallback &&
      n.requestVideoFrameCallback(() => {
        n.requestVideoFrameCallback(o);
      }),
      (0, __imports.setTimeout)(o, 150));
  });
  if (!current()) return !1;
  try {
    2 <= n.readyState &&
      Yi &&
      Yi.getContext("2d", { willReadFrequently: !0 }).drawImage(n, 0, 0, 2, 2);
  } catch (e) {}
  return (
    t && n.style.setProperty("opacity", "0.01", "important"),
    e && n.pause(),
    !0
  );
}
async function recapturePipStream(e, t) {
  var o = e?.__pip_source_video__ || document.getElementById("__video2");
  const current = () => e && !e.closed && !e.__nextPipLifetime?.disposed && window.__pip_window__ === e;
  if (!o || !t || !current()) return !1;
  await refreshPipSourceFrame(o, current);
  if (!current()) return !1;
  try {
    var n = t.srcObject;
    n && n.getTracks().forEach((e) => e.stop());
  } catch (e) {}
  let i = null;
  try {
    i = o.captureStream();
  } catch (e) {
    return !1;
  }
  ((t.srcObject = i), o.paused ? t.pause() : await t.play().catch(() => {}));
  if (!current()) return !1;
  try {
    e && !e.closed && e.focus();
  } catch (e) {}
  return !0;
}
function syncPipPlayback(e, t, o) {
  const current = () => window.__pip_window__ === t && !t?.closed && !t?.__nextPipLifetime?.disposed;
  if (!current()) return;
  if ((0, __imports.It)()) {
    var n = e;
    if ((cancelPipFramePump(), n && window.__pip_is_active__)) {
      ((Ui = n),
        Yi ||
          (((Yi = document.createElement("canvas")).width = 2),
          (Yi.height = 2)));
      let e = Yi.getContext("2d", { willReadFrequently: !0 }),
        t = () => {
          if (current() && window.__pip_is_active__ && Ui === n) {
            try {
              2 <= n.readyState && e.drawImage(n, 0, 0, 2, 2);
            } catch (e) {}
            Wi =
              "function" == typeof n.requestVideoFrameCallback
                ? n.requestVideoFrameCallback(t)
                : (0, __imports.setTimeout)(t, 200);
          }
        };
      t();
    }
    var i = t,
      a = o,
      r =
        (Qi &&
          (document.removeEventListener("visibilitychange", Qi), (Qi = null)),
        (Qi = () => {
          current() && window.__pip_is_active__ &&
            "visible" === document.visibilityState &&
            recapturePipStream(i, a);
        }),
        document.addEventListener("visibilitychange", Qi),
        e),
      l = t,
      s = o;
    if (
      (Ji && ((0, __imports.clearTimeout)(Ji), (Ji = null)),
      "function" == typeof r.requestVideoFrameCallback)
    ) {
      let e = performance.now(),
        t = !1,
        o = () => {
          current() && window.__pip_is_active__ &&
            ((e = performance.now()), r.requestVideoFrameCallback(o));
        },
        n =
          (r.requestVideoFrameCallback(o),
          () => {
            current() && window.__pip_is_active__ &&
              ((Ji = (0, __imports.setTimeout)(n, 2500)),
              t ||
                r.paused ||
                r.readyState < 2 ||
                performance.now() - e < 4500 ||
                ((t = !0),
                recapturePipStream(l, s).finally(() => {
                  ((e = performance.now()), (t = !1));
                })));
          });
      Ji = (0, __imports.setTimeout)(n, 2500);
    }
  }
}
function sa() {
  (cancelPipFramePump(),
    Qi && (document.removeEventListener("visibilitychange", Qi), (Qi = null)),
    Ji && ((0, __imports.clearTimeout)(Ji), (Ji = null)));
}
function da(e) {
  var t,
    e = e || window.__pip_window__;
  e &&
    !e.closed &&
    ((t = e.document.getElementById("input-panel")),
    (e = e.document.getElementById("pip-input-field")),
    t) &&
    e &&
    (t.classList.add("active"), e.focus());
}
function ca() {
  (Ri && (Ri.closeHook(), (Ri = null)),
    document.getElementById("js-player-controlbar") &&
      (Ri = new __imports.DomMutationSubscription("#js-player-controlbar", !0, ya)));
}
function pa() {
  var e = document.getElementById("js-player-controlbar");
  return i && i.isConnected && e && e.contains(i);
}
function ma() {
  (Fi &&
    ("function" == typeof Fi.closeHook ? Fi.closeHook() : Fi.disconnect?.(),
    (Fi = null)),
    null != Gi && ((0, __imports.cancelAnimationFrame)(Gi), (Gi = null)));
}
function ua() {
  Fi ||
    pa() ||
    (Fi = new __imports.DomMutationSubscription("body", !0, (t) => {
      if (pa()) ma();
      else {
        let e = !1;
        for (var o of t) {
          for (var n of o.addedNodes) {
            if (ga(n)) {
              ((e = !0), Ca(n));
              break;
            }
            if (1 === n.nodeType) {
              for (var i of n.children)
                if (ga(i)) {
                  ((e = !0), Ca(i));
                  break;
                }
              if (e) break;
            }
          }
          if (e) break;
        }
        e && ha();
      }
    }));
}
function ga(e) {
  return (
    1 === e?.nodeType &&
    e.classList?.contains("mantine-Tooltip-tooltip") &&
    "开启画中画" === (e.textContent || "").trim()
  );
}
function ha() {
  pa() ||
    (null == Gi &&
      (Gi = (0, __imports.requestAnimationFrame)(() => {
        ((Gi = null), pa() || (va(), xa()));
      })));
}
function fa() {
  pa() ||
    (null == Hi &&
      (Hi = (0, __imports.requestAnimationFrame)(() => {
        ((Hi = null),
          (pa() || (i && !i.isConnected && (i = null), va(), pa())) && ma());
      })));
}
function ya(e) {
  pa() ||
    (ca(),
    i && !i.isConnected && (i = null),
    e &&
      !((e) => {
        for (var t of e)
          if ("childList" === t.type) {
            for (var o of t.addedNodes)
              if (
                ((e) => {
                  if (1 === e.nodeType) {
                    if (e.matches?.("button, [role='button']"))
                      if (
                        (e.getAttribute("aria-label") || e.title || "")
                          .trim()
                          .includes("画中画")
                      )
                        return 1;
                    return e.querySelector?.(
                      "button[aria-label*='画中画'], [role='button'][aria-label*='画中画']",
                    );
                  }
                })(o)
              )
                return 1;
            for (let e of t.removedNodes) {
              if (e === i) return 1;
              if (1 === e.nodeType && i && e.contains(i)) return 1;
            }
          } else if ("attributes" === t.type) {
            var n = t.target;
            if (n === i) return 1;
            if (
              1 === n.nodeType &&
              ("aria-label" === t.attributeName ||
                "title" === t.attributeName ||
                "aria-describedby" === t.attributeName)
            )
              if (
                (n.getAttribute("aria-label") || n.title || "")
                  .trim()
                  .includes("画中画")
              )
                return 1;
          }
      })(e)) ||
    (ua(), fa());
}
function ba() {
  var e,
    t = document.getElementById("js-player-controlbar");
  if (t)
    for (e of t.querySelectorAll("button, [role='button']"))
      if (
        (e.getAttribute("aria-label") || e.title || "")
          .trim()
          .includes("画中画")
      )
        return e;
  return null;
}
function va() {
  let e = ba();
  (e =
    e ||
    (() => {
      var e;
      for (e of document.querySelectorAll(".mantine-Tooltip-tooltip"))
        if ("开启画中画" === (e.textContent || "").trim() && e.id) {
          var t = document.querySelector(`[aria-describedby="${e.id}"]`);
          if (t) return t;
        }
      return null;
    })()) &&
    "1" !== e.dataset.exPipBound &&
    ((e.dataset.exPipBound = "1"),
    (i = e).addEventListener("mouseenter", _a),
    e.addEventListener("mouseleave", Ta),
    e.addEventListener("focus", _a),
    e.addEventListener("blur", Ta),
    Sa(e),
    ma(),
    xa());
}
function xa() {
  var e = i;
  e && e.matches(":hover") && (Sa((qi = e)), Ea(e));
}
function wa() {
  var e;
  document.getElementById("ex-pip-menu-panel") ||
    (((e = document.createElement("div")).id = "ex-pip-menu-panel"),
    (e.className = "ex-pip-menu-root"),
    e.setAttribute("role", "menu"),
    (e.innerHTML = `

        <div class="ex-pip-menu">

            <ul class="ex-pip-menu__list" role="presentation">

                <li>

                    <button type="button" class="ex-pip-opt" data-ex-pip-mode="native">

                        <span class="ex-pip-opt__icon">${Xi}</span>

                        <span class="ex-pip-opt__label">原版画中画</span>

                    </button>

                </li>

                <li>

                    <button type="button" class="ex-pip-opt ex-pip-opt--ex" data-ex-pip-mode="enhanced">

                        <span class="ex-pip-opt__icon">${Ki}</span>

                        <span class="ex-pip-opt__body">

                            <span class="ex-pip-opt__row">

                                <span class="ex-pip-opt__label">增强版画中画</span>

                                <span class="ex-pip-opt__mark">DouyuEx</span>

                            </span>

                            <span class="ex-pip-opt__hint">带弹幕，可窗口发弹幕</span>

                        </span>

                    </button>

                </li>

            </ul>

        </div>

    `),
    document.body.appendChild(e),
    e.addEventListener("mouseenter", Ia),
    e.addEventListener("mouseleave", Ta),
    e
      .querySelector('[data-ex-pip-mode="native"]')
      .addEventListener("click", (e) => {
        (e.preventDefault(),
          e.stopPropagation(),
          Ba(),
          (e = i || ba())
            ? e.click()
            : (e =
                  document.getElementById("__video2") ||
                  document.querySelector(".layout-Player-videoEntity video")) &&
                "function" == typeof e.requestPictureInPicture
              ? e.requestPictureInPicture().catch(() => {
                  (0, __imports.T)("【画中画】无法开启原版画中画", "error");
                })
              : (0, __imports.T)("【画中画】未找到原版画中画按钮", "error"));
      }),
    e
      .querySelector('[data-ex-pip-mode="enhanced"]')
      .addEventListener("click", (e) => {
        (e.preventDefault(), e.stopPropagation(), Ba(), (0, __imports.openEnhancedPip)());
      }));
}
function _a(e) {
  (Sa((qi = e.currentTarget)), Ea(qi));
}
function ka() {
  (wa(),
    ca(),
    ua(),
    ha(),
    (0, __imports.setTimeout)(() => {
      ha();
    }, 250));
}
function Ea(t) {
  (wa(), Ia());
  var o = document.getElementById("ex-pip-menu-panel");
  if (o && t) {
    (o.classList.add("is-visible", "is-measuring"),
      o.style.removeProperty("visibility"),
      (o.style.left = "-9999px"),
      (o.style.top = "0"));
    var t = t.getBoundingClientRect(),
      n = o.offsetWidth,
      i = o.offsetHeight,
      a = t.left + t.width / 2 - n / 2;
    let e = t.top - i - 4;
    ((a = Math.max(8, Math.min(a, window.innerWidth - n - 8))),
      e < 8 && (e = t.bottom + 4),
      o.classList.remove("is-measuring"),
      (o.style.left = a + "px"),
      (o.style.top = e + "px"));
  }
}
function Ba() {
  var e = document.getElementById("ex-pip-menu-panel");
  (e && e.classList.remove("is-visible", "is-measuring"), (qi = null));
}
function Ia() {
  Vi && ((0, __imports.clearTimeout)(Vi), (Vi = null));
}
function Ta() {
  (Ia(),
    (Vi = (0, __imports.setTimeout)(() => {
      var e = document.getElementById("ex-pip-menu-panel");
      e &&
        e.classList.contains("is-visible") &&
        (e.matches(":hover") || (qi && qi.matches(":hover")) || Ba());
    }, 180)));
}
function Ca(e) {
  e &&
    "1" !== e.dataset.exPipTooltipHidden &&
    ((e.dataset.exPipTooltipHidden = "1"),
    e.style.setProperty("display", "none", "important"));
}
function Sa(e) {
  if (e) {
    e = e.getAttribute("aria-describedby");
    if (e) {
      e = document.getElementById(e);
      if (e && "开启画中画" === (e.textContent || "").trim()) return void Ca(e);
    }
  }
  document.querySelectorAll(".mantine-Tooltip-tooltip").forEach((e) => {
    "开启画中画" === (e.textContent || "").trim() && Ca(e);
  });
}

}
