"use strict";
// pages/room/history.js
const app = getApp()
Page({

  /**
   * 页面的初始数据
   */
  data: {
    room_id: 0,
    info: {},
    meetings: [],
    history_start: '',
    history_end: '',
    history_limit_start: '',
    history_limit_end: '',
  },
  refresh: function () {

    app.api.api_meeting_room_info({ room_id: this.data.room_id }).then(res => {
      this.setData({ info: res })
      app.userInfo().then(res => {
        this.setData({ owner: res.id == this.data.info.create_user })
      })
    })
    app.api.api_meeting_history_meetings({
      room_id: this.data.room_id,
      start_date: this.data.history_start,
      end_date: this.data.history_end
    }).then(res => {
      this.setData({
        meetings: res.meetings,
        history_limit_start: res.history_start_date,
        history_limit_end: res.history_end_date
      })
    })
  },
  change_history: function(){
    this.setData({
      history_view: !this.data.history_view
    })
    this.refresh()
  },
  change_history_start: function(e){
    this.setData({
      history_start: e.detail.value
    })
    this.refresh()
  },
  change_history_end: function(e){
    this.setData({
      history_end: e.detail.value
    })
    this.refresh()
  },
  date_select_change: function (e) {
    this.refresh()
  },
  detail: function (e) {
    wx.navigateTo({
      url: '../meeting/detail?meeting_id=' + e.currentTarget.id
    })
  },
  formatNumber: function(n) {
    n = n.toString()
    return n[1] ? n : '0' + n
  },
  dateId: function(date){
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return [year, month, day].map(this.formatNumber).join('-')
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    let now = app.nowDate()
    this.setData({
      room_id: parseInt(options.room_id),
      show_home: getCurrentPages().length == 1,
      history_end: this.dateId(now),
      history_start: this.dateId(new Date(now.setDate(now.getDate() - 7)))

    })
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

  }
})