
"use strict";
const USE_WEBSOCKET = true
const httpCookie = require('./http-cookie.js')
const ApiViewWS = require('./apiviewws.js')
let app = getApp()
let apiViewWSs = {}
const reconnectApiViews = (check_time) => {
  if(!USE_WEBSOCKET){
    return
  }
  for(let i in apiViewWSs){
    apiViewWSs[i].check_and_reconnect(check_time)
  }
}
const getApiViewWS = (server, need_connect) => {
  const ws_path = "ws" + server.substring(4) + "/wsapi"
  return new Promise((resolve, reject) => {
    if (!apiViewWSs.hasOwnProperty(ws_path)) {
      apiViewWSs[ws_path] = new ApiViewWS(ws_path)
    }
    if (!need_connect){
      resolve(apiViewWSs[ws_path])
      return
    }
    apiViewWSs[ws_path].connect().then(res => {
      resolve(apiViewWSs[ws_path])
    }).catch(res => {
      reject(res)
    })
  })
}
const check_res = function (res, server, path, data, method, header, resolve, reject, check_login) {
  if (app === undefined) {
    app = getApp()
  }
  if (check_login && res.data.code == app.api.ERROR_CODE.ERR_WECHAT_LOGIN) {
    app.login().then(res => {
      req(server, path, data, method, header, resolve, reject, false)
    }).catch(res => {
      resolve(res.data)
    })
  } else if (res.data.code != app.api.ERROR_CODE.SUCCESS) {
    reject(res.data.message)
  } else {
    resolve(res.data.data)
  }
}
const ws_request = function (server, path, data, method, header, resolve, reject, check_login) {
  if (!USE_WEBSOCKET || path === '/api/wechat/login') {
    wx_request(server, path, data, method, header, resolve, reject, check_login)
    return
  }
  getApiViewWS(server, true).then(conn => {
    conn.req(path, data, (succ, res) => {
      if (!succ) {
        reject("网络错误")
      } else {
        check_res(res, server, path, data, method, header, resolve, reject, check_login)
      }
    })
  }).catch(res => {
    wx_request(server, path, data, method, header, resolve, reject, check_login)
  })
}
const wx_request = function (server, path, data, method, header, resolve, reject, check_login){
  const url = server + path
  header['Cookie'] = httpCookie.getCookieForReq()
  const reqid = "req_" + parseInt(Math.random() * 9000000000 + 1000000000)
  wx.request({
    url: url,
    data: data,
    method: method,
    header: header,
    success(res) {
      httpCookie.setCookieByHead(res.header)
      if(app === undefined){
        app = getApp()
      }
      let server_time = new Date(res.header["Date"])
      if (!isNaN(server_time)){
        app.globalData.timeDifference = server_time.getTime() - new Date().getTime()
      }
      if(USE_WEBSOCKET){
        getApiViewWS(server, false).then(conn => {
          conn.reconnect()
          check_res(res, server, path, data, method, header, resolve, reject, check_login)
        }).catch(res => {
          check_res(res, server, path, data, method, header, resolve, reject, check_login)
        })
      }else{
        check_res(res, server, path, data, method, header, resolve, reject, check_login)
      }
    },
    fail(res) {
      reject("网络错误")
    },
    complete() {
    }
  })
}
const req = function (server, path, data, method, header, resolve, reject, check_login){
  return ws_request(server, path, data, method, header, resolve, reject, check_login)
}
const request = function({server, path, data, method, header} = {}){
  for (let key in data) {
    if(data[key] === undefined){
      delete data[key]
    }
  }
  return new Promise((resolve, reject) => {
    wx.showNavigationBarLoading()
    let resolve_callback = res => {
      wx.hideNavigationBarLoading()
      resolve(res)
    }
    let reject_callback = res => {
      wx.hideNavigationBarLoading()
      wx.showToast({
        icon: 'none',
        title: res
      })
      reject(res)
    }
    req(server, path, data, method, header, resolve_callback, reject_callback, true)
  })
}
module.exports = request
module.exports.reconnectApiViews = reconnectApiViews
