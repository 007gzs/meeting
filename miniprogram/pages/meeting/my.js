// pages/meeting/my.js
"use strict";
const app = getApp()
Page({

  /**
   * 页面的初始数据
   */
  data: {
    loading: true
  },

  check_td_data: function () {
    this.data.td_data = app.meetings.getTdData(
      this.data.rooms,
      this.data.meetings,
      this.data.time_range,
      { selected: false },
      this.selectComponent("#date_select").data.select_date
    )
    this.selectComponent("#time_table").set_data({
      titles: this.data.rooms, labels: this.data.time_range, td_data: this.data.td_data
    })
    if(this.data.loading){
      this.setData({ loading: false})
    }
  },
  data_click: function(e){
    if (!e.detail.data_id){
      return
    }
    wx.navigateTo({
      url: '../meeting/detail?meeting_id=' + e.detail.data_id,
    })
  },
  date_select_change: function (e) {
    this.refresh()
  },
  refresh: function () {
    app.api.api_meeting_my_meetings({
      date: this.selectComponent("#date_select").data.select_date
    }).then(res => {
      const start_time = app.time.parseTime(res.start_time).value()
      const end_time = app.time.parseTime(res.end_time).value()
      let time_range = []
      for (let time = start_time; time <= end_time; time += 1800) {
        const t = app.time.valueToTime(time)
        const id = t.string(2)
        time_range.push({ id: id, text: t.minute == 0 ? id : "", data: t })
      }
      this.data.meetings = res.meetings
      this.data.rooms = res.rooms
      this.data.time_range = time_range
      this.selectComponent("#date_select").setDateRange(res.start_date, res.end_date)
      this.check_td_data()
    })
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

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