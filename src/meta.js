// ==UserScript==

// @name         DouyuEx-RL 斗鱼直播间增强插件 (Reborn Lite)

// @namespace    https://github.com/xayahcore/DouyuEx-RL
// @homepageURL  https://github.com/xayahcore/DouyuEx-RL
// @supportURL   https://github.com/xayahcore/DouyuEx-RL/issues

// @icon         data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMTA4cHgiIGhlaWdodD0iMTA4cHgiIHZpZXdCb3g9IjAgMCAxMDggMTA4IiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPgogICAgPHRpdGxlPueyvueBteeQgzwvdGl0bGU+CiAgICA8ZyBpZD0i6aG16Z2iLTEiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgICAgIDxnIGlkPSLnsr7ngbXnkIMiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAuODMwNzY5LCAwLjgzMDc2OSkiIGZpbGwtcnVsZT0ibm9uemVybyI+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik01My4xNjkyMzA3LDEwNi4zMzg0NjEgQzIzLjgyNzY5MjIsMTA2LjMzODQ2MSAwLDgyLjUxMDc2OTIgMCw1My4xNjkyMzA3IEMwLDUxLjAwMzA3NjkgMS43NzIzMDc3NSw0OS4yMzA3NjkyIDMuOTM4NDYxNSw0OS4yMzA3NjkyIEwzMy40NzY5MjMsNDkuMjMwNzY5MiBDMzUuNjQzMDc2OSw0OS4yMzA3NjkyIDM3LjQxNTM4NDUsNTEuMDAzMDc3IDM3LjQxNTM4NDYsNTMuMTY5MjMwNyBDMzcuNDE1Mzg0Niw2MS44MzM4NDYxIDQ0LjUwNDYxNTQsNjguOTIzMDc2OSA1My4xNjkyMzA3LDY4LjkyMzA3NjkgQzYxLjgzMzg0NjEsNjguOTIzMDc2OSA2OC45MjMwNzY5LDYxLjgzMzg0NjEgNjguOTIzMDc2OSw1My4xNjkyMzA3IEM2OC45MjMwNzY5LDUxLjAwMzA3NjkgNzAuNjk1Mzg0Niw0OS4yMzA3NjkyIDcyLjg2MTUzODUsNDkuMjMwNzY5MiBMMTAyLjQsNDkuMjMwNzY5MiBDMTA0LjU2NjE1NCw0OS4yMzA3NjkyIDEwNi4zMzg0NjEsNTEuMDAzMDc3IDEwNi4zMzg0NjEsNTMuMTY5MjMwNyBDMTA2LjMzODQ2MSw4Mi41MTA3NjkyIDgyLjUxMDc2OTIsMTA2LjMzODQ2MSA1My4xNjkyMzA3LDEwNi4zMzg0NjEgWiIgaWQ9Iui3r+W+hCIgZmlsbD0iIzMzMzYzQSI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNOC4wNzM4NDYxMiw1Ny4xMDc2OTIyIEMxMC4wNDMwNzY5LDgwLjI0NjE1MzcgMjkuNTM4NDYxNSw5OC40NjE1Mzg1IDUzLjE2OTIzMDcsOTguNDYxNTM4NSBDNzYuOCw5OC40NjE1Mzg1IDk2LjI5NTM4NDYsODAuMjQ2MTUzOSA5OC4yNjQ2MTU0LDU3LjEwNzY5MjIgTDc2LjUwNDYxNTQsNTcuMTA3NjkyMiBDNzQuNjMzODQ2MSw2OC4yMzM4NDYxIDY0Ljg4NjE1MzksNzYuOCA1My4xNjkyMzA3LDc2LjggQzQxLjQ1MjMwNzYsNzYuOCAzMS43MDQ2MTU0LDY4LjIzMzg0NjEgMjkuODMzODQ2MSw1Ny4xMDc2OTIyIEw4LjA3Mzg0NjEyLDU3LjEwNzY5MjIgWiIgaWQ9Iui3r+W+hCIgZmlsbD0iI0ZGRkZGRiI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNNTMuMTY5MjMwOCwzLjkzODQ2MTUgQzI1Ljk5Mzg0NjEsMy45Mzg0NjE1IDMuOTM4NDYxNSwyNS45OTM4NDYxIDMuOTM4NDYxNSw1My4xNjkyMzA3IEwzMy40NzY5MjMsNTMuMTY5MjMwNyBDMzMuNDc2OTIzLDQyLjMzODQ2MTUgNDIuMzM4NDYxNSwzMy40NzY5MjMgNTMuMTY5MjMwOCwzMy40NzY5MjMgQzY0LDMzLjQ3NjkyMyA3Mi44NjE1Mzg1LDQyLjMzODQ2MTUgNzIuODYxNTM4NSw1My4xNjkyMzA3IEwxMDIuNCw1My4xNjkyMzA3IEMxMDIuNCwyNS45OTM4NDYxIDgwLjM0NDYxNTQsMy45Mzg0NjE1IDUzLjE2OTIzMDgsMy45Mzg0NjE1IFoiIGlkPSLot6/lvoQiIGZpbGw9IiNENjA5MDkiPjwvcGF0aD4KICAgICAgICAgICAgPHBhdGggZD0iTTEwMi40LDU3LjEwNzY5MjIgTDcyLjg2MTUzODUsNTcuMTA3NjkyMiBDNzAuNjk1Mzg0Niw1Ny4xMDc2OTIyIDY4LjkyMzA3Nyw1NS4zMzUzODQ1IDY4LjkyMzA3NjksNTMuMTY5MjMwNyBDNjguOTIzMDc2OSw0NC41MDQ2MTU0IDYxLjgzMzg0NjEsMzcuNDE1Mzg0NiA1My4xNjkyMzA3LDM3LjQxNTM4NDYgQzQ0LjUwNDYxNTQsMzcuNDE1Mzg0NiAzNy40MTUzODQ2LDQ0LjUwNDYxNTQgMzcuNDE1Mzg0Niw1My4xNjkyMzA3IEMzNy40MTUzODQ2LDU1LjMzNTM4NDYgMzUuNjQzMDc2OSw1Ny4xMDc2OTIyIDMzLjQ3NjkyMyw1Ny4xMDc2OTIyIEwzLjkzODQ2MTUsNTcuMTA3NjkyMiBDMS43NzIzMDc2Miw1Ny4xMDc2OTIyIDAsNTUuMzM1Mzg0NSAwLDUzLjE2OTIzMDcgQzAsMjMuODI3NjkyMiAyMy44Mjc2OTIzLDAgNTMuMTY5MjMwNywwIEM4Mi41MTA3NjkyLDAgMTA2LjMzODQ2MSwyMy44Mjc2OTIyIDEwNi4zMzg0NjEsNTMuMTY5MjMwNyBDMTA2LjMzODQ2MSw1NS4zMzUzODQ2IDEwNC41NjYxNTQsNTcuMTA3NjkyMiAxMDIuNCw1Ny4xMDc2OTIyIFoiIGlkPSLot6/lvoQiIGZpbGw9IiMzMzM2M0EiPjwvcGF0aD4KICAgICAgICAgICAgPHBhdGggZD0iTTc2LjUwNDYxNTQsNDkuMjMwNzY5MyBMOTguMzYzMDc2OSw0OS4yMzA3NjkzIEM5Ni4yOTUzODQ2LDI2LjA5MjMwNzYgNzYuOCw3Ljg3NjkyMyA1My4xNjkyMzA3LDcuODc2OTIzIEMyOS41Mzg0NjE1LDcuODc2OTIzIDEwLjA0MzA3NjksMjYuMDkyMzA3NiA4LjA3Mzg0NjEyLDQ5LjIzMDc2OTMgTDI5LjkzMjMwNzYsNDkuMjMwNzY5MyBDMzEuNzA0NjE1NCwzOC4xMDQ2MTU0IDQxLjQ1MjMwNzYsMjkuNTM4NDYxNSA1My4xNjkyMzA3LDI5LjUzODQ2MTUgQzY0Ljg4NjE1MzksMjkuNTM4NDYxNSA3NC42MzM4NDYxLDM4LjEwNDYxNTQgNzYuNTA0NjE1NCw0OS4yMzA3NjkzIEw3Ni41MDQ2MTU0LDQ5LjIzMDc2OTMgWiIgaWQ9Iui3r+W+hCIgZmlsbD0iI0Q2MDkwOSI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNNTMuMTY5MjMwNyw3Ni44IEM0MC4xNzIzMDc2LDc2LjggMjkuNTM4NDYxNSw2Ni4xNjYxNTM5IDI5LjUzODQ2MTUsNTMuMTY5MjMwNyBDMjkuNTM4NDYxNSw0MC4xNzIzMDc2IDQwLjE3MjMwNzYsMjkuNTM4NDYxNSA1My4xNjkyMzA3LDI5LjUzODQ2MTUgQzY2LjE2NjE1MzksMjkuNTM4NDYxNSA3Ni44LDQwLjE3MjMwNzYgNzYuOCw1My4xNjkyMzA3IEM3Ni44LDY2LjE2NjE1MzkgNjYuMTY2MTUzOSw3Ni44IDUzLjE2OTIzMDcsNzYuOCBaIiBpZD0i6Lev5b6EIiBmaWxsPSIjMzMzNjNBIj48L3BhdGg+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik01My4xNjkyMzA3LDM3LjQxNTM4NDYgQzQ0LjUwNDYxNTQsMzcuNDE1Mzg0NiAzNy40MTUzODQ2LDQ0LjUwNDYxNTQgMzcuNDE1Mzg0Niw1My4xNjkyMzA3IEMzNy40MTUzODQ2LDYxLjgzMzg0NjEgNDQuNTA0NjE1NCw2OC45MjMwNzY5IDUzLjE2OTIzMDcsNjguOTIzMDc2OSBDNjEuODMzODQ2MSw2OC45MjMwNzY5IDY4LjkyMzA3NjksNjEuODMzODQ2MSA2OC45MjMwNzY5LDUzLjE2OTIzMDcgQzY4LjkyMzA3NjksNDQuNTA0NjE1NCA2MS44MzM4NDYxLDM3LjQxNTM4NDYgNTMuMTY5MjMwNywzNy40MTUzODQ2IEw1My4xNjkyMzA3LDM3LjQxNTM4NDYgWiIgaWQ9Iui3r+W+hCIgZmlsbD0iI0ZGRkZGRiI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNNDMuMzIzMDc2OSw1My4xNjkyMzA3IEM0My4zMjMwNzY5LDU4LjYwNzExMTQgNDcuNzMxMzUwMSw2My4wMTUzODQ2IDUzLjE2OTIzMDcsNjMuMDE1Mzg0NiBDNTguNjA3MTExNCw2My4wMTUzODQ2IDYzLjAxNTM4NDYsNTguNjA3MTExNCA2My4wMTUzODQ2LDUzLjE2OTIzMDcgQzYzLjAxNTM4NDYsNDcuNzMxMzUwMSA1OC42MDcxMTE0LDQzLjMyMzA3NjkgNTMuMTY5MjMwNyw0My4zMjMwNzY5IEM0Ny43MzEzNTAxLDQzLjMyMzA3NjkgNDMuMzIzMDc2OSw0Ny43MzEzNTAxIDQzLjMyMzA3NjksNTMuMTY5MjMwNyBaIiBpZD0i6Lev5b6EIiBmaWxsPSIjMzMzNjNBIj48L3BhdGg+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4=

// @version      2026.09.14.01

// @description  DouyuEx 纯净重构版：源头全链路无缝最高画质（彻底告别开播二次切流卡顿）/ 活跃榜贡献值原生极速注入 / 物理单例长连接多路复用 / 优雅阻断P2P上传 / 彻底去除弹窗广告 / 剥离历史冗余死重

// @author       xayahcore

// @match			*://*.douyu.com/0*

// @match			*://*.douyu.com/1*

// @match			*://*.douyu.com/2*

// @match			*://*.douyu.com/3*

// @match			*://*.douyu.com/4*

// @match			*://*.douyu.com/5*

// @match			*://*.douyu.com/6*

// @match			*://*.douyu.com/7*

// @match			*://*.douyu.com/8*

// @match			*://*.douyu.com/9*

// @match			*://*.douyu.com/beta/*

// @match			*://*.douyu.com/topic/*

// @match        *://www.douyu.com/member/cp/getFansBadgeList

// @match        *://passport.douyu.com/*

// @match        *://msg.douyu.com/*

// @match        *://yuba.douyu.com/*

// @match        *://v.douyu.com/*

// @match        *://cz.douyu.com/*
// @require      https://registry.npmmirror.com/flv.js/1.6.2/files/dist/flv.min.js
// @require      https://fastly.jsdelivr.net/npm/svgaplayerweb@2.3.1/build/svga.min.js
// @require      https://registry.npmmirror.com/gif.js/0.2.0/files/dist/gif.js
// @require      https://registry.npmmirror.com/three/0.80.0/files/build/three.min.js
// @require      https://registry.npmmirror.com/xlsx/0.16.4/files/dist/xlsx.full.min.js
// @require      https://registry.npmmirror.com/dompurify/2.3.6/files/dist/purify.min.js

// @grant        GM_openInTab

// @grant        GM_xmlhttpRequest

// @grant        GM_setClipboard

// @grant        GM_setValue

// @grant        GM_getValue

// @grant        GM_listValues

// @grant        GM_deleteValue

// @grant        GM_cookie

// @grant        GM_registerMenuCommand

// @grant        unsafeWindow

// @run-at       document-start

// @connect      douyucdn.cn

// @connect      douyu.com

// @connect      qq.com

// @connect      douyuex.com

// @connect      bilibili.com

// @connect      huya.com

// @connect      shadiao.app

// @connect      doseeing.com

// @connect      registry.npmmirror.com

// @connect      fastly.jsdelivr.net

// @connect      greasyfork.org

// @license        MIT
// ==/UserScript==
