"use strict";
// pages/meeting/detail.js
const app = getApp()
Page({

  /**
   * 页面的初始数据
   */
  data: {
    meeting_id: 0,
    owner: false,
    joined: false,
    attendees_show: false,
    no_icon_attendee_num: 0,
    info: {}
  },

  refresh: function () {
    if (this.data.meeting_id <= 0) {
      return
    }
    app.api.api_meeting_info({ meeting_id: this.data.meeting_id }).then(res => {
      let no_icon_attendee_num = 0
      for (let i in res.attendees) {
        if (!res.attendees[i].avatarurl) {
          no_icon_attendee_num += 1
        }
      }
      this.setData({
        info: res,
        no_icon_attendee_num: no_icon_attendee_num,
        owner: res.is_manager
      })
      
      app.userInfo().then(res => {
        let joined = false
        for(let i in this.data.info.attendees){
          if (this.data.info.attendees[i].id == res.id){
            joined = true
            break
          }
        }
        this.setData({
          joined: joined
        })
      })
    })
  },
  attendees_show_change: function(){
    this.setData({ attendees_show: !this.data.attendees_show})
  },
  home: function () {
    app.gotoHome()
  },
  join: function(){

    app.api.api_meeting_join({ meeting_id: this.data.meeting_id }).then(res => {
      this.refresh()
    })
  },
  leave: function(){

    app.api.api_meeting_leave({ meeting_id: this.data.meeting_id }).then(res => {
      this.refresh()
    })
  },
  edit: function(){
    wx.navigateTo({
      url: 'edit?meeting_id=' + this.data.meeting_id,
    })
  },
  del: function(){
    wx.showModal({
      title: '提示',
      content: '确定要删除吗？',
      success: sm => {
        if (sm.confirm) {
          app.api.api_meeting_cancel({ meeting_id: this.data.meeting_id }).then(res => {
            wx.navigateBack()
          })
        }
      }
    })
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({ show_home: getCurrentPages().length == 1})
    let meeting_id = options.meeting_id
    if(meeting_id){
      this.setData({ meeting_id: meeting_id})
    }else{
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      })
      wx.navigateBack()
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
    let title = '会议'
    if (this.data.info.name){
      title += " - " + this.data.info.name
    }
    return {
      title: title,
      path: '/pages/meeting/detail?meeting_id='+this.data.meeting_id
    }
  }
})