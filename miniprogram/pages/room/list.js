"use strict";
// pages/room/list.js
const app = getApp()
Page({

  /**
   * 页面的初始数据
   */
  data: {
    tags: ["关注", "创建"],
    tabs: ["我关注的", "我创建的"],
    activeIndex: 0,
    rooms: [null, null],
  },
  refreshFollowRooms: function () {
    app.api.api_meeting_follow_rooms().then(res => {
      this.data.rooms[0] = res
      this.setData({ rooms: this.data.rooms })
    })
  },
  refreshCreateRooms: function () {
    app.api.api_meeting_create_rooms().then(res => {
      this.data.rooms[1] = res
      this.setData({ rooms: this.data.rooms })
    })
  },
  refresh: function(){
    switch (this.data.activeIndex){
      case 0:
        this.refreshFollowRooms()
        break
      case 1:
        this.refreshCreateRooms()
        break
    }
  },
  reserve: function(e){
    wx.navigateTo({
      url: '../meeting/reserve',
    })
  },
  my: function (e) {
    wx.navigateTo({
      url: '../meeting/my',
    })
  },
  create: function(e){
    wx.navigateTo({
      url: 'edit',
    })
  },
  detail: function(e){
    wx.navigateTo({
      url: 'detail?room_id='+e.currentTarget.id
    })
  },
  tabClick: function (e) {
    this.setData({
      activeIndex: parseInt(e.currentTarget.id)
    });
    this.refresh()
  },
  adLoad: function (options) {
  },
  adError: function (options) {
    console.log("adError", options)
    this.setData({ show_ad: false})
  },
  adClose: function (options) {
    this.setData({ show_ad: false })
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

    let room_ids = options.room_ids
    if (room_ids) {
      this.api.api_meeting_room_follow({room_id: room_ids}).then(res => {
        this.refresh()
      })
    }
    app.config().then(res => {
      if (res.banner_ad_unit_id){
        let data = {}
        data.ad_unit_id = res.banner_ad_unit_id
        data.show_ad = true
        if (res.banner_ad_intervals){
          data.ad_intervals = res.banner_ad_intervals
        }
        this.setData(data)
      }
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