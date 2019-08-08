
"use strict";
const httpCookie = require('./http-cookie.js')
let app = getApp()
const TASK_STATUS = {
  INIT: -1, // 初始化
  ERROR: -2, // 连接错误
  CLOSE: -3, // 连接关闭
  CLOSEING: -4, // 请求连接关闭中
  OK: 0, // 连接成功
  CONNECTING: 1, // 连接中
  RECONNECTING: 3, // 请求重连中
}
const ApiViewWS = function (ws_path, common_listener) {
  this.listenerList = {}
  this.common_listener = common_listener 
  this.gen_reqid = function () {
    return "apiview_" + parseInt(Math.random() * 9000000000 + 1000000000)
  }
  this.ws_path = ws_path
  this.task_status = TASK_STATUS.INIT
  this.connects = []
  this._proc_data = (data) => {
    let reqid = data['reqid']
    if (reqid === undefined) {
      if (typeof this.common_listener === "function") {
        this.common_listener(data)
      }
      return
    }
    if (app === undefined) {
      app = getApp()
    }
    let server_time = new Date(data["server_time"])
    if (!isNaN(server_time)) {
      app.globalData.timeDifference = server_time.getTime() - new Date().getTime()
    }
    let listener = this.listenerList[reqid]
    delete this.listenerList[reqid]
    if (typeof listener === "function") {
      listener(data["status_code"] == 200, data)
    }
  }
  this._failall = () => {
    for (let reqid in this.listenerList) {
      if (typeof this.listenerList[reqid] === "function") {
        this.listenerList[reqid](false, {status_code: -1})
      }
    }
  }
  this._coonects_callback = (index, data) => {
    while(this.connects.length > 0){
      let connect = this.connects.pop()
      connect[index](data)
    }
  }
  this._new_task = () => {
    let header = {
      'Cookie': httpCookie.getCookieForReq()
    }
    this.task_status = TASK_STATUS.CONNECTING
    this.task = wx.connectSocket({
      url: this.ws_path,
      header: header,
      tcpNoDelay: false,
      protocols: ["apiview"],
      method: "GET",
      success: res => {
      },
      fail: res => {
        reject("网络错误")
      }
    })
    this.task.onClose(res => {
      this._failall()
      if (this.task_status == TASK_STATUS.RECONNECTING) {
        this._new_task()
      } else if (this.task_status == TASK_STATUS.CLOSEING){
        this.task_status = TASK_STATUS.CLOSE
        this._coonects_callback(1, "网络错误")
      }
    })
    this.task.onError(res => {
      this.task_status = TASK_STATUS.ERROR
      this._failall()
      this._coonects_callback(1, "网络错误")
    })
    this.task.onMessage(res => {
      this._proc_data(JSON.parse(res.data))
    })
    this.task.onOpen(res => {
      this.task_status = TASK_STATUS.OK
      this._coonects_callback(0, this)
    })
  }
  this.connect = () => {
    return new Promise((resolve, reject) => {
      if (this.task_status === TASK_STATUS.OK){
        if(this.task.readyState === 1){
          resolve(this)
          return
        }else{
          this.task_status === TASK_STATUS.ERROR
        }
      }
      this.connects.push([resolve, reject])
      if (this.task_status < 0){
        this._new_task()
      }
    })
    
  }
  this.close = () => {
    this.task_status = TASK_STATUS.CLOSEING
    if(this.task){
      this.task.close()
    }
  }
  this.reconnect = () => {
    this.task_status = TASK_STATUS.RECONNECTING
    if(this.task){
      this.task.close()
    }else{
      this._new_task()
    }
  }
  this.req = (path, data, listener) => {
    let reqid = this.gen_reqid()
    while (this.listenerList.hasOwnProperty(reqid)) {
      reqid = this.gen_reqid()
    }
    this.listenerList[reqid] = listener
    const req_data = { path: path, reqid: reqid, data: data }
    this.task.send({
      data: JSON.stringify(req_data),
      success: res => {
      },
      fail: res => {
        listener(false, {})
      }
    })
  }
  return this
}
module.exports = ApiViewWS