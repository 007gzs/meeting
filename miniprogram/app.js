"use strict";
//app.js
const api = require("./utils/api.js")
const request = require("./utils/request.js")
const time = require('./utils/time.js')
const meetings = require('./utils/meetings.js')
App({
  api: api,
  time: time,
  meetings: meetings,
  onLaunch: function (options) {
    if (wx.getUpdateManager){
      const updateManager = wx.getUpdateManager()
      updateManager.onUpdateReady(function (e) {
        updateManager.applyUpdate()
      })
    }
    // 获取用户信息
    this.userInfo()
  },
  onShow: function(options){
    request.reconnectApiViews(5)
  },
  onHide: function (options) {
  },
  globalData: {
    config: null,
    userInfo: null,
    getUserInfoing: false,
    getUserInfoPromise: [],
    logining: false,
    loginPromise: [],
    timeDifference: 0,
  },
  nowDate: function(){
    return new Date(new Date().getTime() + this.globalData.timeDifference)
  },
  config: function(){
    return new Promise((resolve, reject) => {
      if (this.globalData.config != null){
        resolve(this.globalData.config)
        return
      }
      api.api_meeting_config().then(res => {
        this.globalData.config = res
        resolve(this.globalData.config)
      }).catch(res => {
        reject(res)
      })
    })
  },
  userInfo: function () {
    return new Promise((resolve, reject) => {
      this.globalData.getUserInfoPromise.push([resolve, reject])
      if (this.globalData.getUserInfoing) {
        return
      }
      this.globalData.getUserInfoing = true
      let callback = (index, info) => {
        this.globalData.getUserInfoing = false
        while (this.globalData.getUserInfoPromise.length > 0) {
          let pro = this.globalData.getUserInfoPromise.pop()
          pro[index](info);
        }
        if (index == 0 && info.need_refresh){
          this.getUserInfo()
        }
      }
      if (this.globalData.userInfo != null) {
        callback(0, this.globalData.userInfo)
        return
      }
      api.api_wechat_user_info().then(data => {
        if (!data.avatarurl){
          this.getUserInfo().then(res => {
            callback(0, res)
          }).catch(res => {
            callback(1, res)
          })
        }else{
          this.globalData.userInfo = data
          callback(0, this.globalData.userInfo)
        }
      }).catch(res => {
        callback(1, res)
      })
    })
  },
  getUserInfo: function () {
    return new Promise((resolve, reject) => {
      this.login().then(res => {
        wx.getUserInfo({
          withCredentials: true,
          lang: 'zh_CN',
          success: res => {
            this.updateUserInfo(res.encryptedData, res.iv).then(res => {
              resolve(res)
            }).catch(res => {
              reject(res)
            })

          },
          fail(res) {
            reject(res.errMsg);
          }
        })
      })
    })
  },
  updateUserInfo: function (encryptedData, iv){
    return new Promise((resolve, reject) => {
      api.api_wechat_user_info({ encrypted_data: encryptedData, iv: iv }).then(data => {
        this.globalData.userInfo = data
        resolve(this.globalData.userInfo)
      }).catch(msg => {
        this.login().then(res => {
          reject(msg)
        })
      })
    })
  },
  onGetPhoneNumber: function (e) {
    if (e.detail.errMsg == 'getPhoneNumber:ok') {
      return this.updateUserInfo(e.detail.encryptedData, e.detail.iv)
    }else{
      return new Promise((resolve, reject) => { reject("获取失败") });
    }
  },

  onGetUserInfo: function (e) {
    if (e.detail.errMsg == 'getUserInfo:ok') {
      return this.updateUserInfo(e.detail.encryptedData, e.detail.iv)
    } else {
      return new Promise((resolve, reject) => { reject("获取失败") });
    }
  },
  gotoHome: function(){
    wx.reLaunch({
      url: '/pages/room/list',
    })
  },
  login: function() {
    return new Promise((resolve, reject) => {
      this.globalData.loginPromise.push([resolve, reject])
      if (this.globalData.logining) {
        return
      }
      this.globalData.logining = true
      let callback = (index, data) => {
        this.globalData.logining = false
        while (this.globalData.loginPromise.length > 0) {
          let pro = this.globalData.loginPromise.pop()
          pro[index](data);
        }
      }
      wx.login({
        success: res => {
          api.api_wechat_login({js_code: res.code}).then(data => {
            callback(0, data)
          })
          // 发送 res.code 到后台换取 openId, sessionKey, unionId
        },
        fail: res => {
          callback(1, res)
        }
      })
    })
  }
})