"use strict";
// pages/room/detail.js
const app = getApp()
Page({

  /**
   * 页面的初始数据
   */
  data: {
    room_id: 0,
    show_home: false,
    owner: false,
    info: {},
    meetings: []
  },
  refresh: function () {

    app.api.api_meeting_room_info({ room_id: this.data.room_id }).then(res => {
      this.setData({ info: res })
      app.userInfo().then(res => {
        this.setData({ owner: res.id == this.data.info.create_user })
      })
    })
    app.api.api_meeting_room_meetings({
      room_ids: this.data.room_id,
      date: this.selectComponent("#date_select").data.select_date
    }).then(res => {
      this.selectComponent("#date_select").setDateRange(res.start_date, res.end_date)
      this.setData({ meetings: res.meetings })
    })
  },
  hide_qrcode: function () {
    this.setData({
      show_qr_code: false
    })
  },
  show_qrcode: function(){
    this.setData({
      show_qr_code:true
    })
    // wx.previewImage({
    //   current: this.data.info.qr_code,
    //   urls: [this.data.info.qr_code]
    // })
  },
  home: function(){
    app.gotoHome()
  },
  date_select_change: function (e) {
    this.refresh()
  },
  reserve: function(){
    wx.navigateTo({
      url: '../meeting/reserve?room_ids=' + this.data.room_id + "&date=" + this.selectComponent("#date_select").data.select_date
    })
  },
  unfollow: function(){
    app.api.api_meeting_room_un_follow({ room_id: this.data.room_id}).then(res => {
      this.data.info.is_follow = false
      this.setData({info: this.data.info})
    })
  },
  follow: function(){
    app.api.api_meeting_room_follow({ room_id: this.data.room_id }).then(res => {
      this.data.info.is_follow = true
      this.setData({ info: this.data.info })
    })
  },
  edit: function(){
    wx.navigateTo({
      url: 'edit?room_id=' + this.data.room_id
    })
  },
  del: function() {
    wx.showModal({
      title: '提示',
      content: '确定要删除吗？',
      success: sm => {
        if (sm.confirm) {
          app.api.api_meeting_room_delete({ room_id: this.data.room_id }).then(res => {
            wx.navigateBack()
          })
        }
      }
    })
  },
  detail: function (e) {
    wx.navigateTo({
      url: '../meeting/detail?meeting_id=' + e.currentTarget.id
    })
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({ show_home: getCurrentPages().length == 1 })
    const scene = decodeURIComponent(options.scene)
    let room_id = ''
    scene.split("&").map(s => {
      if(s.substring(0, s.indexOf("=")) == "room_id"){
        room_id = s.substring(s.indexOf("=") + 1, s.length)
      }
    })
    let from_scene = false
    if(room_id){
      from_scene = true
    }else{
      room_id = options.room_id
    }
    if(options.date){
      this.selectComponent("#date_select").setData({ select_date: options.date })
    }
    if (room_id) {
      this.setData({ room_id: parseInt(room_id) })
      if(from_scene){
        this.follow()
      }
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.refresh()
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    let title = '会议室'
    if (this.data.info.name) {
      title += " - " + this.data.info.name
    }
    return {
      title: title,
      path: '/pages/room/detail?room_id=' + this.data.room_id
    }
  }
})